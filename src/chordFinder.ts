import { KEY_ROOT_NAMES, type ChordQuality, type ChordVoice } from './chords';
import { pitchAt } from './music';
import { OPEN_CHORDS } from './openChords';

export type ChordFamily = 'Triads' | 'Power' | 'Sevenths' | 'Sixths & extensions';
export type ChordType = {
  id: string;
  family: ChordFamily;
  name: string;
  symbol: string;
  intervals: number[];
  required: number[];
  minStrings: number;
};
export type FinderChord = {
  id: string;
  kind: 'finder';
  name: string;
  root: number;
  quality: ChordQuality;
  rootString: number;
  voices: ChordVoice[];
};

export const CHORD_FAMILIES: ChordFamily[] = ['Triads', 'Power', 'Sevenths', 'Sixths & extensions'];
export const CHORD_TYPES: ChordType[] = [
  { id: 'major', family: 'Triads', name: 'Major', symbol: '', intervals: [0, 4, 7], required: [0, 4], minStrings: 4 },
  { id: 'minor', family: 'Triads', name: 'Minor', symbol: 'm', intervals: [0, 3, 7], required: [0, 3], minStrings: 4 },
  { id: 'diminished', family: 'Triads', name: 'Diminished', symbol: 'dim', intervals: [0, 3, 6], required: [0, 3, 6], minStrings: 4 },
  { id: 'augmented', family: 'Triads', name: 'Augmented', symbol: 'aug', intervals: [0, 4, 8], required: [0, 4, 8], minStrings: 4 },
  { id: 'sus2', family: 'Triads', name: 'Suspended 2', symbol: 'sus2', intervals: [0, 2, 7], required: [0, 2, 7], minStrings: 4 },
  { id: 'sus4', family: 'Triads', name: 'Suspended 4', symbol: 'sus4', intervals: [0, 5, 7], required: [0, 5, 7], minStrings: 4 },
  { id: 'power', family: 'Power', name: 'Power chord', symbol: '5', intervals: [0, 7], required: [0, 7], minStrings: 3 },
  { id: '7', family: 'Sevenths', name: 'Dominant 7', symbol: '7', intervals: [0, 4, 7, 10], required: [0, 4, 10], minStrings: 4 },
  { id: 'maj7', family: 'Sevenths', name: 'Major 7', symbol: 'maj7', intervals: [0, 4, 7, 11], required: [0, 4, 11], minStrings: 4 },
  { id: 'm7', family: 'Sevenths', name: 'Minor 7', symbol: 'm7', intervals: [0, 3, 7, 10], required: [0, 3, 10], minStrings: 4 },
  { id: 'm7b5', family: 'Sevenths', name: 'Half-diminished 7', symbol: 'm7♭5', intervals: [0, 3, 6, 10], required: [0, 3, 6, 10], minStrings: 4 },
  { id: 'dim7', family: 'Sevenths', name: 'Diminished 7', symbol: 'dim7', intervals: [0, 3, 6, 9], required: [0, 3, 6, 9], minStrings: 4 },
  { id: '6', family: 'Sixths & extensions', name: 'Sixth', symbol: '6', intervals: [0, 4, 7, 9], required: [0, 4, 9], minStrings: 4 },
  { id: 'm6', family: 'Sixths & extensions', name: 'Minor 6', symbol: 'm6', intervals: [0, 3, 7, 9], required: [0, 3, 9], minStrings: 4 },
  { id: 'add9', family: 'Sixths & extensions', name: 'Add 9', symbol: 'add9', intervals: [0, 2, 4, 7], required: [0, 2, 4], minStrings: 4 },
  { id: 'madd9', family: 'Sixths & extensions', name: 'Minor add 9', symbol: 'm(add9)', intervals: [0, 2, 3, 7], required: [0, 2, 3], minStrings: 4 },
  { id: '9', family: 'Sixths & extensions', name: 'Dominant 9', symbol: '9', intervals: [0, 2, 4, 7, 10], required: [0, 2, 4, 10], minStrings: 4 },
  { id: 'maj9', family: 'Sixths & extensions', name: 'Major 9', symbol: 'maj9', intervals: [0, 2, 4, 7, 11], required: [0, 2, 4, 11], minStrings: 4 },
  { id: 'm9', family: 'Sixths & extensions', name: 'Minor 9', symbol: 'm9', intervals: [0, 2, 3, 7, 10], required: [0, 2, 3, 10], minStrings: 4 },
];

