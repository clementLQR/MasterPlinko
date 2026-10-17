import { describe, expect, it } from 'vitest';
import { CONFIG, EXITS, OUTCOMES } from '../src/config';
import { Game, reconcile } from '../src/game/engine';
import { newGame } from '../src/game/state';
import type { GameState } from '../src/game/state';
import { drawOutcome } from '../src/game/outcomes';
import { parseSnapshot } from '../src/persistence/snapshot';
import { BOARD, pathToExit, samplePath } from '../src/rendering/trajectory';
import { Navigation } from '../src/navigation/camera';

function setup(random = () => 0) {
  let saved = newGame(); let fail = false;
  const game = new Game(saved, state => { if (fail) throw new Error('Quota'); saved = structuredClone(state); }, random);
  game.writable = true;
  return { game, snapshot: () => structuredClone(saved), fail: (value: boolean) => { fail = value; } };
}

function atelier() {
  const context = setup(() => 0.999);
  const { game } = context;
  for (let i = 0; i < 2; i++) { const ball = game.launch()!; game.settle(ball.id); game.advance(500); }
  expect(game.buy('azur.initial_repair')).toBe(true);
  expect(game.buy('azur.auto_launcher')).toBe(true);
  return context;
}

describe('Règles économiques et transactions', () => {
  it('démarre à 19,00 et conserve les fractions : mise 10, x0,3, net -7', () => {
    const { game } = setup();
    expect(game.state.walletCents).toBe(1900);
    expect(game.state.selectedBetCents).toBe(100);
    expect(game.state.upgrades).toEqual([]);
    game.setBet(1000);
    const ball = game.launch()!;
    expect(game.state.walletCents).toBe(900);
    expect(game.launch()).toBeUndefined();
    expect(game.settle(ball.id)?.netCents).toBe(-700);
    expect(game.state.walletCents).toBe(1200);
    expect(game.settle(ball.id)).toBeUndefined();
    expect(game.state.walletCents).toBe(1200);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
  });
  it('x1 rembourse exactement la mise', () => {
    const { game } = setup(() => 0.7);
    game.settle(game.launch()!.id);
    expect(game.state.walletCents).toBe(1900);
  });
  it('le plafond refuse la 51e sans débit, même pour une bille payante', () => {
    const { game } = atelier();
    game.toggleAuto();
    for (let i = 0; i < 50; i++) expect(game.launch('auto')).toBeDefined();
    const before = structuredClone(game.state);
    expect(game.launch()).toBeUndefined();
    expect(game.launch('auto')).toBeUndefined();
    expect(game.state).toEqual(before);
    expect(parseSnapshot(JSON.stringify(before)).pendingBalls).toHaveLength(50);
  });
  it('ne facture pas la bille gratuite et ne lui prête pas la mise choisie', () => {
    const { game } = atelier();
    game.setBet(1000); game.toggleAuto();
    const wallet = game.state.walletCents;
    const ball = game.launch('auto')!;
    expect(ball.betCents).toBe(0); expect(ball.baseCents).toBe(100);
    expect(game.state.walletCents).toBe(wallet);
    expect(game.settle(ball.id)?.netCents).toBe(4000);
  });
  it('panne unique au seuil, règlement en vol conservé, réparation après vidage', () => {
    const { game } = setup(() => 0.999);
    const first = game.launch()!; game.advance(500); const second = game.launch()!;
    game.settle(first.id); expect(game.state.repairTriggered).toBe(false);
    game.advance(500); const third = game.launch()!;
    game.settle(second.id); expect(game.state.repairTriggered).toBe(true);
    expect(game.launch()).toBeUndefined();
    expect(game.buy('azur.initial_repair')).toBe(false);
    expect(game.settle(third.id)?.returnCents).toBe(4000);
    expect(game.buy('azur.initial_repair')).toBe(true);
    const wallet = game.state.walletCents;
    expect(game.buy('azur.initial_repair')).toBe(false); expect(game.state.walletCents).toBe(wallet);
    game.advance(500); expect(game.launch()).toBeDefined();
  });
  it('refuse les achats avant déblocage ou sans fonds', () => {
    const { game } = setup();
    expect(game.buy('azur.auto_launcher')).toBe(false);
    expect(game.buy('azur.accounting_tray')).toBe(false);
    game.state.repairTriggered = true;
    expect(game.buy('azur.initial_repair')).toBe(false);
    expect(game.state.walletCents).toBe(1900);
  });
  it('annule les mutations et suspend le jeu si la sauvegarde échoue', () => {
    const context = setup(); const { game } = context;
    const before = structuredClone(game.state); context.fail(true);
    expect(game.launch()).toBeUndefined(); expect(game.state).toEqual(before); expect(game.error).toContain('Sauvegarde');
    game.advance(10000); expect(game.state).toEqual(before);
    context.fail(false); expect(game.retrySave()).toBe(true);
    const ball = game.launch()!; const inFlight = structuredClone(game.state);
    context.fail(true); expect(game.settle(ball.id)).toBeUndefined(); expect(game.state).toEqual(inFlight);
    context.fail(false); game.retrySave(); game.settle(ball.id);
    expect(game.settle(ball.id)).toBeUndefined();
  });
});

