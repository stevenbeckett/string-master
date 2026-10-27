import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { NOTES, pitchAt } from '../src/music';

async function openPractice(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  if (name === 'Barre chord practice') await page.getByRole('button', { name: 'E shape', exact: true }).click();
}
async function verifyNotes(page: Page) {
  const labels = await page.locator('[data-chord-string]').evaluateAll((elements) => elements.map((element) => ({
    string: Number(element.getAttribute('data-chord-string')), fret: Number(element.getAttribute('data-chord-fret')),
    label: element.querySelector('.chord-note-name')?.textContent,
  })));
  expect(labels.length).toBeGreaterThanOrEqual(4);
  for (const voice of labels) expect(voice.label).toBe(NOTES[pitchAt(voice)].name);
  await expect(page.locator('.chord-finger-number')).toHaveCount(0);
  await expect(page.locator('.chord-neck-scroll > svg')).toHaveAttribute('data-label-mode', 'notes');
}

test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.clock.install({ time: new Date('2026-10-27T12:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-27T12:01:00Z'));
});

for (const name of ['Open chord practice', 'Barre chord practice']) {
  test(`${name}: label switch shows sounded notes, survives fullscreen and refresh, and keeps separate preferences`, async ({ page }) => {
    await openPractice(page, name);
    await expect(page.getByRole('button', { name: 'Fingers', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const token = await page.getByTestId('chord-entry').getAttribute('data-prompt-token');
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    await verifyNotes(page);
    await expect(page.getByTestId('chord-entry')).toHaveAttribute('data-prompt-token', token!);
    await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
    const full = page.getByRole('dialog');
    await expect(full.getByRole('button', { name: 'Notes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await full.getByRole('button', { name: 'Fingers', exact: true }).click();
    await expect(page.locator('.chord-note-name')).toHaveCount(0);
    await expect(page.locator('.chord-finger-number').first()).toBeVisible();
    await full.getByRole('button', { name: 'Notes', exact: true }).click();
    await verifyNotes(page);
    await full.getByRole('button', { name: 'Minimise', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Notes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await openPractice(page, name);
    await expect(page.getByRole('button', { name: 'Notes', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await verifyNotes(page);
    await openPractice(page, name === 'Open chord practice' ? 'Barre chord practice' : 'Open chord practice');
    await expect(page.getByRole('button', { name: 'Fingers', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test(`${name}: ring drains between seconds and changing labels never restarts the chord or timer`, async ({ page }) => {
    await openPractice(page, name);
    await page.getByLabel('Seconds per chord', { exact: true }).fill('4');
    const token = await page.getByTestId('chord-entry').getAttribute('data-prompt-token');
    const animation = await page.getByTestId('chord-entry').evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).toBe('chord-name-enter');
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    const startOffset = Number(await page.getByTestId('timer-progress').getAttribute('stroke-dashoffset'));
    await page.clock.runFor(500);
    await expect(page.getByTestId('barre-remaining')).toHaveText('4');
    expect(Number(await page.getByTestId('timer-progress').getAttribute('stroke-dashoffset'))).toBeGreaterThan(startOffset);
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    await page.clock.runFor(500);
    await expect(page.getByTestId('barre-remaining')).toHaveText('3');
    await expect(page.getByTestId('chord-entry')).toHaveAttribute('data-prompt-token', token!);
    await verifyNotes(page);
    await page.clock.runFor(3000);
    await expect(page.getByTestId('chord-entry')).not.toHaveAttribute('data-prompt-token', token!);
    await expect(page.getByTestId('barre-remaining')).toHaveText('4');
    await verifyNotes(page);
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
    const held = await page.getByTestId('chord-entry').getAttribute('data-prompt-token');
    await page.clock.runFor(10000);
    await expect(page.getByTestId('chord-entry')).toHaveAttribute('data-prompt-token', held!);
  });
}

test('note labels use the selected key spelling, including flat and raised scale tones', async ({ page }) => {
  await page.evaluate(() => { Math.random = () => 0; });
  await openPractice(page, 'Barre chord practice');
  await page.getByRole('button', { name: 'Chords in a key', exact: true }).click();
  await page.getByLabel('Key root', { exact: true }).selectOption('6');
  await page.evaluate(() => { Math.random = () => .5; });
  await page.getByRole('button', { name: 'Minor only', exact: true }).click();
  await expect(page.getByTestId('chord-name')).toHaveText('A♯ minor');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.locator('[data-chord-string="5"] .chord-note-name')).toHaveText('E♯');
  await page.evaluate(() => { Math.random = () => 0; });
  await page.getByLabel('Key root', { exact: true }).selectOption('10');
  await expect(page.getByTestId('chord-name')).toHaveText('C minor');
  await expect(page.locator('[data-chord-string="3"] .chord-note-name')).toHaveText('E♭');
});

test('the chord spotlight is readable in normal and full-screen views and respects reduced motion', async ({ page }) => {
  await openPractice(page, 'Open chord practice');
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await page.getByLabel('Seconds per chord', { exact: true }).fill('4');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    expect(await page.locator('.chord-root-name').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(54);
    const timer = await page.locator('.barre-timer-card').boundingBox();
    expect(timer!.height).toBeLessThanOrEqual(80);
    expect(timer!.width).toBeLessThanOrEqual(230);
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    await page.clock.runFor(1500);
    await page.screenshot({ animations: 'disabled', path: `artifacts/chord-spotlight-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Maximise fretboard', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
    await page.screenshot({ animations: 'disabled', path: `artifacts/chord-spotlight-fullscreen-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Minimise', exact: true }).click();
    await page.getByRole('button', { name: 'Stop practice', exact: true }).click();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.getByTestId('chord-entry').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.clock.runFor(4000);
  await verifyNotes(page);
});
