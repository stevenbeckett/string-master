import { describe, expect, it } from 'vitest';
import { LESSONS } from './lessons';
import { pitchAt, positionKey } from './music';
import { createSession, currentTarget, hintTarget, jumbleNotes, placementComplete, sessionReducer, sessionResults, type Session } from './session';

const start = () => sessionReducer(createSession(LESSONS[0], () => 0.5), { type: 'START_PLACE' });
function placed(session = start()) {
  return session.positions.reduce((s, position) => sessionReducer(s, { type: 'PLACE', position, pitch: pitchAt(position) }), session);
}
const recall = () => sessionReducer(placed(), { type: 'START_RECALL' });
function finish(s: Session) {
  while (s.phase === 'recall') {
    s = sessionReducer(s, { type: 'RECALL', position: currentTarget(s) });
    s = sessionReducer(s, { type: 'NEXT' });
  }
  return s;
}

describe('placement', () => {
  it('starts each lesson with a shuffled palette containing all twelve notes', () => {
    for (const random of [Math.random, () => .5, () => .999999]) {
      const palette = createSession(LESSONS[0], random).paletteOrder;
      expect(palette).not.toEqual(Array.from({ length: 12 }, (_, pitch) => pitch));
      expect([...palette].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, pitch) => pitch));
    }
  });
  it('jumbles all twelve pieces without losing notes and always changes their order', () => {
    const original = Array.from({ length: 12 }, (_, pitch) => pitch);
    for (const random of [Math.random, () => 0.999999]) {
      const shuffled = jumbleNotes(original, random);
      expect(shuffled).not.toEqual(original);
      expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
      expect(original).toEqual(Array.from({ length: 12 }, (_, pitch) => pitch));
      expect(jumbleNotes(shuffled, random)).not.toEqual(shuffled);
    }
  });
  it('keeps placements, selected pitch and scoring intact when pieces are jumbled', () => {
    let s = sessionReducer(start(), { type: 'SELECT', pitch: 4 });
    s = sessionReducer(s, { type: 'PLACE', position: { string: 6, fret: 0 }, pitch: 4 });
    const jumbled = sessionReducer(s, { type: 'JUMBLE', order: jumbleNotes(s.paletteOrder) });
    expect(jumbled.paletteOrder).not.toEqual(s.paletteOrder);
    expect(jumbled.selected).toBe(4);
    expect(jumbled.placements).toEqual(s.placements);
    expect(jumbled.recalls).toEqual(s.recalls);
    expect(jumbled.order).toEqual(s.order);
    expect(sessionResults(jumbled)).toEqual(sessionResults(s));
  });
  it('does not advance until the board is complete', () => {
    const s = start();
    expect(placementComplete(s)).toBe(false);
    expect(sessionReducer(s, { type: 'START_RECALL' }).phase).toBe('place');
    expect(placementComplete(placed())).toBe(true);
  });
  it('allows retries and reusing the same E piece on two strings', () => {
    let s = start();
    s = sessionReducer(s, { type: 'PLACE', position: { string: 6, fret: 0 }, pitch: 0 });
    expect(s.placements['6:0']).toEqual({ mistakes: 1, hints: 0, solved: false });
    for (const string of [6, 1]) s = sessionReducer(s, { type: 'PLACE', position: { string, fret: 0 }, pitch: 4 });
    expect(s.placements['6:0'].solved).toBe(true);
    expect(s.placements['1:0'].solved).toBe(true);
  });
  it('ignores drops outside the puzzle and does not overwrite a solved position', () => {
    const s = placed();
    expect(sessionReducer(s, { type: 'PLACE', position: { string: 6, fret: 2 }, pitch: 6 })).toBe(s);
    expect(sessionReducer(s, { type: 'PLACE', position: { string: 6, fret: 0 }, pitch: 0 })).toBe(s);
  });
  it('stores hints per position and targets the next unsolved position after an answer', () => {
    let s = sessionReducer(start(), { type: 'HINT' });
    const p = hintTarget(s);
    expect(s.placements[positionKey(p)].hints).toBe(1);
    s = sessionReducer(s, { type: 'PLACE', position: p, pitch: pitchAt(p) });
    expect(positionKey(hintTarget(s))).not.toBe(positionKey(p));
  });
});

