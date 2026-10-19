import { describe, expect, it } from 'vitest';
import { STAIRS, CONFIG, EXITS, OUTCOMES } from '../src/config';
import { Game, reconcile } from '../src/game/engine';
import { newGame } from '../src/game/state';
import type { UpgradeId } from '../src/config';
import type { GameState } from '../src/game/state';
import { drawOutcome } from '../src/game/outcomes';
import { magnetExit } from '../src/game/magnets';
import { parseSnapshot } from '../src/persistence/snapshot';
import { BOARD, pathToExit, samplePath, pinPositions, contactStep } from '../src/rendering/trajectory';
import { Departure, Navigation } from '../src/navigation/camera';
import { AZUR, AZUR_POSES, AzurNavigation } from '../src/navigation/shop';
import { factoryReward, factoryEventAt, factoryClock } from '../src/game/packing';

function setup(random = () => 0, magnetsTrial = false, collectorTrial = false) {
  let saved = newGame(); let fail = false;
  const game = new Game(saved, state => { if (fail) throw new Error('Quota'); saved = structuredClone(state); }, random, { magnetsTrial, collectorTrial });
  game.writable = true;
  return { game, snapshot: () => structuredClone(saved), fail: (value: boolean) => { fail = value; } };
}

/** Choisir un résultat économique précis sans dépendre de la fréquence de sa catégorie. */
function outcomeRandom(multiplier: number) {
  let lower = 0;
  for (const outcome of OUTCOMES) {
    if (outcome.multiplier === multiplier) { const ticket = (lower + outcome.weight / 2) / 1000; return () => ticket; }
    lower += outcome.weight;
  }
  throw new Error('Multiplicateur absent du test.');
}

function buyInstalled(game: Game, id: UpgradeId) {
  if (id === 'azur.initial_repair' && game.state.pendingBalls.length) return false;
  return game.buyPlan(id) && game.installPlan(id);
}

function atelier(random = () => 0.999, magnetsTrial = false, collectorTrial = false) {
  const context = setup(random, magnetsTrial, collectorTrial);
  const { game } = context;
  for (let i = 0; i < 2; i++) { const ball = game.launch()!; game.settle(ball.id); game.advance(500); }
  expect(buyInstalled(game, 'azur.initial_repair')).toBe(true);
  expect(buyInstalled(game, 'azur.auto_launcher')).toBe(true);
  return context;
}

