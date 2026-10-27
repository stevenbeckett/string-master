import { type Lesson, lessonPositions } from './lessons';
import { type Position, pitchAt, positionKey, positionLabel, noteLabel } from './music';
import { DEFAULT_CHORD_OPTIONS, randomChord, type BarreChord, type ChordOptions } from './chords';

export type Attempt = { mistakes: number; hints: number; solved: boolean; mapViewed?: boolean };
export type Session = {
  id: string;
  lesson: Lesson;
  phase: 'learn' | 'place' | 'recall' | 'collect' | 'barre' | 'results';
  positions: Position[];
  order: Position[];
  paletteOrder: number[];
  collection: { pitch: number; mistakes: number; lastMiss: string | null } | null;
  barre: { prompt: BarreChord; options: ChordOptions } | null;
  index: number;
  selected: number | null;
  focused: string;
  placements: Record<string, Attempt>;
  recalls: Record<string, Attempt>;
  feedback: string;
  feedbackKind: 'neutral' | 'correct' | 'retry';
};
export type SessionAction =
  | { type: 'START_PLACE' }
  | { type: 'SELECT'; pitch: number }
  | { type: 'JUMBLE'; order: number[] }
  | { type: 'FOCUS'; key: string }
  | { type: 'PLACE'; position: Position; pitch: number }
  | { type: 'RECALL'; position: Position }
  | { type: 'COLLECT'; position: Position }
  | { type: 'FINISH_COLLECTION' }
  | { type: 'VIEW_NOTE_MAP' }
  | { type: 'HINT' }
  | { type: 'START_RECALL' }
  | { type: 'NEXT' }
  | { type: 'CLEAR_SELECTION' };

