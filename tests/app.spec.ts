import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { LESSONS } from '../src/lessons';
import { noteLabel, pitchAt, pitchFromName, STRINGS, type Position } from '../src/music';

async function targetPositions(page: Page): Promise<Position[]> {
  return (await page.locator('[data-position]:not([disabled])').evaluateAll((elements) => elements.map((e) => e.getAttribute('data-position')!)))
    .map((key) => { const [string, fret] = key.split(':').map(Number); return { string, fret }; });
}
const cell = (page: Page, p: Position) => page.locator(`[data-position="${p.string}:${p.fret}"]`);
async function placeAll(page: Page) {
  for (const p of await targetPositions(page)) {
    if (await cell(page, p).getAttribute('data-answered') === 'true') continue;
    await page.getByRole('button', { name: `Select ${noteLabel(pitchAt(p))}`, exact: true }).click();
    await cell(page, p).click();
  }
  await expect(page.getByRole('button', { name: 'Try without the map' })).toBeEnabled();
}
async function findCurrent(page: Page) {
  const name = (await page.getByTestId('target-note').textContent())!;
  const pitch = pitchFromName(name.split(' / ')[0]);
  const promptString = (await page.locator('.prompt-on').textContent())!.replace('on the ', '').replace(' string', '');
  const string = STRINGS.find((s) => s.name === promptString)!.id;
  const p = (await targetPositions(page)).find((p) => p.string === string && pitchAt(p) === pitch)!;
  const counter = (await page.locator('.count-pill').allTextContents()).join('');
  await cell(page, p).click();
  await expect.poll(async () => (await page.locator('.count-pill').allTextContents()).join('')).not.toBe(counter);
}
async function finishRecall(page: Page) {
  while (await page.locator('.recall-prompt').count()) {
    await findCurrent(page);
  }
  await expect(page.getByRole('heading', { name: 'A good place to pause.' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mkdir('artifacts', { recursive: true });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Learning path', exact: true }).click();
});

test('complete beginner flow, retries, native dragging, clean recall, scoring, persistence and reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.locator('.lesson-card')).toHaveCount(28);
  await page.screenshot({ animations: 'disabled', path: 'artifacts/home-1366.png' });
  await page.getByRole('button', { name: 'Start with open strings', exact: true }).click();
  await expect(page.locator('.alphabet-notes')).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: 'artifacts/learn-1366.png' });
  await page.getByRole('button', { name: 'Try placing the notes' }).click();
  await page.getByRole('button', { name: 'Select C', exact: true }).click();
  await cell(page, { string: 6, fret: 0 }).click();
  await expect(page.getByRole('status')).toContainText('Not quite');
  await expect(cell(page, { string: 6, fret: 0 })).toHaveAttribute('data-answered', 'false');
  await page.getByRole('button', { name: 'Select E', exact: true }).dragTo(cell(page, { string: 6, fret: 0 }));
  await expect(cell(page, { string: 6, fret: 0 })).toHaveAttribute('data-answered', 'true');
  await expect(page.getByRole('group', { name: 'Note pieces' }).getByRole('button')).toHaveCount(12);
  await placeAll(page);
  await page.screenshot({ animations: 'disabled', path: 'artifacts/place-1366.png' });
  await page.getByRole('button', { name: 'Try without the map' }).click();
  await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
  await expect(page.locator('.fret-position[data-answered="true"]')).toHaveCount(0);
  expect(await page.locator('.fret-position').evaluateAll((elements) => new Set(elements.map((e) => getComputedStyle(e).backgroundColor)).size)).toBe(1);
  await page.screenshot({ animations: 'disabled', path: 'artifacts/recall-1366.png' });
  const targetString = (await page.locator('.prompt-on').textContent())!.replace('on the ', '').replace(' string', '');
  const wrong = (await targetPositions(page)).find((p) => STRINGS.find((s) => s.id === p.string)!.name !== targetString)!;
  await cell(page, wrong).click();
  await expect(page.getByRole('status')).toContainText('Not quite');
  await findCurrent(page);
  await page.mouse.move(0, 0);
  await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
  expect(await page.locator('.fret-position').evaluateAll((elements) => new Set(elements.map((e) => getComputedStyle(e).backgroundColor)).size)).toBe(1);
  await page.getByRole('button', { name: 'Need a hint?' }).click();
  await finishRecall(page);
  await expect(page.locator('.accuracy-number')).toHaveText('67%');
  await page.screenshot({ animations: 'disabled', path: 'artifacts/results-1366.png' });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!));
  expect(saved.lessons['open-strings']).toMatchObject({ lastAccuracy: 67, bestAccuracy: 67, visits: 1 });
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await page.reload();
  await expect(page.getByText('1 of 28 lessons completed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Reset learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my progress', exact: true }).click();
  await page.getByRole('button', { name: 'Reset learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Clear learning progress', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByText('0 of 28 lessons completed')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('string-master:v1')!))).toMatchObject({ sound: false, lessons: {} });
  expect(errors).toEqual([]);
});

