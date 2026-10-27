import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { LEARNING_LESSONS } from '../src/lessons';
import { pitchAt, pitchFromName } from '../src/music';

test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
});

test('dashboard separates activity choices from the learning path and groups navigation', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(page.getByRole('heading', { name: 'Choose your next session.', exact: true })).toBeVisible();
  await expect(page.locator('.activity-card')).toHaveCount(4);
  await expect(page.locator('.lesson-card')).toHaveCount(0);
  await expect(nav.getByRole('group', { name: 'Learning', exact: true }).getByRole('button', { name: 'Learning path', exact: true })).toBeVisible();
  await expect(nav.getByRole('group', { name: 'Practice', exact: true }).getByRole('button')).toHaveCount(3);
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.activity-card > p').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(15);
    expect(await page.locator('.eyebrow').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
    const settings = await nav.page().getByRole('button', { name: 'Settings', exact: true }).boundingBox();
    expect(settings!.y + settings!.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ animations: 'disabled', path: `artifacts/dashboard-${viewport.width}.png` });
  }
  await page.getByRole('button', { name: 'Open Learning path', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Learning path', exact: true })).toBeVisible();
  await expect(page.locator('.lesson-card')).toHaveCount(28);
  await expect(page.getByRole('button', { name: 'Open Find every instance', exact: true })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Open Open chord practice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Open chord practice', exact: true })).toBeVisible();
  await nav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.locator('.activity-card')).toHaveCount(4);
});

test('larger note labels stay separated and the full neck scrolls within the desktop board', async ({ page }) => {
  await page.getByRole('button', { name: 'Find every instance', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).check();
  await page.getByRole('button', { name: 'Clear highlight', exact: true }).click();
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.fretboard-scroll').evaluate((element) => { element.scrollLeft = 0; });
    await expect(page.locator('.fret-position.with-note')).toHaveCount(138);
    const markers = await page.locator('[data-position]').evaluateAll((elements) => elements.map((element) => {
      const [string, fret] = element.getAttribute('data-position')!.split(':').map(Number);
      const box = element.getBoundingClientRect();
      return { string, fret, x: box.x, y: box.y, right: box.right, bottom: box.bottom };
    }));
    for (const marker of markers) {
      const right = markers.find((other) => other.string === marker.string && other.fret === marker.fret + 1);
      const below = markers.find((other) => other.fret === marker.fret && other.string === marker.string + 1);
      if (right) expect(right.x - marker.right).toBeGreaterThanOrEqual(4);
      if (below) expect(below.y - marker.bottom).toBeGreaterThanOrEqual(5);
    }
    expect(await page.locator('.fret-position .flat-name').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ animations: 'disabled', path: `artifacts/note-map-spaced-${viewport.width}.png` });
    await page.locator('.fretboard-scroll').evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const last = await page.locator('[data-position="1:22"]').boundingBox();
    expect(last!.x + last!.width).toBeLessThanOrEqual(viewport.width);
  }
});

test('recall progresses automatically after correct answers and opens the final result', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-27T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-27T12:01:00Z'));
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  const lesson = LEARNING_LESSONS.find((lesson) => lesson.id === 'string-6-octave')!;
  await page.getByRole('button', { name: `Open ${lesson.title}`, exact: true }).click();
  const notePitch = async () => pitchFromName((await page.getByTestId('target-note').textContent())!.split(' / ')[0])!;
  const cells = Array.from({ length: 12 }, (_, i) => ({ string: 6, fret: i + 1 }));
  const wrong = cells.find((position) => pitchAt(position) !== 0)!;
  const initial = await notePitch();
  const incorrect = cells.find((position) => pitchAt(position) !== initial) ?? wrong;
  await page.locator(`[data-position="6:${incorrect.fret}"]`).click();
  await page.clock.runFor(1500);
  await expect(page.locator('.count-pill')).toHaveText('1 / 12');
  for (let i = 0; i < 12; i++) {
    await expect(page.locator('.count-pill')).toHaveText(`${i + 1} / 12`);
    await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
    const pitch = await notePitch();
    const correct = cells.find((position) => pitchAt(position) === pitch)!;
    await page.locator(`[data-position="6:${correct.fret}"]`).click();
    await expect(page.getByRole('button', { name: 'Next note', exact: true })).toHaveCount(0);
    await page.clock.runFor(549);
    await expect(page.locator('.count-pill')).toHaveText(`${i + 1} / 12`);
    await page.clock.runFor(1);
  }
  await expect(page.locator('.accuracy-number')).toHaveText('92%');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!).lessons['string-6-octave'].visits)).toBe(1);
});

test('leaving an answered recall cancels automatic progression', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-27T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-27T12:01:00Z'));
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await page.getByRole('button', { name: 'Open Low E · full octave test', exact: true }).click();
  const pitch = pitchFromName((await page.getByTestId('target-note').textContent())!.split(' / ')[0]);
  const fret = Array.from({ length: 12 }, (_, i) => i + 1).find((fret) => pitchAt({ string: 6, fret }) === pitch)!;
  await page.locator(`[data-position="6:${fret}"]`).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.clock.runFor(10000);
  await expect(page.getByRole('heading', { name: 'Choose your next session.', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!).lessons)).toEqual({});
});
