import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Game } from '../src/game/engine';
import { newGame } from '../src/game/state';
import { EXITS, OUTCOMES } from '../src/config';
test.setTimeout(90000); // Plusieurs démarrages WebGL sous rendu logiciel peuvent dépasser 45 s.

function equippedGame() {
  const game = new Game(newGame(), () => {}, () => 0.999); game.writable = true;
  for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
  game.buy('azur.initial_repair'); game.buy('azur.auto_launcher'); game.buy('azur.accounting_tray');
  game.setPreferences({ reducedMotion: true, quality: 'low' }); return game;
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!));
async function ready(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'plinko');
}
async function view(page: Page, key: string, name: string) {
  await page.keyboard.press(key); await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', name);
}
async function focus(page: Page, action: string) {
  await page.locator('#scene canvas').focus();
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    if (await page.locator('#scene').getAttribute('data-focused-action') === action) return;
  }
  throw new Error(`Objet non accessible au clavier : ${action}; focus=${await page.locator('#scene').getAttribute('data-focused-action')}`);
}
async function activate(page: Page, action: string) { await focus(page, action); await page.keyboard.press('Enter'); }
async function importFile(page: Page, json: string, valid = true) {
  await page.locator('#import-file').setInputFiles({ name: 'partie.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'reglages');
  await expect(page.locator('#accessibility-status')).toContainText(valid ? 'Fichier validé' : 'Import refusé');
}

test('scène plein écran sans HUD, objets accessibles, vol réconcilié une seule fois', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 720 }); await ready(page);
  expect(await page.locator('#scene').evaluate(el => [...el.children].map(x => x.tagName))).toEqual(['CANVAS']);
  expect(await page.locator('header:visible,footer:visible,aside:visible,dialog:visible,button:visible').count()).toBe(0);
  expect(await page.locator('#scene canvas').boundingBox()).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
  expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([1280, 720]);
  await page.mouse.move(1278, 718); await expect(page.locator('#scene')).toHaveAttribute('data-focused-action', '');
  await page.screenshot({ path: 'test-results/cave-sans-hud-1280.png' });
  await view(page, 'c', 'commandes'); await activate(page, 'bet-up');
  expect((await saved(page)).selectedBetCents).toBe(200);
  await activate(page, 'launch');
  const before = await saved(page), ball = before.pendingBalls[0]; expect(ball.betCents).toBe(200);
  await page.reload(); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  const resumed = await saved(page); expect(resumed.walletCents).toBe(1700 + ball.returnCents); expect(resumed.pendingBalls).toHaveLength(0);
  await page.reload(); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  expect((await saved(page)).walletCents).toBe(resumed.walletCents); expect((await saved(page)).history).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('boîtier physique : réglages, export, import refusé et remplacement confirmé', async ({ page }) => {
  await ready(page); await view(page, 'r', 'reglages');
  await activate(page, 'quality'); expect((await saved(page)).preferences.quality).toBe('low');
  const download = page.waitForEvent('download'); await activate(page, 'export'); expect((await download).suggestedFilename()).toBe('masterplinko-sauvegarde.json');
  await importFile(page, '{"saveVersion":99}', false);
  await expect(page.locator('#accessibility-status')).toContainText('Import refusé'); expect((await saved(page)).walletCents).toBe(1900);
  const game = equippedGame(); await importFile(page, JSON.stringify(game.state));
  expect((await saved(page)).walletCents).toBe(1900);
  await focus(page, 'confirm-import'); await page.screenshot({ path: 'test-results/import-physique.png' });
  await page.keyboard.press('Escape'); expect((await saved(page)).walletCents).toBe(1900);
  await importFile(page, JSON.stringify(game.state)); await activate(page, 'confirm-import');
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'plinko');
  await expect(page.locator('#scene')).toHaveAttribute('data-modules', 'auto_launcher,accounting_tray');
  expect((await saved(page)).walletCents).toBe(game.state.walletCents);
  await view(page, 'h', 'historique'); await activate(page, 'history-next');
  await page.mouse.move(1435, 995); await page.screenshot({ path: 'test-results/ticket-physique.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'plinko');
  const beforeFailure = await page.evaluate(() => localStorage.getItem('masterplinko.save'));
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); }; });
  await importFile(page, JSON.stringify(newGame())); await activate(page, 'confirm-import');
  await expect(page.locator('#scene')).toHaveAttribute('data-state', 'suspended');
  await expect(page.locator('#accessibility-status')).toContainText('Sauvegarde impossible');
  expect(await page.evaluate(() => localStorage.getItem('masterplinko.save'))).toBe(beforeFailure);
});

test('boîtier simplifié : annulation, export et suppression confirmée avec reprise saine', async ({ page }) => {
  const game = equippedGame();
  await page.addInitScript(state => { if (!localStorage.getItem('masterplinko.save')) localStorage.setItem('masterplinko.save', JSON.stringify(state)); }, game.state);
  await page.setViewportSize({ width: 1280, height: 720 }); await ready(page); await view(page, 'r', 'reglages');
  await page.evaluate(() => localStorage.setItem('autre-application', 'à garder'));
  await page.locator('#scene canvas').focus();
  const actions = new Set<string>();
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); actions.add((await page.locator('#scene').getAttribute('data-focused-action'))!); }
  expect([...actions]).toEqual(['sound', 'motion', 'quality', 'export', 'import', 'delete-save', 'plinko']);
  await page.mouse.move(1275, 715); await page.screenshot({ path: 'test-results/boitier-simplifie.png' });
  const before = await saved(page);
  await activate(page, 'delete-save'); await expect(page.locator('#accessibility-status')).toContainText('Supprimer la sauvegarde');
  expect(await saved(page)).toEqual(before);
  await page.keyboard.press('m'); await page.keyboard.press('s'); await page.keyboard.press('Space');
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'reglages'); expect(await saved(page)).toEqual(before);
  await page.keyboard.press('Escape'); await expect(page.locator('#accessibility-status')).toContainText('Suppression annulée');
  expect(await saved(page)).toEqual(before);
  await activate(page, 'delete-save'); await activate(page, 'cancel-delete'); expect(await saved(page)).toEqual(before);
  await activate(page, 'delete-save');
  const download = page.waitForEvent('download'); await activate(page, 'export'); await download;
  expect(await saved(page)).toEqual(before);
  await focus(page, 'confirm-delete'); await page.mouse.move(1275, 715); await page.screenshot({ path: 'test-results/suppression-confirmation.png' });
  await activate(page, 'confirm-delete'); await page.keyboard.press('Enter');
  await expect(page.locator('#accessibility-status')).toContainText('Nouvelle partie');
  const reset = await saved(page);
  expect(reset.walletCents).toBe(1900); expect(reset.upgrades).toEqual([]); expect(reset.history).toEqual([]); expect(reset.pendingBalls).toEqual([]);
  expect(reset.stats.factoryIncome).toBe(0); expect(reset.preferences).toEqual(before.preferences);
  expect(await page.evaluate(() => localStorage.getItem('autre-application'))).toBe('à garder');
  await page.reload(); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  expect((await saved(page)).walletCents).toBe(1900); expect((await saved(page)).upgrades).toEqual([]);
  await view(page, 'c', 'commandes'); await activate(page, 'launch'); const ball = (await saved(page)).pendingBalls[0];
  await expect.poll(async () => (await saved(page)).history.length, { timeout: 15000 }).toBe(1);
  expect((await saved(page)).walletCents).toBe(1800 + ball.returnCents);
});

