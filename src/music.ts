export const NOTES = [
  { name: 'C', flat: '', colour: '#edb9a9' },
  { name: 'C♯', flat: 'D♭', colour: '#e7c4a0' },
  { name: 'D', flat: '', colour: '#ebd590' },
  { name: 'D♯', flat: 'E♭', colour: '#d4d99d' },
  { name: 'E', flat: '', colour: '#b6d5ad' },
  { name: 'F', flat: '', colour: '#a6d4c2' },
  { name: 'F♯', flat: 'G♭', colour: '#a4d3d7' },
  { name: 'G', flat: '', colour: '#adc9e6' },
  { name: 'G♯', flat: 'A♭', colour: '#bfbee4' },
  { name: 'A', flat: '', colour: '#d5b9df' },
  { name: 'A♯', flat: 'B♭', colour: '#e4b6cd' },
  { name: 'B', flat: '', colour: '#e9b7b7' },
] as const;

export const STRINGS = [
  { id: 6, name: 'Low E', note: 'E', midi: 40, description: 'thickest string' },
  { id: 5, name: 'A', note: 'A', midi: 45, description: '5th string' },
  { id: 4, name: 'D', note: 'D', midi: 50, description: '4th string' },
  { id: 3, name: 'G', note: 'G', midi: 55, description: '3rd string' },
  { id: 2, name: 'B', note: 'B', midi: 59, description: '2nd string' },
  { id: 1, name: 'High E', note: 'E', midi: 64, description: 'thinnest string' },
] as const;

export type Position = { string: number; fret: number };
export const MAX_FRET = 22;
export const fretboardPositions = (lastFret = MAX_FRET): Position[] => STRINGS.flatMap((s) => Array.from({ length: lastFret + 1 }, (_, fret) => ({ string: s.id, fret })));
export const positionKey = (p: Position) => `${p.string}:${p.fret}`;
export const stringInfo = (id: number) => {
  const string = STRINGS.find((s) => s.id === id);
  if (!string) throw new Error('Unknown guitar string');
  return string;
};
export const midiAt = (p: Position) => {
  if (!Number.isInteger(p.fret) || p.fret < 0 || p.fret > MAX_FRET) throw new Error(`Fret must be between 0 and ${MAX_FRET}`);
  return stringInfo(p.string).midi + p.fret;
};
export const pitchAt = (p: Position) => midiAt(p) % 12;
export const noteLabel = (pitch: number) => {
  const note = NOTES[pitch];
  return note.flat ? `${note.name} / ${note.flat}` : note.name;
};
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export function pitchFromName(name: string): number | undefined {
  const normalised = name.trim().replaceAll('#', '♯').replaceAll('b', '♭');
  const index = NOTES.findIndex((n) => n.name === normalised || (n.flat !== '' && n.flat === normalised));
  return index === -1 ? undefined : index;
}
export const positionLabel = (p: Position) => `${stringInfo(p.string).name} string, ${p.fret === 0 ? 'open (fret 0)' : `fret ${p.fret}`}`;
