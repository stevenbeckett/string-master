import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { barreChord, type ChordQuality, type ChordShape } from '../src/chords';
import { pitchFromName } from '../src/music';

async function prompt(page: Page) {
  const name = (await page.getByTestId('chord-name').textContent())!;
  const quality = name.endsWith('minor') ? 'minor' : 'major';
  const root = pitchFromName(name.replace(` ${quality}`, ''))!;
  const shape = (await page.getByTestId('chord-shape').textContent())!.startsWith('E') ? 'E' : 'A';
  return barreChord(root, shape, quality);
}
async function verifyDiagram(page: Page) {
  const chord = await prompt(page);
  await expect(page.getByTestId('barre-fret')).toHaveText(String(chord.fret));
  const lastFret = Math.max(12, ...chord.voices.map((voice) => voice.fret ?? 0));
  await expect(page.getByRole('img', { name: /shape, barre at fret/ })).toHaveAttribute('data-last-fret', String(lastFret));
  await expect(page.locator('[data-neck-fret]')).toHaveCount(lastFret);
  const voices = await page.locator('[data-chord-string]').evaluateAll((elements) => elements.map((e) => [Number(e.getAttribute('data-chord-string')), Number(e.getAttribute('data-chord-fret')), Number(e.getAttribute('data-chord-finger'))]));
  expect(voices).toEqual(chord.voices.filter((v) => v.fret !== null).map((v) => [v.string, v.fret, v.finger]));
  await expect(page.locator('.chord-mute')).toHaveCount(chord.shape === 'A' ? 1 : 0);
}
async function openPractice(page: Page) {
  await page.getByRole('button', { name: 'Barre chord practice', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-27T10:01:00Z'));
  await openPractice(page);
});

test('automatically changes the visible chord at the chosen interval without scoring', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('10');
  await expect(page.getByText('48 combinations', { exact: true })).toBeVisible();
  await verifyDiagram(page);
  await expect(page.getByRole('button', { name: /Reveal chord|Got it|Needs practice/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'A shape', exact: true }).click();
  await page.getByRole('button', { name: 'Minor only', exact: true }).click();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('2');
  const first = await prompt(page);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop practice', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'E shape', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Major only', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toBeDisabled();
  await page.clock.runFor(1000);
  await expect(page.getByTestId('barre-remaining')).toHaveText('1');
  expect((await prompt(page)).id).toBe(first.id);
  await page.clock.runFor(1000);
  const second = await prompt(page);
  expect(second.id).not.toBe(first.id);
  expect(second.shape).toBe('A');
  expect(second.quality).toBe('minor');
  await expect(page.getByTestId('barre-remaining')).toHaveText('2');
  await expect(page.getByRole('button', { name: 'Stop practice', exact: true })).toBeFocused();
  await verifyDiagram(page);
  await page.clock.runFor(2000);
  expect((await prompt(page)).id).not.toBe(second.id);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!));
  expect(saved.lessons).toEqual({});
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await expect(page.getByText('0 of 28 lessons completed', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Stop holds the chord and repeated restarts each allow a full interval', async ({ page }) => {
  await page.getByLabel('Seconds per chord', { exact: true }).fill('3');
  const first = await prompt(page);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByTestId('barre-remaining')).toHaveText('1');
  await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  await page.clock.runFor(15000);
  expect((await prompt(page)).id).toBe(first.id);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.runFor(2000);
    expect((await prompt(page)).id).toBe(first.id);
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(2900);
  expect((await prompt(page)).id).toBe(first.id);
  await page.clock.runFor(100);
  expect((await prompt(page)).id).not.toBe(first.id);
});