test('suppression refusée par le stockage : ancienne partie conservée, annulation et récupération', async ({ page }) => {
  const game = equippedGame();
  await page.addInitScript(state => localStorage.setItem('masterplinko.save', JSON.stringify(state)), game.state);
  await ready(page); await view(page, 'r', 'reglages'); const before = await saved(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem; (window as any).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(key, value) { if (key === 'masterplinko.save') throw new DOMException('Quota', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await activate(page, 'delete-save'); await activate(page, 'confirm-delete');
  await expect(page.locator('#scene')).toHaveAttribute('data-state', 'suspended'); expect(await saved(page)).toEqual(before);
  await expect(page.locator('#accessibility-status')).toContainText('Sauvegarde impossible');
  await page.keyboard.press('Escape'); expect(await saved(page)).toEqual(before);
  await page.evaluate(() => (window as any).restoreStorage()); await activate(page, 'retry');
  await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready'); expect((await saved(page)).walletCents).toBe(before.walletCents);
});

test('suppression d’une sauvegarde incompatible : confirmation indispensable et refus dans le second onglet', async ({ page, context }) => {
  const unknown = '{"saveVersion":99,"note":"à conserver avant confirmation"}';
  await page.addInitScript(raw => { if (!localStorage.getItem('masterplinko.save')) localStorage.setItem('masterplinko.save', raw); }, unknown);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/'); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'suspended');
  await activate(page, 'delete-save'); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => localStorage.getItem('masterplinko.save'))).toBe(unknown);
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('#scene')).toHaveAttribute('data-state', 'waiting');
  const actions = new Set<string>();
  for (let i = 0; i < 5; i++) { await other.keyboard.press('Tab'); actions.add((await other.locator('#scene').getAttribute('data-focused-action'))!); }
  expect(actions.has('delete-save')).toBe(false); await other.close();
  await activate(page, 'delete-save'); await activate(page, 'confirm-delete'); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  expect((await saved(page)).walletCents).toBe(1900); expect((await saved(page)).saveVersion).toBe(3);
});

test('nouvelle partie : aucun ancien vol ne survit lorsque les identifiants recommencent', async ({ page }) => {
  await page.goto('/tests/render.html');
  const result = await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { PlinkoScene } = await import('/src/rendering/scene.ts');
    // @ts-expect-error module Vite de la fixture
    const { Navigation } = await import('/src/navigation/camera.ts');
    // @ts-expect-error module Vite de la fixture
    const { Game } = await import('/src/game/engine.ts');
    // @ts-expect-error module Vite de la fixture
    const { newGame } = await import('/src/game/state.ts');
    let random = 0;
    const model = new Game(newGame(), () => {}, () => random); model.writable = true;
    model.setPreferences({ quality: 'low', reducedMotion: true }); const old = model.launch();
    const scene = new PlinkoScene(document.getElementById('fixture')!, new Navigation(), () => {});
    scene.frame(model.state, 1900, true, () => false);
    model.resetProgress(); scene.resetFlights();
    const empty = scene.flights.size === 0; random = 0.999;
    const fresh = model.launch(); scene.frame(model.state, 0, true, () => false);
    const freshElapsed = scene.flights.get(fresh.id).elapsed;
    let arrival: any;
    scene.frame(model.state, 3600, true, (id: string) => {
      const p = scene.flights.get(id).mesh.position;
      arrival = { x: p.x, y: p.y, credit: model.settle(id).returnCents }; return true;
    });
    return { empty, sameId: old.id === fresh.id, differentExit: old.exit !== fresh.exit, freshElapsed, arrival, expectedX: (fresh.exit - 7) * 0.66, count: model.state.history.length };
  });
  expect(result).toMatchObject({ empty: true, sameId: true, differentExit: true, freshElapsed: 0, count: 1 });
  expect(result.arrival.x).toBeCloseTo(result.expectedX, 8); expect(result.arrival.credit).toBe(4000);
});

test('catalogue 3D : achat, pages et retours machine', async ({ page }) => {
  const game = equippedGame();
  // Une partie cohérente juste après la panne, avant les achats.
  const fresh = new Game(newGame(), () => {}, () => 0.999); fresh.writable = true;
  for (let i = 0; i < 2; i++) { fresh.settle(fresh.launch()!.id); fresh.advance(500); }
  fresh.setPreferences(game.state.preferences);
  await page.addInitScript(state => localStorage.setItem('masterplinko.save', JSON.stringify(state)), fresh.state);
  await ready(page); await view(page, 'a', 'azur'); await activate(page, 'catalogue');
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'catalogue');
  await activate(page, 'buy:azur.initial_repair'); expect((await saved(page)).repairPurchased).toBe(true);
  await activate(page, 'buy:azur.auto_launcher'); await activate(page, 'buy:azur.accounting_tray');
  expect((await saved(page)).upgrades).toHaveLength(3);
  await page.mouse.move(1435, 995); await page.screenshot({ path: 'test-results/catalogue-physique.png' });
  await activate(page, 'catalogue-page'); await page.mouse.move(1435, 995); await page.screenshot({ path: 'test-results/notes-physiques.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'plinko');
});

test('établi mural : catalogue et achats atteignables à la souris après rotation', async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 911 }]) {
    await page.setViewportSize(viewport); await page.goto('/tests/render.html');
    const result = await page.evaluate(async () => {
      // @ts-expect-error modules Vite de la fixture
      const { PlinkoScene } = await import('/src/rendering/scene.ts');
      // @ts-expect-error modules Vite de la fixture
      const { Navigation } = await import('/src/navigation/camera.ts');
      // @ts-expect-error modules Vite de la fixture
      const { newGame } = await import('/src/game/state.ts');
      const nav = new Navigation(), state = newGame(), actions: string[] = [];
      state.preferences.quality = 'low'; state.preferences.reducedMotion = true;
      state.repairTriggered = true; state.walletCents = 10000;
      const scene = new PlinkoScene(document.getElementById('fixture')!, nav, (action: string) => actions.push(action));
      scene.setInterface({ canWrite: true, autoEnabled: false, message: '', cataloguePage: 0, historyPage: 0 });
      scene.frame(state, 0, false, () => true);
      const canvas = document.querySelector('canvas')!, rect = canvas.getBoundingClientRect();
      const click = (action: string) => {
        const target = scene.clickTargets.find((object: any) => object.userData.action === action);
        const point = target.getWorldPosition(scene.camera.position.clone()).project(scene.camera);
        const before = actions.length;
        canvas.dispatchEvent(new MouseEvent('click', { clientX: (point.x + 1) * rect.width / 2, clientY: (1 - point.y) * rect.height / 2 }));
        return Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && actions.length === before + 1 && actions.at(-1) === action;
      };
      const fromMachine = click('catalogue');
      nav.go('azur', true); scene.frame(state, 0, false, () => true);
      const fromBench = click('catalogue'), direction = scene.camera.getWorldDirection(scene.camera.position.clone());
      nav.go('catalogue', true); scene.frame(state, 0, false, () => true);
      const normal = scene.camera.position.clone().set(0, 0, 1).transformDirection(scene.interfaces.catalogue.mesh.matrixWorld);
      const purchases = ['buy:azur.initial_repair', 'buy:azur.auto_launcher', 'buy:azur.accounting_tray'].map(click);
      return { fromMachine, fromBench, purchases, cameraFacesRight: direction.x > 0.9, pageFacesRoom: normal.x < -0.5 };
    });
    expect(result).toEqual({ fromMachine: true, fromBench: true, purchases: [true, true, true], cameraFacesRight: true, pageFacesRoom: true });
  }
});

