import { describe, expect, it } from 'vitest';
import { BARRE_LESSON } from './lessons';
import { KEY_ROOT_NAMES, barreChord, chordAlias, chordMidis, chordName, chordPool, keyName, keyTriads, pitchName, randomChord, validBarreSettings, validChordKey, validChordSeconds, type ChordKey, type ChordOptions } from './chords';
import { pitchAt, pitchFromName } from './music';
import { createSession } from './session';

describe('E- and A-shaped barre chord definitions', () => {
  it.each(chordPool())('contains the correct triad for root $root, $shape shape, $quality', (chord) => {
    const midis = chordMidis(chord);
    const intervals = [...new Set(midis.map((midi) => (midi - chord.root + 12) % 12))].sort((a, b) => a - b);
    expect(intervals).toEqual(chord.quality === 'major' ? [0, 4, 7] : [0, 3, 7]);
    expect(chord.fret).toBeGreaterThanOrEqual(1);
    expect(chord.fret).toBeLessThanOrEqual(12);
    expect(pitchAt({ string: chord.rootString, fret: chord.fret })).toBe(chord.root);
    expect(chord.voices.filter((v) => v.fret !== null).every((v) => v.fret! >= chord.fret && v.fret! <= chord.fret + 2 && v.finger! >= 1 && v.finger! <= 4)).toBe(true);
    expect(chord.voices[0].fret === null).toBe(chord.shape === 'A');
    expect(midis).toHaveLength(chord.shape === 'A' ? 5 : 6);
  });
  it('matches familiar independent reference fingerings', () => {
    expect(barreChord(9, 'E', 'major').voices.map((v) => v.fret)).toEqual([5, 7, 7, 6, 5, 5]);
    expect(barreChord(9, 'E', 'minor').voices.map((v) => v.fret)).toEqual([5, 7, 7, 5, 5, 5]);
    expect(barreChord(0, 'A', 'major').voices.map((v) => v.fret)).toEqual([null, 3, 5, 5, 5, 3]);
    expect(barreChord(11, 'A', 'minor').voices.map((v) => v.fret)).toEqual([null, 2, 4, 4, 3, 2]);
  });
  it('keeps open-root chords as barre shapes at fret 12, with fingers reaching fret 14', () => {
    expect(barreChord(4, 'E', 'major').voices.map((v) => v.fret)).toEqual([12, 14, 14, 13, 12, 12]);
    expect(barreChord(9, 'A', 'minor').voices.map((v) => v.fret)).toEqual([null, 12, 14, 14, 13, 12]);
  });
  it('uses a ring-finger barre over D, G and B in A-shaped major chords', () => {
    const chord = barreChord(0, 'A', 'major');
    expect(chord.voices.filter((v) => [4, 3, 2].includes(v.string)).map((v) => [v.fret, v.finger])).toEqual([[5, 3], [5, 3], [5, 3]]);
  });
});