test('retains settings while navigation, refresh and reset leave practice stopped', async ({ page }) => {
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('7');
  await page.getByRole('button', { name: 'E shape', exact: true }).click();
  await page.getByRole('button', { name: 'Major only', exact: true }).click();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await page.clock.runFor(30000);
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  await openPractice(page);
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeVisible();
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('7');
  await expect(page.getByRole('button', { name: 'E shape', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Major only', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Chords in a key', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Key root', { exact: true })).toHaveValue('7');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.reload();
  await openPractice(page);
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeVisible();
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('7');
  expect(await prompt(page)).toMatchObject({ shape: 'E', quality: 'major' });
  await expect(page.getByLabel('Key root', { exact: true })).toHaveValue('7');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Reset learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Clear learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await openPractice(page);
  await expect(page.getByLabel('Seconds per chord', { exact: true })).toHaveValue('7');
  expect(await prompt(page)).toMatchObject({ shape: 'E', quality: 'major' });
  await expect(page.getByLabel('Key root', { exact: true })).toHaveValue('7');
});

test('validates whole seconds and accepts the one-second and five-minute limits', async ({ page }) => {
  const seconds = page.getByLabel('Seconds per chord', { exact: true });
  for (const value of ['', '0', '-1', '1.5', '301']) {
    await seconds.fill(value);
    await expect(seconds).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
    await expect(page.getByRole('alert')).toHaveText('Choose a whole number from 1 to 300 seconds.');
  }
  for (const value of ['1', '300']) {
    await seconds.fill(value);
    await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeEnabled();
    const first = await prompt(page);
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    // Jump to just before the deadline instead of rendering five minutes of animation ticks.
    await page.clock.fastForward(Number(value) * 1000 - 100);
    await expect(page.getByTestId('barre-remaining')).toHaveText('1');
    expect((await prompt(page)).id).toBe(first.id);
    await page.clock.runFor(100);
    expect((await prompt(page)).id).not.toBe(first.id);
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  }
});

test('supports every shape/type and fits both desktop sizes', async ({ page }) => {
  for (const shape of ['E', 'A'] as ChordShape[]) {
    for (const quality of ['major', 'minor'] as ChordQuality[]) {
      await page.getByRole('button', { name: `${shape} shape`, exact: true }).click();
      await page.getByRole('button', { name: quality === 'major' ? 'Major only' : 'Minor only', exact: true }).click();
      expect(await prompt(page)).toMatchObject({ shape, quality });
      await verifyDiagram(page);
    }
  }
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('10');
  await page.getByRole('button', { name: 'Major + minor', exact: true }).click();
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeVisible();
    const diagram = await page.locator('.chord-neck-scroll > svg').boundingBox();
    const card = await page.locator('.barre-answer').boundingBox();
    expect(diagram!.width).toBeGreaterThan(card!.width * .9);
    const timer = await page.locator('.barre-timer-card').boundingBox();
    expect(timer!.width).toBeLessThanOrEqual(230);
    expect(timer!.height).toBeLessThanOrEqual(80);
    await page.screenshot({ animations: 'disabled', path: `artifacts/barre-key-ready-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.runFor(3000);
    await page.screenshot({ animations: 'disabled', path: `artifacts/barre-key-running-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  }
});

test('unavailable sound and storage leave the timed player usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('Audio unavailable'); } } });
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
  });
  await page.reload();
  await openPractice(page);
  await page.getByRole('button', { name: 'Hear chord', exact: true }).click();
  await expect(page.getByText('Sound is unavailable here. You can still compare the chord diagram.', { exact: true })).toBeVisible();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('2');
  const first = await prompt(page);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(2000);
  expect((await prompt(page)).id).not.toBe(first.id);
  await verifyDiagram(page);
  await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
});

test('shows the fret-12 barre and fingers reaching fret 14 immediately', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 38.1 / 48; });
  await page.reload();
  await openPractice(page);
  await expect(page.getByTestId('chord-name')).toHaveText('A major');
  await expect(page.getByTestId('chord-shape')).toHaveText('A shape');
  await verifyDiagram(page);
  await expect(page.getByTestId('barre-fret')).toHaveText('12');
  await expect(page.locator('.chord-neck-scroll > svg')).toHaveAttribute('data-last-fret', '14');
  await expect(page.locator('[data-neck-fret="14"]')).toHaveText('14');
  await expect(page.getByText('This shape’s other fingers reach fret 14.', { exact: false })).toBeVisible();
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    const board = await page.locator('.chord-neck-scroll > svg').boundingBox();
    const highest = await page.locator('[data-chord-fret="14"]').first().boundingBox();
    expect(highest!.x + highest!.width).toBeLessThan(board!.x + board!.width);
    expect(board!.x + board!.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ animations: 'disabled', path: `artifacts/barre-neck-fret-12-${viewport.width}.png` });
  }
  await page.evaluate(() => { Math.random = () => 0; });
  await page.getByLabel('Seconds per chord', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator('.chord-neck-scroll > svg')).toHaveAttribute('data-last-fret', '12');
  await expect(page.locator('[data-neck-fret="13"]')).toHaveCount(0);
  await verifyDiagram(page);
});