test('escalier : trajet unique, clavier bloqué, destinations noires et descente sans reprise automatique', async ({ page }) => {
  const game = equippedGame(); game.setPreferences({ reducedMotion: false });
  await page.addInitScript(state => localStorage.setItem('masterplinko.save', JSON.stringify(state)), game.state);
  await ready(page); await activate(page, 'auto');
  await page.keyboard.press('s');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'ascending');
  await page.keyboard.press('s'); await page.keyboard.press('r'); await page.keyboard.press('Space');
  expect(await page.locator('#outside').isVisible()).toBe(false);
  const before = await saved(page);
  await expect(page.locator('#outside')).toBeVisible({ timeout: 16000 });
  expect(await page.locator('#departure-fade').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  expect(await page.locator('#outside button:visible').allTextContents()).toEqual(['Aller travailler à l’usine', 'Rendre visite à Azur', 'Redescendre dans la cave']);
  expect((await saved(page)).stats.launched).toBe(before.stats.launched);
  expect((await saved(page)).factoryRemainingMs).toBe(0);
  await page.waitForTimeout(1100); expect((await saved(page)).bonusRemainingMs).toBe(before.bonusRemainingMs);
  await page.screenshot({ path: 'test-results/destinations-noires.png' });
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Rendre visite à Azur' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Redescendre dans la cave' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'descending');
  await page.keyboard.press('s'); await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave', { timeout: 16000 });
  await page.waitForTimeout(2300); expect((await saved(page)).stats.launched).toBe(before.stats.launched);
  await focus(page, 'auto'); await expect(page.locator('#accessibility-status')).toContainText('Activer le Doigt');
});

test('départ refusé avec une bille, fondu réduit et service explicite repris sans double salaire', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => { Math.random = () => 0.5; });
  const game = equippedGame(); game.toggleAuto();
  while (!game.state.chargeReady) game.settle(game.launch('auto')!.id);
  game.activateBonus();
  await page.addInitScript(state => { if (!localStorage.getItem('masterplinko.save')) localStorage.setItem('masterplinko.save', JSON.stringify(state)); }, game.state);
  await ready(page); await activate(page, 'launch');
  await page.keyboard.press('s'); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  await expect(page.locator('#accessibility-status')).toContainText('Attendez');
  await expect.poll(async () => (await saved(page)).pendingBalls.length, { timeout: 15000 }).toBe(0);
  await page.keyboard.press('s'); await expect(page.locator('#outside')).toBeVisible();
  const paused = (await saved(page)).bonusRemainingMs;
  await page.waitForTimeout(1200); expect((await saved(page)).bonusRemainingMs).toBe(paused);
  expect((await saved(page)).factoryRemainingMs).toBe(0);
  const wallet = (await saved(page)).walletCents;
  await page.getByRole('button', { name: 'Aller travailler à l’usine' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'working');
  await expect(page.locator('#factory-scene canvas')).toBeVisible();
  await expect(page.locator('#factory-scene')).toHaveAttribute('data-round', 'active');
  expect((await saved(page)).factoryRemainingMs).toBeGreaterThan(58000);
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('#factory-scene')).toHaveAttribute('data-hits', '1');
  // Le lancement du service persiste le temps exact figé au départ, après le dernier checkpoint.
  const servicePaused = (await saved(page)).bonusRemainingMs;
  await expect(page.locator('#factory-time')).toContainText('s restantes');
  const hiddenTime = await page.locator('#factory-time').textContent();
  const hiddenSnapshot = await saved(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(1200);
  expect(await page.locator('#factory-time').textContent()).toBe(hiddenTime);
  expect((await saved(page)).factoryRemainingMs).toBe(hiddenSnapshot.factoryRemainingMs);
  await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.keyboard.press('Escape'); await page.keyboard.press('r'); await page.keyboard.press('Space');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'working');
  await page.screenshot({ path: 'test-results/usine-tri.png' });
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'working');
  await expect(page.locator('#factory-scene')).toHaveAttribute('data-hits', '1');
  expect((await saved(page)).walletCents).toBe(wallet);
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations', { timeout: 70000 });
  expect((await saved(page)).walletCents).toBe(wallet + 50); expect((await saved(page)).stats.factoryIncome).toBe(50);
  expect((await saved(page)).bonusRemainingMs).toBe(servicePaused);
  await page.waitForTimeout(1200); expect((await saved(page)).walletCents).toBe(wallet + 50);
  await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  await expect(page.locator('#outside')).not.toBeVisible();
});

test('boutique : visite masquée avant la rencontre, sans contournement par la destination', async ({ page }) => {
  await ready(page); await page.keyboard.press('s');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations', { timeout: 16000 });
  await expect(page.locator('[data-destination="azur"]')).toBeHidden();
  await page.locator('[data-destination="azur"]').dispatchEvent('click');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations');
  expect((await saved(page)).factoryRemainingMs).toBe(0);
  await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave', { timeout: 16000 });
});

test('boutique publique : visite explicite, objets au clavier, horloges figées et sauvegarde préservée', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const game = equippedGame();
  while (!game.state.chargeReady) game.settle(game.launch('manual')!.id), game.advance(500);
  game.activateBonus(); game.setPreferences({ quality: 'normal' });
  await page.addInitScript(state => { if (!localStorage.getItem('masterplinko.save')) localStorage.setItem('masterplinko.save', JSON.stringify(state)); }, game.state);
  await page.setViewportSize({ width: 1820, height: 864 }); await ready(page); await page.keyboard.press('s');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations');
  const before = await saved(page);
  await page.getByRole('button', { name: 'Rendre visite à Azur' }).click();
  const shop = page.locator('#shop-scene');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'shop');
  await expect(shop.locator('canvas')).toBeVisible({ timeout: 20000 }); await expect(shop).toHaveAttribute('data-view', 'entrance');
  await expect(shop.locator('canvas')).toBeFocused();
  expect(await page.locator('button:visible,h1:visible,#outside-message:visible').count()).toBe(0);
  expect(await shop.locator('canvas').boundingBox()).toEqual({ x: 0, y: 0, width: 1820, height: 864 });
  await page.mouse.move(1818, 862); await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/azur-boutique.png' });
  await shop.locator('canvas').focus();
  await page.keyboard.press('Shift+Tab'); await expect(shop).toHaveAttribute('data-focused-action', 'counter');
  async function shopFocus(action: string) {
    for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); if (await shop.getAttribute('data-focused-action') === action) return; }
    throw new Error(`Objet de boutique inaccessible : ${action}`);
  }
  await shopFocus('backroom'); await expect(page.locator('#shop-status')).toContainText('arrière-boutique');
  await page.keyboard.press('Enter'); await expect(shop).toHaveAttribute('data-view', 'backroom');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'shop'); expect(await saved(page)).toEqual(before);
  await page.keyboard.press('Escape'); await expect(shop).toHaveAttribute('data-view', 'entrance');
  await shopFocus('counter'); await page.keyboard.press('Enter');
  await expect(shop).toHaveAttribute('data-view', 'counter'); await expect(shop).toHaveAttribute('data-moving', 'false');
  await page.mouse.move(1818, 862); await page.screenshot({ path: 'test-results/azur-comptoir.png' });
  for (const key of ['m', 'r', 'a', '+', 's']) await page.keyboard.press(key);
  await page.waitForTimeout(1200); expect(await saved(page)).toEqual(before);
  await page.keyboard.press('Escape'); await expect(shop).toHaveAttribute('data-view', 'entrance');
  await page.setViewportSize({ width: 1280, height: 720 }); await page.mouse.move(1278, 718); await page.waitForTimeout(300);
  await expect(shop).toHaveAttribute('data-focused-action', '');
  await page.screenshot({ path: 'test-results/azur-boutique-compact.png' });
  await shopFocus('entrance'); await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations');
  expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: 'Rendre visite à Azur' }).click();
  await expect(shop).toHaveAttribute('data-view', 'entrance');
  await page.reload(); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  const resumed = await saved(page); expect(resumed.walletCents).toBe(before.walletCents); expect(resumed.upgrades).toEqual(before.upgrades);
  expect(resumed.history).toEqual(before.history); expect(resumed.saveVersion).toBe(3); expect(resumed.factoryRemainingMs).toBe(0);
  expect(errors).toEqual([]);
});

