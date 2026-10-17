import { expect, test } from '@playwright/test';
import { Game } from '../src/game/engine';
import { newGame } from '../src/game/state';

function equippedGame() {
  const game = new Game(newGame(), () => {}, () => 0.999);
  game.writable = true;
  for (let i = 0; i < 2; i++) { game.settle(game.launch()!.id); game.advance(500); }
  game.buy('azur.initial_repair'); game.buy('azur.auto_launcher'); game.buy('azur.accounting_tray');
  return game;
}

test('nouvelle partie, vol conservé au rechargement, réglages et export', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('wallet')).toHaveText('19,00');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await expect(page.locator('#launch')).toBeEnabled();
  await page.locator('#launch').click();
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).pendingBalls[0]);
  expect(pending.betCents).toBe(100);
  await page.reload();
  await expect(page.locator('#notice')).toContainText('Reprise : 1 bille');
  const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!));
  expect(resumed.walletCents).toBe(1800 + pending.returnCents);
  expect(resumed.pendingBalls).toHaveLength(0); expect(resumed.history).toHaveLength(1);
  await page.reload();
  const second = await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!));
  expect(second.walletCents).toBe(resumed.walletCents); expect(second.history).toHaveLength(1);
  await page.getByRole('button', { name: 'Réglages et sauvegarde', exact: true }).click();
  await page.locator('#motion').check(); await page.locator('#quality').check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter la partie', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('masterplinko-sauvegarde.json');
  expect(errors).toEqual([]);
});

test('imports refusés sans perte, import valide confirmé, atelier et histoire', async ({ page }) => {
  const game = equippedGame();
  await page.goto('/');
  await expect(page.locator('#launch')).toBeEnabled();
  const importFile = async (json: string) => page.locator('#import-file').setInputFiles({ name: 'partie.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await importFile('{"saveVersion":99}');
  await expect(page.getByRole('heading', { name: 'Import refusé.' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).walletCents)).toBe(1900);
  await importFile(JSON.stringify(game.state));
  await expect(page.getByRole('heading', { name: 'Remplacer votre partie ?' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).walletCents)).toBe(1900);
  await page.getByRole('button', { name: 'Remplacer et importer' }).click();
  await expect(page.locator('#auto')).toBeVisible();
  await expect(page.locator('#atelier-badge')).toHaveText('3 / 3 INSTALLÉS');
  await page.locator('#auto').click(); await expect(page.locator('#auto')).toContainText('Arrêter');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).pendingBalls.length)).toBeGreaterThan(0);
  await page.locator('#auto').click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).pendingBalls.length)).toBe(0);
  await page.locator('#history').click(); await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.locator('#close-menu').click();
  await page.screenshot({ path: 'test-results/atelier.png', fullPage: true });
});

test('service réellement actif, dialogue en pause et salaire unique', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#factory')).toBeEnabled();
  await page.locator('#factory').click();
  await expect(page.locator('#launch')).toBeDisabled();
  await page.getByRole('button', { name: 'Réglages et sauvegarde', exact: true }).click();
  const remaining = await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).factoryRemainingMs);
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).factoryRemainingMs)).toBe(remaining);
  await page.locator('#close-menu').click();
  await expect(page.getByTestId('wallet')).toHaveText('34,00', { timeout: 20000 });
  await page.waitForTimeout(1100);
  await expect(page.getByTestId('wallet')).toHaveText('34,00');
});

test('un seul onglet écrit, puis reprise après fermeture du propriétaire', async ({ page, context }) => {
  await page.goto('/'); await expect(page.locator('#launch')).toBeEnabled();
  const other = await context.newPage(); await other.goto('/');
  await expect(other.locator('#notice')).toContainText('déjà ouverte ailleurs');
  await expect(other.locator('#launch')).toBeDisabled();
  await page.close();
  await expect(other.locator('#launch')).toBeEnabled();
  await expect(other.getByTestId('wallet')).toHaveText('19,00');
});

