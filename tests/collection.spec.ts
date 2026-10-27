import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { NOTES, fretboardPositions, pitchAt, pitchFromName, type Position } from '../src/music';

const cell = (page: Page, p: Position) => page.locator(`[data-position="${p.string}:${p.fret}"]`);
const target = async (page: Page) => (await page.getByTestId('target-note').textContent())!;
const matching = (name: string) => fretboardPositions().filter((p) => pitchAt(p) === pitchFromName(name.split(' / ')[0]));

test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Find every instance', exact: true }).click();
});

test('find every instance across the full fretboard, with feedback, hints, saved results and a new note', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const name = await target(page);
  const positions = matching(name);
  await expect(page.locator('[data-position]:not([disabled])')).toHaveCount(138);
  await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
  await expect(page.locator('.count-pill')).toHaveText(`0 / ${positions.length} found`);
  await expect(page.getByRole('button', { name: 'See your results', exact: true })).toBeDisabled();
  const wrong = fretboardPositions().find((p) => pitchAt(p) !== pitchFromName(name.split(' / ')[0]))!;
  await cell(page, wrong).click();
  await expect(page.getByRole('status')).toContainText('That isn’t');
  await expect(cell(page, wrong)).toHaveAttribute('data-incorrect', 'true');
  await expect(page.locator('.count-pill')).toHaveText(`0 / ${positions.length} found`);
  await page.getByRole('button', { name: 'Give me a clue', exact: true }).click();
  await expect(page.locator('.hinted-string')).toHaveCount(1);
  await expect(page.locator('.fret-position.revealed')).toHaveCount(0);
  await page.getByRole('button', { name: 'Narrow the area', exact: true }).click();
  await expect(page.locator('.hinted-range')).toHaveCount(1);
  await expect(page.locator('.fret-position.revealed')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal one position', exact: true }).click();
  await expect(page.locator('.fret-position.revealed')).toHaveCount(1);
  await expect(page.locator('.count-pill')).toHaveText(`0 / ${positions.length} found`);
  await page.screenshot({ animations: 'disabled', path: 'artifacts/collection-hint.png' });
  const revealedKey = (await page.locator('.fret-position.revealed').getAttribute('data-position'))!;
  await page.locator(`[data-position="${revealedKey}"]`).click();
  await expect(page.locator('.count-pill')).toHaveText(`1 / ${positions.length} found`);
  await page.locator(`[data-position="${revealedKey}"]`).click();
  await expect(page.getByRole('status')).toContainText('already found');
  await expect(page.locator('.count-pill')).toHaveText(`1 / ${positions.length} found`);
  for (const p of positions) await cell(page, p).click();
  await expect(page.locator('.count-pill')).toHaveText(`${positions.length} / ${positions.length} found`);
  await expect(page.locator('.fret-position[data-answered="true"]')).toHaveCount(positions.length);
  await expect(page.locator('.string-finished')).toHaveCount(6);
  await page.screenshot({ animations: 'disabled', path: 'artifacts/collection-complete.png' });
  await page.getByRole('button', { name: 'See your results', exact: true }).click();
  await expect(page.getByRole('heading', { name: `Every ${name} found.`, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Found without help', exact: true })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: 'artifacts/collection-results.png' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!).lessons['find-every-instance'].visits)).toBe(1);
  await page.getByRole('button', { name: 'Find another note', exact: true }).click();
  expect(await target(page)).not.toBe(name);
  await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
  const next = await target(page);
  await page.getByRole('button', { name: 'New random note', exact: true }).click();
  expect(await target(page)).not.toBe(next);
  await page.reload();
  await expect(page.getByText('0 of 28 lessons completed')).toBeVisible();
  expect(errors).toEqual([]);
});

test('all 22 frets remain visible and keyboard accessible on desktop', async ({ page }) => {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'New random note', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const sizes = await page.locator('[data-position]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
    expect(sizes.every((width) => width >= 38)).toBe(true);
    await cell(page, { string: 6, fret: 21 }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(cell(page, { string: 6, fret: 22 })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(cell(page, { string: 5, fret: 22 })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(cell(page, { string: 5, fret: 21 })).toBeFocused();
    await page.screenshot({ animations: 'disabled', path: `artifacts/collection-${viewport.width}.png` });
  }
});

test('shows every note name while selecting and clearing highlights, including sharp/flat aliases', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).check();
  await expect(page.locator('.fret-position.with-note')).toHaveCount(138);
  const labels = await page.locator('[data-position]').evaluateAll((elements) => elements.map((element) => ({ key: element.getAttribute('data-position'), text: element.querySelector('.note-name')?.textContent })));
  expect(labels).toEqual(fretboardPositions().map((position) => ({ key: `${position.string}:${position.fret}`, text: NOTES[pitchAt(position)].name + NOTES[pitchAt(position)].flat })));
  for (const name of ['C', 'F♯ / G♭']) {
    await page.getByRole('button', { name: `Highlight ${name}`, exact: true }).click();
    await expect(page.getByTestId('map-selected-note')).toHaveText(name);
    await expect(page.locator('.fret-position.with-note')).toHaveCount(138);
    await expect(page.locator('.fret-position.map-highlighted')).toHaveCount(matching(name).length);
    for (const position of matching(name)) await expect(cell(page, position)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Clear highlight', exact: true }).click();
  await expect(page.getByTestId('map-selected-note')).toHaveText('All notes');
  await expect(page.locator('.fret-position.map-highlighted')).toHaveCount(0);
  await expect(page.locator('.fret-position.with-note')).toHaveCount(138);
  await expect(page.locator('.count-pill')).toHaveText('138 notes visible');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!).lessons)).toEqual({});
});

test('clicking or using the keyboard on a labelled note highlights its matches without collecting finds', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).check();
  await cell(page, { string: 6, fret: 0 }).click();
  await expect(page.getByTestId('map-selected-note')).toHaveText('E');
  await expect(page.locator('.fret-position.map-highlighted')).toHaveCount(matching('E').length);
  await cell(page, { string: 1, fret: 21 }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(cell(page, { string: 1, fret: 22 })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('map-selected-note')).toHaveText('D');
  await expect(page.locator('.fret-position.map-highlighted')).toHaveCount(matching('D').length);
  await expect(page.locator('.fret-position[data-answered="true"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'See your results', exact: true })).toHaveCount(0);
});

test('keeps earlier finds, hides the map on return, and records the remaining finds as assisted', async ({ page }) => {
  const name = await target(page);
  const positions = matching(name);
  await cell(page, positions[0]).click();
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).check();
  await cell(page, positions[1]).click();
  await page.getByRole('button', { name: 'Highlight C', exact: true }).click();
  await expect(page.locator('.fret-position[data-answered="true"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Back to finding notes', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Show all notes', exact: true })).not.toBeChecked();
  expect(await target(page)).toBe(name);
  await expect(page.locator('.count-pill')).toHaveText(`1 / ${positions.length} found`);
  await expect(page.locator('.fret-position.with-note')).toHaveCount(1);
  await expect(page.locator('.fret-position.map-highlighted')).toHaveCount(0);
  await expect(page.locator('.fret-position[data-revealed="true"]')).toHaveCount(0);
  for (const position of positions) await cell(page, position).click();
  await page.getByRole('button', { name: 'See your results', exact: true }).click();
  await expect(page.locator('.accuracy-number')).toContainText(String(Math.round(100 / positions.length)));
  await expect(page.locator('.result-breakdown')).toContainText(`${positions.length - 1} assisted finds`);
  await expect(page.locator('.result-breakdown')).toContainText('0 incorrect guesses');
});

test('a new random note in study view stays labelled and cannot earn unaided credit', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).check();
  const previous = await page.getByTestId('map-selected-note').textContent();
  await page.getByRole('button', { name: 'New random note', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Show all notes', exact: true })).toBeChecked();
  await expect(page.getByTestId('map-selected-note')).not.toHaveText(previous!);
  await expect(page.locator('.fret-position.with-note')).toHaveCount(138);
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).uncheck();
  const positions = matching(await target(page));
  await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
  for (const position of positions) await cell(page, position).click();
  await page.getByRole('button', { name: 'See your results', exact: true }).click();
  await expect(page.locator('.accuracy-number')).toContainText('0');
  await expect(page.locator('.result-breakdown')).toContainText(`${positions.length} assisted finds`);
});

test('all notes and highlighted matches remain readable across the 22-fret desktop view', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Show all notes', exact: true }).check();
  await page.getByRole('button', { name: 'Highlight C♯ / D♭', exact: true }).click();
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.fret-position.with-note')).toHaveCount(138);
    const sizes = await page.locator('[data-position]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
    expect(sizes.every((width) => width >= 38)).toBe(true);
    await page.locator('.fretboard-scroll').evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const last = await cell(page, { string: 1, fret: 22 }).boundingBox();
    expect(last!.x + last!.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ animations: 'disabled', path: `artifacts/collection-map-${viewport.width}.png` });
  }
});