test('boutique 3D : clics occultés, porte fermée et déplacement à hauteur des yeux', async ({ page }) => {
  await page.goto('/tests/render.html');
  const result = await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { AzurShop } = await import('/src/rendering/shop.ts');
    const element = document.getElementById('fixture')!; let exits = 0;
    const shop = new AzurShop(element, () => {}, () => exits++);
    shop.reset(); shop.setActive(true, { reducedMotion: false, sound: false, quality: 'low' }); shop.frame(0);
    const runtime = shop as any;
    function clickAt(x: number, y: number, z: number, activate = false) {
      const point = runtime.camera.position.clone().set(x, y, z).project(runtime.camera);
      const rect = element.getBoundingClientRect();
      const clientX = rect.left + (point.x + 1) / 2 * rect.width, clientY = rect.top + (1 - point.y) / 2 * rect.height;
      const target = runtime.hit(clientX, clientY);
      if (activate) {
        runtime.renderer.domElement.dispatchEvent(new PointerEvent('pointermove', { clientX, clientY }));
        runtime.renderer.domElement.dispatchEvent(new MouseEvent('click', { clientX, clientY }));
      }
      return target;
    }
    const door = clickAt(1.55, 2.25, -4.18);
    const counter = clickAt(-0.9, 0.5, 0.3);
    const appliance = clickAt(-2.1, 1.4, -0.35);
    clickAt(1.55, 2.25, -4.18, true); const stayed = exits === 0;
    clickAt(-0.9, 0.5, 0.3, true);
    let minY = Infinity, maxY = -Infinity, minimumZ = Infinity;
    for (let i = 0; i < 25; i++) { shop.frame(20); minY = Math.min(minY, runtime.camera.position.y); maxY = Math.max(maxY, runtime.camera.position.y); minimumZ = Math.min(minimumZ, runtime.camera.position.z); }
    const counterView = element.dataset.view;
    shop.back(); shop.frame(500);
    clickAt(-4.94, 2.25, 1.3, true);
    return { door: door?.userData.action, counter: counter?.userData.action, appliance: appliance?.userData.action ?? null, stayed, counterView, minY, maxY, minimumZ, exits,
      connection: !!runtime.scene.getObjectByName('azur:backroom-connection'), noHud: [...element.children].every(child => child.tagName === 'CANVAS') };
  });
  expect(result).toEqual({ door: 'backroom', counter: 'counter', appliance: null, stayed: true, counterView: 'counter', minY: 1.68, maxY: 1.68, minimumZ: 2.1, exits: 1, connection: true, noHud: true });
});

test('atelier caché : réparation requise, radio, prototypes décoratifs et retour sans modifier la sauvegarde', async ({ page }) => {
  test.setTimeout(150000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const game = new Game(newGame(), () => {}, () => 0.999); game.writable = true;
  for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
  game.setPreferences({ reducedMotion: true, quality: 'low' });
  await page.addInitScript(state => { if (!localStorage.getItem('masterplinko.save')) localStorage.setItem('masterplinko.save', JSON.stringify(state)); }, game.state);
  await page.setViewportSize({ width: 1280, height: 720 }); await ready(page);
  const shop = page.locator('#shop-scene');
  async function visit() { await page.keyboard.press('s'); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations'); await page.locator('[data-destination="azur"]').click(); await expect(shop).toHaveAttribute('data-view', 'entrance'); await shop.locator('canvas').focus(); }
  async function shopAction(action: string) {
    for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); if (await shop.getAttribute('data-focused-action') === action) { await page.keyboard.press('Enter'); return; } }
    throw new Error(`Objet privé inaccessible : ${action}`);
  }
  await visit(); const locked = await saved(page);
  await shopAction('backroom'); await expect(shop).toHaveAttribute('data-view', 'entrance'); await expect(page.locator('#shop-status')).toContainText('réparation initiale'); expect(await saved(page)).toEqual(locked);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  await view(page, 'a', 'azur'); await activate(page, 'catalogue'); await activate(page, 'buy:azur.initial_repair');
  await page.keyboard.press('Escape'); await visit(); const before = await saved(page);
  expect(before.upgrades).toEqual(['azur.initial_repair']);
  await shopAction('backroom'); await expect(shop).toHaveAttribute('data-view', 'backroom'); await expect(shop).toHaveAttribute('data-secret', 'closed');
  await page.mouse.move(1278, 718); await page.screenshot({ path: 'test-results/azur-arriere-compact.png' });
  await shopAction('secret-switch'); await expect(shop).toHaveAttribute('data-secret', 'open'); await expect(shop).toHaveAttribute('data-view', 'discovery');
  await shopAction('enter-workshop'); await expect(shop).toHaveAttribute('data-view', 'workshop');
  for (const action of ['machine', 'prototypes', 'duplicator']) {
    await shopAction(action); await expect(shop).toHaveAttribute('data-view', action); expect(await saved(page)).toEqual(before);
    await shopAction(action); await expect(shop).toHaveAttribute('data-view', 'workshop');
  }
  await shopAction('return-backroom'); await expect(shop).toHaveAttribute('data-view', 'backroom'); await expect(shop).toHaveAttribute('data-secret', 'open');
  await shopAction('secret-switch'); await expect(page.locator('#shop-status')).toContainText('déjà ouvert');
  await shopAction('return-shop'); await expect(shop).toHaveAttribute('data-view', 'entrance'); expect(await saved(page)).toEqual(before);
  await page.keyboard.press('Escape'); await page.locator('[data-destination="azur"]').click(); await expect(shop).toHaveAttribute('data-secret', 'closed');
  await shopAction('backroom'); await shopAction('secret-switch'); await shopAction('enter-workshop');
  await page.reload(); await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready'); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  const resumed = await saved(page); expect(resumed.walletCents).toBe(before.walletCents); expect(resumed.upgrades).toEqual(before.upgrades); expect(resumed.history).toEqual(before.history); expect(resumed.saveVersion).toBe(3);
  expect(errors).toEqual([]);
});

test('atelier 3D : continuité réelle, mécanisme dégagé, clics uniques et prototypes masqués depuis la boutique', async ({ page }) => {
  test.setTimeout(150000); await page.goto('/tests/render.html');
  const result = await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { AzurShop } = await import('/src/rendering/shop.ts');
    // @ts-expect-error module Vite de la fixture
    const { AZUR_POSES } = await import('/src/navigation/shop.ts');
    const element = document.getElementById('fixture')!; const shop = new AzurShop(element, () => {}, () => {}); const runtime = shop as any;
    shop.setPrivateAccess(true); shop.setActive(true, { reducedMotion: false, sound: false, quality: 'low' }); shop.frame(0);
    const ray = runtime.ray, v = runtime.camera.position.clone(), direction = v.clone();
    function nearest(from: any, toward: any, limit = Infinity) {
      ray.set(from, toward.clone().sub(from).normalize()); ray.far = limit;
      const hit = ray.intersectObjects(runtime.root.children, true).find((hit: any) => hit.object.isMesh && !hit.object.material.transparent);
      ray.far = Infinity; return hit;
    }
    const originalRender = runtime.renderer.render.bind(runtime.renderer); runtime.renderer.render = () => {};
    const collisions: string[] = []; let minDoorClearance = Infinity, minShelfClearance = Infinity;
    function sample() {
      runtime.scene.updateMatrixWorld(true);
      const p = runtime.camera.position;
      for (const y of [1.68, 0.85]) for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        v.set(p.x, y, p.z); direction.set(p.x + x, y, p.z + z);
        if (nearest(v, direction, 0.16)) collisions.push(`${runtime.view}:${p.x.toFixed(2)},${p.z.toFixed(2)}`);
      }
      if (p.z < -4.2 && p.z > -4.6) minDoorClearance = Math.min(minDoorClearance, p.x - 1.02, 2.165 - p.x);
    }
    function walk(view: string) {
      runtime.go(view); let count = 0;
      while (runtime.journey.moving && count++ < 250) { shop.frame(80); sample(); }
      if (runtime.journey.moving) throw new Error('Trajet non terminé');
    }
    walk('backroom');
    const radio = runtime.targets.find((o: any) => o.userData.action === 'secret-switch');
    runtime.act(radio); runtime.act(radio); const queued = runtime.journey.view === 'discovery';
    while (runtime.journey.moving) {
      shop.frame(80); sample();
      const box = new runtime.highlight.box.constructor().setFromObject(runtime.workshop.shelf);
      minShelfClearance = Math.min(minShelfClearance, box.min.x + 2.16, -9.4 - box.max.z);
    }
    const shelf = runtime.workshop.shelf.position.x; walk('workshop');
    for (const view of ['machine', 'workshop', 'prototypes', 'workshop', 'duplicator', 'workshop', 'backroom', 'entrance']) walk(view);
    // Même avec les pièces forcées visibles et les deux ouvertures dégagées, les volumes
    // et le décalage des baies cachent les prototypes depuis les cadrages publics.
    runtime.workshop.backroom.visible = runtime.workshop.passage.visible = runtime.workshop.workshop.visible = true;
    runtime.doorLeaf.rotation.y = Math.PI / 2; runtime.scene.updateMatrixWorld(true);
    let publicHidden = true;
    for (const view of ['entrance', 'counter']) for (const name of ['azur:broken-masterplinko', 'azur:prototype:finger', 'azur:prototype:accounting-tray', 'azur:prototype:duplicator']) {
      const object = runtime.scene.getObjectByName(name), box = new runtime.highlight.box.constructor().setFromObject(object), target = box.getCenter(v.clone());
      const from = v.clone().copy(AZUR_POSES[view].position), hit = nearest(from, target);
      if (!hit || hit.distance > from.distanceTo(target) - 0.1) publicHidden = false;
      let ancestor = hit?.object; while (ancestor) { if (ancestor === object) publicHidden = false; ancestor = ancestor.parent; }
    }
    runtime.renderer.render = originalRender;
    return { collisions: [...new Set(collisions)], minDoorClearance, minShelfClearance, shelf, queued, publicHidden, prototypes: runtime.targets.filter((o: any) => o.name.startsWith('azur:prototype:')).length };
  });
  expect(result.collisions).toEqual([]); expect(result.minDoorClearance).toBeGreaterThan(0.3); expect(result.minShelfClearance).toBeGreaterThan(0.3);
  expect(result.shelf).toBeCloseTo(-0.7); expect(result.queued).toBe(true); expect(result.publicHidden).toBe(true); expect(result.prototypes).toBe(3);
});