describe('Temps actif, usine et Décharge', () => {
  it('usine à zéro ou sous une pièce, salaire unique et reprise conservatrice', () => {
    for (const wallet of [0, 30]) {
      const context = setup(); const { game } = context;
      game.state.walletCents = wallet;
      expect(game.startFactory()).toBe(true);
      expect(game.startFactory()).toBe(false);
      expect(game.launch()).toBeUndefined();
      game.advance(7000); const checkpoint = context.snapshot();
      game.advance(4000, false); expect(game.state.factoryRemainingMs).toBe(8000);
      const resumed = new Game(checkpoint, () => {}); resumed.writable = true;
      expect(resumed.state.factoryRemainingMs).toBe(8000);
      resumed.advance(7999); expect(resumed.state.walletCents).toBe(wallet);
      resumed.advance(1); expect(resumed.state.walletCents).toBe(wallet + 1500);
      resumed.advance(15000); expect(resumed.state.walletCents).toBe(wallet + 1500);
    }
  });
  it('demande usine arrête le Doigt même si des billes restent en vol', () => {
    const { game } = atelier(); game.toggleAuto(); const ball = game.launch('auto')!;
    expect(game.startFactory()).toBe(false); expect(game.autoEnabled).toBe(false);
    game.settle(ball.id); expect(game.startFactory()).toBe(true);
    game.advance(15000); expect(game.autoEnabled).toBe(false);
  });
  it('fige le bonus au lancement, ne recharge pas pendant son activité', () => {
    const { game } = atelier(); game.toggleAuto();
    while (game.state.heatCount < 100) game.settle(game.launch('auto')!.id);
    const beforeBonus = game.launch('auto')!;
    expect(beforeBonus.bonus).toBe(1);
    expect(game.activateBonus()).toBe(true); expect(game.activateBonus()).toBe(false);
    const boosted = game.launch('auto')!;
    expect(boosted.bonus).toBe(10); expect(boosted.returnCents).toBe(40000);
    game.settle(beforeBonus.id); expect(game.state.heatCount).toBe(0);
    game.autoEnabled = false;
    game.advance(10000); expect(game.state.bonusRemainingMs).toBe(0);
    game.settle(boosted.id); expect(game.state.heatCount).toBe(1);
    expect(game.state.history[0].returnCents).toBe(40000);
    expect(parseSnapshot(JSON.stringify(game.state))).toBeDefined();
  });
  it('base 1, x0,5, bonus10 donne5 et le service suspend le bonus', () => {
    const { game } = setup(() => 0.5);
    game.state.chargeReady = true; game.state.heatCount = 100; game.activateBonus();
    const ball = game.launch()!; expect(ball.returnCents).toBe(500); game.settle(ball.id);
    game.advance(2000); game.startFactory(); game.advance(15000);
    expect(game.state.bonusRemainingMs).toBe(8000);
    game.advance(2000, false); expect(game.state.bonusRemainingMs).toBe(8000);
  });
  it('aucun temps ou lancement dans un onglet inactif, pas de file au plafond', () => {
    const { game } = atelier(); game.toggleAuto();
    game.advance(60000, false); expect(game.state.pendingBalls).toHaveLength(0);
    for (let i = 0; i < 50; i++) game.launch('auto');
    game.advance(60000); expect(game.state.pendingBalls).toHaveLength(50);
    game.settle(game.state.pendingBalls[0].id); game.advance(1);
    expect(game.state.pendingBalls).toHaveLength(49);
    game.advance(1999); expect(game.state.pendingBalls).toHaveLength(50);
    game.writable = false; const before = structuredClone(game.state);
    game.advance(10000); expect(game.launch()).toBeUndefined(); expect(game.state).toEqual(before);
  });
});

