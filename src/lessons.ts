import { MAX_FRET, STRINGS, fretboardPositions, type Position } from './music';

export const BANDS = [{ start: 0, end: 4 }, { start: 5, end: 8 }, { start: 9, end: 12 }] as const;
export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  kind: 'open' | 'string' | 'review' | 'test' | 'collect' | 'barre';
  string?: number;
  band: { start: number; end: number };
};
export const COLLECTION_LESSON: Lesson = {
  id: 'find-every-instance', title: 'Find every instance', subtitle: 'One note. The whole fretboard.',
  kind: 'collect', band: { start: 0, end: MAX_FRET },
};
export const BARRE_LESSON: Lesson = {
  id: 'barre-chord-practice', title: 'Barre chord practice', subtitle: 'Set your pace. Start the sequence. Play along.',
  kind: 'barre', band: { start: 1, end: 12 },
};
export const LESSONS: Lesson[] = [
  { id: 'open-strings', title: 'Meet the open strings', subtitle: 'Your six starting points', kind: 'open', band: { start: 0, end: 0 } },
  ...STRINGS.flatMap((string): Lesson[] => [
    ...BANDS.map((band) => ({
      id: `string-${string.id}-${band.start}`,
      title: `${string.name} · frets ${band.start}–${band.end}`,
      subtitle: band.start === 0 ? 'Start near the nut' : band.start === 5 ? 'Move along the neck' : 'Meet the octave',
      kind: 'string' as const,
      string: string.id,
      band,
    })),
    { id: `string-${string.id}-octave`, title: `${string.name} · full octave test`, subtitle: 'All twelve notes, from memory', kind: 'test', string: string.id, band: { start: 1, end: 12 } },
  ]),
  ...BANDS.map((band) => ({
    id: `review-${band.start}`, title: `Across the strings · frets ${band.start}–${band.end}`,
    subtitle: 'Bring your note map together', kind: 'review' as const, band,
  })),
  COLLECTION_LESSON,
];
export const LEARNING_LESSONS = LESSONS.filter((lesson) => lesson.kind !== 'collect');

export function lessonPositions(lesson: Lesson, random = Math.random): Position[] {
  if (lesson.kind === 'barre') return [];
  if (lesson.kind === 'collect') return fretboardPositions(lesson.band.end);
  if (lesson.kind === 'open') return STRINGS.map((s) => ({ string: s.id, fret: 0 }));
  if (lesson.kind === 'string' || lesson.kind === 'test') return Array.from({ length: lesson.band.end - lesson.band.start + 1 }, (_, i) => ({ string: lesson.string!, fret: lesson.band.start + i }));
  return STRINGS.map((s) => ({ string: s.id, fret: lesson.band.start + Math.floor(random() * (lesson.band.end - lesson.band.start + 1)) }));
}

export function lessonConcept(lesson: Lesson) {
  if (lesson.kind === 'open') return { title: 'Six strings. Six starting points.', text: 'An open string is played without holding down a fret. From thickest to thinnest, the strings are E, A, D, G, B, E. On this diagram, thin high E is at the top and thick low E at the bottom. The two E strings share a name but have different pitches. Click a note below to hear it.' };
  if (lesson.band.start === 9) return { title: 'At fret 12, the note name comes home.', text: 'Every fret moves up one musical step, called a semitone. After twelve steps, the note name repeats an octave higher. Fret 12 has the same name as the open string. Explore the notes below before building them yourself.' };
  if (lesson.kind === 'review') return { title: 'A familiar note, in a different place.', text: 'A note name can appear on several strings. Use each open string as your starting point, then follow the chromatic alphabet along the frets. This puzzle brings six small parts of your map together.' };
  return { title: 'One fret is one small step.', text: 'Move one fret towards the guitar body and you move up one semitone in the twelve-note alphabet. B goes straight to C, and E straight to F. All the other letter pairs have a sharp or flat between them. Click the notes to follow the pattern.' };
}
