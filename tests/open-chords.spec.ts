import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { chordName } from '../src/chords';
import { OPEN_CHORDS } from '../src/openChords';

async function openPractice(page: Page) {
  await page.getByRole('button', { name: 'Open chord practice', exact: true }).click();
}
async function verifyDiagram(page: Page) {
  const name = await page.getByTestId('chord-name').textContent();
  const chord = OPEN_CHORDS.find((chord) => chordName(chord) === name)!;
  expect(chord).toBeTruthy();
  const voices = await page.locator('[data-chord-string]').evaluateAll((elements) => elements.map((element) => [Number(element.getAttribute('data-chord-string')), Number(element.getAttribute('data-chord-fret')), Number(element.getAttribute('data-chord-finger'))]));
  expect(voices).toEqual(chord.voices.filter((voice) => voice.fret !== null).map((voice) => [voice.string, voice.fret, voice.finger]));
  await expect(page.locator('.chord-open')).toHaveCount(chord.voices.filter((voice) => voice.fret === 0).length);
  await expect(page.locator('.chord-mute')).toHaveCount(chord.voices.filter((voice) => voice.fret === null).length);
  await expect(page.locator('.chord-finger-number')).toHaveCount(chord.voices.filter((voice) => voice.fret !== null && voice.fret > 0).length);
  await expect(page.getByRole('img', { name: `${name}, open position`, exact: true })).toBeVisible();
  await expect(page.locator('.chord-neck-scroll > svg')).toHaveAttribute('data-last-fret', '12');
  await expect(page.locator('[data-neck-fret]')).toHaveCount(12);
}

test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-27T10:01:00Z'));
  await openPractice(page);
});