test('reprise de 50 billes, charge prête et mise en page à 1280×720', async ({ page }) => {
  const game = equippedGame(); game.toggleAuto();
  for (let i = 0; i < 98; i++) game.settle(game.launch('auto')!.id);
  for (let i = 0; i < 50; i++) game.launch('auto');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(state => localStorage.setItem('masterplinko.save', JSON.stringify(state)), game.state);
  await page.goto('/'); await expect(page.locator('#discharge')).toBeEnabled();
  await expect(page.locator('#notice')).toContainText('Reprise : 50 billes');
  await page.locator('#discharge').click(); await expect(page.locator('#bonus-label')).toHaveText('RETOURS ×10');
  await page.screenshot({ path: 'test-results/machine-1280.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('navigation directe, production à l’établi, Échap et mouvement réduit', async ({ page }) => {
  const game = equippedGame(); game.toggleAuto();
  while (!game.state.chargeReady) game.settle(game.launch('auto')!.id);
  await page.addInitScript(state => localStorage.setItem('masterplinko.save', JSON.stringify(state)), game.state);
  await page.goto('/');
  await expect(page.locator('#auto')).toBeEnabled(); await page.locator('#auto').click();
  await page.locator('#view-azur').click();
  await expect(page.locator('#app')).toHaveAttribute('data-view', 'azur');
  await expect(page.locator('#app')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'azur');
  await expect(page.locator('#launch')).toBeHidden();
  await expect(page.locator('#charge-back')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('masterplinko.save')!).stats.launched), { timeout: 6000 }).toBeGreaterThan(game.state.stats.launched);
  await page.keyboard.press('Escape');
  await expect(page.locator('#view-plinko')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Réglages et sauvegarde', exact: true }).click();
  await page.locator('#motion').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).not.toBeVisible();
  await page.locator('#view-azur').click();
  await expect(page.locator('#app')).toHaveAttribute('data-moving', 'false');
  await expect(page.locator('#scene')).toHaveAttribute('data-rendered-view', 'azur');
  await page.screenshot({ path: 'test-results/etabli.png', fullPage: true });
  await page.locator('#view-plinko').click(); await page.locator('#view-azur').click(); await page.locator('#view-plinko').click();
  await expect(page.locator('#app')).toHaveAttribute('data-view', 'plinko');
  await page.locator('#door').click(); await expect(page.getByRole('heading', { name: 'La porte de la cave.' })).toBeVisible();
});

test('50 billes simultanées réellement rendues et réglées', async ({ page }) => {
  const game = equippedGame(); game.toggleAuto();
  for (let i = 0; i < 50; i++) game.launch('auto');
  await page.goto('/tests/render.html');
  const metrics = await page.evaluate(async state => {
    // Les modules applicatifs sont chargés par Vite ; aucun accès de test dans le jeu livré.
    // @ts-expect-error chemin HTTP géré par Vite
    const { PlinkoScene } = await import('/src/rendering/scene.ts');
    // @ts-expect-error chemin HTTP géré par Vite
    const { Navigation } = await import('/src/navigation/camera.ts');
    const scene = new PlinkoScene(document.getElementById('fixture')!, new Navigation(), () => {});
    let count = 0, frames = 0; const started = performance.now(); let previous = started;
    while (performance.now() - started < 1800) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const now = performance.now(); scene.frame(state, now - previous, true, () => { count++; return true; }); previous = now; frames++;
    }
    const fps = frames * 1000 / (performance.now() - started);
    scene.frame(state, 4000, true, () => { count++; return true; });
    return { count, frames, fps: Math.round(fps * 10) / 10 };
  }, game.state);
  console.log('Rendu logiciel Chrome, 50 billes :', metrics);
  expect(metrics.count).toBe(50); expect(metrics.frames).toBeGreaterThan(1);
  await page.screenshot({ path: 'test-results/charge-50.png' });
});

test('sauvegarde initiale incompatible conservée, panne de stockage sans débit', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('masterplinko.save', '{"saveVersion":99,"note":"à conserver"}'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'La partie attend à l’abri.' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('masterplinko.save'))).toBe('{"saveVersion":99,"note":"à conserver"}');
  await expect(page.locator('#launch')).toBeDisabled();
  // Répare le stockage de ce contexte de test, puis vérifie une transaction refusée.
  await page.evaluate(() => localStorage.removeItem('masterplinko.save'));
  await page.getByRole('button', { name: 'Réessayer la lecture' }).click();
  await expect(page.locator('#launch')).toBeEnabled();
  const before = await page.evaluate(() => localStorage.getItem('masterplinko.save'));
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota', 'QuotaExceededError'); }; });
  await page.locator('#launch').click();
  await expect(page.locator('#notice')).toContainText('Sauvegarde impossible');
  await expect(page.getByTestId('wallet')).toHaveText('19,00');
  expect(await page.evaluate(() => localStorage.getItem('masterplinko.save'))).toBe(before);
});
