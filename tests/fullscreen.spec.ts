import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function openPractice(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  if (name === 'Barre chord practice') await page.getByRole('button', { name: 'E shape', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.clock.install({ time: new Date('2026-10-27T12:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-27T12:01:00Z'));
});

for (const name of ['Open chord practice', 'Barre chord practice']) {
  test(`${name}: maximise preserves the timer; full-screen Start, Stop and Minimise control the same player`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openPractice(page, name);
    await page.getByLabel('Seconds per chord', { exact: true }).fill('4');
    const first = await page.getByTestId('chord-name').textContent();
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.runFor(1000);
    await expect(page.getByTestId('barre-remaining')).toHaveText('3');
    await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
    const full = page.getByRole('dialog', { name: `${name} · full-screen fretboard`, exact: true });
    await expect(full).toBeVisible();
    await expect(full.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
    await expect(full.getByRole('button', { name: 'Stop practice', exact: true })).toBeEnabled();
    await expect(full.getByRole('button', { name: 'Stop practice', exact: true })).toBeFocused();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByTestId('chord-name')).toHaveText(first!);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.clock.runFor(2900);
    await expect(page.getByTestId('chord-name')).toHaveText(first!);
    await page.clock.runFor(100);
    await expect(page.getByTestId('chord-name')).not.toHaveText(first!);
    await expect(page.getByTestId('barre-remaining')).toHaveText('4');
    await expect(full).toBeVisible();
    await full.getByRole('button', { name: 'Stop practice', exact: true }).click();
    const held = await page.getByTestId('chord-name').textContent();
    await expect(full.getByRole('button', { name: 'Start practice', exact: true })).toBeFocused();
    await page.clock.runFor(10000);
    await expect(page.getByTestId('chord-name')).toHaveText(held!);
    await full.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.runFor(4000);
    const next = await page.getByTestId('chord-name').textContent();
    expect(next).not.toBe(held);
    await full.getByRole('button', { name: 'Minimise', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Maximise fretboard', exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Stop practice', exact: true })).toBeEnabled();
    await expect(page.getByTestId('chord-name')).toHaveText(next!);
    expect(await page.evaluate(() => document.fullscreenElement === null && document.body.style.overflow === '')).toBe(true);
    await page.clock.runFor(4000);
    await expect(page.getByTestId('chord-name')).not.toHaveText(next!);
    expect(errors).toEqual([]);
  });

  test(`${name}: full-screen fretboard fits both desktop sizes, traps keyboard focus and exits with Escape`, async ({ page }) => {
    await openPractice(page, name);
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
      const full = page.getByRole('dialog');
      await expect(full).toBeVisible();
      if (await page.evaluate(() => document.fullscreenEnabled)) await expect.poll(() => full.evaluate((element) => document.fullscreenElement === element)).toBe(true);
      await expect(full.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
      await expect(full.getByRole('button', { name: 'Stop practice', exact: true })).toBeDisabled();
      await expect(full.getByRole('button', { name: 'Start practice', exact: true })).toBeFocused();
      const bounds = await full.boundingBox();
      const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
      expect(bounds!.x).toBe(0);
      expect(bounds!.y).toBe(0);
      expect(bounds!.width).toBe(screen.width);
      expect(bounds!.height).toBe(screen.height);
      const diagram = await full.locator('.chord-neck-scroll > svg').boundingBox();
      expect(diagram!.width).toBeGreaterThan(screen.width * .85);
      expect(diagram!.y + diagram!.height).toBeLessThanOrEqual(screen.height);
      const minimise = await full.getByRole('button', { name: 'Minimise', exact: true }).boundingBox();
      expect(minimise!.y + minimise!.height).toBeLessThanOrEqual(screen.height);
      await page.keyboard.press('Shift+Tab');
      await expect(full.getByRole('region')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(full.getByRole('button', { name: 'Start practice', exact: true })).toBeFocused();
      await page.screenshot({ animations: 'disabled', path: `artifacts/${name.startsWith('Open') ? 'open' : 'barre'}-fullscreen-${viewport.width}.png` });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Maximise fretboard', exact: true })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
    }
  });

  test(`${name}: expanded view remains usable when native fullscreen is rejected`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
      Element.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen blocked'));
    });
    await page.reload();
    await openPractice(page, name);
    await page.getByLabel('Seconds per chord', { exact: true }).fill('2');
    await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
    const full = page.getByRole('dialog');
    await expect(full).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
    await full.getByRole('button', { name: 'Start practice', exact: true }).click();
    const first = await page.getByTestId('chord-name').textContent();
    await page.clock.runFor(2000);
    await expect(page.getByTestId('chord-name')).not.toHaveText(first!);
    await full.getByRole('button', { name: 'Stop practice', exact: true }).click();
    await full.getByRole('button', { name: 'Minimise', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });
}

test('full-screen barre practice keeps the fret-12 shape and fret-14 fingers visible', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 38.1 / 48; });
  await page.reload();
  await page.getByRole('button', { name: 'Barre chord practice', exact: true }).click();
  await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
  const full = page.getByRole('dialog');
  await expect(full.getByTestId('barre-fret')).toHaveText('12');
  await expect(full.locator('.chord-neck-scroll > svg')).toHaveAttribute('data-last-fret', '14');
  const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  for (const marker of await full.locator('[data-chord-fret="14"]').all()) {
    const bounds = await marker.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(screen.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(screen.height);
  }
  await page.screenshot({ animations: 'disabled', path: 'artifacts/fullscreen-fret-14.png' });
});

test('invalid intervals and empty open-chord selections cannot start a full-screen player', async ({ page }) => {
  await openPractice(page, 'Open chord practice');
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('1');
  await expect(page.getByRole('button', { name: 'Maximise fretboard', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Use all random chords', exact: true }).click();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
  const full = page.getByRole('dialog');
  await expect(full.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await expect(full.getByRole('button', { name: 'Stop practice', exact: true })).toBeDisabled();
  await expect(full.getByRole('button', { name: 'Minimise', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('0');
});

test('unmounting full-screen practice clears fullscreen, background isolation and the timer', async ({ page }) => {
  await openPractice(page, 'Open chord practice');
  await page.getByLabel('Seconds per chord', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('nav button[aria-label="Dashboard"]')!.click());
  await page.clock.runFor(10000);
  await expect(page.getByRole('heading', { name: 'Choose your next session.', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement === null && document.body.style.overflow === '' && !document.querySelector('aside')!.inert)).toBe(true);
});