describe('chords in a chosen key', () => {
  it('spells every scale tone for note labels, including E sharp in F-sharp major', () => {
    expect([6, 8, 10, 11, 1, 3, 5].map((pitch) => pitchName(pitch, { tonic: 6, mode: 'major' }))).toEqual(['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯']);
    expect([10, 0, 2, 3, 5, 7, 9].map((pitch) => pitchName(pitch, { tonic: 10, mode: 'major' }))).toEqual(['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A']);
    expect([3, 5, 6, 8, 10, 11, 1].map((pitch) => pitchName(pitch, { tonic: 3, mode: 'minor' }))).toEqual(['D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B', 'C♯']);
  });
  it('accepts optional Fingers/Notes preferences while keeping older settings valid', () => {
    const settings = { shape: 'both', quality: 'both', seconds: 10 };
    expect(validBarreSettings(settings)).toBe(true);
    expect(validBarreSettings({ ...settings, labels: 'notes' })).toBe(true);
    expect(validBarreSettings({ ...settings, labels: 'fingers' })).toBe(true);
    expect(validBarreSettings({ ...settings, labels: 'frets' })).toBe(false);
  });
  const keys = Array.from({ length: 12 }, (_, tonic) => (['major', 'minor'] as const).map((mode) => ({ tonic, mode }))).flat();
  it.each(keys)('uses only notes from the $tonic $mode scale, with every shape and quality filter', (key) => {
    const scale = (key.mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]).map((offset) => (key.tonic + offset) % 12);
    expect(chordPool({ shape: 'both', quality: 'both', key })).toHaveLength(12);
    expect(keyTriads(key)).toHaveLength(6);
    for (const shape of ['both', 'E', 'A'] as const) {
      for (const quality of ['both', 'major', 'minor'] as const) {
        const pool = chordPool({ shape, quality, key });
        expect(pool).toHaveLength((shape === 'both' ? 2 : 1) * (quality === 'both' ? 6 : 3));
        expect(new Set(pool.map((chord) => chord.id)).size).toBe(pool.length);
        for (const chord of pool) {
          expect(chordMidis(chord).every((midi) => scale.includes(midi % 12))).toBe(true);
          if (shape !== 'both') expect(chord.shape).toBe(shape);
          if (quality !== 'both') expect(chord.quality).toBe(quality);
        }
        const previous = randomChord({ shape, quality, key }, undefined, () => 0);
        expect(randomChord({ shape, quality, key }, previous.id, () => 0).id).not.toBe(previous.id);
      }
    }
  });
  it('matches the C-major and A-natural-minor chord families, omitting B diminished', () => {
    expect(keyTriads({ tonic: 0, mode: 'major' }).map((triad) => chordName(triad))).toEqual(['C major', 'D minor', 'E minor', 'F major', 'G major', 'A minor']);
    expect(keyTriads({ tonic: 9, mode: 'minor' }).map((triad) => chordName(triad))).toEqual(['A minor', 'C major', 'D minor', 'E minor', 'F major', 'G major']);
  });
  it('spells flat keys and sharp keys consistently while preserving pitch identity', () => {
    const flatKey: ChordKey = { tonic: 10, mode: 'major' };
    expect(keyName(flatKey)).toBe('B♭ major');
    expect(keyTriads(flatKey).map((triad) => chordName(triad, flatKey))).toEqual(['B♭ major', 'C minor', 'D minor', 'E♭ major', 'F major', 'G minor']);
    expect(chordAlias(barreChord(10, 'E', 'major'), flatKey)).toBe('A♯ major');
    expect(chordName(barreChord(6, 'A', 'minor'), { tonic: 4, mode: 'major' })).toBe('F♯ minor');
    for (const key of keys) {
      expect(pitchFromName(KEY_ROOT_NAMES[key.mode][key.tonic])).toBe(key.tonic);
      for (const chord of chordPool({ shape: 'both', quality: 'both', key })) expect(pitchFromName(chordName(chord, key).split(' ')[0])).toBe(chord.root);
    }
  });
  it('passes the key to successive timed-practice sessions and restores unrestricted random mode', () => {
    const options: ChordOptions = { shape: 'A', quality: 'minor', key: { tonic: 7, mode: 'major' } };
    const first = createSession(BARRE_LESSON, () => .5, undefined, { options });
    const next = createSession(BARRE_LESSON, () => .5, undefined, { options, previousId: first.barre!.prompt.id });
    expect(next.barre?.options).toEqual(options);
    expect(next.barre?.prompt.id).not.toBe(first.barre?.prompt.id);
    expect(chordPool(options).map((chord) => chord.id)).toContain(next.barre!.prompt.id);
    expect(chordPool({ ...options, key: null })).toHaveLength(12);
  });
  it('accepts older preferences without a key and rejects invalid key settings', () => {
    const settings = { shape: 'both', quality: 'both', seconds: 10 };
    expect(validBarreSettings(settings)).toBe(true);
    expect(validBarreSettings({ ...settings, key: null })).toBe(true);
    expect(validBarreSettings({ ...settings, key: { tonic: 10, mode: 'minor' } })).toBe(true);
    for (const key of [true, {}, { tonic: 12, mode: 'major' }, { tonic: -1, mode: 'major' }, { tonic: .5, mode: 'major' }, { tonic: '0', mode: 'major' }, { tonic: 0, mode: 'dorian' }]) {
      expect(validChordKey(key)).toBe(false);
      expect(validBarreSettings({ ...settings, key })).toBe(false);
    }
  });
});

describe('random chord practice prompts', () => {
  it('has 48 distinct prompts and respects both filters', () => {
    expect(chordPool()).toHaveLength(48);
    expect(new Set(chordPool().map((chord) => chord.id)).size).toBe(48);
    const options: ChordOptions = { shape: 'A', quality: 'minor' };
    expect(chordPool(options)).toHaveLength(12);
    expect(chordPool(options).every((chord) => chord.shape === 'A' && chord.quality === 'minor')).toBe(true);
    expect(randomChord(options, undefined, () => 0).shape).toBe('A');
  });
  it('avoids repeating the exact chord and shape immediately', () => {
    const previous = randomChord(undefined, undefined, () => 0);
    expect(randomChord(undefined, previous.id, () => 0).id).not.toBe(previous.id);
  });
  it('provides a ready-to-play chord without a scoring or reveal step', () => {
    const s = createSession(BARRE_LESSON, () => .5);
    expect(s.phase).toBe('barre');
    expect(s.barre?.prompt.voices).toHaveLength(6);
    expect(s.recalls).toEqual({});
    expect(s.barre).not.toHaveProperty('revealed');
    expect(s.barre).not.toHaveProperty('rating');
  });
  it('retains selected filters when creating the next prompt', () => {
    const options: ChordOptions = { shape: 'E', quality: 'major' };
    const previous = randomChord(options, undefined, () => .5);
    const s = createSession(BARRE_LESSON, () => .5, undefined, { options, previousId: previous.id });
    expect(s.barre?.options).toEqual(options);
    expect(s.barre?.prompt.shape).toBe('E');
    expect(s.barre?.prompt.quality).toBe('major');
    expect(s.barre?.prompt.id).not.toBe(previous.id);
  });
  it('accepts only whole-second intervals between 1 and 300 and valid practice filters', () => {
    for (const seconds of [1, 10, 300]) expect(validChordSeconds(seconds)).toBe(true);
    for (const seconds of [0, -1, 1.5, 301, NaN, Infinity]) expect(validChordSeconds(seconds)).toBe(false);
    expect(validBarreSettings({ shape: 'A', quality: 'minor', seconds: 12 })).toBe(true);
    expect(validBarreSettings({ shape: 'D', quality: 'minor', seconds: 12 })).toBe(false);
    expect(validBarreSettings({ shape: 'E', quality: 'seventh', seconds: 12 })).toBe(false);
    expect(validBarreSettings({ shape: 'E', quality: 'major', seconds: 0 })).toBe(false);
  });
});