test('jumble note pieces repeatedly and navigate their displayed order with the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Start with open strings', exact: true }).click();
  await page.getByRole('button', { name: 'Try placing the notes' }).click();
  await page.getByRole('button', { name: 'Select E', exact: true }).click();
  await cell(page, { string: 6, fret: 0 }).click();
  const pieces = page.getByRole('group', { name: 'Note pieces' }).getByRole('button');
  const labels = () => pieces.evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')!));
  const original = await labels();
  expect(original).not.toEqual(Array.from({ length: 12 }, (_, pitch) => `Select ${noteLabel(pitch)}`));
  const jumble = page.getByRole('button', { name: 'Jumble note pieces', exact: true });
  await jumble.click();
  const shuffled = await labels();
  expect(shuffled).not.toEqual(original);
  expect([...shuffled].sort()).toEqual([...original].sort());
  await expect(pieces).toHaveCount(12);
  await expect(cell(page, { string: 6, fret: 0 })).toHaveAttribute('data-answered', 'true');
  await expect(page.getByRole('button', { name: 'Select E', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('Note pieces jumbled');
  await pieces.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(pieces.nth(1)).toBeFocused();
  await expect(pieces.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await pieces.nth(11).focus();
  await page.keyboard.press('ArrowRight');
  await expect(pieces.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(pieces.nth(11)).toBeFocused();
  await page.getByRole('button', { name: 'Select A', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(cell(page, { string: 5, fret: 0 })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cell(page, { string: 5, fret: 0 })).toHaveAttribute('data-answered', 'true');
  await jumble.focus();
  await page.keyboard.press('Enter');
  expect(await labels()).not.toEqual(shuffled);
  await expect(jumble).toBeFocused();
  await expect(cell(page, { string: 5, fret: 0 })).toHaveAttribute('data-answered', 'true');
  await page.screenshot({ animations: 'disabled', path: 'artifacts/jumbled-palette.png' });
  await page.getByRole('button', { name: 'Select B', exact: true }).dragTo(cell(page, { string: 2, fret: 0 }));
  await expect(cell(page, { string: 2, fret: 0 })).toHaveAttribute('data-answered', 'true');
  await placeAll(page);
  await page.getByRole('button', { name: 'Try without the map', exact: true }).click();
  await finishRecall(page);
  await expect(page.locator('.accuracy-number')).toHaveText('100%');
});

test('place notes and navigate the board with only the keyboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Start with open strings', exact: true }).click();
  await page.getByRole('button', { name: 'Try placing the notes' }).click();
  await page.getByRole('button', { name: 'Select C', exact: true }).focus();
  const palette = await page.getByRole('group', { name: 'Note pieces' }).getByRole('button').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
  const steps = (palette.indexOf('Select E') - palette.indexOf('Select C') + 12) % 12;
  for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Select E', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cell(page, { string: 6, fret: 0 })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(cell(page, { string: 6, fret: 0 })).toHaveAttribute('data-answered', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(cell(page, { string: 5, fret: 0 })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.selected-note')).toHaveCount(0);
});

for (const id of ['string-2-9', 'review-5']) {
  test(`complete ${id} with equivalent note names and three levels of hints`, async ({ page }) => {
    const lesson = LESSONS.find((l) => l.id === id)!;
    await page.getByRole('button', { name: `Open ${lesson.title}`, exact: true }).click();
    await page.getByRole('button', { name: 'Try placing the notes' }).click();
    await page.getByRole('button', { name: 'Need a hint?' }).click();
    await page.getByRole('button', { name: 'Show the steps' }).click();
    await page.getByRole('button', { name: 'Reveal the answer' }).click();
    await expect(page.locator('.fret-position.revealed')).toHaveCount(1);
    await expect(page.locator('.note-route')).toBeVisible();
    await placeAll(page);
    await page.getByRole('button', { name: 'Try without the map' }).click();
    await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
    await finishRecall(page);
    await expect(page.locator('.accuracy-number')).toHaveText('100%');
  });
}