export const CHORD_ROOTS = KEY_ROOT_NAMES.major.map((name, root) => ({ root, name }));

export function findChordVoicing(root: number, type: ChordType): FinderChord {
  const basicOpen = type.family === 'Triads' && ['major', 'minor'].includes(type.id)
    ? OPEN_CHORDS.find((chord) => chord.root === root && chord.quality === type.id)
    : undefined;
  if (basicOpen) return { ...basicOpen, kind: 'finder', name: `${CHORD_ROOTS[root].name}${type.symbol}` };

  const allowed = new Set(type.intervals.map((interval) => (root + interval) % 12));
  const required = new Set(type.required.map((interval) => (root + interval) % 12));
  let best: { frets: (number | null)[]; bassString: number; score: number } | null = null;

  for (const bassString of [6, 5, 4, 3]) {
    for (let bassFret = 0; bassFret <= 12; bassFret++) {
      if (pitchAt({ string: bassString, fret: bassFret }) !== root) continue;
      const windowStart = Math.max(1, bassFret - 3);
      const windowEnd = Math.min(12, windowStart + 4);
      const choices = new Map<number, (number | null)[]>();
      for (let string = 6; string >= 1; string--) {
        if (string > bassString) choices.set(string, [null]);
        else if (string === bassString) choices.set(string, [bassFret]);
        else {
          const frets: (number | null)[] = [null];
          if (allowed.has(pitchAt({ string, fret: 0 }))) frets.push(0);
          for (let fret = windowStart; fret <= windowEnd; fret++) {
            if (allowed.has(pitchAt({ string, fret }))) frets.push(fret);
          }
          choices.set(string, frets);
        }
      }

      const current: (number | null)[] = Array(7).fill(null);
      function scoreVoicing() {
        const sounding = current.slice(1).filter((fret) => fret !== null) as number[];
        if (sounding.length < type.minStrings) return;
        const tones = new Set(current.slice(1).flatMap((fret, index) => fret === null ? [] : [pitchAt({ string: 6 - index, fret })]));
        if ([...required].some((tone) => !tones.has(tone))) return;
        const fretted = sounding.filter((fret) => fret > 0);
        if (new Set(fretted).size > 4) return;
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
        if (span > 4) return;
        const uniqueTones = new Set([...tones].filter((tone) => allowed.has(tone))).size;
        const muted = current.slice(1).filter((fret) => fret === null).length;
        const score = sounding.reduce((sum, fret) => sum + fret, 0) + muted * 3 + span * .35 - uniqueTones * 1.8 - sounding.length * .45 + (6 - bassString) * .7 + bassFret * .1;
        if (!best || score < best.score) best = { frets: [...current], bassString, score };
      }
      function search(string: number) {
        if (string === 0) { scoreVoicing(); return; }
        for (const fret of choices.get(string)!) {
          current[string] = fret;
          search(string - 1);
        }
      }
      search(6);
    }
  }

  const solution = best ?? { frets: [null, null, 0, 0, 0, 0, 0], bassString: 4, score: 0 };
  const frettedLevels = [...new Set(solution.frets.slice(1).filter((fret): fret is number => fret !== null && fret > 0))].sort((a, b) => a - b);
  const voices = Array.from({ length: 6 }, (_, index) => {
    const string = 6 - index;
    const fret = solution.frets[string];
    return { string, fret, finger: fret === null || fret === 0 ? null : Math.min(4, frettedLevels.indexOf(fret) + 1) };
  });
  const rootName = CHORD_ROOTS[root].name;
  return { id: `${root}-${type.id}`, kind: 'finder', name: `${rootName}${type.symbol}`, root, quality: type.intervals.includes(3) ? 'minor' : 'major', rootString: solution.bassString, voices };
}
