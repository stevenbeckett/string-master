import { describe, expect, it } from 'vitest';
import { chordMidis, chordName } from './chords';
import { pitchAt } from './music';
import { DEFAULT_OPEN_SETTINGS, OPEN_CHORDS, openChordPool, randomOpenChord, validOpenSettings } from './openChords';

describe('common open chord fingerings', () => {
  const references = [
    ['C major', [null, 3, 2, 0, 1, 0]], ['A major', [null, 0, 2, 2, 2, 0]],
    ['G major', [3, 2, 0, 0, 0, 3]], ['E major', [0, 2, 2, 1, 0, 0]],
    ['D major', [null, null, 0, 2, 3, 2]], ['A minor', [null, 0, 2, 2, 1, 0]],
    ['E minor', [0, 2, 2, 0, 0, 0]], ['D minor', [null, null, 0, 2, 3, 1]],
  ] as const;
  it.each(references)('matches the independent reference voicing for %s', (name, frets) => {
    const chord = OPEN_CHORDS.find((chord) => chordName(chord) === name)!;
    expect(chord.voices.map((voice) => voice.fret)).toEqual(frets);
  });
  it.each(OPEN_CHORDS)('contains a complete triad and playable open fingering for $id', (chord) => {
    const intervals = [...new Set(chordMidis(chord).map((midi) => (midi - chord.root) % 12))].sort((a, b) => a - b);
    expect(intervals).toEqual(chord.quality === 'major' ? [0, 4, 7] : [0, 3, 7]);
    expect(chord.voices.some((voice) => voice.fret === 0)).toBe(true);
    expect(chordMidis(chord)[0] % 12).toBe(chord.root);
    const root = chord.voices.find((voice) => voice.string === chord.rootString)!;
    expect(pitchAt({ string: root.string, fret: root.fret! })).toBe(chord.root);
    const fretted = chord.voices.filter((voice) => voice.fret !== null && voice.fret > 0);
    expect(new Set(fretted.map((voice) => voice.finger)).size).toBe(fretted.length);
    for (const voice of chord.voices) {
      if (voice.fret === null) expect(voice.finger).toBeNull();
      else if (voice.fret === 0) expect(voice.finger).toBe(0);
      else {
        expect(voice.fret).toBeGreaterThanOrEqual(1);
        expect(voice.fret).toBeLessThanOrEqual(3);
        expect(voice.finger).toBeGreaterThanOrEqual(1);
        expect(voice.finger).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('open chord practice pools', () => {
  it('offers five major and three minor chords with distinct identities', () => {
    expect(openChordPool()).toHaveLength(8);
    expect(new Set(OPEN_CHORDS.map((chord) => chord.id)).size).toBe(8);
    expect(openChordPool({ quality: 'major' })).toHaveLength(5);
    expect(openChordPool({ quality: 'minor' })).toHaveLength(3);
  });
  it('includes only the available open shapes from a key, with the right qualities', () => {
    expect(openChordPool({ quality: 'both', key: { tonic: 0, mode: 'major' } }).map((chord) => chordName(chord))).toEqual(['C major', 'G major', 'A minor', 'E minor', 'D minor']);
    expect(openChordPool({ quality: 'major', key: { tonic: 7, mode: 'major' } }).map((chord) => chordName(chord))).toEqual(['C major', 'G major', 'D major']);
    expect(openChordPool({ quality: 'minor', key: { tonic: 9, mode: 'minor' } }).map((chord) => chordName(chord))).toEqual(['A minor', 'E minor', 'D minor']);
  });
  it('keeps every tone in the selected scale across all keys and filters', () => {
    for (let tonic = 0; tonic < 12; tonic++) for (const mode of ['major', 'minor'] as const) {
      const scale = (mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]).map((offset) => (tonic + offset) % 12);
      for (const quality of ['both', 'major', 'minor'] as const) {
        for (const chord of openChordPool({ quality, key: { tonic, mode } })) {
          expect(chordMidis(chord).every((midi) => scale.includes(midi % 12))).toBe(true);
          if (quality !== 'both') expect(chord.quality).toBe(quality);
        }
      }
    }
  });
  it('avoids immediate repeats when there is a choice', () => {
    const first = randomOpenChord(DEFAULT_OPEN_SETTINGS, undefined, () => 0)!;
    expect(randomOpenChord(DEFAULT_OPEN_SETTINGS, first.id, () => 0)?.id).not.toBe(first.id);
  });
  it('returns no prompt for an empty key and safely repeats the only available chord', () => {
    expect(randomOpenChord({ quality: 'both', key: { tonic: 1, mode: 'major' } })).toBeNull();
    const single = { quality: 'both' as const, key: { tonic: 7, mode: 'minor' as const } };
    const first = randomOpenChord(single)!;
    expect(chordName(first)).toBe('D minor');
    expect(randomOpenChord(single, first.id)).toEqual(first);
    expect(randomOpenChord({ ...single, quality: 'major' })).toBeNull();
  });
  it('validates separate settings, including key and interval bounds', () => {
    expect(validOpenSettings(DEFAULT_OPEN_SETTINGS)).toBe(true);
    for (const seconds of [1, 300]) expect(validOpenSettings({ quality: 'minor', seconds, key: { tonic: 9, mode: 'minor' } })).toBe(true);
    for (const seconds of [0, 1.5, 301]) expect(validOpenSettings({ ...DEFAULT_OPEN_SETTINGS, seconds })).toBe(false);
    expect(validOpenSettings({ ...DEFAULT_OPEN_SETTINGS, quality: 'seventh' })).toBe(false);
    expect(validOpenSettings({ ...DEFAULT_OPEN_SETTINGS, key: { tonic: 12, mode: 'major' } })).toBe(false);
    expect(validOpenSettings({ ...DEFAULT_OPEN_SETTINGS, labels: 'notes' })).toBe(true);
    expect(validOpenSettings({ ...DEFAULT_OPEN_SETTINGS, labels: 'fingers' })).toBe(true);
    expect(validOpenSettings({ ...DEFAULT_OPEN_SETTINGS, labels: 'frets' })).toBe(false);
  });
});