describe('Persistance et import', () => {
  it('reprend plusieurs vols dans l’ordre, sans hasard ni second paiement', () => {
    const { game } = setup(() => 0.7);
    game.launch(); game.advance(500); game.launch();
    const data = parseSnapshot(JSON.stringify(game.state));
    const resumed = reconcile(data);
    expect(resumed.count).toBe(2); expect(resumed.total).toBe(200); expect(resumed.state.walletCents).toBe(1900);
    expect(resumed.state.history.map(ball => ball.sequence)).toEqual([2, 1]);
    expect(reconcile(parseSnapshot(JSON.stringify(resumed.state))).count).toBe(0);
    expect(reconcile(resumed.state).state.walletCents).toBe(1900);
  });
  it('format futur, résultats falsifiés, doublons et données incohérentes refusés', () => {
    const { game } = setup(); game.launch();
    const mutations: ((s: GameState) => void)[] = [
      s => { (s as { saveVersion: number }).saveVersion = 9; },
      s => { s.pendingBalls[0].returnCents = 999; },
      s => { s.pendingBalls.push(s.pendingBalls[0]); },
      s => { s.walletCents = -1; },
      s => { s.walletCents += 1; },
      s => { s.pendingBalls[0].exit = 14; },
      s => { s.upgrades.push('azur.auto_launcher'); },
      s => { s.factoryRemainingMs = 1; },
      s => { s.selectedBetCents = 101; },
    ];
    const before = structuredClone(game.state);
    for (const mutate of mutations) {
      const candidate = structuredClone(before); mutate(candidate);
      expect(() => parseSnapshot(JSON.stringify(candidate))).toThrow();
      expect(game.state).toEqual(before);
    }
    expect(() => parseSnapshot('{')).toThrow();
    expect(() => parseSnapshot('null')).toThrow();
  });
  it('import réconcilie les billes et arrête toujours le Doigt', () => {
    const { game } = atelier(); game.toggleAuto(); game.launch('auto');
    const imported = parseSnapshot(JSON.stringify(game.state));
    expect(game.replace(imported)).toBe(true);
    expect(game.state.pendingBalls).toHaveLength(0); expect(game.autoEnabled).toBe(false);
    expect(parseSnapshot(JSON.stringify(game.state))).toBeDefined();
  });
});

describe('Navigation indépendante de la production', () => {
  it('la dernière commande remplace la cible, sans file de transitions', () => {
    const nav = new Navigation(); expect(nav.atMachine).toBe(true);
    nav.go('azur'); nav.advance(200); expect(nav.value).toBeGreaterThan(0); expect(nav.atMachine).toBe(false);
    nav.go('plinko'); nav.advance(80); nav.go('azur'); nav.advance(500);
    expect(nav.target).toBe('azur'); expect(nav.value).toBe(1); expect(nav.moving).toBe(false);
    nav.go('plinko'); nav.advance(500); expect(nav.atMachine).toBe(true);
  });
  it('mouvement réduit immédiat et production indépendante des changements de vue', () => {
    const nav = new Navigation(); nav.go('azur', true); expect(nav.value).toBe(1); expect(nav.moving).toBe(false);
    const { game } = atelier(); game.toggleAuto();
    nav.go('plinko'); nav.advance(500); game.advance(2000);
    expect(game.state.pendingBalls).toHaveLength(1);
    nav.go('azur'); nav.advance(500); game.advance(500);
    game.settle(game.state.pendingBalls[0].id); expect(game.state.history[0].origin).toBe('auto');
    nav.go('plinko'); nav.advance(1, true); expect(nav.atMachine).toBe(true);
  });
});

describe('Probabilités et coordonnées visuelles', () => {
  it('les 1 000 tickets correspondent exactement aux poids, côtés partagés', () => {
    expect(OUTCOMES.reduce((sum, o) => sum + o.weight, 0)).toBe(1000);
    const counts = new Map<number, number>();
    for (let ticket = 0; ticket < 1000; ticket++) {
      let call = 0;
      const result = drawOutcome(() => call++ === 0 ? (ticket + 0.1) / 1000 : 0);
      counts.set(result.multiplier, (counts.get(result.multiplier) ?? 0) + 1);
      expect(EXITS[result.exit]).toBe(result.multiplier);
    }
    for (const o of OUTCOMES) expect(counts.get(o.multiplier)).toBe(o.weight);
    let call = 0; expect(drawOutcome(() => call++ === 0 ? 0.999999 : 0).exit).toBe(0);
    expect(drawOutcome(() => 0.999999).exit).toBe(14);
    expect(() => drawOutcome(() => 1)).toThrow();
  });
  it('les 15 trajectoires atteignent leur sortie sans traverser les picots', () => {
    for (let exit = 0; exit < 15; exit++) {
      const path = pathToExit(exit, () => 0.38);
      expect(path.at(-1)!.x).toBeCloseTo((exit - 7) * BOARD.spacingX, 8);
      const end = samplePath(path, 1); expect(end).toEqual(path.at(-1));
      expect(path).toHaveLength(17);
      let closest = Infinity;
      for (let i = 0; i <= 1000; i++) {
        const point = samplePath(path, i / 1000);
        for (let row = 0; row < 14; row++) for (let col = 0; col <= row; col++) {
          const distance = Math.hypot(point.x - (col - row / 2) * BOARD.spacingX, point.y - (BOARD.startY - row * BOARD.spacingY));
          closest = Math.min(closest, distance);
        }
      }
      expect(closest).toBeGreaterThan(0.176);
    }
  });
});