test('shows open chords and runs timed keyboard Start/Stop without scores', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('heading', { name: 'Open chord practice', exact: true })).toBeVisible();
  await expect(page.getByText('8 open chords', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('10');
  await expect(page.getByRole('button', { name: 'E shape', exact: true })).toHaveCount(0);
  await verifyDiagram(page);
  await page.getByLabel('Seconds per chord', { exact: true }).fill('2');
  const first = await page.getByTestId('chord-name').textContent();
  const start = page.getByRole('button', { name: 'Start practice', exact: true });
  await start.focus();
  await start.press('Enter');
  await expect(page.getByRole('button', { name: 'Minor only', exact: true })).toBeDisabled();
  await page.clock.runFor(1000);
  await expect(page.getByTestId('barre-remaining')).toHaveText('1');
  await expect(page.getByTestId('chord-name')).toHaveText(first!);
  await page.clock.runFor(1000);
  await expect(page.getByTestId('chord-name')).not.toHaveText(first!);
  await verifyDiagram(page);
  const stop = page.getByRole('button', { name: 'Stop practice', exact: true });
  await expect(stop).toBeFocused();
  await stop.press('Space');
  const held = await page.getByTestId('chord-name').textContent();
  await page.clock.runFor(20000);
  await expect(page.getByTestId('chord-name')).toHaveText(held!);
  await start.click();
  await page.clock.runFor(1900);
  await expect(page.getByTestId('chord-name')).toHaveText(held!);
  await page.clock.runFor(100);
  await expect(page.getByTestId('chord-name')).not.toHaveText(held!);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!).lessons)).toEqual({});
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await page.clock.runFor(10000);
  await expect(page.getByText('0 of 28 lessons completed', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('renders all eight open fingerings with open circles, mute marks and finger numbers', async ({ page }) => {
  for (let i = 0; i < OPEN_CHORDS.length; i++) {
    await page.evaluate((fraction) => { Math.random = () => fraction; }, (i + .1) / OPEN_CHORDS.length);
    await page.getByRole('button', { name: 'Learning path', exact: true }).click();
    await openPractice(page);
    await expect(page.getByTestId('chord-name')).toHaveText(chordName(OPEN_CHORDS[i]));
    await verifyDiagram(page);
  }
});

test('filters by key and quality without inventing unavailable open shapes', async ({ page }) => {
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await expect(page.getByTestId('key-chord-pool')).toHaveText('C major · G major · A minor · E minor · D minor');
  await expect(page.getByText('5 open chords', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Minor only', exact: true }).click();
  await expect(page.getByTestId('key-chord-pool')).toHaveText('A minor · E minor · D minor');
  await page.getByLabel('Seconds per chord', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByLabel('Key root', { exact: true })).toBeDisabled();
  let previous = await page.getByTestId('chord-name').textContent();
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(1000);
    const name = await page.getByTestId('chord-name').textContent();
    expect(['A minor', 'E minor', 'D minor']).toContain(name);
    expect(name).not.toBe(previous);
    previous = name;
  }
  await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('9');
  await page.getByLabel('Key type', { exact: true }).selectOption('minor');
  await expect(page.getByTestId('key-chord-pool')).toHaveText('A minor · E minor · D minor');
});

test('handles empty and single-chord key selections, then returns to all random chords', async ({ page }) => {
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('1');
  await expect(page.getByRole('heading', { name: 'No matching open chords', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await expect(page.getByTestId('chord-name')).toHaveCount(0);
  await expect(page.locator('[data-chord-string]')).toHaveCount(0);
  await page.getByLabel('Key root', { exact: true }).selectOption('11');
  await expect(page.getByText('1 open chord', { exact: true })).toBeVisible();
  await expect(page.getByTestId('chord-name')).toHaveText('E major');
  await expect(page.getByText('Only one chord fits these filters. It repeats each interval.', { exact: true })).toBeVisible();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await page.clock.runFor(1000);
    await expect(page.getByTestId('barre-remaining')).toHaveText('1');
    await page.clock.runFor(1000);
    await expect(page.getByTestId('barre-remaining')).toHaveText('2');
    await expect(page.getByTestId('chord-name')).toHaveText('E major');
  }
  await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  await page.getByRole('button', { name: 'Minor only', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching open chords', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use all random chords', exact: true }).click();
  await expect(page.getByText('3 open chords', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
});

test('saves open settings independently, stops on leaving, and keeps preferences through reset', async ({ page }) => {
  await page.getByRole('button', { name: 'Barre chord practice', exact: true }).click();
  await page.getByRole('button', { name: 'A shape', exact: true }).click();
  await page.getByRole('button', { name: 'Major only', exact: true }).click();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('4');
  await openPractice(page);
  await page.getByRole('button', { name: 'Minor only', exact: true }).click();
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('9');
  await page.getByLabel('Key type', { exact: true }).selectOption('minor');
  await page.getByLabel('Seconds per chord', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('button', { name: 'Barre chord practice', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.getByRole('heading', { name: 'Barre chord practice', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeVisible();
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'A shape', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openPractice(page);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.reload();
  await openPractice(page);
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeVisible();
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('15');
  await expect(page.getByLabel('Key root', { exact: true })).toHaveValue('9');
  await expect(page.getByLabel('Key type', { exact: true })).toHaveValue('minor');
  await expect(page.getByRole('button', { name: 'Minor only', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Reset learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Clear learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await openPractice(page);
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('15');
  await expect(page.getByLabel('Key type', { exact: true })).toHaveValue('minor');
});

test('validates timing, uses both interval limits and handles delayed callbacks', async ({ page }) => {
  const seconds = page.getByLabel('Seconds per chord', { exact: true });
  for (const value of ['', '0', '1.5', '301']) {
    await seconds.fill(value);
    await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
    await expect(page.getByRole('alert')).toHaveText('Choose a whole number from 1 to 300 seconds.');
  }
  for (const value of ['1', '300']) {
    await seconds.fill(value);
    const first = await page.getByTestId('chord-name').textContent();
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.fastForward(Number(value) * 1000 - 100);
    await expect(page.getByTestId('chord-name')).toHaveText(first!);
    await page.clock.runFor(100);
    await expect(page.getByTestId('chord-name')).not.toHaveText(first!);
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  }
  await seconds.fill('3');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.fastForward(120000);
  await expect(page.getByTestId('barre-remaining')).toHaveText('3');
});

test('sound and storage failure leave open chord practice usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('Audio unavailable'); } } });
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  });
  await page.reload();
  await openPractice(page);
  await page.getByRole('button', { name: 'Hear chord', exact: true }).click();
  await expect(page.getByText('Sound is unavailable here. You can still compare the chord diagram.', { exact: true })).toBeVisible();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('1');
  const first = await page.getByTestId('chord-name').textContent();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByTestId('chord-name')).not.toHaveText(first!);
  await verifyDiagram(page);
});

test('open chord practice fits both desktop sizes and has an entry on the learning path', async ({ page }) => {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const savedLabel = await page.locator('.local-label').boundingBox();
    expect(savedLabel!.y + savedLabel!.height).toBeLessThanOrEqual(viewport.height);
    const board = await page.locator('.chord-neck-scroll > svg').boundingBox();
    const card = await page.locator('.barre-answer').boundingBox();
    expect(board!.width).toBeGreaterThan(card!.width * .9);
    const highE = Number(await page.locator('[data-string-wire="1"]').getAttribute('y1'));
    const lowE = Number(await page.locator('[data-string-wire="6"]').getAttribute('y1'));
    expect(highE).toBeLessThan(lowE);
    const lastFret = await page.locator('[data-neck-fret="12"]').boundingBox();
    expect(lastFret!.x + lastFret!.width).toBeLessThanOrEqual(viewport.width);
    const timer = await page.locator('.barre-timer-card').boundingBox();
    expect(timer!.width).toBeLessThanOrEqual(230);
    expect(timer!.height).toBeLessThanOrEqual(80);
    expect(await page.getByTestId('barre-remaining').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(24);
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.runFor(3000);
    await expect(page.getByRole('button', { name: 'Stop practice', exact: true })).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: `artifacts/open-chords-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Open Open chord practice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Open chord practice', exact: true })).toBeVisible();
});
