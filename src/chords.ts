import { NOTES, midiAt, type Position } from './music';

export type ChordShape = 'E' | 'A';
export type ChordQuality = 'major' | 'minor';
export type ChordLabelMode = 'fingers' | 'notes';
export type ChordKey = { tonic: number; mode: 'major' | 'minor' };
export type ChordOptions = { shape: ChordShape | 'both'; quality: ChordQuality | 'both'; key?: ChordKey | null };
export type BarrePracticeSettings = ChordOptions & { seconds: number; labels?: ChordLabelMode };
export type ChordVoice = { string: number; fret: number | null; finger: number | null };
export type GuitarChord = {
  id: string;
  root: number;
  quality: ChordQuality;
  rootString: number;
  voices: ChordVoice[];
};
export type BarreChord = GuitarChord & { shape: ChordShape; fret: number };
export const DEFAULT_CHORD_OPTIONS: ChordOptions = { shape: 'both', quality: 'both' };
export const DEFAULT_BARRE_SETTINGS: BarrePracticeSettings = { ...DEFAULT_CHORD_OPTIONS, seconds: 10 };
export const validChordSeconds = (seconds: number) => Number.isInteger(seconds) && seconds >= 1 && seconds <= 300;
export const validChordLabels = (value: unknown): value is ChordLabelMode => value === 'fingers' || value === 'notes';
export function validChordKey(value: unknown): value is ChordKey {
  if (!value || typeof value !== 'object') return false;
  const key = value as Partial<ChordKey>;
  return typeof key.tonic === 'number' && Number.isInteger(key.tonic) && key.tonic >= 0 && key.tonic < 12 && (key.mode === 'major' || key.mode === 'minor');
}
export function validBarreSettings(value: unknown): value is BarrePracticeSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<BarrePracticeSettings>;
  return ['both', 'E', 'A'].includes(settings.shape ?? '') && ['both', 'major', 'minor'].includes(settings.quality ?? '') && typeof settings.seconds === 'number' && validChordSeconds(settings.seconds) && (settings.key == null || validChordKey(settings.key)) && (settings.labels === undefined || validChordLabels(settings.labels));
}

// Use common enharmonic spellings, avoiding keys needing double accidentals.
export const KEY_ROOT_NAMES = {
  major: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
  minor: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'],
} as const;
export const keyName = (key: ChordKey) => `${KEY_ROOT_NAMES[key.mode][key.tonic]} ${key.mode === 'minor' ? 'natural minor' : 'major'}`;
type KeyTriad = { root: number; quality: ChordQuality };
export function keyTriads(key: ChordKey): KeyTriad[] {
  // Diatonic triads supported by the existing major/minor barre shapes.
  // Major omits vii°; natural minor omits ii°.
  const offsets = key.mode === 'major' ? [0, 2, 4, 5, 7, 9] : [0, 3, 5, 7, 8, 10];
  const qualities: ChordQuality[] = key.mode === 'major'
    ? ['major', 'minor', 'minor', 'major', 'major', 'minor']
    : ['minor', 'major', 'minor', 'minor', 'major', 'major'];
  return offsets.map((offset, index) => ({ root: (key.tonic + offset) % 12, quality: qualities[index] }));
}
export function pitchName(root: number, key?: ChordKey | null): string {
  if (key) {
    const scale = key.mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    const degree = scale.findIndex((offset) => (key.tonic + offset) % 12 === root);
    if (degree >= 0) {
      const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const letter = (letters.indexOf(KEY_ROOT_NAMES[key.mode][key.tonic][0]) + degree) % 7;
      const alteration = (root - [0, 2, 4, 5, 7, 9, 11][letter] + 12) % 12;
      return letters[letter] + (alteration === 1 ? '♯' : alteration === 11 ? '♭' : '');
    }
  }
  const flats = key && (key.mode === 'major' ? [1, 3, 5, 8, 10] : [0, 2, 5, 7, 10]).includes(key.tonic);
  return flats && NOTES[root].flat ? NOTES[root].flat : NOTES[root].name;
}

export function barreChord(root: number, shape: ChordShape, quality: ChordQuality): BarreChord {
  if (!Number.isInteger(root) || root < 0 || root > 11) throw new Error('A chord root must be one of the twelve pitches');
  const rootString = shape === 'E' ? 6 : 5;
  const openPitch = shape === 'E' ? 4 : 9;
  const fret = (root - openPitch + 12) % 12 || 12;
  const offsets = shape === 'E'
    ? quality === 'major' ? [0, 2, 2, 1, 0, 0] : [0, 2, 2, 0, 0, 0]
    : quality === 'major' ? [null, 0, 2, 2, 2, 0] : [null, 0, 2, 2, 1, 0];
  const fingers = shape === 'E'
    ? quality === 'major' ? [1, 3, 4, 2, 1, 1] : [1, 3, 4, 1, 1, 1]
    : quality === 'major' ? [null, 1, 3, 3, 3, 1] : [null, 1, 3, 4, 2, 1];
  return { id: `${root}-${shape}-${quality}`, root, shape, quality, fret, rootString,
    voices: offsets.map((offset, i) => ({ string: 6 - i, fret: offset === null ? null : fret + offset, finger: fingers[i] })) };
}

export function chordPool(options: ChordOptions = DEFAULT_CHORD_OPTIONS): BarreChord[] {
  const shapes: ChordShape[] = options.shape === 'both' ? ['E', 'A'] : [options.shape];
  const qualities: ChordQuality[] = options.quality === 'both' ? ['major', 'minor'] : [options.quality];
  if (options.key) return keyTriads(options.key).filter((chord) => qualities.includes(chord.quality))
    .flatMap(({ root, quality }) => shapes.map((shape) => barreChord(root, shape, quality)));
  return Array.from({ length: 12 }, (_, root) => shapes.flatMap((shape) => qualities.map((quality) => barreChord(root, shape, quality)))).flat();
}
export function randomChord(options = DEFAULT_CHORD_OPTIONS, previousId?: string, random = Math.random): BarreChord {
  const choices = chordPool(options).filter((chord) => chord.id !== previousId);
  return choices[Math.floor(random() * choices.length)];
}
export const chordName = (chord: KeyTriad, key?: ChordKey | null) => `${pitchName(chord.root, key)} ${chord.quality}`;
export const chordAlias = (chord: KeyTriad, key?: ChordKey | null) => NOTES[chord.root].flat ? `${pitchName(chord.root, key) === NOTES[chord.root].name ? NOTES[chord.root].flat : NOTES[chord.root].name} ${chord.quality}` : '';
export const chordPositions = (chord: Pick<GuitarChord, 'voices'>): Position[] => chord.voices.filter((v) => v.fret !== null).map((v) => ({ string: v.string, fret: v.fret! }));
export const chordMidis = (chord: Pick<GuitarChord, 'voices'>) => chordPositions(chord).map(midiAt);
