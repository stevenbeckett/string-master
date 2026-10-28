import { DEFAULT_PRACTICE_MINUTES, keyTriads, validChordKey, validChordLabels, validChordSeconds, validPracticeMinutes, type ChordLabelMode, type ChordOptions, type GuitarChord } from './chords';

export const OPEN_CHORD_PRACTICE_ID = 'open-chord-practice';
export type OpenChordOptions = Pick<ChordOptions, 'quality' | 'key'>;
export type OpenChordSettings = OpenChordOptions & { seconds: number; practiceMinutes?: number; labels?: ChordLabelMode };
export type OpenChord = GuitarChord & { kind: 'open'; tip: string };
export const DEFAULT_OPEN_SETTINGS: OpenChordSettings = { quality: 'both', seconds: 10, practiceMinutes: DEFAULT_PRACTICE_MINUTES };

function define(root: number, quality: OpenChord['quality'], rootString: number, frets: (number | null)[], fingers: (number | null)[], tip: string): OpenChord {
  return { id: `open-${root}-${quality}`, kind: 'open', root, quality, rootString, tip,
    voices: frets.map((fret, i) => ({ string: 6 - i, fret, finger: fingers[i] })) };
}

// One common, non-barre fingering for each of the eight beginner open chords.
// Finger 0 means an open string; null means a muted string.
export const OPEN_CHORDS: OpenChord[] = [
  define(0, 'major', 5, [null, 3, 2, 0, 1, 0], [null, 3, 2, 0, 1, 0], 'Let the open G and high e strings ring. Keep your fingers arched so they do not touch those strings.'),
  define(9, 'major', 5, [null, 0, 2, 2, 2, 0], [null, 0, 1, 2, 3, 0], 'Fit three fingertips across D, G and B at fret 2. Leave the high e string open.'),
  define(7, 'major', 6, [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3], 'Let the open D, G and B strings ring between your fretted notes.'),
  define(4, 'major', 6, [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0], 'Keep your index finger on G at fret 1. Let both E strings and the B string ring open.'),
  define(2, 'major', 4, [null, null, 0, 2, 3, 2], [null, null, 0, 1, 3, 2], 'Make a small triangle with your fingertips. Leave the low E and A strings out of your strum.'),
  define(9, 'minor', 5, [null, 0, 2, 2, 1, 0], [null, 0, 2, 3, 1, 0], 'Keep your index finger on B at fret 1. Let the A and high e strings ring open.'),
  define(4, 'minor', 6, [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0], 'Press only A and D at fret 2. Keep every other string open and ringing.'),
  define(2, 'minor', 4, [null, null, 0, 2, 3, 1], [null, null, 0, 2, 3, 1], 'Place your index finger on high e at fret 1. Leave the low E and A strings out of your strum.'),
];

export function openChordPool(options: OpenChordOptions = DEFAULT_OPEN_SETTINGS): OpenChord[] {
  const family = options.key ? keyTriads(options.key) : null;
  return OPEN_CHORDS.filter((chord) => (options.quality === 'both' || chord.quality === options.quality)
    && (!family || family.some((triad) => triad.root === chord.root && triad.quality === chord.quality)));
}
export function randomOpenChord(options: OpenChordOptions = DEFAULT_OPEN_SETTINGS, previousId?: string, random = Math.random): OpenChord | null {
  const pool = openChordPool(options);
  const choices = pool.length > 1 ? pool.filter((chord) => chord.id !== previousId) : pool;
  return choices.length ? choices[Math.floor(random() * choices.length)] : null;
}
export function validOpenSettings(value: unknown): value is OpenChordSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<OpenChordSettings>;
  return ['both', 'major', 'minor'].includes(settings.quality ?? '') && typeof settings.seconds === 'number'
    && validChordSeconds(settings.seconds) && (settings.practiceMinutes === undefined || (typeof settings.practiceMinutes === 'number' && validPracticeMinutes(settings.practiceMinutes))) && (settings.key == null || validChordKey(settings.key)) && (settings.labels === undefined || validChordLabels(settings.labels));
}
