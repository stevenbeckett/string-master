import { useMemo, useState } from 'react';
import { chordMidis, type ChordLabelMode } from '../chords';
import { CHORD_FAMILIES, CHORD_ROOTS, CHORD_TYPES, findChordVoicing, type ChordFamily } from '../chordFinder';
import { ChordDiagram } from './ChordDiagram';
import { Icon } from './Icon';

export function ChordFinder({ playChord, goBack }: { playChord: (midis: number[]) => void; goBack: () => void }) {
  const [root, setRoot] = useState(0);
  const [family, setFamily] = useState<ChordFamily>('Triads');
  const [typeId, setTypeId] = useState('major');
  const [labelMode, setLabelMode] = useState<ChordLabelMode>('fingers');
  const types = CHORD_TYPES.filter((type) => type.family === family);
  const type = types.find((item) => item.id === typeId) ?? types[0];
  const chord = useMemo(() => findChordVoicing(root, type), [root, type]);

  function changeFamily(next: ChordFamily) {
    setFamily(next);
    setTypeId(CHORD_TYPES.find((item) => item.family === next)!.id);
  }

  return <section className="learning-tool-page chord-finder-page">
    <button className="text-button back-link" onClick={goBack}><Icon name="back" size={16} /> Learning path</button>
    <div className="lesson-heading"><div><p className="eyebrow">LEARNING TOOL</p><h1 id="page-title" tabIndex={-1}>Chord finder</h1></div></div>
    <div className="chord-finder-controls">
      <div className="chord-finder-control-group" role="group" aria-label="Chord root">
        <span className="chord-finder-control-label">Root</span>
        <div className="chord-finder-roots">{CHORD_ROOTS.map((note) => <button key={note.root} type="button" aria-pressed={root === note.root} onClick={() => setRoot(note.root)}>{note.name}</button>)}</div>
      </div>
      <div className="chord-finder-control-group" role="group" aria-label="Chord family">
        <span className="chord-finder-control-label">Family</span>
        <div className="chord-finder-families">{CHORD_FAMILIES.map((item) => <button key={item} type="button" aria-pressed={family === item} onClick={() => changeFamily(item)}>{item}</button>)}</div>
      </div>
      <div className="chord-finder-control-group" role="group" aria-label="Chord type">
        <span className="chord-finder-control-label">Chord</span>
        <div className="chord-finder-types">{types.map((item) => <button key={item.id} type="button" aria-pressed={type.id === item.id} onClick={() => setTypeId(item.id)}><strong>{CHORD_ROOTS[root].name}{item.symbol}</strong><small>{item.name}</small></button>)}</div>
      </div>
    </div>
    <div className="barre-answer chord-finder-diagram">
      <div className="barre-answer-heading">
        <div><p className="eyebrow">SUGGESTED GUITAR VOICING</p><h3>{chord.name}</h3></div>
        <div className="barre-answer-actions">
          <button type="button" className="button secondary small" onClick={() => playChord(chordMidis(chord))}><Icon name="sound" size={16} />Hear chord</button>
          <div className="chord-label-switch" role="group" aria-label="Diagram labels">
            <button type="button" aria-pressed={labelMode === 'fingers'} onClick={() => setLabelMode('fingers')}>Fingers</button>
            <button type="button" aria-pressed={labelMode === 'notes'} onClick={() => setLabelMode('notes')}>Notes</button>
          </div>
        </div>
      </div>
      <ChordDiagram chord={chord} labelMode={labelMode} />
    </div>
  </section>;
}
