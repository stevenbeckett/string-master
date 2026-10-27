import { describe, expect, it } from 'vitest';
import { completedLessonCount, emptyProgress, loadProgress, nextLesson, recordCompletion, saveProgress, STORAGE_KEY } from './progress';
import { LESSONS } from './lessons';

describe('local learning history', () => {
  it('preserves the original lesson history and recommends the new final test', () => {
    const progress = LESSONS.filter((l) => l.kind !== 'test' && l.kind !== 'collect' && l.kind !== 'barre').reduce((saved, lesson) => recordCompletion(saved, lesson.id, 100), emptyProgress(false));
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(restored).toEqual(progress);
    expect(Object.keys(restored.lessons)).toHaveLength(22);
    expect(nextLesson(restored).id).toBe('string-6-octave');
  });
  it('keeps all 28 course completions separate from full-neck practice', () => {
    const progress = LESSONS.filter((l) => l.kind !== 'collect' && l.kind !== 'barre').reduce((saved, lesson) => recordCompletion(saved, lesson.id, 100), emptyProgress());
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(Object.keys(restored.lessons)).toHaveLength(28);
    expect(nextLesson(restored).id).toBe('open-strings');
    expect(completedLessonCount(restored)).toBe(28);
  });
  it('preserves legacy chord ratings without including practice in scored lesson completion', () => {
    let progress = LESSONS.filter((l) => l.kind !== 'barre').reduce((saved, lesson) => recordCompletion(saved, lesson.id, 100), emptyProgress());
    expect(nextLesson(progress).id).toBe('open-strings');
    progress = recordCompletion(progress, 'barre-chord-practice', 100);
    progress = recordCompletion(progress, 'barre-chord-practice', 0);
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(Object.keys(restored.lessons)).toHaveLength(30);
    expect(restored.lessons['barre-chord-practice']).toMatchObject({ visits: 2, lastAccuracy: 0 });
    expect(completedLessonCount(restored)).toBe(28);
    expect(nextLesson(restored).kind).not.toBe('barre');
  });
  it('saves practice settings and preserves them when learning progress is reset', () => {
    const barrePractice = { shape: 'A' as const, quality: 'minor' as const, seconds: 15 };
    const progress = { ...emptyProgress(false), barrePractice };
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(restored).toEqual(progress);
    expect(emptyProgress(restored.sound, restored.barrePractice)).toEqual(progress);
    const invalid = { ...progress, barrePractice: { ...barrePractice, seconds: 0 } };
    expect(loadProgress(() => ({ getItem: () => JSON.stringify(invalid), setItem: () => {} })).progress.barrePractice).toBeUndefined();
  });
  it('retains note-finding history while keeping it outside course progress and recommendations', () => {
    const progress = recordCompletion(emptyProgress(), 'find-every-instance', 75);
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(restored.lessons['find-every-instance'].lastAccuracy).toBe(75);
    expect(completedLessonCount(restored)).toBe(0);
    expect(nextLesson(restored).id).toBe('open-strings');
  });
  it('round-trips completion, sound, last accuracy and best accuracy', () => {
    const memory = new Map<string, string>();
    const store = () => ({ getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } });
    let progress = recordCompletion(emptyProgress(false), 'open-strings', 100);
    progress = recordCompletion(progress, 'open-strings', 67);
    expect(saveProgress(progress, store)).toBe(true);
    expect(loadProgress(store).progress).toEqual(progress);
    expect(progress.lessons['open-strings']).toMatchObject({ lastAccuracy: 67, bestAccuracy: 100, visits: 2 });
    expect(nextLesson(progress)).toBe(LESSONS[1]);
  });
  it('round-trips the chosen key with earlier lesson history and sound preferences', () => {
    const progress = { ...recordCompletion(emptyProgress(false), 'open-strings', 100), barrePractice: { shape: 'both' as const, quality: 'both' as const, seconds: 8, key: { tonic: 10, mode: 'major' as const } } };
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(restored).toEqual(progress);
    expect(emptyProgress(restored.sound, restored.barrePractice).barrePractice?.key).toEqual({ tonic: 10, mode: 'major' });
  });
  it('fails gracefully when browser storage is blocked or full', () => {
    const blocked = () => { throw new Error('Storage denied'); };
    expect(loadProgress(blocked).progress).toEqual(emptyProgress());
    expect(loadProgress(blocked).notice).toContain('unavailable');
    expect(saveProgress(emptyProgress(), blocked)).toBe(false);
  });
  it('stores open and barre preferences independently and keeps both after resetting lessons', () => {
    const barrePractice = { shape: 'A' as const, quality: 'major' as const, seconds: 5, labels: 'fingers' as const };
    const openPractice = { quality: 'minor' as const, seconds: 15, key: { tonic: 9, mode: 'minor' as const }, labels: 'notes' as const };
    const progress = recordCompletion(emptyProgress(false, barrePractice, openPractice), 'open-strings', 100);
    const restored = loadProgress(() => ({ getItem: () => JSON.stringify(progress), setItem: () => {} })).progress;
    expect(restored).toEqual(progress);
    const reset = emptyProgress(restored.sound, restored.barrePractice, restored.openPractice);
    expect(reset).toMatchObject({ sound: false, barrePractice, openPractice, lessons: {} });
    const invalid = { ...progress, openPractice: { ...openPractice, seconds: -1 } };
    const recovered = loadProgress(() => ({ getItem: () => JSON.stringify(invalid), setItem: () => {} })).progress;
    expect(recovered.openPractice).toBeUndefined();
    expect(recovered.barrePractice).toEqual(barrePractice);
    expect(recovered.lessons).toEqual(progress.lessons);
  });
  it('handles corrupt JSON and unknown versions', () => {
    for (const raw of ['{broken', 'null', '{"version":2}', '{"version":1,"sound":true,"lessons":[]}']) {
      expect(loadProgress(() => ({ getItem: () => raw, setItem: () => {} })).progress).toEqual(emptyProgress());
    }
  });
  it('ignores invalid or unknown lesson entries', () => {
    const data = { ...emptyProgress(), lessons: { 'unknown': { lastAccuracy: 100 }, 'open-strings': { lastAccuracy: -1, bestAccuracy: 100, visits: 1, completedAt: new Date().toISOString() } } };
    expect(loadProgress(() => ({ getItem: () => JSON.stringify(data), setItem: () => {} })).progress.lessons).toEqual({});
  });
  it('reset preserves sound and does not clear unrelated browser data', () => {
    const values = new Map([['another-app', 'keep me']]);
    saveProgress(emptyProgress(false), () => ({ getItem: () => null, setItem: (key, value) => { values.set(key, value); } }));
    expect(values.get('another-app')).toBe('keep me');
    expect(JSON.parse(values.get(STORAGE_KEY)!)).toEqual({ version: 1, sound: false, lessons: {} });
  });
});
