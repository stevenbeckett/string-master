import { useEffect, useRef, type CSSProperties } from 'react';
import { LEARNING_LESSONS, lessonConcept } from '../lessons';
import { NOTES, midiAt, pitchAt, positionKey, stringInfo, noteLabel, type Position } from '../music';
import { currentTarget, hintTarget, jumbleNotes, placementComplete, sessionResults, type Session, type SessionAction } from '../session';
import { type Progress, nextLesson } from '../progress';
import { Fretboard, NoteName } from './Fretboard';
import { Icon } from './Icon';
import { CollectionLesson } from './CollectionLesson';
import { BarreLesson } from './BarreLesson';
import { DEFAULT_BARRE_SETTINGS, type BarrePracticeSettings, type ChordOptions } from '../chords';

export function Alphabet({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  return <details className="alphabet" open={initiallyOpen}><summary>The twelve-note alphabet <span>Every fret moves one step →</span></summary><div className="alphabet-notes">{NOTES.map((note, pitch) => <span key={note.name} style={{ '--note-colour': note.colour } as CSSProperties}><NoteName pitch={pitch} /></span>)}</div><p>B → C and E → F are already one fret apart. C♯ and D♭ are two names for the same pitch.</p></details>;
}

export function LearningSession({ session: s, dispatch, play, playChord, onBarreSettingsChange, progress, openLesson, goHome }: {
  session: Session;
  dispatch: (action: SessionAction) => void;
  play: (midi: number) => void;
  playChord: (midis: number[]) => void;
  onBarreSettingsChange: (settings: BarrePracticeSettings) => void;
  progress: Progress;
  openLesson: (id: string, options?: ChordOptions) => void;
  goHome: () => void;
}) {
  const paletteRef = useRef<HTMLDivElement>(null);
  const recallSolved = s.phase === 'recall' && s.recalls[positionKey(currentTarget(s))].solved;
  useEffect(() => {
    if (!recallSolved || s.phase !== 'recall') return;
    const timer = window.setTimeout(() => dispatch({ type: 'NEXT' }), 550);
    return () => window.clearTimeout(timer);
  }, [recallSolved, s.id, s.phase, s.index, dispatch]);
  useEffect(() => {
    if (s.phase === 'recall') document.querySelector<HTMLButtonElement>(`[data-position="${s.focused}"]`)?.focus({ preventScroll: true });
  }, [s.id, s.phase, s.index]);
  if (s.lesson.kind === 'barre') return <BarreLesson session={s} playChord={playChord} openLesson={openLesson} settings={progress.barrePractice ?? DEFAULT_BARRE_SETTINGS} onSettingsChange={onBarreSettingsChange} />;
  if (s.lesson.kind === 'collect') return <CollectionLesson session={s} dispatch={dispatch} play={play} openLesson={openLesson} goHome={goHome} />;
  const paletteOrder = s.paletteOrder ?? NOTES.map((_, pitch) => pitch);
  const target = currentTarget(s);
  const hint = hintTarget(s);
  const hintKey = positionKey(hint);
  const hints = s.phase === 'place' ? s.placements[hintKey].hints : s.recalls[hintKey].hints;
  const placed = Object.values(s.placements).filter((a) => a.solved).length;
  const complete = placementComplete(s);
  const concept = lessonConcept(s.lesson);
  const result = sessionResults(s);

  function attemptPlacement(position: Position, pitch: number) {
    if (s.placements[positionKey(position)]?.solved) { play(midiAt(position)); return; }
    dispatch({ type: 'PLACE', position, pitch });
    if (pitchAt(position) === pitch) play(midiAt(position));
  }
  function onPosition(position: Position) {
    if (s.phase === 'learn') { play(midiAt(position)); return; }
    if (s.phase === 'place') {
      if (s.placements[positionKey(position)].solved) { play(midiAt(position)); return; }
      if (s.selected !== null) attemptPlacement(position, s.selected);
      else dispatch({ type: 'FOCUS', key: positionKey(position) });
    } else if (s.phase === 'recall') {
      dispatch({ type: 'RECALL', position });
      if (!recallSolved && position.string === target.string && pitchAt(position) === pitchAt(target)) play(midiAt(position));
    }
  }

  if (s.phase === 'results') return <section className="results-page">
    <div className="result-symbol"><Icon name="check" size={36} /></div><p className="eyebrow">A LITTLE MORE FAMILIAR</p>
    <h1 id="page-title" tabIndex={-1}>A good place to pause.</h1><p className="result-description">You completed <strong>{s.lesson.title}</strong>.<br />Come back after a break and see what you remember.</p>
    <div className="result-card"><div className="accuracy-ring" style={{ '--accuracy': `${result.accuracy * 3.6}deg` } as CSSProperties}><div className="accuracy-number">{result.accuracy}<span>%</span></div></div><h2>Unaided recall accuracy</h2><p>{result.unaided} of {result.total} notes found on your first try, without hints.</p><div className="result-breakdown"><span><strong>{result.assisted}</strong> {result.assisted === 1 ? 'note' : 'notes'} with hints</span><span><strong>{result.retries}</strong> {result.retries === 1 ? 'note' : 'notes'} retried</span></div><p className="small-print">Hints help you learn. Only first-try, hint-free recall answers count towards this percentage.</p></div>
    <div className="result-actions"><button className="button primary" onClick={() => openLesson(nextLesson(progress).id)}>Next suggested lesson <Icon name="arrow" size={17} /></button><button className="button secondary" onClick={() => openLesson(s.lesson.id)}><Icon name="repeat" size={17} /> Repeat this lesson</button></div><button className="text-button" onClick={goHome}>Back to your learning path</button>
  </section>;

  const finalTest = s.lesson.kind === 'test';
  const stages = finalTest ? ['Recall'] : ['Learn', 'Place', 'Recall'];
  const step = finalTest || s.phase === 'learn' ? 0 : s.phase === 'place' ? 1 : 2;
  return <section className="lesson-page" onKeyDown={(event) => { if (event.key === 'Escape') dispatch({ type: 'CLEAR_SELECTION' }); }}>
    <button className="text-button back-link" onClick={goHome}><Icon name="back" size={16} /> Learning path</button>
    <div className="lesson-heading"><div><p className="eyebrow">{finalTest ? 'FINAL TEST · ' : ''}LESSON {LEARNING_LESSONS.findIndex((l) => l.id === s.lesson.id) + 1} OF {LEARNING_LESSONS.length}</p><h1 id="page-title" tabIndex={-1}>{s.lesson.title}</h1></div><div className="stepper" aria-label="Lesson stages">{stages.map((name, i) => <span key={name} className={i === step ? 'current-step' : i < step ? 'finished-step' : ''} aria-current={i === step ? 'step' : undefined}><b>{i < step ? <Icon name="check" size={13} /> : i + 1}</b>{name}{i < stages.length - 1 && <i />}</span>)}</div></div>
    {s.phase === 'learn' && <div className="concept"><div className="concept-icon"><Icon name="sun" size={22} /></div><div><h2>{concept.title}</h2><p>{concept.text}</p></div></div>}
    {s.phase === 'place' && <div className="puzzle-heading"><div><h2>{complete ? 'Your note map is in place.' : 'Give each note a home.'}</h2><p>{complete ? 'Ready to see what you remember on a fresh board?' : 'Drag a note to its position, or select a note and click the board.'}</p></div><span className="count-pill">{placed} / {s.positions.length} placed</span></div>}
    {s.phase === 'recall' && <div className="recall-prompt"><div><p className="eyebrow">FIND THIS NOTE</p><h2 aria-live="polite" aria-atomic="true"><span data-testid="target-note">{noteLabel(pitchAt(target))}</span><span className="prompt-on">on the {stringInfo(target.string).name} string</span></h2>{finalTest && <p className="test-instructions">Frets 1–12 · all twelve notes, once each, in random order.</p>}</div><div className="prompt-right"><button className="icon-button" title="Hear the target note" aria-label="Hear the target note" onClick={() => play(midiAt(target))}><Icon name="sound" size={18} /></button><span className="count-pill">{s.index + 1} / {s.order.length}</span></div></div>}
    <div className="board-card">
      <div className="board-topline"><span><span className="live-dot" /> STANDARD TUNING <span className="board-tuning">E A D G B E</span></span><span>{s.lesson.kind === 'open' ? 'Open strings' : `Frets ${s.lesson.band.start}–${s.lesson.band.end}`}</span></div>
      <Fretboard session={s} onPosition={onPosition} onFocus={(p) => dispatch({ type: 'FOCUS', key: positionKey(p) })} onDrop={attemptPlacement} />
      <div className="board-bottomline"><span id="board-instructions">{s.phase === 'learn' ? 'Click a coloured note to hear it.' : s.phase === 'place' ? 'Choose a piece, then its position. Arrow keys move around the board.' : 'Select the note on the named string. Take your time.'}</span><span><i className="legend-dot" /> Your practice area</span></div>
    </div>
    {s.phase === 'learn' && <><Alphabet initiallyOpen={s.lesson.kind === 'open'} /><div className="lesson-footer"><p><Icon name="spark" size={17} /> A small area is all you need to start.</p><button className="button primary" onClick={() => dispatch({ type: 'START_PLACE' })}>Try placing the notes <Icon name="arrow" size={17} /></button></div></>}
    {s.phase === 'place' && <div className="palette-card"><div className="palette-label"><h3>Your note pieces</h3><p>{s.selected === null ? 'Choose one to begin' : `${noteLabel(s.selected)} selected · reusable pieces`}</p></div><div className="note-palette" role="group" aria-label="Note pieces" ref={paletteRef}>{paletteOrder.map((pitch, index) => { const note = NOTES[pitch]; return <button key={pitch} type="button" draggable aria-label={`Select ${noteLabel(pitch)}`} aria-pressed={s.selected === pitch} tabIndex={s.selected === pitch || s.selected === null && index === 0 ? 0 : -1}
      className={`palette-note ${s.selected === pitch ? 'selected-note' : ''}`} style={{ '--note-colour': note.colour } as CSSProperties}
      onClick={(event) => { dispatch({ type: 'SELECT', pitch }); if (event.detail === 0) document.querySelector<HTMLButtonElement>(`[data-position="${positionKey(s.positions.find((p) => !s.placements[positionKey(p)].solved) ?? s.positions[0])}"]`)?.focus(); }}
      onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : paletteOrder.length - 1)) % paletteOrder.length; dispatch({ type: 'SELECT', pitch: paletteOrder[nextIndex] }); paletteRef.current?.querySelectorAll('button')[nextIndex]?.focus(); } }}
      onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(pitch)); event.dataTransfer.effectAllowed = 'copy'; dispatch({ type: 'SELECT', pitch }); }}><NoteName pitch={pitch} /></button>; })}</div><div className="palette-footer"><button type="button" className="palette-jumble" aria-label="Jumble note pieces" title="Shuffle the note pieces" onClick={() => dispatch({ type: 'JUMBLE', order: jumbleNotes(paletteOrder) })}><Icon name="shuffle" size={14} />Jumble</button><span className="keyboard-tip">Keyboard: arrows to choose · Enter to pick up · arrows + Enter to place</span></div></div>}
    {(s.phase === 'place' || s.phase === 'recall') && <>
      <div className={`feedback ${s.feedbackKind}`} role="status" aria-live="polite">{s.feedback || 'Take your time. Every attempt helps build the map.'}</div>
      <div className="hint-panel"><div className="hint-copy"><Icon name="help" size={19} /><div><h3>{hints ? `A nudge · ${stringInfo(hint.string).name}, ${hint.fret === 0 ? 'open string' : `fret ${hint.fret}`}` : 'A little help, whenever you need it.'}</h3>
        {hints === 0 && <p>Hints explain the steps. There’s no limit on trying again.</p>}
        {hints >= 1 && <p>{hint.fret === 0 ? `An open string starts at its own name: ${stringInfo(hint.string).note}. No frets to count.` : `Start at the open ${stringInfo(hint.string).name} string (${stringInfo(hint.string).note}). Move ${hint.fret} ${hint.fret === 1 ? 'semitone' : 'semitones'} towards the body, one fret at a time.`}</p>}
        {hints >= 2 && <p className="note-route">{Array.from({ length: hint.fret + 1 }, (_, fret) => noteLabel(pitchAt({ string: hint.string, fret }))).join(' → ')}</p>}
        {hints >= 3 && <p><strong>{noteLabel(pitchAt(hint))}</strong> is at {hint.fret === 0 ? 'the open string position' : `fret ${hint.fret}`}. Select it on the board to continue.</p>}
      </div></div><button className="button secondary small" disabled={s.phase === 'place' ? complete : recallSolved || hints === 3} onClick={() => dispatch({ type: 'HINT' })}>{hints === 0 ? 'Need a hint?' : hints === 1 ? 'Show the steps' : hints === 2 ? 'Reveal the answer' : 'Answer revealed'}</button></div>
      <div className="lesson-footer"><p>{s.phase === 'recall' ? 'First-try, hint-free answers count as unaided recall.' : 'The colours stay with the notes, wherever they live.'}</p>{s.phase === 'place' && <button className="button primary" disabled={!complete} onClick={() => dispatch({ type: 'START_RECALL' })}>Try without the map <Icon name="arrow" size={17} /></button>}{s.phase === 'recall' && <span className="recall-auto-status">{recallSolved ? <><Icon name="check" size={17} />{s.index === s.order.length - 1 ? 'Opening your results…' : 'Correct. Next note coming…'}</> : 'Correct answers move you on automatically.'}</span>}</div>
    </>}
  </section>;
}