test('a delayed timer advances once and gives the next chord a full interval', async ({ page }) => {
  await page.getByLabel('Seconds per chord', { exact: true }).fill('5');
  const first = await prompt(page);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.fastForward(120000);
  const next = await prompt(page);
  expect(next.id).not.toBe(first.id);
  await expect(page.getByTestId('barre-remaining')).toHaveText('5');
  await page.clock.runFor(4900);
  expect((await prompt(page)).id).toBe(next.id);
  await page.clock.runFor(100);
  expect((await prompt(page)).id).not.toBe(next.id);
});

test('choosing a key restricts the initial chord and subsequent changes, including chord-type filters', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'All random chords', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Key root', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await expect(page.getByTestId('key-chord-pool')).toHaveText('C major · D minor · E minor · F major · G major · A minor');
  await expect(page.getByText('12 combinations', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Minor only', exact: true }).click();
  await page.getByRole('button', { name: 'E shape', exact: true }).click();
  await expect(page.getByTestId('key-chord-pool')).toHaveText('D minor · E minor · A minor');
  await expect(page.getByText('3 combinations', { exact: true })).toBeVisible();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('1');
  let previous = await prompt(page);
  expect([2, 4, 9]).toContain(previous.root);
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'All random chords', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Key root', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Key type', { exact: true })).toBeDisabled();
  for (let i = 0; i < 4; i++) {
    await page.clock.runFor(1000);
    const chord = await prompt(page);
    expect([2, 4, 9]).toContain(chord.root);
    expect(chord).toMatchObject({ shape: 'E', quality: 'minor' });
    expect(chord.id).not.toBe(previous.id);
    previous = chord;
    await verifyDiagram(page);
  }
  await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('7');
  expect([9, 11, 4]).toContain((await prompt(page)).root);
  await expect(page.getByTestId('key-chord-pool')).toHaveText('A minor · B minor · E minor');
});

test('natural-minor keys and returning to random mode retain their correct chord families', async ({ page }) => {
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('9');
  await page.getByLabel('Key type', { exact: true }).selectOption('minor');
  await expect(page.getByTestId('key-chord-pool')).toHaveText('A minor · C major · D minor · E minor · F major · G major');
  await page.getByLabel('Seconds per chord', { exact: true }).fill('2');
  const family = ['A minor', 'C major', 'D minor', 'E minor', 'F major', 'G major'];
  expect(family).toContain(await page.getByTestId('chord-name').textContent());
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(2000);
  expect(family).toContain(await page.getByTestId('chord-name').textContent());
  await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  await page.reload();
  await openPractice(page);
  await expect(page.getByLabel('Key root', { exact: true })).toHaveValue('9');
  await expect(page.getByLabel('Key type', { exact: true })).toHaveValue('minor');
  await expect(page.getByTestId('key-chord-pool')).toHaveText('A minor · C major · D minor · E minor · F major · G major');
  await page.getByRole('button', { name: 'All random chords', exact: true }).click();
  await expect(page.getByText('48 combinations', { exact: true })).toBeVisible();
  await expect(page.getByTestId('key-chord-pool')).toHaveCount(0);
  await page.reload();
  await openPractice(page);
  await expect(page.getByRole('button', { name: 'All random chords', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('48 combinations', { exact: true })).toBeVisible();
});