describe('Règles économiques et transactions', () => {
  it('vend les Aimants à 200 et le Collecteur à 120, sans activer les plans avant montage', () => {
    const { game } = atelier();
    const poor = structuredClone(game.state); expect(game.buyPlan('azur.magnets')).toBe(false); expect(game.buyPlan('azur.collector')).toBe(false); expect(game.state).toEqual(poor);
    // Fixture de salaires historiques cohérente avec le bilan monétaire, sans modifier les prix.
    game.state.walletCents += 40000; game.state.stats.factoryIncome += 40000; const before = game.state.walletCents;
    expect(game.buyPlan('azur.magnets')).toBe(true); expect(game.state.walletCents).toBe(before - 20000); expect(game.magnetsAvailable).toBe(false);
    expect(game.buyPlan('azur.collector')).toBe(true); expect(game.state.walletCents).toBe(before - 32000); expect(game.collectorAvailable).toBe(false);
    expect(game.buyPlan('azur.magnets')).toBe(false); expect(game.buyPlan('azur.collector')).toBe(false);
    expect(game.installPlan('azur.magnets')).toBe(true); expect(game.installPlan('azur.collector')).toBe(true);
    expect(game.state.walletCents).toBe(before - 32000); expect(game.state.plans).toEqual([]); expect(game.state.stats.upgradeExpenses).toBe(38500);
    expect(game.magnetsAvailable).toBe(true); expect(game.collectorAvailable).toBe(true);
    const resumed = new Game(parseSnapshot(JSON.stringify(game.state)), () => {});
    expect(resumed.magnetsAvailable).toBe(true); expect(resumed.collectorAvailable).toBe(true); expect(resumed.autoEnabled).toBe(false);
    expect(game.installPlan('azur.magnets')).toBe(false); expect(game.state.walletCents).toBe(before - 32000);
  });
  it('garde les prérequis des modules, sans exiger le Doigt pour le Collecteur', () => {
    const { game } = setup(() => 0.999); game.state.walletCents += 40000; game.state.stats.factoryIncome += 40000;
    expect(game.buyPlan('azur.magnets')).toBe(false); expect(game.buyPlan('azur.collector')).toBe(false);
    for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
    buyInstalled(game, 'azur.initial_repair');
    expect(game.buyPlan('azur.magnets')).toBe(false); expect(game.notice).toContain('Doigt');
    expect(buyInstalled(game, 'azur.collector')).toBe(true); expect(game.collectorAvailable).toBe(true); expect(game.toggleAuto()).toBe(false);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
  });
  it('fait fonctionner les deux achats sans essai DEV et conserve les résultats antérieurs', () => {
    let sample = 0.999; const { game } = atelier(() => sample); game.state.walletCents += 40000; game.state.stats.factoryIncome += 40000;
    game.toggleAuto(); sample = 0; game.state.magnetCooldownMs = 0;
    const before = game.launch('auto')!; expect(before).toMatchObject({ exit: 7, returnCents: 30 });
    buyInstalled(game, 'azur.magnets'); buyInstalled(game, 'azur.collector');
    expect(game.state.pendingBalls[0]).toEqual(before); expect(before.collectorEligible).toBeUndefined();
    const attracted = game.launch('auto')!; expect(attracted).toMatchObject({ magnetFrom: 7, exit: 6, returnCents: 50, collectorEligible: true });
    game.settle(before.id); expect(game.state.collectorCharge).toBe(0); game.settle(attracted.id); expect(game.state.collectorCharge).toBe(1);
    game.stopAuto(); game.state.magnetCooldownMs = 0;
    for (let i = 0; i < 9; i++) {
      const manual = game.launch()!; expect(manual.exit).toBe(7); expect(manual.magnetFrom).toBeUndefined(); game.settle(manual.id); if (i < 8) game.advance(500);
    }
    expect(game.state.collectorCharge).toBe(10); game.advance(1); const reward = game.state.pendingBalls[0];
    expect(reward).toMatchObject({ origin: 'collector', baseCents: 100, betCents: 0, exit: 7 }); expect(reward.magnetFrom).toBeUndefined(); expect(reward.collectorEligible).toBeUndefined();
    game.settle(reward.id); expect(game.state.collectorCharge).toBe(0); expect(game.state.magnetCooldownMs).toBe(0);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
  });
  it('n’active pas un module acheté si l’écriture du montage échoue', () => {
    const context = atelier(), { game } = context; game.state.walletCents += 40000; game.state.stats.factoryIncome += 40000;
    game.buyPlan('azur.magnets'); const before = structuredClone(game.state); context.fail(true);
    expect(game.installPlan('azur.magnets')).toBe(false); expect(game.state).toEqual(before); expect(game.magnetsAvailable).toBe(false);
    context.fail(false); game.retrySave(); expect(game.installPlan('azur.magnets')).toBe(true); expect(game.state.walletCents).toBe(before.walletCents);
    expect(game.magnetsAvailable).toBe(true);
  });
  it('migre le format 5 en conservant plans payés, réserve et paiements figés sans offrir de modules', () => {
    let sample = 0.999; const { game } = atelier(() => sample, true, true);
    game.buyPlan('azur.accounting_tray'); game.toggleAuto(); game.state.magnetCooldownMs = 0; sample = 0;
    const ball = game.launch('auto')!; game.state.collectorCharge = 9;
    const old = JSON.parse(JSON.stringify(game.state)); old.saveVersion = 5;
    const migrated = parseSnapshot(JSON.stringify(old)); expect(migrated.plans).toEqual(['azur.accounting_tray']); expect(migrated.collectorCharge).toBe(9);
    expect(migrated.pendingBalls[0]).toEqual(ball); const paid = reconcile(migrated).state;
    expect(paid.walletCents).toBe(migrated.walletCents + ball.returnCents); expect(paid.collectorCharge).toBe(10);
    const normal = new Game(paid, () => {}); normal.writable = true; normal.advance(10000);
    expect(normal.magnetsAvailable).toBe(false); expect(normal.collectorAvailable).toBe(false); expect(normal.state.pendingBalls).toEqual([]); expect(normal.state.collectorCharge).toBe(10);
    expect(reconcile(paid).state.walletCents).toBe(paid.walletCents);
  });
  it('valide les nouveaux identifiants, leur prix et la dépendance au Doigt dans le format 6', () => {
    const { game } = atelier(); game.state.walletCents += 40000; game.state.stats.factoryIncome += 40000;
    game.buyPlan('azur.magnets'); game.buyPlan('azur.collector'); const raw = JSON.stringify(game.state);
    expect(parseSnapshot(raw)).toEqual(game.state);
    for (const version of [1, 2, 3, 4, 5, 7]) { const bad = JSON.parse(raw); bad.saveVersion = version; expect(() => parseSnapshot(JSON.stringify(bad))).toThrow(); }
    const noFinger = JSON.parse(raw); noFinger.upgrades = ['azur.initial_repair']; expect(() => parseSnapshot(JSON.stringify(noFinger))).toThrow('Doigt');
    const wrongPrice = JSON.parse(raw); wrongPrice.walletCents++; wrongPrice.stats.upgradeExpenses--; expect(() => parseSnapshot(JSON.stringify(wrongPrice))).toThrow('dépenses');
    const duplicate = JSON.parse(raw); duplicate.upgrades.push('azur.collector'); expect(() => parseSnapshot(JSON.stringify(duplicate))).toThrow('plans');
  });
  it('paie chaque plan une fois, puis installe sans débit ni activation anticipée', () => {
    const { game } = setup(() => 0.999);
    for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
    const wallet = game.state.walletCents;
    expect(game.installPlan('azur.initial_repair')).toBe(false);
    expect(game.buyPlan('azur.initial_repair')).toBe(true);
    expect(game.state.walletCents).toBe(wallet - 2500); expect(game.state.repairPurchased).toBe(false);
    expect(game.state.upgrades).toEqual([]); expect(game.state.plans).toEqual(['azur.initial_repair']);
    expect(game.buyPlan('azur.initial_repair')).toBe(false); expect(game.buyPlan('azur.auto_launcher')).toBe(false);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
    expect(game.installPlan('azur.initial_repair')).toBe(true); expect(game.state.repairPurchased).toBe(true);
    expect(game.state.walletCents).toBe(wallet - 2500); expect(game.installPlan('azur.initial_repair')).toBe(false);
    expect(game.buyPlan('azur.auto_launcher')).toBe(true); expect(game.toggleAuto()).toBe(false);
    const paid = game.state.walletCents;
    const resumed = new Game(parseSnapshot(JSON.stringify(game.state)), () => {}); resumed.writable = true;
    expect(resumed.state.plans).toEqual(['azur.auto_launcher']); expect(resumed.installPlan('azur.auto_launcher')).toBe(true);
    expect(resumed.state.walletCents).toBe(paid); expect(resumed.state.plans).toEqual([]); expect(resumed.toggleAuto()).toBe(true);
    expect(parseSnapshot(JSON.stringify(resumed.state))).toEqual(resumed.state);
  });
  it('ne monte pas une réparation sur les billes en cours et conserve le plan', () => {
    const { game } = setup(() => 0.999);
    const a = game.launch()!; game.advance(500); const b = game.launch()!; game.advance(500); const c = game.launch()!;
    game.settle(a.id); game.settle(b.id); expect(game.buyPlan('azur.initial_repair')).toBe(true);
    const before = structuredClone(game.state); expect(game.installPlan('azur.initial_repair')).toBe(false); expect(game.state).toEqual(before);
    game.settle(c.id); expect(game.installPlan('azur.initial_repair')).toBe(true);
  });
  it('annule achat ou montage en cas d’erreur d’écriture, sans perdre ni doubler le plan', () => {
    const context = setup(() => 0.999), { game } = context;
    for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
    const before = structuredClone(game.state); context.fail(true);
    expect(game.buyPlan('azur.initial_repair')).toBe(false); expect(game.state).toEqual(before);
    context.fail(false); game.retrySave(); game.buyPlan('azur.initial_repair'); const paid = structuredClone(game.state);
    context.fail(true); expect(game.installPlan('azur.initial_repair')).toBe(false); expect(game.state).toEqual(paid);
    context.fail(false); game.retrySave(); expect(game.installPlan('azur.initial_repair')).toBe(true);
    expect(game.state.walletCents).toBe(paid.walletCents); expect(game.state.stats.upgradeExpenses).toBe(2500);
  });
  it('migre les modules déjà installés du format 4 sans achat ni démontage', () => {
    const { game } = atelier(() => 0.999, true, true); game.state.collectorCharge = 7;
    const old = JSON.parse(JSON.stringify(game.state)); old.saveVersion = 4; delete old.plans;
    expect(parseSnapshot(JSON.stringify(old))).toEqual(game.state);
    for (const version of [1, 2, 3]) {
      const legacy = JSON.parse(JSON.stringify(newGame())); legacy.saveVersion = version; delete legacy.plans;
      if (version < 3) delete legacy.factory.events;
      expect(parseSnapshot(JSON.stringify(legacy)).plans).toEqual([]);
    }
  });
  it('refuse plans inconnus, doublons, prix incohérents et déblocages anticipés à l’import', () => {
    const { game } = atelier(); const raw = JSON.stringify(game.state);
    for (const plans of [['azur.auto_launcher'], ['azur.unknown'], ['azur.accounting_tray', 'azur.accounting_tray'], ['azur.accounting_tray']]) {
      expect(() => parseSnapshot(JSON.stringify({ ...JSON.parse(raw), plans }))).toThrow();
    }
    const premature = newGame(); premature.plans = ['azur.initial_repair']; expect(() => parseSnapshot(JSON.stringify(premature))).toThrow();
    expect(game.buyPlan('azur.unknown' as UpgradeId)).toBe(false); expect(game.installPlan('azur.unknown' as UpgradeId)).toBe(false);
  });
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
    const { game } = setup(outcomeRandom(100));
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
    expect(buyInstalled(game, 'azur.initial_repair')).toBe(false);
    expect(game.settle(third.id)?.returnCents).toBe(4000);
    expect(buyInstalled(game, 'azur.initial_repair')).toBe(true);
    const wallet = game.state.walletCents;
    expect(buyInstalled(game, 'azur.initial_repair')).toBe(false); expect(game.state.walletCents).toBe(wallet);
    game.advance(500); expect(game.launch()).toBeDefined();
  });
  it('refuse les achats avant déblocage ou sans fonds', () => {
    const { game } = setup();
    expect(buyInstalled(game, 'azur.auto_launcher')).toBe(false);
    expect(buyInstalled(game, 'azur.accounting_tray')).toBe(false);
    game.state.repairTriggered = true;
    expect(buyInstalled(game, 'azur.initial_repair')).toBe(false);
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

describe('Aimants en essai de développement', () => {
  it('désactivés par défaut et avant réparation/Doigt, ne change jamais les manuelles', () => {
    expect(setup(() => 0, true).game.magnetsAvailable).toBe(false);
    let sample = 0.999;
    const { game: ordinary } = atelier(() => sample); sample = 0;
    ordinary.state.magnetCooldownMs = 0; ordinary.toggleAuto();
    expect(ordinary.magnetsAvailable).toBe(false); expect(ordinary.launch('auto')?.magnetFrom).toBeUndefined();
    sample = 0.999; const { game } = atelier(() => sample, true); sample = 0;
    game.state.magnetCooldownMs = 0; game.toggleAuto();
    const manual = game.launch()!;
    expect(manual.multiplier).toBe(30); expect(manual.magnetFrom).toBeUndefined(); expect(game.state.magnetCooldownMs).toBe(0);
    expect(game.launch('auto')).toMatchObject({ origin: 'auto', betCents: 0, baseCents: 100, magnetFrom: 7, exit: 6, multiplier: 50, returnCents: 50 });
  });
  it('recharge cinq secondes puis attire au prochain lancement : six secondes avec le Doigt actuel', () => {
    let sample = 0.999; const { game } = atelier(() => sample, true); sample = 0;
    game.toggleAuto(); const wallet = game.state.walletCents;
    for (let i = 0; i < 59; i++) game.advance(100);
    expect(game.state.pendingBalls).toHaveLength(2); expect(game.state.magnetCooldownMs).toBe(0);
    expect(game.state.pendingBalls.every(ball => ball.magnetFrom === undefined)).toBe(true);
    game.advance(100);
    expect(game.state.pendingBalls.at(-1)).toMatchObject({ magnetFrom: 7, exit: 6, returnCents: 50 });
    expect(game.state.magnetCooldownMs).toBe(5000); expect(game.state.walletCents).toBe(wallet);
    for (let i = 0; i < 60; i++) game.advance(100);
    expect(game.state.pendingBalls.filter(ball => ball.magnetFrom !== undefined)).toHaveLength(2);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
  });
  it('préserve la recharge à l’arrêt, masqué, en usine et à la reprise, sans accumulation', () => {
    let sample = 0.999; const { game } = atelier(() => sample, true); sample = 0;
    game.toggleAuto(); game.advance(1000); expect(game.state.magnetCooldownMs).toBe(4000);
    game.stopAuto(); game.advance(60000); expect(game.state.magnetCooldownMs).toBe(4000);
    game.toggleAuto(); game.advance(60000, false); expect(game.state.magnetCooldownMs).toBe(4000);
    game.stopAuto(); expect(game.startFactory()).toBe(true); game.advance(60000, true, 'factory');
    expect(game.state.magnetCooldownMs).toBe(4000);
    const resumed = new Game(parseSnapshot(JSON.stringify(game.state)), () => {}, () => 0, { magnetsTrial: true }); resumed.writable = true;
    expect(resumed.autoEnabled).toBe(false); resumed.advance(60000); expect(resumed.state.magnetCooldownMs).toBe(4000);
    resumed.toggleAuto(); resumed.advance(4000); expect(resumed.state.magnetCooldownMs).toBe(5000);
    expect(resumed.state.pendingBalls).toHaveLength(1); expect(resumed.state.pendingBalls[0].magnetFrom).toBe(7);
  });
  it('ne consomme rien sur ×40 et choisit les deux voisins du centre à 50/50', () => {
    const untouched = () => { throw new Error('Aucun hasard supplémentaire sur ×40'); };
    expect(magnetExit(0, untouched)).toBe(0); expect(magnetExit(14, untouched)).toBe(14);
    expect(magnetExit(7, () => 0.499999)).toBe(6); expect(magnetExit(7, () => 0.5)).toBe(8);
    for (let exit = 1; exit < 14; exit++) {
      const target = magnetExit(exit, () => 0);
      expect(Math.abs(target - exit)).toBe(1); expect(EXITS[target]).toBeGreaterThan(EXITS[exit]);
    }
    let sample = 0.999; const { game } = atelier(() => sample, true); game.toggleAuto(); game.state.magnetCooldownMs = 0;
    expect(game.launch('auto')).toMatchObject({ multiplier: 4000, exit: 14 }); expect(game.state.magnetCooldownMs).toBe(0);
    sample = 0; expect(game.launch('auto')?.magnetFrom).toBe(7); expect(game.state.magnetCooldownMs).toBe(5000);
  });
  it('fige attraction, bonus et retour au lancement ; recharge et paiement résistent aux échecs', () => {
    let sample = 0.999; const { game, fail, snapshot } = atelier(() => sample, true); sample = 0;
    game.toggleAuto(); game.state.magnetCooldownMs = 0; game.state.heatCount = 100; game.state.chargeReady = true; game.activateBonus();
    const before = structuredClone(game.state); fail(true);
    expect(game.launch('auto')).toBeUndefined(); expect(game.state).toEqual(before);
    fail(false); game.retrySave(); game.toggleAuto(); const ball = game.launch('auto')!;
    expect(ball).toMatchObject({ magnetFrom: 7, multiplier: 50, bonus: 2, returnCents: 100 });
    expect(snapshot().magnetCooldownMs).toBe(5000); expect(parseSnapshot(JSON.stringify(snapshot())).pendingBalls[0]).toEqual(ball);
    game.stopAuto(); game.advance(10000); const inFlight = structuredClone(game.state); fail(true);
    expect(game.settle(ball.id)).toBeUndefined(); expect(game.state).toEqual(inFlight);
    fail(false); game.retrySave(); expect(game.settle(ball.id)?.returnCents).toBe(100); expect(game.settle(ball.id)).toBeUndefined();
    const resumed = reconcile(parseSnapshot(JSON.stringify(inFlight)));
    expect(resumed.total).toBe(100); expect(resumed.state.history[0]).toMatchObject(ball); expect(reconcile(resumed.state).total).toBe(0);
    expect(new Game(resumed.state, () => {}).magnetsAvailable).toBe(false);
  });
  it('refuse la 51e sans débit, hasard supplémentaire ni consommation de la recharge prête', () => {
    let calls = 0; let sample = 0.999; const { game } = atelier(() => { calls++; return sample; }, true); sample = 0;
    game.toggleAuto(); for (let i = 0; i < 50; i++) game.launch('auto'); game.state.magnetCooldownMs = 0;
    const before = structuredClone(game.state), drawn = calls;
    expect(game.launch('auto')).toBeUndefined(); expect(game.launch()).toBeUndefined(); expect(calls).toBe(drawn); expect(game.state).toEqual(before);
    game.settle(game.state.pendingBalls[0].id); expect(game.launch('auto')?.magnetFrom).toBe(7);
  });
  it('importe les anciens snapshots et refuse recharges et attractions incohérentes', () => {
    for (const version of [1, 2, 3]) {
      const old = JSON.parse(JSON.stringify(newGame())); delete old.magnetCooldownMs;
      old.saveVersion = version; if (version < 3) delete old.factory.events;
      expect(parseSnapshot(JSON.stringify(old)).magnetCooldownMs).toBe(5000);
    }
    let sample = 0.999; const { game } = atelier(() => sample, true); sample = 0;
    game.toggleAuto(); game.state.magnetCooldownMs = 0; game.launch('auto');
    const invalid: ((s: GameState) => void)[] = [
      s => { s.magnetCooldownMs = -1; }, s => { s.magnetCooldownMs = 5001; }, s => { s.magnetCooldownMs = 1.5; },
      s => { s.pendingBalls[0].magnetFrom = 0; }, s => { s.pendingBalls[0].magnetFrom = 9; },
      s => { s.pendingBalls[0].magnetFrom = 5; }, s => { s.pendingBalls[0].magnetFrom = 6; },
    ];
    for (const mutate of invalid) { const candidate = structuredClone(game.state); mutate(candidate); expect(() => parseSnapshot(JSON.stringify(candidate))).toThrow(); }
  });
  it('anime les treize décalages possibles sur la même grille, sans traverser les cloisons', () => {
    const pins = pinPositions();
    for (let from = 1; from < 14; from++) for (const side of [0, 0.999]) {
      const target = magnetExit(from, () => side), path = pathToExit(target, () => 0.42, from);
      expect(path).toHaveLength(17); expect(path.at(-1)!.x).toBeCloseTo((target - 7) * BOARD.spacingX);
      const junction = path[14].x;
      expect(Math.abs(junction - (from - 7) * BOARD.spacingX)).toBeCloseTo(BOARD.spacingX / 2);
      expect(Math.abs(junction - path[15].x)).toBeCloseTo(BOARD.spacingX / 2);
      for (let step = 0; step <= 800; step++) {
        const p = samplePath(path, step / 800);
        expect(Math.min(...pins.map(pin => Math.hypot(pin.x - p.x, pin.y - p.y)))).toBeGreaterThan(BOARD.ballRadius + BOARD.pinRadius - 0.025);
        if (p.y < BOARD.dividerTop) expect(Math.abs(p.x - path.at(-1)!.x)).toBeLessThan(BOARD.spacingX / 2 - BOARD.ballRadius);
      }
    }
  });
});

describe('Collecteur de ratés en essai de développement', () => {
  it('reste désactivé par défaut, exige la réparation et ne requalifie pas un ancien lancement', () => {
    expect(setup(() => 0, false, true).game.collectorAvailable).toBe(false);
    let sample = 0.999; const normal = atelier(() => sample); sample = 0;
    const old = normal.game.launch()!; expect(old.collectorEligible).toBeUndefined();
    const trial = new Game(normal.game.state, () => {}, () => 0, { collectorTrial: true }); trial.writable = true;
    trial.settle(old.id); expect(trial.state.collectorCharge).toBe(0);
    expect(trial.collectorAvailable).toBe(true); expect(trial.launch('collector')).toBeUndefined();
  });
  it('dix ratés manuels donnent une seule bille gratuite, sans Doigt et sans auto-recharge', () => {
    let sample = 0.999; const { game, snapshot } = setup(() => sample, false, true);
    for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
    buyInstalled(game, 'azur.initial_repair'); sample = 0;
    expect(game.state.upgrades).not.toContain('azur.auto_launcher');
    for (let i = 0; i < 10; i++) {
      const ball = game.launch()!; expect(ball.collectorEligible).toBe(true);
      expect(game.state.collectorCharge).toBe(i); game.settle(ball.id); expect(game.settle(ball.id)).toBeUndefined();
      expect(game.state.collectorCharge).toBe(i + 1); if (i < 9) game.advance(500);
    }
    const wallet = game.state.walletCents; game.advance(1);
    const reward = game.state.pendingBalls[0]; expect(reward).toMatchObject({ origin: 'collector', betCents: 0, baseCents: 100, multiplier: 30, returnCents: 30 });
    expect(reward.collectorEligible).toBeUndefined(); expect(game.state.collectorCharge).toBe(0); expect(game.state.walletCents).toBe(wallet);
    expect(snapshot().pendingBalls[0]).toEqual(reward); expect(game.settle(reward.id)?.netCents).toBe(30);
    expect(game.state.collectorCharge).toBe(0); expect(game.state.stats.freeProduction).toBe(30);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state); game.advance(10000); expect(game.state.pendingBalls).toHaveLength(0);
  });
  it('compte les sorties finales du Doigt, pas les remboursements ni le retour bonifié', () => {
    let sample = 0.999; const { game } = atelier(() => sample, true, true); game.toggleAuto();
    sample = 0.9; game.settle(game.launch('auto')!.id); expect(game.state.collectorCharge).toBe(0); // ×1
    sample = 0; game.settle(game.launch('auto')!.id); expect(game.state.collectorCharge).toBe(1);
    game.state.magnetCooldownMs = 0; sample = 0.7; const attracted = game.launch('auto')!;
    expect(attracted).toMatchObject({ magnetFrom: 8, multiplier: 100 }); game.settle(attracted.id); expect(game.state.collectorCharge).toBe(1);
    game.state.chargeReady = true; game.state.heatCount = 100; game.activateBonus();
    const doubled = game.launch('auto')!; expect(doubled.returnCents).toBe(100); game.settle(doubled.id); expect(game.state.collectorCharge).toBe(2);
  });
  it('garde une récompense au plafond et réserve la place libérée avant le Doigt', () => {
    let sample = 0.999; let draws = 0; const { game } = atelier(() => { draws++; return sample; }, false, true); sample = 0; game.toggleAuto();
    for (let i = 0; i < 50; i++) game.launch('auto'); game.state.collectorCharge = 10;
    const before = structuredClone(game.state), count = draws;
    expect(game.launch('collector')).toBeUndefined(); expect(game.state).toEqual(before); expect(draws).toBe(count);
    game.advance(10); expect(game.state.collectorCharge).toBe(10); expect(game.state.pendingBalls).toHaveLength(50);
    game.settle(game.state.pendingBalls[0].id); expect(game.state.collectorCharge).toBe(10); game.advance(1);
    expect(game.state.pendingBalls).toHaveLength(50); expect(game.state.pendingBalls.filter(ball => ball.origin === 'collector')).toHaveLength(1);
    expect(game.state.collectorCharge).toBe(0); expect(parseSnapshot(JSON.stringify(game.state)).pendingBalls).toHaveLength(50);
  });
  it('suspend la récompense hors jeu actif, dans l’usine et lorsque l’essai est désactivé', () => {
    const { game } = atelier(() => 0.999, false, true); game.state.collectorCharge = 10;
    game.advance(50000, false); expect(game.state.collectorCharge).toBe(10); expect(game.state.pendingBalls).toHaveLength(0);
    game.startFactory(); game.advance(60000, true, 'factory'); expect(game.state.collectorCharge).toBe(10);
    const disabled = new Game(game.state, () => {}, () => 0); disabled.writable = true; disabled.advance(50000);
    expect(disabled.state.collectorCharge).toBe(10); expect(disabled.launch('collector')).toBeUndefined();
    game.advance(1); expect(game.state.pendingBalls[0].origin).toBe('collector');
  });
  it('annule le règlement ou le lancement refusé par la sauvegarde, sans perdre la récompense', () => {
    let sample = 0.999; const { game, fail, snapshot } = atelier(() => sample, false, true); sample = 0; game.state.collectorCharge = 9;
    const ball = game.launch()!, before = structuredClone(game.state); fail(true);
    expect(game.settle(ball.id)).toBeUndefined(); expect(game.state).toEqual(before);
    fail(false); game.retrySave(); game.settle(ball.id); expect(game.state.collectorCharge).toBe(10);
    const saved = snapshot(); fail(true); game.advance(1); expect(game.state.collectorCharge).toBe(10); expect(snapshot()).toEqual(saved);
    expect(game.state.pendingBalls).toHaveLength(0); fail(false); game.retrySave(); game.advance(1);
    expect(game.state.pendingBalls.filter(ball => ball.origin === 'collector')).toHaveLength(1); expect(game.state.collectorCharge).toBe(0);
  });
  it('réconcilie les contributions et la récompense figées sans hasard ni nouveau lancement', () => {
    let sample = 0.999; const { game } = atelier(() => sample, false, true); sample = 0;
    game.state.collectorCharge = 9; game.launch();
    const resumed = reconcile(parseSnapshot(JSON.stringify(game.state))); expect(resumed.state.collectorCharge).toBe(10); expect(resumed.count).toBe(1);
    expect(reconcile(resumed.state).state.collectorCharge).toBe(10); expect(resumed.state.pendingBalls).toHaveLength(0);
    const next = new Game(resumed.state, () => {}, () => 0, { collectorTrial: true, magnetsTrial: true }); next.writable = true;
    next.state.chargeReady = true; next.state.heatCount = 100; next.activateBonus(); next.state.magnetCooldownMs = 0;
    next.advance(1); const reward = next.state.pendingBalls[0]; expect(reward).toMatchObject({ origin: 'collector', bonus: 2, returnCents: 60 }); expect(reward.magnetFrom).toBeUndefined();
    const paid = reconcile(parseSnapshot(JSON.stringify(next.state))); expect(paid.total).toBe(60); expect(paid.state.collectorCharge).toBe(0);
    expect(reconcile(paid.state).total).toBe(0); expect(parseSnapshot(JSON.stringify(paid.state))).toEqual(paid.state);
    next.resetProgress(); expect(next.state.collectorCharge).toBe(0); expect(next.state.pendingBalls).toHaveLength(0);
  });
  it('migre les formats 1/2/3 sans charge inventée et refuse les contributions incohérentes', () => {
    for (const version of [1, 2, 3]) {
      const old = JSON.parse(JSON.stringify(newGame())); old.saveVersion = version; delete old.collectorCharge;
      if (version < 3) delete old.factory.events;
      const migrated = parseSnapshot(JSON.stringify(old)); expect(migrated.saveVersion).toBe(6); expect(migrated.collectorCharge).toBe(0);
    }
    let sample = 0.999; const { game } = atelier(() => sample, false, true); sample = 0; game.launch();
    for (const charge of [-1, 11, 0.5, null]) { const candidate = JSON.parse(JSON.stringify(game.state)); candidate.collectorCharge = charge; expect(() => parseSnapshot(JSON.stringify(candidate))).toThrow(); }
    const candidate = JSON.parse(JSON.stringify(game.state)); candidate.pendingBalls[0].origin = 'collector'; candidate.pendingBalls[0].betCents = 0; candidate.pendingBalls[0].returnCents = 30;
    expect(() => parseSnapshot(JSON.stringify(candidate))).toThrow('contribution au Collecteur');
    const old = JSON.parse(JSON.stringify(game.state)); old.saveVersion = 3; expect(() => parseSnapshot(JSON.stringify(old))).toThrow('Collecteur dans un ancien format');
  });
  it('migre une vraie partie du format 3 avec gains figés et programme d’usine déjà en cours', () => {
    let sample = 0.999; const { game } = atelier(() => sample, true); sample = 0;
    game.state.heatCount = 100; game.state.chargeReady = true; game.activateBonus(); game.toggleAuto(); game.state.magnetCooldownMs = 0;
    game.launch('auto'); game.launch();
    const old = JSON.parse(JSON.stringify(game.state)); old.saveVersion = 3; delete old.collectorCharge;
    const migrated = parseSnapshot(JSON.stringify(old));
    expect(migrated).toEqual({ ...game.state, saveVersion: 6, collectorCharge: 0 });
    const resumed = reconcile(migrated); expect(resumed.total).toBe(160); expect(reconcile(resumed.state).total).toBe(0);
    const working = new Game(resumed.state, () => {}, () => 0.5); working.writable = true; working.startFactory(); working.advance(12345, true, 'factory');
    const previous = JSON.parse(JSON.stringify(working.state)); previous.saveVersion = 3; delete previous.collectorCharge;
    const service = parseSnapshot(JSON.stringify(previous));
    expect(service.factory).toEqual(working.state.factory); expect(service.factoryRemainingMs).toBe(working.state.factoryRemainingMs);
    expect(service.walletCents).toBe(working.state.walletCents); expect(service.history).toEqual(working.state.history); expect(service.bonusRemainingMs).toBe(working.state.bonusRemainingMs);
  });
});

describe('Suppression de la progression', () => {
  it('repart à 19 pièces sans ancien résultat ni vol, conserve les réglages et arrête le Doigt', () => {
    const { game, snapshot } = atelier();
    game.setPreferences({ sound: true, reducedMotion: true, quality: 'low' }); game.setBet(1000);
    game.state.heatCount = 100; game.state.chargeReady = true; game.activateBonus();
    game.toggleAuto(); game.launch('auto');
    expect(game.resetProgress()).toBe(true);
    const fresh = newGame(); fresh.preferences = structuredClone(game.state.preferences); fresh.savedAt = game.state.savedAt;
    expect(game.state).toEqual(fresh); expect(game.autoEnabled).toBe(false);
    expect(snapshot()).toEqual(game.state); expect(parseSnapshot(JSON.stringify(snapshot()))).toEqual(game.state);
    const ball = game.launch()!; game.settle(ball.id); expect(game.state.history).toHaveLength(1);
  });
  it('écriture refusée : ancienne partie intacte et nouvelle tentative explicite', () => {
    const { game, fail, snapshot } = atelier(); const before = structuredClone(game.state), saved = snapshot();
    fail(true); expect(game.resetProgress()).toBe(false); expect(game.state).toEqual(before); expect(snapshot()).toEqual(saved);
    expect(game.error).toContain('Sauvegarde impossible');
    fail(false); expect(game.resetProgress()).toBe(true); expect(game.state.walletCents).toBe(1900); expect(game.state.upgrades).toEqual([]);
  });
  it('un onglet sans droit d’écriture ne peut pas effacer la progression', () => {
    const { game, snapshot } = atelier(); game.writable = false; const before = structuredClone(game.state), saved = snapshot();
    expect(game.resetProgress()).toBe(false); expect(game.state).toEqual(before); expect(snapshot()).toEqual(saved);
  });
});

describe('Temps actif, usine et Décharge', () => {
  it('usine à zéro ou sous une pièce, une minute active, sans gain si aucune grise', () => {
    for (const wallet of [0, 30]) {
      const context = setup(() => 0.5); const { game } = context;
      game.state.walletCents = wallet;
      expect(game.startFactory()).toBe(true); expect(game.state.factoryRemainingMs).toBe(60000);
      expect(game.startFactory()).toBe(false); expect(game.launch()).toBeUndefined();
      game.advance(7000); const checkpoint = context.snapshot();
      game.advance(4000, false); expect(game.state.factoryRemainingMs).toBe(53000);
      const resumed = new Game(checkpoint, () => {}); resumed.writable = true;
      resumed.advance(52999); expect(resumed.state.walletCents).toBe(wallet);
      resumed.advance(1); expect(resumed.state.walletCents).toBe(wallet);
      expect(resumed.state.factory.status).toBe('success'); expect(resumed.state.stats.factoryIncome).toBe(0);
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
    expect(boosted.bonus).toBe(2); expect(boosted.returnCents).toBe(8000);
    game.settle(beforeBonus.id); expect(game.state.heatCount).toBe(0);
    game.autoEnabled = false;
    game.advance(10000); expect(game.state.bonusRemainingMs).toBe(0);
    game.settle(boosted.id); expect(game.state.heatCount).toBe(1);
    expect(game.state.history[0].returnCents).toBe(8000);
    expect(parseSnapshot(JSON.stringify(game.state))).toBeDefined();
  });
  it('base 1, x0,5, bonus2 donne1 et le service suspend le bonus', () => {
    const { game } = setup(outcomeRandom(50));
    game.state.chargeReady = true; game.state.heatCount = 100; game.activateBonus();
    const ball = game.launch()!; expect(ball.bonus).toBe(2); expect(ball.returnCents).toBe(100); game.settle(ball.id);
    game.advance(2000); game.startFactory(); game.advance(60000);
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
  it('accepte les anciens retours ×10 figés, sans les recalculer ni les payer deux fois', () => {
    const { game } = setup(outcomeRandom(50));
    game.state.chargeReady = true; game.state.heatCount = 100; game.activateBonus(); game.launch();
    const legacy = structuredClone(game.state);
    legacy.pendingBalls[0].bonus = 10; legacy.pendingBalls[0].returnCents = 500;
    const resumed = reconcile(parseSnapshot(JSON.stringify(legacy)));
    expect(resumed.total).toBe(500); expect(resumed.state.walletCents).toBe(2300);
    expect(resumed.state.history[0].bonus).toBe(10);
    expect(reconcile(parseSnapshot(JSON.stringify(resumed.state))).total).toBe(0);
    const next = new Game(resumed.state, () => {}, outcomeRandom(50)); next.writable = true; next.advance(500);
    expect(next.launch()?.bonus).toBe(2); expect(next.state.pendingBalls[0].returnCents).toBe(100);
    expect(parseSnapshot(JSON.stringify(next.state))).toBeDefined();
    const invalid = structuredClone(next.state); (invalid.pendingBalls[0] as { bonus: number }).bonus = 3;
    expect(() => parseSnapshot(JSON.stringify(invalid))).toThrow();
  });
  it('un résultat figé sous les anciens poids reste payé même si son ancien ticket tire désormais une perte', () => {
    const old = newGame(); old.walletCents = 1800; old.nextBallSequence = 2;
    old.stats.launched = 1; old.stats.paidBets = 100;
    old.pendingBalls = [{ id: 'ball-1', sequence: 1, origin: 'manual', betCents: 100, baseCents: 100, multiplier: 100, exit: 5, bonus: 1, returnCents: 100 }];
    expect(drawOutcome(() => 0.7).multiplier).toBe(50); // Ce ticket donnait ×1 avant le rééquilibrage.
    const resumed = reconcile(parseSnapshot(JSON.stringify(old)));
    expect(resumed.total).toBe(100); expect(resumed.state.walletCents).toBe(1900);
    expect(reconcile(parseSnapshot(JSON.stringify(resumed.state))).total).toBe(0);
    const next = new Game(resumed.state, () => {}, () => 0.7); next.writable = true;
    const ball = next.launch()!; expect(ball.multiplier).toBe(50); expect(next.settle(ball.id)?.returnCents).toBe(50);
    expect(next.state.walletCents).toBe(1850);
  });
  it('reprend plusieurs vols dans l’ordre, sans hasard ni second paiement', () => {
    const { game } = setup(outcomeRandom(100));
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

describe('Tri des billes à l’usine', () => {
  it('flux continu, grises manquées sans salaire, clic unique et paiement différé de 0,50', () => {
    const { game, snapshot } = setup(() => 0.5);
    expect(game.hitFactoryBall(1)).toBe(false); game.startFactory(); game.advance(2000, true, 'factory');
    const id = game.state.factory.balls[0].id;
    expect(game.state.factory.balls).toHaveLength(3);
    expect(game.hitFactoryBall(id)).toBe(true); expect(game.hitFactoryBall(id)).toBe(false);
    expect(game.state.walletCents).toBe(1900); expect(game.state.factory.greyHits).toBe(1);
    const resumed = new Game(parseSnapshot(JSON.stringify(snapshot())), () => {}, () => 0.5); resumed.writable = true;
    expect(resumed.hitFactoryBall(id)).toBe(false); resumed.advance(58000, true, 'factory');
    expect(resumed.state.walletCents).toBe(1950); expect(resumed.state.stats.factoryIncome).toBe(50);
    resumed.advance(60000, true, 'factory'); expect(resumed.state.walletCents).toBe(1950);
    expect(resumed.hitFactoryBall(id)).toBe(false); expect(parseSnapshot(JSON.stringify(resumed.state))).toEqual(resumed.state);
    expect(resumed.state.stats.settled).toBe(0); expect(resumed.state.heatCount).toBe(0); expect(resumed.state.history).toEqual([]);
  });
  it('une rouge termine immédiatement le service et annule toutes ses grises, même après reprise', () => {
    let red = false;
    const game = new Game(newGame(), () => {}, () => red ? 0 : 0.5); game.writable = true;
    game.startFactory(); game.advance(1, true, 'factory'); game.hitFactoryBall(1);
    expect(factoryReward(game.state.factory)).toBe(50); red = true; game.advance(700, true, 'factory');
    const id = game.state.factory.balls.find(ball => ball.kind === 'red')!.id;
    expect(game.hitFactoryBall(id)).toBe(true); expect(game.hitFactoryBall(id)).toBe(false);
    expect(game.state.factoryRemainingMs).toBe(0); expect(factoryReward(game.state.factory)).toBe(0);
    const resumed = new Game(parseSnapshot(JSON.stringify(game.state)), () => {}); resumed.writable = true;
    resumed.advance(60000, true, 'factory'); expect(resumed.state.walletCents).toBe(1900); expect(resumed.state.stats.factoryIncome).toBe(0);
    expect(resumed.state.factory.status).toBe('exploded'); resumed.startFactory(); expect(resumed.state.factory.greyHits).toBe(0);
  });
  it('pause du flux, billes expirées non cliquables et refus sans écriture', () => {
    const { game, fail } = setup(() => 0.5); game.startFactory(); game.advance(1, true, 'factory');
    const before = structuredClone(game.state); game.advance(7000, false, 'factory'); expect(game.state).toEqual(before);
    fail(true); expect(game.hitFactoryBall(1)).toBe(false); expect(game.state).toEqual(before);
    fail(false); game.retrySave(); game.advance(6500, true, 'factory');
    expect(game.hitFactoryBall(1)).toBe(false); expect(game.state.factory.balls.length).toBeLessThanOrEqual(10);
    game.writable = false; expect(game.hitFactoryBall(2)).toBe(false);
  });
  it('échec du versement : solde et score conservés, nouvelle tentative sans double salaire', () => {
    const { game, fail, snapshot } = setup(() => 0.5); game.startFactory(); game.advance(1000, true, 'factory'); game.hitFactoryBall(1);
    const before = structuredClone(game.state); fail(true); game.advance(59000, true, 'factory');
    expect(game.state).toEqual(before); expect(snapshot().walletCents).toBe(1900);
    fail(false); game.retrySave(); game.advance(59000, true, 'factory'); game.advance(59000, true, 'factory');
    expect(game.state.walletCents).toBe(1950); expect(game.state.stats.factoryIncome).toBe(50);
  });
  it('une explosion ne se publie qu’après sauvegarde et ne retire jamais l’ancien solde', () => {
    const { game, fail } = setup(() => 0); game.startFactory(); game.advance(1000, true, 'factory');
    const before = structuredClone(game.state), id = game.state.factory.balls[0].id;
    fail(true); expect(game.hitFactoryBall(id)).toBe(false); expect(game.state).toEqual(before);
    fail(false); game.retrySave(); expect(game.hitFactoryBall(id)).toBe(true);
    expect(game.state.walletCents).toBe(1900); expect(game.state.factoryRemainingMs).toBe(0);
    expect(parseSnapshot(JSON.stringify(game.state)).factory.status).toBe('exploded');
  });
  it('migration des anciennes sauvegardes : solde inchangé et ancien service terminé une fois', () => {
    const old = { ...newGame(), saveVersion: 1, factoryRemainingMs: 8000 } as Record<string, unknown>; delete old.factory;
    const migrated = parseSnapshot(JSON.stringify(old)); expect(migrated.saveVersion).toBe(6); expect(migrated.factory.legacy).toBe(true);
    const game = new Game(migrated, () => {}); game.writable = true;
    expect(game.hitFactoryBall(1)).toBe(false); game.advance(8000, true, 'factory');
    expect(game.state.walletCents).toBe(3400); expect(parseSnapshot(JSON.stringify(game.state))).toBeDefined();
    const resumed = new Game(game.state, () => {}); resumed.writable = true; resumed.advance(15000, true, 'factory');
    expect(resumed.state.walletCents).toBe(3400); resumed.startFactory(); expect(resumed.state.factory.legacy).toBe(false); expect(resumed.state.factoryRemainingMs).toBe(60000);
    old.factoryRemainingMs = 20000; expect(() => parseSnapshot(JSON.stringify(old))).toThrow();
  });
  it('refuse les états usine incohérents sans remplacer la partie', () => {
    const { game } = setup(() => 0.5); game.startFactory(); game.advance(1000, true, 'factory');
    const before = structuredClone(game.state);
    const mutations: ((s: GameState) => void)[] = [
      s => { s.factory.greyHits = 999; }, s => { s.factory.balls.push(s.factory.balls[0]); },
      s => { s.factory.balls[0].ageMs++; }, s => { s.factory.balls[0].lane = 5; },
      s => { s.factory.status = 'success'; }, s => { s.factory.legacy = true; },
      s => { s.factory.nextId++; }, s => { s.factory.spawnInMs++; },
      s => { s.stats.factoryIncome = 1; s.walletCents++; },
    ];
    for (const mutate of mutations) { const candidate = structuredClone(before); mutate(candidate); expect(() => parseSnapshot(JSON.stringify(candidate))).toThrow(); }
    expect(game.state).toEqual(before);
  });
});

describe('Événements du tapis d’usine', () => {
  function eventGame() {
    const context = setup(() => 0.5); context.game.startFactory();
    context.game.state.factory.events = [
      { kind: 'overdrive', startsAtMs: 12000 }, { kind: 'delivery', startsAtMs: 28000 }, { kind: 'slowdown', startsAtMs: 44000 },
    ];
    return context;
  }
  it('annonce la surcadence deux secondes avant, double vraiment vitesse et arrivées, puis revient au rythme normal', () => {
    const { game } = eventGame();
    game.advance(9999, true, 'factory'); expect(factoryEventAt(game.state.factory, 9999)).toBeUndefined();
    game.advance(1, true, 'factory'); expect(factoryEventAt(game.state.factory, 10000)).toMatchObject({ kind: 'overdrive', warning: true, remainingMs: 2000 });
    game.advance(1999, true, 'factory'); const first = structuredClone(game.state.factory.balls.at(-1)!);
    game.advance(1, true, 'factory');
    expect(game.state.factory.balls.find(ball => ball.id === first.id)!.ageMs - first.ageMs).toBe(1);
    expect(factoryEventAt(game.state.factory, 12000)).toMatchObject({ kind: 'overdrive', warning: false, remainingMs: 7000 });
    const before = structuredClone(game.state.factory); game.advance(700, true, 'factory');
    expect(game.state.factory.balls.find(ball => ball.id === first.id)!.ageMs - before.balls.find(ball => ball.id === first.id)!.ageMs).toBe(1400);
    expect(game.state.factory.nextId - before.nextId).toBe(2);
    game.advance(6300, true, 'factory'); expect(factoryEventAt(game.state.factory, 19000)).toBeUndefined();
    const ball = structuredClone(game.state.factory.balls.at(-1)!); game.advance(700, true, 'factory');
    expect(game.state.factory.balls.find(item => item.id === ball.id)!.ageMs - ball.ageMs).toBe(700);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
  });
  it('arrivage massif double seulement les arrivées ; ralentissement divise aussi le déplacement par deux', () => {
    const { game } = eventGame(); game.advance(28000, true, 'factory');
    const before = structuredClone(game.state.factory), id = before.balls.at(-1)!.id;
    game.advance(700, true, 'factory'); expect(game.state.factory.nextId - before.nextId).toBe(2);
    expect(game.state.factory.balls.find(ball => ball.id === id)!.ageMs - before.balls.at(-1)!.ageMs).toBe(700);
    game.advance(15300, true, 'factory'); const slow = structuredClone(game.state.factory), slowId = slow.balls.at(-1)!.id;
    game.advance(1400, true, 'factory'); expect(game.state.factory.nextId - slow.nextId).toBe(1);
    expect(game.state.factory.balls.find(ball => ball.id === slowId)!.ageMs - slow.balls.at(-1)!.ageMs).toBe(700);
    expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
    expect(game.state.walletCents).toBe(1900); expect(game.state.stats.factoryIncome).toBe(0); expect(game.state.heatCount).toBe(0);
  });
  it('même flux à grandes ou petites étapes, sans perte aux frontières des événements', () => {
    const { game: large } = eventGame(), { game: small } = eventGame();
    for (const elapsed of [10001, 12001, 19001, 28001, 35001, 44001, 51001, 59001]) {
      large.advance(elapsed - (60000 - large.state.factoryRemainingMs), true, 'factory');
      while (60000 - small.state.factoryRemainingMs < elapsed) small.advance(Math.min(17, elapsed - (60000 - small.state.factoryRemainingMs)), true, 'factory');
      expect(small.state.factory).toEqual(large.state.factory);
      expect(parseSnapshot(JSON.stringify(large.state)).factory).toEqual(large.state.factory);
    }
  });
  it('répartit un arrivage dense entre les couloirs sans superposer les billes ni changer leur type', () => {
    const { game } = eventGame(); game.advance(30000, true, 'factory');
    for (let i = 0; i < 250; i++) {
      const balls = game.state.factory.balls;
      for (let j = 0; j < balls.length; j++) for (let k = j+1; k < balls.length; k++) {
        if (balls[j].lane === balls[k].lane) expect(Math.abs(balls[j].ageMs - balls[k].ageMs)).toBeGreaterThanOrEqual(600);
      }
      expect(balls.every(ball => ball.kind === 'grey')).toBe(true); game.advance(17, true, 'factory');
    }
    expect(game.state.factory.balls.some(ball => ball.lane !== 2)).toBe(true);
  });
  it('pause et reprise gardent événement, annonce, score et positions sans nouveau tirage', () => {
    const { game, snapshot } = eventGame(); game.advance(12501, true, 'factory');
    const id = game.state.factory.balls.find(ball => ball.kind === 'grey')!.id; game.hitFactoryBall(id);
    const before = structuredClone(game.state); game.advance(60000, false, 'factory'); expect(game.state).toEqual(before);
    const resumed = new Game(parseSnapshot(JSON.stringify(snapshot())), () => {}, () => 0.5); resumed.writable = true;
    expect(resumed.state.factory).toEqual(before.factory); expect(resumed.hitFactoryBall(id)).toBe(false);
    game.advance(45001, true, 'factory'); resumed.advance(45001, true, 'factory'); expect(resumed.state.factory).toEqual(game.state.factory);
    resumed.advance(60000, true, 'factory'); expect(resumed.state.walletCents).toBe(1950); expect(resumed.state.stats.factoryIncome).toBe(50);
  });
  it('migre un service du format 2 sans lui ajouter un événement en cours de route', () => {
    const { game } = setup(() => 0.5); game.startFactory(); game.state.factory.events = []; game.advance(17001, true, 'factory'); game.hitFactoryBall(game.state.factory.balls[0].id);
    const previous = JSON.parse(JSON.stringify(game.state)); previous.saveVersion = 2; delete previous.factory.events;
    const migrated = parseSnapshot(JSON.stringify(previous)); expect(migrated.saveVersion).toBe(6); expect(migrated.factory.events).toEqual([]);
    expect(migrated.walletCents).toBe(game.state.walletCents); expect(migrated.factory.greyHits).toBe(1); expect(migrated.factory.balls).toEqual(game.state.factory.balls);
    const resumed = new Game(migrated, () => {}, () => 0.5); resumed.writable = true; resumed.advance(migrated.factoryRemainingMs, true, 'factory');
    expect(resumed.state.walletCents).toBe(1950); resumed.startFactory(); expect(resumed.state.factory.events).toHaveLength(3);
  });
  it('programme trois événements distincts, sans chevauchement, et refuse les programmes invalides', () => {
    for (const random of [0, 0.2, 0.5, 0.999999]) {
      const { game } = setup(() => random); game.startFactory();
      expect(new Set(game.state.factory.events.map(event => event.kind))).toEqual(new Set(['overdrive', 'delivery', 'slowdown']));
      expect(parseSnapshot(JSON.stringify(game.state))).toEqual(game.state);
    }
    const { game } = eventGame(); game.advance(10000, true, 'factory'); const before = structuredClone(game.state);
    const mutations: ((s: GameState) => void)[] = [
      s => { s.factory.events[0].startsAtMs = 0; }, s => { s.factory.events[1].startsAtMs = 14000; },
      s => { s.factory.events[1].kind = s.factory.events[0].kind; }, s => { s.factory.events.pop(); },
      s => { (s.factory.events[0] as { kind: string }).kind = 'inconnu'; },
      s => { s.factory.events[0].startsAtMs += 0.5; },
    ];
    for (const mutate of mutations) { const candidate = structuredClone(before); mutate(candidate); expect(() => parseSnapshot(JSON.stringify(candidate))).toThrow(); }
    expect(factoryClock(before.factory.events, 12000, 'belt')).toBe(12000);
  });
});

describe('Navigation indépendante de la production', () => {
  it('garde l’accès privé fermé sans autorisation et contourne le comptoir avant la porte', () => {
    const nav = new AzurNavigation(); expect(nav.go('backroom')).toBe(false); expect(nav.view).toBe('entrance');
    expect(nav.go('backroom', true)).toBe(true); expect(nav.go('backroom', true)).toBe(false);
    let previous = nav.pose.position;
    for (let i = 0; i < 400 && nav.moving; i++) {
      nav.advance(20); const p = nav.pose.position;
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true); expect(p.y).toBe(1.68);
      if (p.z < 0.5 && p.z > -1.15) expect(p.x).toBeGreaterThan(1.85);
      if (p.z < -4.1 && p.z > -4.65) { expect(nav.door).toBe(1); expect(p.x).toBeCloseTo(AZUR.door.x, 5); }
      expect(Math.hypot(p.x - previous.x, p.z - previous.z)).toBeLessThan(0.075); previous = p;
    }
    expect(nav.moving).toBe(false); expect(nav.pose).toEqual(AZUR_POSES.backroom);
  });
  it('déverrouille avant le coulissement et refuse les commandes pendant le mouvement', () => {
    const nav = new AzurNavigation(); nav.go('backroom', true); nav.advance(0, true);
    expect(nav.go('workshop', false)).toBe(false); expect(nav.go('discovery', false)).toBe(false);
    nav.go('discovery', true); nav.advance(175);
    expect(nav.latch).toBeCloseTo(0.5); expect(nav.shelf).toBe(0); expect(nav.go('discovery', true)).toBe(false);
    nav.advance(175); expect(nav.latch).toBe(1); expect(nav.shelf).toBe(0);
    nav.advance(800); expect(nav.shelf).toBeCloseTo(0.5); expect(nav.pose.position).toEqual(AZUR_POSES.backroom.position);
    nav.advance(2600); expect(nav.secretOpen).toBe(true); expect(nav.view).toBe('discovery'); expect(nav.moving).toBe(false);
    nav.advance(60000); expect(nav.view).toBe('discovery');
    expect(nav.go('workshop', false)).toBe(false); expect(nav.go('workshop', true)).toBe(true);
  });
  it('enchaîne tout le trajet vers l’atelier en une commande depuis chaque cadrage public', () => {
    for (const view of ['entrance', 'counter', 'devis'] as const) {
      const nav = new AzurNavigation(); if (view !== 'entrance') { nav.go(view); nav.advance(0, true); }
      const before = structuredClone(nav.pose); expect(nav.go('workshop')).toBe(false); expect(nav.pose).toEqual(before);
      expect(nav.go('workshop', true)).toBe(true); let previous = nav.pose.position;
      let unlocked = false, opened = false, crossed = false, elapsed = 0;
      while (nav.moving && elapsed < 20000) {
        expect(nav.go('workshop', true)).toBe(false); expect(nav.go('entrance', true)).toBe(false);
        nav.advance(20); elapsed += 20; const p = nav.pose.position;
        expect(p.y).toBe(AZUR.eyeHeight); expect(Math.hypot(p.x - previous.x, p.z - previous.z)).toBeLessThan(0.09);
        if (nav.latch === 1) unlocked = true;
        if (nav.shelf > 0) { expect(unlocked).toBe(true); opened = true; }
        if (p.z < -4.2 && p.z > -4.6) expect(nav.door).toBe(1);
        if (p.z < AZUR.passage.start && p.z > AZUR.passage.end) {
          expect(nav.shelf).toBe(1); expect(p.x).toBeGreaterThan(AZUR.passage.left + 0.2); expect(p.x).toBeLessThan(AZUR.passage.right - 0.2); crossed = true;
        }
        previous = p;
      }
      expect([unlocked, opened, crossed]).toEqual([true, true, true]); expect(nav.moving).toBe(false); expect(nav.pose).toEqual(AZUR_POSES.workshop);
      expect(elapsed).toBeLessThan(16000);
    }
  });
  it('revient directement à la boutique, réentre par le passage ouvert et réduit le trajet entier', () => {
    const nav = new AzurNavigation(); nav.go('workshop', true); nav.advance(0, true);
    expect(nav.pose).toEqual(AZUR_POSES.workshop); expect(nav.secretOpen).toBe(true);
    nav.go('prototypes', true); nav.advance(0, true); expect(nav.go('entrance', true)).toBe(true);
    while (nav.moving) { nav.advance(20); if (nav.pose.position.z < -4.4) expect(nav.door).toBe(1); }
    expect(nav.pose).toEqual(AZUR_POSES.entrance); expect(nav.door).toBe(0);
    expect(nav.go('workshop', true)).toBe(true); nav.advance(0, true); expect(nav.pose).toEqual(AZUR_POSES.workshop);
    expect(nav.go('entrance', true)).toBe(true); nav.advance(0, true); expect(nav.pose).toEqual(AZUR_POSES.entrance);
    nav.reset(); expect(nav.shelf + nav.door + nav.latch).toBe(0); expect(nav.moving).toBe(false);
  });
  it('parcourt le vrai couloir, garde sa hauteur et revient par le passage ouvert', () => {
    const nav = new AzurNavigation(); nav.go('backroom', true); nav.advance(0, true); nav.go('discovery', true); nav.advance(0, true);
    const check = () => {
      const p = nav.pose.position; expect(p.y).toBe(AZUR.eyeHeight);
      if (p.z > AZUR.passage.end && p.z < AZUR.passage.start) {
        expect(nav.shelf).toBe(1); expect(p.x).toBeGreaterThan(AZUR.passage.left + 0.2); expect(p.x).toBeLessThan(AZUR.passage.right - 0.2);
      }
    };
    nav.go('workshop', true); while (nav.moving) { nav.advance(20); check(); }
    for (const view of ['machine', 'plans', 'prototypes', 'duplicator', 'workshop'] as const) {
      expect(nav.go(view, true)).toBe(true); while (nav.moving) { nav.advance(20); check(); }
      expect(nav.pose).toEqual(AZUR_POSES[view]);
    }
    nav.go('backroom', true); while (nav.moving) { nav.advance(20); check(); }
    nav.go('entrance', true); while (nav.moving) { nav.advance(20); if (nav.pose.position.z < -4.1) expect(nav.door).toBe(1); }
    expect(nav.pose).toEqual(AZUR_POSES.entrance); expect(nav.door).toBe(0);
  });
  it('réduit tous les trajets sans mouvement intermédiaire et remet les mécanismes à zéro pour une nouvelle visite', () => {
    const nav = new AzurNavigation(); nav.go('backroom', true); nav.advance(0, true); nav.go('discovery', true); nav.advance(0, true);
    expect(nav.secretOpen).toBe(true); nav.go('workshop', true); nav.advance(0, true); expect(nav.pose).toEqual(AZUR_POSES.workshop);
    nav.reset(); expect(nav.pose).toEqual(AZUR_POSES.entrance); expect(nav.door + nav.shelf + nav.latch).toBe(0); expect(nav.moving).toBe(false);
  });
  it('autorise la visite publique après la rencontre et revient aux destinations sans lancer de service', () => {
    const exit = new Departure(), origin = { position: { x: 0, y: 1, z: 20 }, lookAt: { x: 0, y: 1, z: 0 } };
    expect(exit.visitAzur(true)).toBe(false);
    exit.begin(origin, true); exit.advance(1000);
    expect(exit.visitAzur(false)).toBe(false); expect(exit.phase).toBe('destinations');
    expect(exit.visitAzur(true)).toBe(true); expect(exit.opaque).toBe(true); expect(exit.inCave).toBe(false);
    exit.advance(60000); exit.work(); expect(exit.phase).toBe('shop');
    expect(exit.returnToCave(origin, true)).toBe(false);
    exit.finishVisit(); expect(exit.phase).toBe('destinations');
    expect(exit.returnToCave(origin, true)).toBe(true); exit.advance(1000); expect(exit.inCave).toBe(true);
  });
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

describe('Départ par l’escalier et horloges séparées', () => {
  const origin = { position: { x: 2.5, y: 1, z: 25 }, lookAt: { x: 0.4, y: -0.05, z: 0 } };
  it('un trajet unique, pause masquée, noir complet avant destinations et retour inverse', () => {
    const exit = new Departure(); expect(exit.begin(origin, false)).toBe(true);
    exit.advance(3000); const midway = exit.camera;
    expect(exit.begin(origin, false)).toBe(false);
    exit.advance(1000, false); expect(exit.camera).toEqual(midway);
    exit.advance(3000); expect(exit.phase).toBe('ascending'); expect(exit.opacity).toBe(0);
    exit.advance(200); expect(exit.opacity).toBeCloseTo(0.5); expect(exit.opaque).toBe(false);
    exit.advance(200); expect(exit.phase).toBe('destinations'); expect(exit.opacity).toBe(1);
    exit.advance(90000); expect(exit.phase).toBe('destinations');
    expect(exit.returnToCave(origin, false)).toBe(true); expect(exit.opacity).toBe(1);
    expect(exit.returnToCave(origin, false)).toBe(false);
    exit.advance(400); expect(exit.opacity).toBe(0); expect(exit.camera!.position.y).toBeCloseTo(15.47);
    exit.advance(3400); expect(exit.camera!.position.x).toBeCloseTo(STAIRS.x); expect(exit.camera!.position.y).toBeCloseTo(origin.position.y); expect(exit.camera!.position.z).toBeCloseTo(8.15);
    exit.advance(CONFIG.stairReturnApproach); expect(exit.inCave).toBe(true); expect(exit.camera).toBeUndefined();
  });
  it('garde la hauteur de Plinko pendant l’approche et la même stature jusqu’au palier', () => {
    for (const y of [1, 1.5]) {
      const start = { ...origin, position: { ...origin.position, y } };
      const exit = new Departure(); exit.begin(start, false);
      for (let ms = 0; ms < 2600; ms += 20) {
        expect(exit.camera!.position.y).toBeCloseTo(y, 8); exit.advance(20);
      }
      const eyeHeight = y + 7.7;
      let previousY = y;
      for (let ms = 2600; ms < 6000; ms += 20) {
        const position = exit.camera!.position;
        expect(position.y).toBeGreaterThanOrEqual(previousY - 1e-8);
        previousY = position.y; exit.advance(20);
      }
      expect(exit.camera!.position.y - 6.77).toBeCloseTo(eyeHeight, 8);
      expect(exit.camera!.position.z).toBeCloseTo(-1.3, 8);
    }
  });
  it('mouvement réduit par fondu sans déplacement, reprise de service et aucune sélection automatique', () => {
    const exit = new Departure(); exit.begin(origin, true); exit.advance(150);
    expect(exit.camera).toBeUndefined(); expect(exit.opacity).toBeCloseTo(0.5);
    exit.advance(150); expect(exit.phase).toBe('destinations');
    exit.work(); expect(exit.phase).toBe('working'); expect(exit.returnToCave(origin, true)).toBe(false);
    exit.finishWork(); exit.returnToCave(origin, true); exit.advance(300); expect(exit.inCave).toBe(true);
    exit.resumeService(); expect(exit.phase).toBe('working'); expect(exit.opacity).toBe(1);
  });
  it('découvre l’atelier arrière puis retrouve la machine sans saut du regard', () => {
    const exit = new Departure(); exit.begin(origin, false);
    exit.advance(CONFIG.stairApproach + CONFIG.stairClimb + CONFIG.exitFade);
    exit.returnToCave(origin, false); exit.advance(CONFIG.exitFade);
    const direction = (pose: NonNullable<typeof exit.camera>) => {
      const x = pose.lookAt.x - pose.position.x, y = pose.lookAt.y - pose.position.y, z = pose.lookAt.z - pose.position.z;
      const length = Math.hypot(x, y, z); return { x: x / length, y: y / length, z: z / length };
    };
    let previousDirection = direction(exit.camera!), maxRotation = 0;
    for (let elapsed = 20; elapsed < CONFIG.stairClimb + CONFIG.stairReturnApproach; elapsed += 20) {
      exit.advance(20); const pose = exit.camera!, current = direction(pose);
      maxRotation = Math.max(maxRotation, Math.acos(Math.min(1, previousDirection.x * current.x + previousDirection.y * current.y + previousDirection.z * current.z)));
      if (elapsed === CONFIG.stairClimb) expect(current.z).toBeGreaterThan(0.8);
      if (elapsed >= CONFIG.stairClimb + CONFIG.stairReturnRevealDelay + CONFIG.stairReturnReveal) {
        // Après la découverte de l'atelier arrière, la machine redevient le repère stable.
        const target = direction({ position: pose.position, lookAt: origin.lookAt });
        expect(current.x * target.x + current.y * target.y + current.z * target.z).toBeGreaterThan(0.999999);
      }
      previousDirection = current;
    }
    expect(maxRotation).toBeLessThan(0.055);
    const final = direction(origin);
    expect(previousDirection.x * final.x + previousDirection.y * final.y + previousDirection.z * final.z).toBeGreaterThan(0.999999);
    exit.advance(20); expect(exit.inCave).toBe(true);
  });
  it('seule l’horloge du service avance ; salaire unique, sans consommation du bonus ni de la cadence', () => {
    const { game } = atelier(); game.state.bonusRemainingMs = 7200; game.state.manualCooldownMs = 400;
    game.toggleAuto(); game.stopAuto(); game.startFactory();
    game.advance(5000, false, 'factory'); expect(game.state.factoryRemainingMs).toBe(60000);
    game.advance(59000, true, 'factory'); expect(game.state.factoryRemainingMs).toBe(1000);
    game.hitFactoryBall(game.state.factory.balls.find(ball => ball.kind === 'grey')!.id);
    expect(game.state.bonusRemainingMs).toBe(7200); expect(game.state.manualCooldownMs).toBe(400);
    const wallet = game.state.walletCents; game.advance(1000, true, 'factory'); game.advance(20000, true, 'factory');
    expect(game.state.walletCents).toBe(wallet + 50); expect(game.state.stats.factoryIncome).toBe(50);
    expect(game.state.bonusRemainingMs).toBe(7200); expect(game.state.manualCooldownMs).toBe(400);
    expect(game.state.pendingBalls).toHaveLength(0); expect(game.autoEnabled).toBe(false);
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
    const loss = [...counts].filter(([multiplier]) => multiplier < 100).reduce((sum, [, count]) => sum + count, 0);
    const profit = [...counts].filter(([multiplier]) => multiplier > 100).reduce((sum, [, count]) => sum + count, 0);
    const returns = [...counts].reduce((sum, [multiplier, count]) => sum + multiplier * count, 0);
    expect(loss).toBe(840); expect(counts.get(100)).toBe(100); expect(profit).toBe(60);
    expect(returns).toBe(59750); // 100 000 centièmes de mises, 59 750 de retours : perte nette 40 250.
    let call = 0; expect(drawOutcome(() => call++ === 0 ? 0.999999 : 0).exit).toBe(0);
    expect(drawOutcome(() => 0.999999).exit).toBe(14);
    expect(() => drawOutcome(() => 1)).toThrow();
  });
  it('applique les mêmes nouveaux poids au manuel et au Doigt, sans effet du solde ou des pertes passées', () => {
    const base = atelier().game.state;
    const losing = new Game(base, () => {}, () => 0); losing.writable = true;
    for (let i = 0; i < 10; i++) { losing.settle(losing.launch()!.id); losing.advance(500); }
    for (let ticket = 0; ticket < 1000; ticket++) {
      const launch = (origin: 'manual' | 'auto', wallet: number, state = base) => {
        let call = 0;
        const game = new Game({ ...structuredClone(state), walletCents: wallet }, () => {}, () => call++ === 0 ? (ticket + 0.1) / 1000 : 0.75);
        game.writable = true; game.autoEnabled = true; return game.launch(origin)!;
      };
      const manual = launch('manual', 100), rich = launch('manual', 100000), auto = launch('auto', 0);
      const afterLosses = launch('manual', losing.state.walletCents, losing.state);
      expect([manual.multiplier, manual.exit, manual.returnCents]).toEqual([auto.multiplier, auto.exit, auto.returnCents]);
      expect([manual.multiplier, manual.exit, manual.returnCents]).toEqual([rich.multiplier, rich.exit, rich.returnCents]);
      expect([manual.multiplier, manual.exit, manual.returnCents]).toEqual([afterLosses.multiplier, afterLosses.exit, afterLosses.returnCents]);
      expect(manual.betCents).toBe(100); expect(auto.betCents).toBe(0);
    }
  });
  it('les 15 trajectoires atteignent leur sortie sans traverser les picots', () => {
    const pins = pinPositions();
    for (let exit = 0; exit < 15; exit++) for (const seed of [0, 0.19, 0.38, 0.71, 0.999999]) for (const reduced of [false, true]) {
      const path = pathToExit(exit, () => seed);
      expect(path.at(-1)!.x).toBeCloseTo((exit - 7) * BOARD.spacingX, 8);
      const end = samplePath(path, 1); expect(end).toEqual(path.at(-1));
      expect(path).toHaveLength(17);
      expect(path[0].y + BOARD.ballRadius).toBeLessThan(5.2); // Dégagement sous le fronton.
      expect(Math.abs(path[0].x) + BOARD.ballRadius).toBeLessThan(0.2); // Ouverture du distributeur.
      let closest = Infinity, maxEdge = 0, maxDivider = 0;
      for (let i = 0; i <= 1000; i++) {
        const point = samplePath(path, i / 1000, reduced);
        maxEdge = Math.max(maxEdge, Math.abs(point.x) + BOARD.ballRadius);
        if (point.y - BOARD.ballRadius <= BOARD.dividerTop) {
          // La bille doit être dans le couloir avant de descendre entre ses deux cloisons.
          maxDivider = Math.max(maxDivider, Math.abs(point.x - (exit - 7) * BOARD.spacingX) + BOARD.ballRadius);
        }
        for (const pin of pins) {
          const distance = Math.hypot(point.x - pin.x, point.y - pin.y);
          closest = Math.min(closest, distance);
        }
      }
      expect(closest).toBeGreaterThan(BOARD.ballRadius + BOARD.pinRadius);
      expect(maxEdge).toBeLessThan(BOARD.halfWidth - 0.065);
      expect(maxDivider).toBeLessThan(BOARD.spacingX / 2 - 0.0225);
      for (let row = 0; row < BOARD.rows; row++) {
        const point = samplePath(path, (row + 1) / 16, reduced);
        const nearest = Math.min(...pins.map(pin => Math.hypot(point.x - pin.x, point.y - pin.y)));
        expect(nearest - BOARD.ballRadius - BOARD.pinRadius).toBeLessThan(0.006);
      }
      expect(contactStep(1)).toBe(14);
    }
  });
});