describe('recall and scoring', () => {
  it('opens a final test directly on a fresh board with all twelve notes shuffled', () => {
    const s = createSession(LESSONS.find((l) => l.id === 'string-6-octave')!, () => 0.5);
    expect(s.phase).toBe('recall');
    expect(s.order).toHaveLength(12);
    expect(s.order).not.toEqual(s.positions);
    expect(s.focused).toBe(positionKey(s.positions[0]));
    expect(new Set(s.order.map(pitchAt)).size).toBe(12);
    expect(Object.values(s.recalls).every((a) => !a.solved && a.hints === 0 && a.mistakes === 0)).toBe(true);
    expect(Object.values(s.placements).every((a) => !a.solved)).toBe(true);
  });
  it('requires all twelve final-test answers before results, with hints and retries scored as assisted', () => {
    let s = createSession(LESSONS.find((l) => l.id === 'string-6-octave')!);
    s = sessionReducer(s, { type: 'HINT' });
    for (let i = 0; i < 12; i++) {
      expect(s.phase).toBe('recall');
      if (i === 1) s = sessionReducer(s, { type: 'RECALL', position: s.positions.find((p) => pitchAt(p) !== pitchAt(currentTarget(s)))! });
      s = sessionReducer(s, { type: 'RECALL', position: currentTarget(s) });
      s = sessionReducer(s, { type: 'NEXT' });
    }
    expect(s.phase).toBe('results');
    expect(sessionResults(s)).toMatchObject({ total: 12, unaided: 10, accuracy: 83, assisted: 1, retries: 1 });
  });
  it('starts with fresh recall records and no selected piece', () => {
    const s = recall();
    expect(s.selected).toBeNull();
    expect(Object.values(s.recalls).every((a) => !a.solved && a.mistakes === 0 && a.hints === 0)).toBe(true);
  });
  it('requires the specified string, even when another string has the same note', () => {
    let s = recall();
    const targetIndex = s.order.findIndex((p) => p.string === 6);
    s = { ...s, index: targetIndex };
    s = sessionReducer(s, { type: 'RECALL', position: { string: 1, fret: 0 } });
    expect(s.recalls['6:0'].solved).toBe(false);
    expect(s.recalls['6:0'].mistakes).toBe(1);
  });
  it('does not allow skipping an unanswered prompt', () => {
    const s = recall();
    expect(sessionReducer(s, { type: 'NEXT' })).toBe(s);
  });
  it('counts only first-try answers without hints as unaided', () => {
    let s = recall();
    s = sessionReducer(s, { type: 'HINT' });
    s = sessionReducer(s, { type: 'RECALL', position: currentTarget(s) });
    s = sessionReducer(s, { type: 'NEXT' });
    const wrong = s.positions.find((p) => p.string !== currentTarget(s).string)!;
    s = sessionReducer(s, { type: 'RECALL', position: wrong });
    s = finish(s);
    expect(sessionResults(s)).toMatchObject({ total: 6, unaided: 4, accuracy: 67, assisted: 1, retries: 1 });
    expect(s.phase).toBe('results');
  });
  it('keeps placement help separate from recall accuracy', () => {
    let s = sessionReducer(start(), { type: 'HINT' });
    s = sessionReducer(placed(s), { type: 'START_RECALL' });
    expect(sessionResults(finish(s))).toMatchObject({ accuracy: 100, placementHints: 1 });
  });
  it('caps hints at three and ignores clicks after a correct answer', () => {
    let s = recall();
    for (let i = 0; i < 5; i++) s = sessionReducer(s, { type: 'HINT' });
    expect(s.recalls[positionKey(currentTarget(s))].hints).toBe(3);
    s = sessionReducer(s, { type: 'RECALL', position: currentTarget(s) });
    expect(sessionReducer(s, { type: 'RECALL', position: s.positions[0] })).toBe(s);
  });
  it('allows every lesson to finish, including accidentals, upper frets and reviews', () => {
    for (const lesson of LESSONS.filter((l) => l.kind !== 'collect' && l.kind !== 'barre')) {
      const s = sessionReducer(placed(sessionReducer(createSession(lesson), { type: 'START_PLACE' })), { type: 'START_RECALL' });
      expect(sessionResults(finish(s)).accuracy).toBe(100);
    }
  });
});