test('trajet 3D : marches dégagées, retour vers la machine et arrivée sans saut du regard', async ({ page }) => {
  await page.goto('/tests/render.html');
  const result = await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { PlinkoScene } = await import('/src/rendering/scene.ts');
    // @ts-expect-error module Vite de la fixture
    const { Navigation, Departure } = await import('/src/navigation/camera.ts');
    // @ts-expect-error module Vite de la fixture
    const { newGame } = await import('/src/game/state.ts');
    // @ts-expect-error module Vite de la fixture
    const { CONFIG } = await import('/src/config.ts');
    const state = newGame(); state.preferences.quality = 'low';
    const scene = new PlinkoScene(document.getElementById('fixture')!, new Navigation(), () => {});
    scene.frame(state, 0, false, () => true);
    const origin = scene.cameraPose(), departure = new Departure(); departure.begin(origin, false);
    const total = CONFIG.stairApproach + CONFIG.stairClimb;
    let minimum = Infinity, maxStep = 0, previous = scene.camera.position.clone();
    let approachHeightError = 0, minEyeHeight = Infinity, maxEyeHeight = 0;
    const ascending: { x: number; y: number; z: number }[] = [];
    const directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(p => scene.camera.position.clone().set(...p));
    const ray = scene.raycaster; ray.far = 0.35;
    const solids: any[] = []; scene.scene.traverse((object: any) => {
      if (object.isMesh && object.visible && !object.material.transparent) solids.push(object);
    });
    for (let t = 0; t <= total; t += 20) {
      if (t) departure.advance(20);
      scene.setDeparture(false, departure.camera); scene.frame(state, 0, false, () => true);
      const position = scene.camera.position.clone(); ascending.push({ x: position.x, y: position.y, z: position.z });
      maxStep = Math.max(maxStep, position.distanceTo(previous)); previous = position;
      if (t <= CONFIG.stairApproach) approachHeightError = Math.max(approachHeightError, Math.abs(position.y - origin.position.y));
      else {
        // Hauteur mesurée sur les surfaces réellement rendues, pas sur la formule du trajet.
        ray.far = 40; ray.set(position, position.clone().set(0, -1, 0));
        const ground = ray.intersectObjects(solids, false)[0];
        if (ground) { minEyeHeight = Math.min(minEyeHeight, ground.distance); maxEyeHeight = Math.max(maxEyeHeight, ground.distance); }
        ray.far = 0.35;
      }
      for (const direction of directions) {
        ray.set(position, direction);
        const hit = ray.intersectObjects(solids, false)[0];
        if (hit) minimum = Math.min(minimum, hit.distance);
      }
    }
    Object.assign(window, { stairsFixture: { scene, state, departure, origin } });
    departure.advance(CONFIG.exitFade); departure.returnToCave(origin, false); departure.advance(CONFIG.exitFade);
    let reverseError = 0, returnTime = CONFIG.exitFade;
    for (let i = ascending.length - 1; i >= 0; i--) {
      const ascendingTime = i * 20;
      const elapsed = CONFIG.exitFade + (ascendingTime >= CONFIG.stairApproach ? total - ascendingTime : CONFIG.stairClimb + CONFIG.stairReturnApproach * (1 - ascendingTime / CONFIG.stairApproach));
      departure.advance(elapsed - returnTime); returnTime = elapsed;
      const p = departure.camera?.position ?? origin.position, expected = ascending[i];
      reverseError = Math.max(reverseError, Math.hypot(p.x-expected.x,p.y-expected.y,p.z-expected.z));
    }
    // Vérifier l'orientation réellement utilisée par Three.js pendant tout le retour,
    // puis le raccord exact au cadrage jouable, que les positions seules ne couvrent pas.
    departure.advance(1); departure.begin(origin, false); departure.advance(total + CONFIG.exitFade); departure.returnToCave(origin, false);
    scene.setDeparture(false, departure.camera); scene.frame(state, 0, false, () => true);
    let previousRotation = scene.camera.quaternion.clone(), maxReturnRotation = 0;
    const duration = CONFIG.exitFade + CONFIG.stairClimb + CONFIG.stairReturnApproach;
    for (let t = 20; t <= duration; t += 20) {
      departure.advance(20); scene.setDeparture(departure.inCave, departure.camera); scene.frame(state, 0, false, () => true);
      maxReturnRotation = Math.max(maxReturnRotation, scene.camera.quaternion.angleTo(previousRotation));
      previousRotation = scene.camera.quaternion.clone();
    }
    departure.begin(origin, false); departure.advance(total + CONFIG.exitFade); departure.returnToCave(origin, false); departure.advance(3200);
    scene.setDeparture(false, departure.camera); scene.frame(state, 0, false, () => true);
    const rearFacingZ = scene.camera.getWorldDirection(scene.camera.position.clone()).z;
    // Une vraie pièce fermée dans le regard de descente : murs, sol, plafond et baie.
    ray.far = 100; let closedRearRays = 0, rearDistance = 0;
    for (const x of [-0.8, 0, 0.8]) for (const y of [-0.6, 0, 0.6]) {
      ray.setFromCamera({ x, y }, scene.camera);
      const hit = ray.intersectObjects(solids, false)[0];
      if (hit) { closedRearRays++; if (x === 0 && y === 0) rearDistance = hit.distance; }
    }
    return { minimum: Number.isFinite(minimum) ? minimum : 1, maxStep, reverseError, maxReturnRotation, approachHeightError, minEyeHeight, maxEyeHeight, rearFacingZ, closedRearRays, rearDistance, eyeHeight: origin.position.y + 7.7 };
  });
  expect(result.minimum).toBeGreaterThan(0.15); expect(result.maxStep).toBeLessThan(0.4); expect(result.reverseError).toBeLessThan(0.001);
  expect(result.approachHeightError).toBeLessThan(1e-8);
  expect(result.minEyeHeight).toBeGreaterThan(result.eyeHeight - 0.1);
  expect(result.maxEyeHeight).toBeLessThan(result.eyeHeight + 1.47);
  expect(result.maxReturnRotation).toBeLessThan(0.055);
  expect(result.rearFacingZ).toBeGreaterThan(0.8); expect(result.closedRearRays).toBe(9);
  expect(result.rearDistance).toBeGreaterThan(25); expect(result.rearDistance).toBeLessThan(80);
  // Images de la montée et de la descente sur la scène réelle.
  await page.evaluate(() => { const f = (window as any).stairsFixture; f.departure.reset(); f.departure.begin(f.origin, false); f.departure.advance(4300); f.scene.setDeparture(false, f.departure.camera); f.scene.frame(f.state, 0, false, () => true); });
  await page.screenshot({ path: 'test-results/escalier-montee.png' });
  await page.evaluate(() => { const f = (window as any).stairsFixture; f.departure.advance(2100); f.departure.returnToCave(f.origin, false); f.departure.advance(2100); f.scene.setDeparture(false, f.departure.camera); f.scene.frame(f.state, 0, false, () => true); });
  await page.screenshot({ path: 'test-results/escalier-descente.png' });
  await page.evaluate(() => { const f = (window as any).stairsFixture; f.departure.advance(1700); f.scene.setDeparture(false, f.departure.camera); f.scene.frame(f.state, 0, false, () => true); });
  await page.screenshot({ path: 'test-results/escalier-retour-pied.png' });
  await page.evaluate(() => { const f = (window as any).stairsFixture; f.departure.advance(2200); f.scene.setDeparture(false, f.departure.camera); f.scene.frame(f.state, 0, false, () => true); });
  await page.screenshot({ path: 'test-results/escalier-retour-piece.png' });
});

