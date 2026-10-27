import { describe, expect, it } from 'vitest';
import { STRINGS, frequency, fretboardPositions, midiAt, noteLabel, pitchAt, pitchFromName } from './music';
import { COLLECTION_LESSON, LEARNING_LESSONS, LESSONS, lessonPositions } from './lessons';

describe('standard guitar fretboard', () => {
  it('uses concert-pitch standard tuning from low E to high E', () => {
    expect(STRINGS.map((s) => s.midi)).toEqual([40, 45, 50, 55, 59, 64]);
    expect(STRINGS.map((s) => noteLabel(pitchAt({ string: s.id, fret: 0 })))).toEqual(['E', 'A', 'D', 'G', 'B', 'E']);
    expect(frequency(69)).toBe(440);
    expect(frequency(40)).toBeCloseTo(82.4069, 3);
  });
  it('matches an independent chromatic sequence on every string through fret 12', () => {
    const expected = [
      [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4],
      [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2],
      [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7],
      [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4],
    ];
    STRINGS.forEach((s, i) => {
      expect(Array.from({ length: 13 }, (_, fret) => pitchAt({ string: s.id, fret }))).toEqual(expected[i]);
      expect(midiAt({ string: s.id, fret: 12 }) - midiAt({ string: s.id, fret: 0 })).toBe(12);
    });
  });
  it('steps directly from E to F and B to C', () => {
    expect(noteLabel(pitchAt({ string: 6, fret: 1 }))).toBe('F');
    expect(noteLabel(pitchAt({ string: 2, fret: 1 }))).toBe('C');
  });
  it('treats sharp and flat spellings as the same pitch', () => {
    for (const [sharp, flat] of [['C#', 'Db'], ['D#', 'Eb'], ['F#', 'Gb'], ['G#', 'Ab'], ['A#', 'Bb']]) {
      expect(pitchFromName(sharp)).toBe(pitchFromName(flat));
    }
    expect(pitchFromName('C♯')).toBe(1);
    expect(pitchFromName('D♭')).toBe(1);
    expect(pitchFromName('H')).toBeUndefined();
  });
  it('rejects positions outside the supported instrument', () => {
    expect(() => midiAt({ string: 7, fret: 0 })).toThrow();
    expect(() => midiAt({ string: 6, fret: 23 })).toThrow();
    expect(() => midiAt({ string: 6, fret: -1 })).toThrow();
    expect(() => midiAt({ string: 6, fret: 1.5 })).toThrow();
  });
  it('covers the upper neck correctly through fret 22', () => {
    expect(fretboardPositions()).toHaveLength(138);
    for (const string of STRINGS) {
      for (let fret = 13; fret <= 22; fret++) {
        expect(midiAt({ string: string.id, fret })).toBe(string.midi + fret);
        expect(pitchAt({ string: string.id, fret })).toBe(pitchAt({ string: string.id, fret: fret - 12 }));
      }
    }
    expect(noteLabel(pitchAt({ string: 1, fret: 22 }))).toBe('D');
  });
});

describe('learning path', () => {
  it('separates 28 course lessons from note-finding practice and keeps all original positions', () => {
    expect(LEARNING_LESSONS).toHaveLength(28);
    expect(LEARNING_LESSONS.some((lesson) => lesson.kind === 'collect')).toBe(false);
    expect(LESSONS).toHaveLength(29);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(29);
    expect(LESSONS.some((l) => l.kind === 'barre')).toBe(false);
    const positions = new Set(LESSONS.filter((l) => l.kind !== 'review' && l.kind !== 'collect').flatMap((l) => lessonPositions(l).map((p) => `${p.string}:${p.fret}`)));
    expect(positions.size).toBe(78);
    expect(lessonPositions(COLLECTION_LESSON)).toHaveLength(138);
  });
  it('follows low E to high E, with a final test after each string’s three bands', () => {
    expect(LESSONS.filter((l) => l.kind === 'string').map((l) => l.string)).toEqual([6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1, 1]);
    for (const string of STRINGS) {
      const group = LESSONS.filter((l) => l.string === string.id);
      expect(group.map((l) => l.kind)).toEqual(['string', 'string', 'string', 'test']);
      expect(LESSONS.indexOf(group[3])).toBe(LESSONS.indexOf(group[2]) + 1);
    }
  });
  it.each(STRINGS)('tests all twelve distinct notes on the $name string', (string) => {
    const lesson = LESSONS.find((l) => l.kind === 'test' && l.string === string.id)!;
    const positions = lessonPositions(lesson);
    expect(positions).toHaveLength(12);
    expect(positions.map((p) => p.fret)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(positions.every((p) => p.string === string.id)).toBe(true);
    expect([...new Set(positions.map(pitchAt))].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('keeps mixed reviews to one position per string in the requested band', () => {
    for (const lesson of LESSONS.filter((l) => l.kind === 'review')) {
      const positions = lessonPositions(lesson);
      expect(positions).toHaveLength(6);
      expect(new Set(positions.map((p) => p.string)).size).toBe(6);
      expect(positions.every((p) => p.fret >= lesson.band.start && p.fret <= lesson.band.end)).toBe(true);
    }
  });
});
