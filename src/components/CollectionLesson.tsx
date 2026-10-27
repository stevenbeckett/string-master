import { useEffect, useState, type CSSProperties } from 'react';
import { MAX_FRET, NOTES, STRINGS, midiAt, noteLabel, pitchAt, positionKey, positionLabel, stringInfo, type Position } from '../music';
import { collectionComplete, currentTarget, hintBand, sessionResults, type Session, type SessionAction } from '../session';
import { Fretboard, NoteName } from './Fretboard';
import { Icon } from './Icon';

export function CollectionLesson({ session: s, dispatch, play, openLesson, goHome }: {
  session: Session;
  dispatch: (action: SessionAction) => void;
  play: (midi: number) => void;
  openLesson: (id: string) => void;
  goHome: () => void;
}) {
  const collection = s.collection!;
  const pitch = collection.pitch;
  const name = noteLabel(pitch);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [highlightedPitch, setHighlightedPitch] = useState<number | null>(pitch);
  const highlightedCount = highlightedPitch === null ? 0 : s.positions.filter((position) => pitchAt(position) === highlightedPitch).length;
  const target = currentTarget(s);
  const hints = s.recalls[positionKey(target)].hints;
  const area = hintBand(target);
  const matches = Object.values(s.recalls);
  const found = matches.filter((attempt) => attempt.solved).length;
  const complete = collectionComplete(s);
  const result = sessionResults(s);

  useEffect(() => {
    if (!showAllNotes && hints >= 2 && s.phase === 'collect') {
      document.querySelector<HTMLElement>(`[data-position="${positionKey(target)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
  }, [hints, s.phase, target.string, target.fret, showAllNotes]);
  useEffect(() => {
    if (showAllNotes && s.phase === 'collect') dispatch({ type: 'VIEW_NOTE_MAP' });
  }, [showAllNotes, s.id, s.phase, dispatch]);
  useEffect(() => { setHighlightedPitch(pitch); }, [s.id, pitch]);

  function collect(position: Position) {
    if (showAllNotes) {
      setHighlightedPitch(pitchAt(position));
      play(midiAt(position));
      return;
    }
    dispatch({ type: 'COLLECT', position });
    if (pitchAt(position) === pitch) play(midiAt(position));
  }

  if (s.phase === 'results') return (
    <section className="results-page collection-results">
      <div className="result-symbol"><Icon name="check" size={36} /></div>
      <p className="eyebrow">THE WHOLE NECK, CONNECTED</p>
      <h1 id="page-title" tabIndex={-1}>Every {name} found.</h1>
      <p className="result-description">You found all <strong>{result.total} positions</strong> from the open strings to fret {MAX_FRET}.<br />A familiar note, all over your guitar.</p>
      <div className="result-card">
        <div className="accuracy-ring" style={{ '--accuracy': `${result.accuracy * 3.6}deg` } as CSSProperties}><div className="accuracy-number">{result.accuracy}<span>%</span></div></div>
        <h2>Found without help</h2>
        <p>{result.unaided} of {result.total} matching positions found without clues or the note map.</p>
        <div className="result-breakdown"><span><strong>{result.assisted}</strong> assisted finds</span><span><strong>{collection.mistakes}</strong> incorrect guesses</span></div>
        <p className="small-print">String clues and the full note map mark unfound positions as assisted. Incorrect guesses are shown separately.</p>
      </div>
      <div className="result-actions"><button className="button primary" onClick={() => openLesson(s.lesson.id)}>Find another note <Icon name="arrow" size={17} /></button><button className="button secondary" onClick={goHome}>Back to dashboard</button></div>
    </section>
  );

  return (
    <section className="lesson-page collection-page" style={{ '--note-colour': NOTES[showAllNotes && highlightedPitch !== null ? highlightedPitch : pitch].colour } as CSSProperties}>
      <button className="text-button back-link" aria-label="Back to dashboard" onClick={goHome}><Icon name="back" size={16} /> Dashboard</button>
      <div className="lesson-heading"><div><p className="eyebrow">ONE NOTE · SIX STRINGS · {MAX_FRET} FRETS</p><h1 id="page-title" tabIndex={-1}>Find every instance</h1></div><button className="button secondary small" onClick={() => openLesson(s.lesson.id)}><Icon name="shuffle" size={15} /> New random note</button></div>
      <div className="collection-view-options"><label className="collection-map-toggle"><input type="checkbox" checked={showAllNotes} onChange={(event) => setShowAllNotes(event.target.checked)} /><span>Show all notes</span></label><p>{showAllNotes ? 'Study view · explore the whole map' : 'Show the note map to study, then hide it to practise.'}</p></div>
      {showAllNotes ? <>
        <div className="recall-prompt collection-prompt map-prompt"><div><p className="eyebrow">THE WHOLE FRETBOARD, LABELLED</p><h2><span data-testid="map-selected-note" className={highlightedPitch === null ? 'no-highlight' : ''}>{highlightedPitch === null ? 'All notes' : noteLabel(highlightedPitch)}</span><span className="prompt-on">{highlightedPitch === null ? 'open strings through fret 22' : 'highlighted on every string'}</span></h2><p className="test-instructions">Choose a note or click the board to highlight all its matches. Every note name stays visible.</p></div><div className="prompt-right">{highlightedPitch !== null && <button className="icon-button" aria-label="Hear the highlighted note" onClick={() => play(60 + highlightedPitch)}><Icon name="sound" size={18} /></button>}<span className="count-pill" aria-live="polite">{highlightedPitch === null ? `${s.positions.length} notes visible` : `${highlightedCount} highlighted`}</span></div></div>
        <div className="map-note-picker" role="group" aria-labelledby="map-picker-title"><div className="map-note-picker-heading"><span id="map-picker-title">Highlight a note</span><button type="button" className="text-button" disabled={highlightedPitch === null} onClick={() => setHighlightedPitch(null)}><Icon name="close" size={13} /> Clear highlight</button></div><div className="map-note-choices">{NOTES.map((note, notePitch) => <button key={notePitch} type="button" className="map-note-choice" aria-label={`Highlight ${noteLabel(notePitch)}`} aria-pressed={highlightedPitch === notePitch} style={{ '--note-colour': note.colour } as CSSProperties} onClick={() => { setHighlightedPitch(notePitch); play(60 + notePitch); }}><NoteName pitch={notePitch} /></button>)}</div></div>
      </> : <><div className="recall-prompt collection-prompt">
        <div><p className="eyebrow">FIND EVERY</p><h2><span data-testid="target-note">{name}</span><span className="prompt-on">on the entire fretboard</span></h2><p className="test-instructions">Click every matching position. The open strings count; found notes stay visible.</p></div>
        <div className="prompt-right"><button className="icon-button" aria-label="Hear the target note" title="Hear the target note" onClick={() => play(60 + pitch)}><Icon name="sound" size={18} /></button><span className="count-pill" aria-live="polite">{found} / {matches.length} found</span></div>
      </div>
      <div className="collection-strings" role="group" aria-label="Found notes by string">
        {STRINGS.map((string) => {
          const positions = s.order.filter((p) => p.string === string.id);
          const count = positions.filter((p) => s.recalls[positionKey(p)].solved).length;
          return <span key={string.id} className={count === positions.length ? 'string-finished' : ''}><b>{string.name}</b><span>{count} found</span>{count === positions.length && <Icon name="check" size={13} />}</span>;
        })}
      </div>
      </>}
      <div className="board-card collection-board">
        <div className="board-topline"><span><span className="live-dot" /> STANDARD TUNING <span className="board-tuning">E A D G B E</span></span><span>Open strings – fret {MAX_FRET}<span className="neck-scroll-hint"> · Scroll sideways to explore</span></span></div>
        <Fretboard session={s} onPosition={collect} onFocus={(position) => dispatch({ type: 'FOCUS', key: positionKey(position) })} onDrop={() => {}} noteMap={showAllNotes ? { highlightedPitch } : undefined} />
        <div className="board-bottomline"><span id="board-instructions">{showAllNotes ? 'Click a note to highlight its matches and hear it. Arrow keys and Enter work too.' : 'Click a dot, or use the arrow keys and Enter. Find the same note on any string.'}</span><span><i className="legend-dot" /> {showAllNotes ? highlightedPitch === null ? 'All note names visible' : `${highlightedCount} highlighted · all names visible` : `${found} matching positions collected`}</span></div>
      </div>
      {showAllNotes ? <><p className="collection-study-info"><Icon name="book" size={15} />Your search is kept. Unfound positions in this round count as assisted.</p><div className="lesson-footer"><p>Look for the pattern 12 frets apart. Sharp and flat names share one pitch.</p><button className="button secondary" onClick={() => setShowAllNotes(false)}>Back to finding notes <Icon name="arrow" size={17} /></button></div></> : <><div className={`feedback ${s.feedbackKind}`} role="status" aria-live="polite">{complete ? `✓ All ${matches.length} instances found. Nicely connected.` : s.feedback}</div>
      <div className="hint-panel collection-hints">
        <div className="hint-copy"><Icon name="help" size={19} /><div>
          <h3>{complete ? 'A full map of one note.' : hints ? `Your next clue · ${stringInfo(target.string).name} string` : 'Need a way in?'}</h3>
          {complete ? <p>Take a look at the pattern you made, then try another note.</p> : hints === 0 ? <p>Work one string at a time. Note names repeat every 12 frets; the two E strings share their note positions.</p> : <>
            <p>There’s another {name} on the {stringInfo(target.string).name} string. Its open note is {stringInfo(target.string).note}.</p>
            {hints >= 2 && <p>Look between frets <strong>{area.start} and {area.end}</strong>, in the highlighted area. Check 12 frets away from any match you’ve already found on this string.</p>}
            {hints >= 3 && <p><strong>{name}</strong> is at {positionLabel(target)}. Click the marked position to collect it.</p>}
          </>}
        </div></div>
        <button className="button secondary small" disabled={complete || hints === 3} onClick={() => dispatch({ type: 'HINT' })}>{hints === 0 ? 'Give me a clue' : hints === 1 ? 'Narrow the area' : hints === 2 ? 'Reveal one position' : 'Position revealed'}</button>
      </div>
      <div className="lesson-footer"><p><Icon name="spark" size={15} /> Every match counts once. Hints are always welcome.</p><button className="button primary" disabled={!complete} onClick={() => dispatch({ type: 'FINISH_COLLECTION' })}>See your results <Icon name="arrow" size={17} /></button></div>
      </>}
    </section>
  );
}