test('service importé : reprise au poste, échec du salaire conservateur, export et nouvelle tentative', async ({ page }) => {
  const game = equippedGame(); game.startFactory(); game.advance(57000, true, 'factory'); game.hitFactoryBall(game.state.factory.balls.find(ball => ball.kind === 'grey')!.id);
  await ready(page); await view(page, 'r', 'reglages');
  await importFile(page, JSON.stringify(game.state)); await activate(page, 'confirm-import');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'working');
  expect((await saved(page)).walletCents).toBe(game.state.walletCents);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(key, value) {
      if (key === 'masterplinko.save' && JSON.parse(value).stats.factoryIncome > 0) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await expect(page.locator('#scene')).toHaveAttribute('data-state', 'suspended', { timeout: 15000 });
  await expect(page.locator('#outside-message')).toContainText('Sauvegarde impossible');
  expect((await saved(page)).stats.factoryIncome).toBe(0);
  expect((await saved(page)).walletCents).toBe(game.state.walletCents);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Exporter la partie' }).click(); await download;
  await page.evaluate(() => (window as any).restoreStorage());
  await page.getByRole('button', { name: 'Réessayer la sauvegarde' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations');
  expect((await saved(page)).walletCents).toBe(game.state.walletCents + 50);
  await page.waitForTimeout(1200); expect((await saved(page)).stats.factoryIncome).toBe(50);
});

test('tri 3D : flux, clic, clavier, pause, explosion et aucun HUD', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/render.html');
  await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { FactoryWork } = await import('/src/rendering/factory.ts');
    // @ts-expect-error module Vite de la fixture
    const { Game } = await import('/src/game/engine.ts');
    // @ts-expect-error module Vite de la fixture
    const { newGame } = await import('/src/game/state.ts');
    let red = false;
    const game = new Game(newGame(), () => {}, () => red ? 0 : 0.5); game.writable = true;
    game.startFactory(); game.advance(2000, true, 'factory');
    const root = document.getElementById('fixture')!;
    const work = new FactoryWork(root, (text: string) => root.setAttribute('aria-label', text), (id: number) => game.hitFactoryBall(id));
    work.setActive(true); work.frame(game.state, 0);
    const draw = () => { work.frame(game.state, 0); requestAnimationFrame(draw); }; requestAnimationFrame(draw);
    Object.assign(window, { factoryFixture: { game, work, red: () => { red = true; }, point: (kind: string) => {
      const mesh = [...work.balls.values()].find((mesh: any) => mesh.userData.kind === kind)!;
      const p = mesh.position.clone().project(work.camera), rect = document.querySelector('canvas')!.getBoundingClientRect();
      return { x: rect.x + (p.x + 1) * rect.width / 2, y: rect.y + (1 - p.y) * rect.height / 2, id: mesh.userData.id };
    } } });
  });
  const point = await page.evaluate(() => (window as any).factoryFixture.point('grey'));
  await page.mouse.move(point.x, point.y);
  await expect(page.locator('#fixture')).toHaveAttribute('data-focused-action', `hit:${point.id}`);
  await page.mouse.click(point.x, point.y); await page.mouse.click(point.x, point.y);
  await expect(page.locator('#fixture')).toHaveAttribute('data-hits', '1');
  await page.locator('canvas').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.locator('#fixture')).toHaveAttribute('data-hits', '2');
  expect(await page.evaluate(() => (window as any).factoryFixture.game.state.walletCents)).toBe(1900);
  const movement = await page.evaluate(() => {
    const { game, work, red } = (window as any).factoryFixture;
    const before = [...work.balls.values()][0].position.x;
    game.advance(300, true, 'factory'); work.frame(game.state, 0);
    const moved = [...work.balls.values()][0].position.x > before;
    red(); game.advance(1500, true, 'factory'); work.frame(game.state, 0);
    work.setActive(false); const state = JSON.stringify(game.state); game.advance(10000, false, 'factory');
    return { moved, paused: state === JSON.stringify(game.state) };
  });
  expect(movement).toEqual({ moved: true, paused: true });
  const red = await page.evaluate(() => (window as any).factoryFixture.point('red'));
  await page.mouse.click(red.x, red.y); await expect(page.locator('#fixture')).toHaveAttribute('data-hits', '2');
  await page.evaluate(() => (window as any).factoryFixture.work.setActive(true));
  await page.mouse.move(1275, 715); await page.screenshot({ path: 'test-results/usine-tri-1280.png' });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForTimeout(100);
  await page.screenshot({ path: 'test-results/usine-tri-1440.png' });
  const target = await page.evaluate(() => (window as any).factoryFixture.point('red'));
  await page.mouse.move(target.x, target.y); await expect(page.locator('#fixture')).toHaveAttribute('aria-label', /Danger/);
  await page.mouse.click(target.x, target.y);
  await expect(page.locator('#fixture')).toHaveAttribute('data-round', 'exploded');
  await page.evaluate(() => { const f = (window as any).factoryFixture; f.work.setActive(false); f.work.frame(f.game.state, 300); });
  await page.screenshot({ path: 'test-results/usine-explosion.png' });
  const result = await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { parseSnapshot } = await import('/src/persistence/snapshot.ts');
    const { game } = (window as any).factoryFixture;
    game.advance(60000, true, 'factory'); const loaded = parseSnapshot(JSON.stringify(game.state));
    return { wallet: loaded.walletCents, income: loaded.stats.factoryIncome, status: loaded.factory.status, remaining: loaded.factoryRemainingMs };
  });
  expect(result).toEqual({ wallet: 1900, income: 0, status: 'exploded', remaining: 0 });
  expect(await page.locator('button:visible').count()).toBe(0); expect(errors).toEqual([]);
});