const freshAttempts = (positions: Position[]) => Object.fromEntries(positions.map((p) => [positionKey(p), { mistakes: 0, hints: 0, solved: false }]));
export function jumbleNotes(order: number[], random = Math.random): number[] {
  const shuffled = [...order];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // A press should visibly change the order, even if the shuffle lands unchanged.
  if (shuffled.length > 1 && shuffled.every((pitch, i) => pitch === order[i])) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function createSession(lesson: Lesson, random = Math.random, previousPitch?: number, chordConfig?: { options: ChordOptions; previousId?: string }): Session {
  const positions = lessonPositions(lesson, random);
  const pitches = Array.from({ length: 12 }, (_, pitch) => pitch).filter((pitch) => pitch !== previousPitch);
  const collection = lesson.kind === 'collect' ? { pitch: pitches[Math.floor(random() * pitches.length)], mistakes: 0, lastMiss: null } : null;
  const order = collection ? positions.filter((p) => pitchAt(p) === collection.pitch) : [...positions];
  for (let i = collection ? 0 : order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const finalTest = lesson.kind === 'test';
  const options = chordConfig?.options ?? DEFAULT_CHORD_OPTIONS;
  const barre = lesson.kind === 'barre' ? { prompt: randomChord(options, chordConfig?.previousId, random), options } : null;
  return { id: crypto.randomUUID(), lesson, phase: barre ? 'barre' : collection ? 'collect' : finalTest ? 'recall' : 'learn', positions, order, collection, barre, paletteOrder: jumbleNotes(Array.from({ length: 12 }, (_, pitch) => pitch), random), index: 0, selected: null,
    focused: positions[0] ? positionKey(positions[0]) : '', placements: freshAttempts(positions), recalls: freshAttempts(order),
    feedback: collection ? 'Pick any matching position. Open strings count too.' : finalTest ? 'Twelve notes, one string. Find each note from memory, at your own pace.' : '', feedbackKind: 'neutral' };
}
export const placementComplete = (s: Session) => Object.values(s.placements).every((a) => a.solved);
export const currentTarget = (s: Session) => s.collection ? s.order.find((p) => !s.recalls[positionKey(p)].solved) ?? s.order[0] : s.order[s.index];
export const collectionComplete = (s: Session) => !!s.collection && Object.values(s.recalls).every((attempt) => attempt.solved);
export const hintBand = (p: Position) => ({ start: Math.floor(p.fret / 6) * 6, end: Math.min(22, Math.floor(p.fret / 6) * 6 + 5) });
export function hintTarget(s: Session): Position {
  if (s.phase === 'recall' || s.phase === 'collect' || s.collection) return currentTarget(s);
  return s.positions.find((p) => positionKey(p) === s.focused && !s.placements[s.focused].solved)
    ?? s.positions.find((p) => !s.placements[positionKey(p)].solved) ?? s.positions[0];
}

export function sessionReducer(s: Session, action: SessionAction): Session {
  if (action.type === 'VIEW_NOTE_MAP' && s.phase === 'collect' && s.collection) {
    const entries = Object.entries(s.recalls);
    if (entries.every(([, attempt]) => attempt.solved || attempt.mapViewed)) return s;
    return { ...s, recalls: Object.fromEntries(entries.map(([key, attempt]) => [key, attempt.solved ? attempt : { ...attempt, mapViewed: true }])),
      feedback: 'Note map viewed. Unfound positions in this round count as assisted.', feedbackKind: 'neutral' };
  }
  if (action.type === 'COLLECT' && s.phase === 'collect' && s.collection) {
    if (collectionComplete(s)) return s;
    const key = positionKey(action.position);
    if (!s.positions.some((p) => positionKey(p) === key)) return s;
    const attempt = s.recalls[key];
    if (attempt?.solved) return { ...s, collection: { ...s.collection, lastMiss: null }, feedback: 'You already found this one. Look for another position.', feedbackKind: 'neutral' };
    if (!attempt) return { ...s, focused: key, collection: { ...s.collection, mistakes: s.collection.mistakes + 1, lastMiss: key }, feedback: `That isn’t ${noteLabel(s.collection.pitch)}. Try another fret, or ask for a hint.`, feedbackKind: 'retry' };
    return { ...s, focused: key, collection: { ...s.collection, lastMiss: null }, recalls: { ...s.recalls, [key]: { ...attempt, solved: true } }, feedback: `✓ ${noteLabel(s.collection.pitch)} found on the ${positionLabel(action.position)}.`, feedbackKind: 'correct' };
  }
  if (action.type === 'HINT' && s.phase === 'collect' && s.collection && !collectionComplete(s)) {
    const target = currentTarget(s);
    const key = positionKey(target);
    const level = Math.min(3, s.recalls[key].hints + 1);
    const recalls = { ...s.recalls };
    for (const p of s.order) {
      const matchKey = positionKey(p);
      const attempt = recalls[matchKey];
      if (!attempt.solved && (level === 1 ? p.string === target.string : matchKey === key)) recalls[matchKey] = { ...attempt, hints: Math.max(attempt.hints, level) };
    }
    return { ...s, recalls, collection: { ...s.collection, lastMiss: null }, feedback: 'Follow the clue below the board. Hinted positions are counted as assisted finds.', feedbackKind: 'neutral' };
  }
  if (action.type === 'FINISH_COLLECTION' && s.phase === 'collect' && collectionComplete(s)) return { ...s, phase: 'results', feedback: '' };
  if (action.type === 'START_PLACE' && s.phase === 'learn') return { ...s, phase: 'place', feedback: 'Choose a note, then place it on the board. You can also drag it.', selected: null };
  if (action.type === 'SELECT' && s.phase === 'place' && Number.isInteger(action.pitch) && action.pitch >= 0 && action.pitch < 12) return { ...s, selected: action.pitch };
  if (action.type === 'JUMBLE' && s.phase === 'place') return { ...s, paletteOrder: action.order, feedback: 'Note pieces jumbled. Find them by name, then place them on the board.', feedbackKind: 'neutral' };
  if (action.type === 'CLEAR_SELECTION') return { ...s, selected: null };
  if (action.type === 'FOCUS' && s.positions.some((p) => positionKey(p) === action.key)) return { ...s, focused: action.key };
  if (action.type === 'PLACE' && s.phase === 'place') {
    const key = positionKey(action.position);
    const attempt = s.placements[key];
    if (!attempt || attempt.solved) return s;
    const correct = action.pitch === pitchAt(action.position);
    return { ...s, focused: key, placements: { ...s.placements, [key]: { ...attempt, mistakes: attempt.mistakes + (correct ? 0 : 1), solved: correct } },
      feedback: correct ? `✓ ${noteLabel(action.pitch)} belongs here. Nicely placed.` : 'Not quite. Try another note, or ask for a hint.', feedbackKind: correct ? 'correct' : 'retry' };
  }
  if (action.type === 'START_RECALL' && s.phase === 'place' && placementComplete(s)) return { ...s, phase: 'recall', selected: null, focused: positionKey(s.positions[0]), feedback: 'A fresh board. Find the note using what you remember.', feedbackKind: 'neutral' };
  if (action.type === 'RECALL' && s.phase === 'recall') {
    const target = currentTarget(s);
    const key = positionKey(target);
    const attempt = s.recalls[key];
    if (attempt.solved || !s.positions.some((p) => positionKey(p) === positionKey(action.position))) return s;
    const correct = action.position.string === target.string && pitchAt(action.position) === pitchAt(target);
    return { ...s, focused: positionKey(action.position), recalls: { ...s.recalls, [key]: { ...attempt, solved: correct, mistakes: attempt.mistakes + (correct ? 0 : 1) } },
      feedback: correct ? `✓ That's ${noteLabel(pitchAt(target))}. Nicely found.` : `Not quite. Look on the ${positionLabel(target).split(',')[0]}. Take your time.`, feedbackKind: correct ? 'correct' : 'retry' };
  }
  if (action.type === 'HINT' && (s.phase === 'place' || s.phase === 'recall')) {
    const target = hintTarget(s);
    const key = positionKey(target);
    const field = s.phase === 'place' ? 'placements' : 'recalls';
    const attempt = s[field][key];
    if (attempt.solved) return s;
    return { ...s, focused: key, [field]: { ...s[field], [key]: { ...attempt, hints: Math.min(3, attempt.hints + 1) } } };
  }
  if (action.type === 'NEXT' && s.phase === 'recall' && s.recalls[positionKey(currentTarget(s))].solved) {
    if (s.index === s.order.length - 1) return { ...s, phase: 'results', feedback: '' };
    return { ...s, index: s.index + 1, focused: positionKey(s.positions[0]), feedback: 'Find the next note. The board is clear again.', feedbackKind: 'neutral' };
  }
  return s;
}

export function sessionResults(s: Session) {
  const attempts = Object.values(s.recalls);
  const unaided = attempts.filter((a) => a.solved && a.mistakes === 0 && a.hints === 0 && !a.mapViewed).length;
  return { total: attempts.length, unaided, accuracy: attempts.length ? Math.round(unaided / attempts.length * 100) : 0,
    assisted: attempts.filter((a) => a.hints > 0 || a.mapViewed).length,
    retries: s.collection ? s.collection.mistakes : attempts.filter((a) => a.mistakes > 0).length,
    placementHints: Object.values(s.placements).filter((a) => a.hints > 0).length };
}
