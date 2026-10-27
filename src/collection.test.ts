import { describe, expect, it } from 'vitest';
import { COLLECTION_LESSON, LESSONS } from './lessons';
import { STRINGS, pitchAt, positionKey } from './music';
import { collectionComplete, createSession, currentTarget, sessionReducer, sessionResults, type Session } from './session';

const start = (pitch = 4) => createSession(COLLECTION_LESSON, () => pitch / 12);
const found = (s: Session) => Object.values(s.recalls).filter((attempt) => attempt.solved).length;
const finish = (s: Session) => s.order.reduce((state, position) => sessionReducer(state, { type: 'COLLECT', position }), s);

describe('find every instance', () => {
  it.each(Array.from({ length: 12 }, (_, pitch) => pitch))('includes every occurrence of pitch %i on the full 22-fret neck', (pitch) => {
    const s = start(pitch);
    const expected = STRINGS.flatMap((string) => {
      const positions: string[] = [];
      for (let fret = (pitch - string.midi % 12 + 12) % 12; fret <= 22; fret += 12) positions.push(`${string.id}:${fret}`);
      return positions;
    });
    expect(s.phase).toBe('collect');
    expect(s.collection!.pitch).toBe(pitch);
    expect(s.positions).toHaveLength(138);
    expect(s.order.map(positionKey).sort()).toEqual(expected.sort());
    expect(s.order.every((p) => pitchAt(p) === pitch)).toBe(true);
    expect(found(s)).toBe(0);
  });
  it('counts matching open strings and different octaves as separate positions, once each', () => {
    let s = start();
    for (const position of [{ string: 6, fret: 0 }, { string: 6, fret: 12 }, { string: 1, fret: 0 }]) {
      s = sessionReducer(s, { type: 'COLLECT', position });
    }
    expect(found(s)).toBe(3);
    s = sessionReducer(s, { type: 'COLLECT', position: { string: 6, fret: 0 } });
    expect(found(s)).toBe(3);
    expect(s.collection!.mistakes).toBe(0);
  });
  it('gives feedback for a wrong guess without counting it as a find', () => {
    const s = sessionReducer(start(), { type: 'COLLECT', position: { string: 6, fret: 1 } });
    expect(found(s)).toBe(0);
    expect(s.collection).toMatchObject({ mistakes: 1, lastMiss: '6:1' });
    expect(s.feedbackKind).toBe('retry');
    expect(sessionReducer(s, { type: 'COLLECT', position: { string: 6, fret: 23 } })).toBe(s);
  });
  it('offers a string clue, a smaller region, and a reveal without collecting the answer automatically', () => {
    let s = start();
    const key = positionKey(currentTarget(s));
    for (let level = 1; level <= 3; level++) {
      s = sessionReducer(s, { type: 'HINT' });
      expect(s.recalls[key].hints).toBe(level);
      expect(s.recalls[key].solved).toBe(false);
    }
    expect(s.recalls['6:12'].hints).toBe(1);
    s = sessionReducer(s, { type: 'COLLECT', position: currentTarget(s) });
    expect(found(s)).toBe(1);
  });
  it('marks all remaining positions helped by a string clue as assisted', () => {
    let s = sessionReducer(start(), { type: 'HINT' });
    s = sessionReducer(s, { type: 'COLLECT', position: { string: 6, fret: 1 } });
    s = finish(s);
    expect(sessionResults(s)).toMatchObject({ total: 12, unaided: 10, assisted: 2, retries: 1, accuracy: 83 });
  });
  it('finishes only after all matches and supports a new, different random note', () => {
    const s = start();
    expect(sessionReducer(s, { type: 'FINISH_COLLECTION' })).toBe(s);
    const completed = finish(s);
    expect(collectionComplete(completed)).toBe(true);
    expect(sessionReducer(completed, { type: 'COLLECT', position: { string: 6, fret: 1 } })).toBe(completed);
    expect(sessionReducer(completed, { type: 'FINISH_COLLECTION' }).phase).toBe('results');
    expect(sessionResults(completed)).toMatchObject({ total: 12, unaided: 12, accuracy: 100 });
    for (let previous = 0; previous < 12; previous++) {
      const next = createSession(COLLECTION_LESSON, () => 0.5, previous);
      expect(next.collection!.pitch).not.toBe(previous);
      expect(found(next)).toBe(0);
      expect(next.collection!.mistakes).toBe(0);
    }
  });
  it('marks only unfound positions as assisted when the full map is viewed', () => {
    let s = sessionReducer(start(), { type: 'COLLECT', position: { string: 6, fret: 0 } });
    s = sessionReducer(s, { type: 'VIEW_NOTE_MAP' });
    expect(found(s)).toBe(1);
    expect(s.recalls['6:0'].mapViewed).toBeUndefined();
    expect(Object.values(s.recalls).filter((attempt) => attempt.mapViewed)).toHaveLength(11);
    expect(Object.values(s.recalls).every((attempt) => attempt.hints === 0)).toBe(true);
    expect(sessionReducer(s, { type: 'VIEW_NOTE_MAP' })).toBe(s);
    s = finish(s);
    expect(sessionResults(s)).toMatchObject({ total: 12, unaided: 1, assisted: 11, accuracy: 8 });
  });
  it('viewing the map never collects answers or completes a search', () => {
    const s = sessionReducer(start(), { type: 'VIEW_NOTE_MAP' });
    expect(found(s)).toBe(0);
    expect(s.phase).toBe('collect');
    expect(collectionComplete(s)).toBe(false);
    expect(sessionReducer(s, { type: 'FINISH_COLLECTION' })).toBe(s);
    expect(sessionResults(finish(s))).toMatchObject({ unaided: 0, assisted: 12, accuracy: 0 });
  });
  it('keeps ordinary hints available without counting map help twice', () => {
    let s = sessionReducer(start(), { type: 'VIEW_NOTE_MAP' });
    s = sessionReducer(s, { type: 'HINT' });
    expect(s.recalls[positionKey(currentTarget(s))].hints).toBe(1);
    expect(sessionResults(finish(s))).toMatchObject({ assisted: 12, accuracy: 0 });
  });
  it('preserves a completed unaided search and clears map assistance for a new round', () => {
    const completed = finish(start());
    expect(sessionReducer(completed, { type: 'VIEW_NOTE_MAP' })).toBe(completed);
    expect(sessionResults(completed).accuracy).toBe(100);
    const fresh = createSession(COLLECTION_LESSON, () => .5, completed.collection!.pitch);
    expect(Object.values(fresh.recalls).every((attempt) => !attempt.mapViewed && attempt.hints === 0)).toBe(true);
    const ordinaryLesson = createSession(LESSONS[0]);
    expect(sessionReducer(ordinaryLesson, { type: 'VIEW_NOTE_MAP' })).toBe(ordinaryLesson);
  });
});