test('événements 3D : préavis, surcadence réelle, retour normal, pause et reprise persistée', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/render.html');
  await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { FactoryWork } = await import('/src/rendering/factory.ts');
    // @ts-expect-error module Vite de la fixture
    const { Game } = await import('/src/game/engine.ts');
    // @ts-expect-error module Vite de la fixture
    const { newGame } = await import('/src/game/state.ts');
    const game = new Game(newGame(), () => {}, () => 0.5); game.writable = true; game.startFactory();
    game.state.factory.events = [{ kind: 'overdrive', startsAtMs: 12000 }, { kind: 'delivery', startsAtMs: 28000 }, { kind: 'slowdown', startsAtMs: 44000 }];
    const root = document.getElementById('fixture')!, announcements: string[] = [];
    const work = new FactoryWork(root, (text: string) => announcements.push(text), (id: number) => game.hitFactoryBall(id));
    work.setActive(true); game.advance(10000, true, 'factory'); work.frame(game.state, 0);
    Object.assign(window, { eventFixture: { game, work, announcements } });
  });
  await expect(page.locator('#fixture')).toHaveAttribute('data-event', 'overdrive:warning');
  await page.mouse.move(1275, 715); await page.screenshot({ path: 'test-results/usine-preavis.png' });
  const acceleration = await page.evaluate(() => {
    const { game, work, announcements } = (window as any).eventFixture;
    game.advance(2000, true, 'factory'); work.frame(game.state, 0);
    const id = game.state.factory.balls.at(-1).id, before = work.balls.get(id).position.x, count = game.state.factory.nextId;
    game.advance(700, true, 'factory'); work.frame(game.state, 0);
    return { distance: work.balls.get(id).position.x - before, arrivals: game.state.factory.nextId-count, announcements };
  });
  expect(acceleration.distance).toBeCloseTo(9.2 * 1400 / 6500, 8); expect(acceleration.arrivals).toBe(2);
  expect(acceleration.announcements.join(' ')).toContain('Attention');
  await expect(page.locator('#fixture')).toHaveAttribute('data-event', 'overdrive:active');
  await page.screenshot({ path: 'test-results/usine-surcadence.png' });
  const resumed = await page.evaluate(async () => {
    // @ts-expect-error module Vite de la fixture
    const { parseSnapshot } = await import('/src/persistence/snapshot.ts');
    // @ts-expect-error module Vite de la fixture
    const { Game } = await import('/src/game/engine.ts');
    const f = (window as any).eventFixture, snapshot = JSON.stringify(f.game.state);
    f.work.setActive(false); f.game.advance(60000, false, 'factory');
    const paused = snapshot === JSON.stringify(f.game.state);
    const resumed = new Game(parseSnapshot(snapshot), () => {}, () => 0.5); resumed.writable = true;
    const unchanged = JSON.stringify(resumed.state.factory) === JSON.stringify(f.game.state.factory);
    f.game = resumed; f.work.setActive(true); f.work.frame(resumed.state, 0);
    resumed.advance(6300, true, 'factory'); f.work.frame(resumed.state, 0);
    return { paused, unchanged };
  });
  expect(resumed).toEqual({ paused: true, unchanged: true });
  await expect(page.locator('#fixture')).toHaveAttribute('data-event', 'normal');
  await page.evaluate(() => { const f = (window as any).eventFixture; f.game.advance(11000, true, 'factory'); f.work.frame(f.game.state, 0); });
  await expect(page.locator('#fixture')).toHaveAttribute('data-event', 'delivery:active');
  await page.screenshot({ path: 'test-results/usine-arrivage.png' });
  await page.evaluate(() => { const f = (window as any).eventFixture; f.game.advance(14000, true, 'factory'); f.work.frame(f.game.state, 0); });
  await expect(page.locator('#fixture')).toHaveAttribute('data-event', 'slowdown:active');
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForTimeout(100);
  await page.evaluate(() => { const f = (window as any).eventFixture; f.work.frame(f.game.state, 0); });
  await page.screenshot({ path: 'test-results/usine-ralentissement.png' });
  const reduced = await page.evaluate(() => {
    const { game, work } = (window as any).eventFixture;
    work.frame(game.state, 0, true); const positions = work.beltMarks.map((mark: any) => mark.position.x);
    game.advance(1000, true, 'factory'); work.frame(game.state, 0, true);
    const staticMarks = positions.every((x: number, index: number) => x === work.beltMarks[index].position.x);
    return { staticMarks, wallet: game.state.walletCents, hits: game.state.factory.greyHits };
  });
  expect(reduced).toEqual({ staticMarks: true, wallet: 1900, hits: 0 });
  expect(await page.locator('button:visible').count()).toBe(0); expect(errors).toEqual([]);
});

test('rouge dans le jeu : explosion, gains perdus, reprise sans salaire et nouveau service explicite', async ({ page }) => {
  let red = false; const game = new Game(newGame(), () => {}, () => red ? 0 : 0.5); game.writable = true;
  game.setPreferences({ reducedMotion: true, quality: 'low' }); game.startFactory(); game.advance(1, true, 'factory'); game.hitFactoryBall(1);
  red = true; game.advance(2000, true, 'factory');
  await page.addInitScript(state => { if (!localStorage.getItem('masterplinko.save')) localStorage.setItem('masterplinko.save', JSON.stringify(state)); }, game.state);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await expect(page.locator('#factory-scene')).toHaveAttribute('data-hits', '1');
  await page.locator('#factory-scene canvas').focus(); await page.keyboard.press('Tab');
  await expect(page.locator('#factory-status')).toContainText('Danger'); await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'destinations');
  await expect(page.locator('#outside-message')).toContainText('Explosion');
  expect((await saved(page)).walletCents).toBe(1900); expect((await saved(page)).stats.factoryIncome).toBe(0);
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  expect((await saved(page)).factory.status).toBe('exploded');
  await page.keyboard.press('s'); await expect(page.locator('#outside')).toBeVisible();
  expect((await saved(page)).factoryRemainingMs).toBe(0);
  await page.getByRole('button', { name: 'Aller travailler à l’usine' }).click();
  expect((await saved(page)).factoryRemainingMs).toBeGreaterThan(58000); expect((await saved(page)).factory.greyHits).toBe(0);
});