for (const string of STRINGS) {
  test(`final octave test on ${string.name} covers all twelve notes from a blank board`, async ({ page }) => {
    const lesson = LESSONS.find((l) => l.kind === 'test' && l.string === string.id)!;
    if (string.id === 1) await page.setViewportSize({ width: 1920, height: 1080 });
    const testCard = page.getByRole('button', { name: `Open ${lesson.title}`, exact: true });
    await testCard.scrollIntoViewIfNeeded();
    if (string.id === 6) await page.screenshot({ animations: 'disabled', path: 'artifacts/string-with-final-test.png' });
    await testCard.click();
    await expect(page.getByRole('heading', { name: lesson.title, exact: true })).toBeVisible();
    await expect(page.locator('.stepper')).toContainText('Recall');
    await expect(page.locator('.stepper')).not.toContainText('Learn');
    await expect(page.getByRole('button', { name: 'Try placing the notes' })).toHaveCount(0);
    await expect(page.locator('.count-pill')).toHaveText('1 / 12');
    const positions = await targetPositions(page);
    expect(positions).toHaveLength(12);
    expect(positions.every((p) => p.string === string.id && p.fret >= 1 && p.fret <= 12)).toBe(true);
    await page.screenshot({ animations: 'disabled', path: `artifacts/final-test-${string.id}.png` });
    const pitches: number[] = [];
    for (let i = 0; i < 12; i++) {
      await expect(page.locator('.fret-position.with-note')).toHaveCount(0);
      const pitch = pitchFromName((await page.getByTestId('target-note').textContent())!.split(' / ')[0])!;
      pitches.push(pitch);
      if (string.id === 6 && i === 0) {
        const wrong = positions.find((p) => pitchAt(p) !== pitch)!;
        await cell(page, wrong).click();
        await expect(page.getByRole('status')).toContainText('Not quite');
        await expect(page.locator('.count-pill')).toHaveText('1 / 12');
      }
      if (string.id === 6 && i === 1) await page.getByRole('button', { name: 'Need a hint?' }).click();
      await findCurrent(page);
    }
    expect([...pitches].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const accuracy = string.id === 6 ? 83 : 100;
    await expect(page.locator('.accuracy-number')).toHaveText(`${accuracy}%`);
    expect(await page.evaluate((id) => JSON.parse(localStorage.getItem('string-master:v1')!).lessons[id], lesson.id)).toMatchObject({ lastAccuracy: accuracy, bestAccuracy: accuracy, visits: 1 });
    if (string.id === 6) await page.screenshot({ animations: 'disabled', path: 'artifacts/final-test-results.png' });
  });
}

test('blocked storage and unavailable audio keep the lesson usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('Audio unavailable'); } } });
    Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('Storage unavailable'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new Error('Storage unavailable'); } });
  });
  await page.reload();
  await expect(page.getByText('Progress cannot be saved in this browser. You can still practise in this session.')).toBeVisible();
  await page.getByRole('button', { name: 'Start with open strings', exact: true }).click();
  await cell(page, { string: 6, fret: 0 }).click();
  await expect(page.getByText('Sound is unavailable here. The visual puzzles are ready to use.')).toBeVisible();
  await page.getByRole('button', { name: 'Try placing the notes' }).click();
  await placeAll(page);
  await page.getByRole('button', { name: 'Try without the map' }).click();
  await finishRecall(page);
  await expect(page.locator('.accuracy-number')).toHaveText('100%');
});

test('desktop layouts and the guide remain usable at both planned sizes', async ({ page }) => {
  for (const width of [1366, 1920]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ animations: 'disabled', path: `artifacts/home-${width}.png` });
    await page.getByRole('button', { name: 'A quick guide', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('navigation').getByRole('button', { name: 'Learning path', exact: true }).click();
    await page.getByRole('button', { name: 'Open Low E · frets 0–4', exact: true }).click();
    await page.getByRole('button', { name: 'Try placing the notes' }).click();
    await page.screenshot({ animations: 'disabled', path: `artifacts/lesson-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const boxes = await page.locator('[data-position]:not([disabled])').evaluateAll((elements) => elements.map((e) => { const r = e.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width }; }));
    expect(boxes.every((b) => b.x >= 0 && b.right <= width && b.width >= 32)).toBe(true);
    await page.getByRole('button', { name: 'Try without the map', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Try without the map', exact: true })).toBeVisible();
  }
});