test('début de service refusé par le stockage : retour à la cave et récupération sans blocage', async ({ page }) => {
  await ready(page); await page.keyboard.press('s'); await expect(page.locator('#outside')).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'masterplinko.save' && JSON.parse(value).factoryRemainingMs > 0) throw new DOMException('Quota', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Aller travailler à l’usine' }).click();
  await expect(page.locator('#outside-message')).toContainText('Sauvegarde impossible');
  expect((await saved(page)).factoryRemainingMs).toBe(0);
  await page.getByRole('button', { name: 'Redescendre dans la cave' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-departure', 'cave');
  await view(page, 'r', 'reglages'); await activate(page, 'retry');
  await expect(page.locator('#scene')).toHaveAttribute('data-state', 'ready');
  expect((await saved(page)).walletCents).toBe(1900);
});

test('un seul onglet écrit, données incompatibles conservées et erreur de stockage sans débit', async ({ page, context }) => {
  await ready(page); const other = await context.newPage(); await other.goto('/');
  await expect(other.locator('#scene')).toHaveAttribute('data-state', 'waiting');
  await page.close(); await expect(other.locator('#scene')).toHaveAttribute('data-state', 'ready');
  await other.evaluate(() => localStorage.setItem('masterplinko.save', '{"saveVersion":99,"note":"à conserver"}'));
  await other.reload(); await expect(other.locator('#scene')).toHaveAttribute('data-state', 'suspended');
  expect(await other.evaluate(() => localStorage.getItem('masterplinko.save'))).toContain('à conserver');
  await other.evaluate(() => localStorage.removeItem('masterplinko.save')); await activate(other, 'retry');
  await expect(other.locator('#scene')).toHaveAttribute('data-state', 'ready');
  await other.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { if (key === 'masterplinko.save' && JSON.parse(value).pendingBalls.length) throw new DOMException('Quota', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await view(other, 'c', 'commandes'); await activate(other, 'launch');
  await expect(other.locator('#scene')).toHaveAttribute('data-state', 'suspended');
  expect((await saved(other)).walletCents).toBe(1900); expect((await saved(other)).pendingBalls).toHaveLength(0);
});

test('rayons 3D, survol et focus ancrés, visibilité, 50 billes et pluie descendante', async ({ page }) => {
  const game = equippedGame(); game.toggleAuto(); for (let i = 0; i < 50; i++) game.launch('auto');
  await page.goto('/tests/render.html');
  const result = await page.evaluate(async state => {
    state.preferences.reducedMotion = false;
    // @ts-expect-error module Vite, uniquement dans la page de test
    const { PlinkoScene } = await import('/src/rendering/scene.ts');
    // @ts-expect-error module Vite, uniquement dans la page de test
    const { Navigation } = await import('/src/navigation/camera.ts');
    const nav = new Navigation(), actions: string[] = [];
    const scene = new PlinkoScene(document.getElementById('fixture')!, nav, (action: string) => actions.push(action));
    scene.frame(state, 0, true, () => true);
    const target = scene.clickTargets.find((x: any) => x.userData.action === 'launch');
    const point = target.getWorldPosition(target.position.clone()).project(scene.camera);
    const canvas = document.querySelector('canvas')!, rect = canvas.getBoundingClientRect();
    const x = rect.x + (point.x + 1) * rect.width / 2, y = rect.y + (1 - point.y) * rect.height / 2;
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }));
    const hover = scene.hint.visible, label = scene.hintText;
    canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y }));
    canvas.dispatchEvent(new PointerEvent('pointerleave')); const cleared = !scene.hint.visible;
    canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    const sameKeyboardHint = scene.hintText === label;
    const blocker = target.clone(); blocker.userData = {};
    const world = target.getWorldPosition(target.position.clone());
    blocker.position.copy(world).add(scene.camera.position.clone().sub(world).normalize()); blocker.scale.setScalar(2);
    scene.scene.add(blocker); scene.frame(state, 0, true, () => true);
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }));
    canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y }));
    const occluded = !scene.hint.visible; scene.scene.remove(blocker);
    scene.frame(state, 0, true, () => true);
    const stair = scene.clickTargets.find((object: any) => {
      if (object.userData.action !== 'sorties') return false;
      const p = object.getWorldPosition(object.position.clone()).project(scene.camera);
      if (Math.abs(p.x) >= 0.95 || Math.abs(p.y) >= 0.95) return false;
      canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.x + (p.x + 1) * rect.width / 2, clientY: rect.y + (1 - p.y) * rect.height / 2 }));
      return scene.hint.visible && scene.hintText.startsWith('Sortir de la cave');
    });
    const stairsWork = !!stair;
    if (stair) { const p = stair.getWorldPosition(stair.position.clone()).project(scene.camera); canvas.dispatchEvent(new MouseEvent('click', { clientX: rect.x + (p.x + 1) * rect.width / 2, clientY: rect.y + (1 - p.y) * rect.height / 2 })); }
    const uv = scene.interfaces.bet.mesh.getWorldPosition(target.position.clone()).project(scene.camera);
    nav.go('commandes', true); scene.frame(state, 0, true, () => true);
    const after = scene.interfaces.bet.mesh.getWorldPosition(target.position.clone()).project(scene.camera);
    let count = 0;
    scene.frame(state, 4000, true, (id: string) => { count++; state.pendingBalls = state.pendingBalls.filter(ball => ball.id !== id); return true; });
    const rain = scene.rain.geometry.getAttribute('position'), oldY = rain.getY(0); scene.frame(state, 50, true, () => true); const newY = rain.getY(0);
    return { hover, label, cleared, sameKeyboardHint, occluded, stairsWork, actions, count, moved: Math.abs(uv.y - after.y) > 0.1, rainFalls: newY < oldY || newY > 7.3 };
  }, game.state);
  expect(result).toMatchObject({ hover: true, cleared: true, sameKeyboardHint: true, occluded: true, stairsWork: true, actions: ['launch', 'sorties'], count: 50, moved: true, rainFalls: true });
  expect(result.label).toContain('Lancer');
});

test('plateau : 50 vols répartis sur les 15 sorties, contacts et crédits cohérents', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const draws: number[] = [];
  for (let i = 0; i < 50; i++) {
    const exit = i % 15, outcome = OUTCOMES.find(item => item.multiplier === EXITS[exit])!;
    let lower = 0; for (const item of OUTCOMES) { if (item === outcome) break; lower += item.weight; }
    draws.push((lower + outcome.weight / 2) / 1000);
    if (outcome.exits.length === 2) draws.push(exit < 7 ? 0 : 0.999);
  }
  const game = new Game(equippedGame().state, () => {}, () => draws.shift()!);
  game.writable = true; game.toggleAuto(); game.setPreferences({ quality: 'normal', reducedMotion: false });
  for (let i = 0; i < 50; i++) expect(game.launch('auto')?.exit).toBe(i % 15);
  const beforeRefusal = JSON.stringify(game.state); expect(game.launch('auto')).toBeUndefined(); expect(JSON.stringify(game.state)).toBe(beforeRefusal);
  await page.goto('/tests/render.html');
  await page.evaluate(async state => {
    // @ts-expect-error modules servis par Vite dans la fixture
    const { PlinkoScene } = await import('/src/rendering/scene.ts');
    // @ts-expect-error module Vite
    const { Navigation } = await import('/src/navigation/camera.ts');
    // @ts-expect-error module Vite
    const { Game } = await import('/src/game/engine.ts');
    const model = new Game(state, () => {}); model.writable = true;
    const nav = new Navigation(); let contacts = 0;
    const scene = new PlinkoScene(document.getElementById('fixture')!, nav, () => {}, () => contacts++);
    const expected = new Map(state.pendingBalls.map(ball => [ball.id, ball]));
    const arrivals: { exit: number; x: number; y: number; credit: number; expected: number }[] = [];
    const tick = (delta: number) => scene.frame(model.state, delta, true, (id: string) => {
      const position = scene.flights.get(id).mesh.position;
      const frozen = expected.get(id)!; const wallet = model.state.walletCents;
      const result = model.settle(id);
      arrivals.push({ exit: frozen.exit, x: position.x, y: position.y, credit: model.state.walletCents - wallet, expected: frozen.returnCents });
      return !!result;
    });
    scene.setInterface({ canWrite: true, autoEnabled: false, message: '', cataloguePage: 0, historyPage: 0 });
    tick(0);
    Object.assign(window, { visualCheck: { scene, nav, model, tick, arrivals, contacts: () => contacts } });
  }, game.state);
  await page.evaluate(() => (window as any).visualCheck.tick(1400));
  await page.screenshot({ path: 'test-results/plinko-50-billes.png' });
  await page.evaluate(() => (window as any).visualCheck.tick(1950));
  await page.screenshot({ path: 'test-results/plinko-receptions.png' });
  const result = await page.evaluate(() => {
    const check = (window as any).visualCheck;
    const wallet = check.model.state.walletCents;
    check.tick(250); const paid = check.model.state.walletCents - wallet;
    check.tick(0); const again = check.model.state.walletCents - wallet;
    return { arrivals: check.arrivals, paid, again, count: check.scene.flights.size, contacts: check.contacts(), labels: check.scene.exitLabels.length };
  });
  expect(result.arrivals).toHaveLength(50); expect(result.count).toBe(0); expect(result.labels).toBe(15);
  expect(result.contacts).toBeGreaterThan(0); expect(result.again).toBe(result.paid);
  expect(result.paid).toBe(game.state.pendingBalls.reduce((sum, ball) => sum + ball.returnCents, 0));
  for (const arrival of result.arrivals) {
    expect(arrival.x).toBeCloseTo((arrival.exit - 7) * 0.66, 6);
    expect(arrival.y).toBeCloseTo(-4.43, 6); expect(arrival.credit).toBe(arrival.expected);
  }
  await page.screenshot({ path: 'test-results/plinko-sorties-activees.png' });
});
