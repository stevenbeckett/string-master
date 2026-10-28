import type { CSSProperties, KeyboardEvent } from 'react';
import { NOTES, STRINGS, pitchAt, positionKey, positionLabel, noteLabel, type Position } from '../music';
import { collectionComplete, currentTarget, hintBand, hintTarget, type Session } from '../session';

const WIDTH = 1120;
const HEIGHT = 330;
const yAt = (string: number) => 62 + (string - 1) * 38;

export function NoteName({ pitch }: { pitch: number }) {
  const note = NOTES[pitch];
  return <span className={`note-name ${note.flat ? 'has-flat' : ''}`}><span>{note.name}</span>{note.flat && <span className="flat-name">{note.flat}</span>}</span>;
}

export function Fretboard({ session, onPosition, onFocus, onDrop, noteMap }: {
  session: Session;
  onPosition: (position: Position) => void;
  onFocus: (position: Position) => void;
  onDrop: (position: Position, pitch: number) => void;
  noteMap?: { highlightedPitch: number | null };
}) {
  const fretCount = Math.max(12, session.lesson.band.end);
  const fretWidth = 936 / fretCount;
  const xAt = (fret: number) => fret === 0 ? 92 : 131 + (fret - .5) * fretWidth;
  const slotWidth = Math.min(64, fretWidth - 6);
  const collecting = session.phase === 'collect';
  const exploring = !!noteMap;
  const concealOpenTuning = session.lesson.kind === 'open' && session.phase !== 'learn';
  const active = new Set(session.positions.map(positionKey));
  const hint = hintTarget(session);
  const hintKey = positionKey(hint);
  const hintLevel = exploring || collectionComplete(session) ? 0 : session.phase === 'place' ? session.placements[hintKey]?.hints ?? 0 : session.phase === 'recall' || collecting ? session.recalls[hintKey]?.hints ?? 0 : 0;
  const target = currentTarget(session);
  const targetSolved = session.recalls[positionKey(target)].solved;
  const focusKey = active.has(session.focused) ? session.focused : positionKey(session.positions[0]);
  const area = hintBand(hint);

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, p: Position) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const candidates = session.positions.filter((other) => {
      if (event.key === 'ArrowLeft') return other.string === p.string && other.fret < p.fret;
      if (event.key === 'ArrowRight') return other.string === p.string && other.fret > p.fret;
      return event.key === 'ArrowUp' ? other.string < p.string : other.string > p.string;
    }).sort((a, b) => Math.abs(a.string - p.string) * 20 + Math.abs(a.fret - p.fret) - Math.abs(b.string - p.string) * 20 - Math.abs(b.fret - p.fret));
    const next = candidates[0];
    if (next) document.querySelector<HTMLButtonElement>(`[data-position="${positionKey(next)}"]`)?.focus();
  }

  return <div className="fretboard-scroll"><div className={`fretboard ${fretCount > 12 ? 'full-neck' : ''} ${exploring ? 'note-map' : ''}`} role="group" aria-label="Interactive guitar fretboard" aria-describedby="board-instructions">
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="neck-svg" aria-hidden="true">
      <rect className="neck-surface" x="65" y="42" width="1002" height="230" rx="12" />
      <rect className="open-surface" x="65" y="42" width="66" height="230" rx="10" />
      {session.phase === 'learn' && session.positions.map((p) => <rect className="practice-highlight" key={positionKey(p)} x={xAt(p.fret) - slotWidth / 2} y={yAt(p.string) - 18} width={slotWidth} height="36" rx="10" />)}
      {collecting && hintLevel >= 2 && <rect className="hinted-range" x={area.start === 0 ? 65 : xAt(area.start) - fretWidth / 2} y={yAt(hint.string) - 18} width={area.start === 0 ? xAt(area.end) + fretWidth / 2 - 65 : (area.end - area.start + 1) * fretWidth} height="36" rx="8" />}
      {[3, 5, 7, 9, 15, 17, 19, 21].filter((fret) => fret <= fretCount).map((fret) => <circle className="fret-inlay" key={fret} cx={xAt(fret)} cy="157" r="7" />)}
      {fretCount >= 12 && <><circle className="fret-inlay" cx={xAt(12)} cy="81" r="7" /><circle className="fret-inlay" cx={xAt(12)} cy="233" r="7" /></>}
      {Array.from({ length: fretCount }, (_, i) => <line className="fret-wire" key={i} x1={131 + (i + 1) * fretWidth} x2={131 + (i + 1) * fretWidth} y1="43" y2="271" strokeWidth="1.3" />)}
      {[...STRINGS].reverse().map((s) => <g key={s.id} opacity={session.positions.some((p) => p.string === s.id) ? 1 : .32}>
        <line className={`string-wire ${collecting && hintLevel >= 1 && hint.string === s.id ? 'hinted-string' : ''}`} x1="65" x2="1067" y1={yAt(s.id)} y2={yAt(s.id)} strokeWidth={.8 + s.id * .22} />
        <text className="string-name" x="21" y={yAt(s.id) + 5} fontSize="17" fontFamily="inherit">{concealOpenTuning ? '·' : s.id === 1 ? 'e' : s.note}</text>
        <text className="string-number" x="43" y={yAt(s.id) + 4} fontSize="12" fontFamily="inherit">{s.id}</text>
      </g>)}
      <line className="nut-line" x1="131" x2="131" y1="42" y2="272" strokeWidth="5" />
      <text x="12" y="22" className="neck-caption">STRING</text>
      {Array.from({ length: fretCount + 1 }, (_, fret) => <text key={fret} x={xAt(fret)} y="23" textAnchor="middle" className="neck-caption">{fret === 0 ? 'OPEN' : fret}</text>)}
      <text x="131" y="318" textAnchor="middle" className="neck-caption">NUT</text>
      {!collecting && hintLevel >= 2 && hint.fret > 0 && <path className="hint-route" d={`M92 ${yAt(hint.string)} H${xAt(hint.fret)}`} fill="none" strokeWidth="3" strokeDasharray="5 6" />}
    </svg>
    {STRINGS.flatMap((s) => Array.from({ length: fretCount + 1 }, (_, fret) => {
      const p = { string: s.id, fret };
      const key = positionKey(p);
      const isActive = active.has(key);
      const pitch = pitchAt(p);
      const answered = session.phase === 'learn' && isActive || session.phase === 'place' && session.placements[key]?.solved || session.phase === 'recall' && key === positionKey(target) && targetSolved || collecting && session.recalls[key]?.solved;
      const revealed = hintLevel === 3 && key === hintKey;
      const anchor = !collecting && hintLevel >= 1 && p.string === hint.string && p.fret === 0;
      const missed = !exploring && (collecting ? session.collection?.lastMiss === key : session.phase === 'recall' && session.recallMiss === key);
      const highlighted = exploring && noteMap.highlightedPitch === pitch;
      const showNote = exploring || answered || revealed || anchor;
      if (!isActive && !anchor) return null;
      const style = { left: `${xAt(fret) / WIDTH * 100}%`, top: `${yAt(s.id) / HEIGHT * 100}%`, '--note-colour': NOTES[pitch].colour } as CSSProperties;
      return <button key={key} type="button" data-position={key} data-answered={!!answered} data-revealed={revealed || anchor} data-incorrect={!!missed} data-highlighted={highlighted}
        className={`fret-position ${showNote ? 'with-note' : 'empty-position'} ${answered ? 'answered' : ''} ${revealed ? 'revealed' : ''} ${anchor ? 'anchor' : ''} ${missed ? 'missed' : ''} ${highlighted ? 'map-highlighted' : exploring && noteMap.highlightedPitch !== null ? 'map-other' : ''}`}
        style={style} disabled={!isActive} tabIndex={key === focusKey ? 0 : -1}
        aria-invalid={missed || undefined}
        aria-pressed={exploring ? highlighted : undefined}
        aria-label={`${positionLabel(p)}${showNote ? `, ${noteLabel(pitch)}${revealed ? ', hint' : ''}${highlighted ? ', highlighted' : ''}` : ''}`}
        onFocus={() => onFocus(p)} onKeyDown={(event) => moveFocus(event, p)} onClick={() => onPosition(p)}
        onDragOver={(event) => { if (session.phase === 'place' && !answered) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
        onDrop={(event) => { event.preventDefault(); const raw = event.dataTransfer.getData('text/plain'); if (!/^\d{1,2}$/.test(raw)) return; const value = Number(raw); if (value >= 0 && value < 12) onDrop(p, value); }}>
        {showNote ? <NoteName pitch={pitch} /> : <span aria-hidden="true">{missed ? '×' : '·'}</span>}
      </button>;
    }))}
  </div></div>;
}

export function MiniFretboard() {
  const positions: Position[] = [{ string: 1, fret: 1 }, { string: 1, fret: 3 }, { string: 2, fret: 1 }, { string: 3, fret: 2 }, { string: 4, fret: 2 }, { string: 5, fret: 3 }, { string: 4, fret: 5 }];
  return <svg className="mini-fretboard" viewBox="0 0 390 235" role="img" aria-label="A colourful map of notes on six guitar strings">
    <defs><linearGradient id="hero-neck" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#40535a" /><stop offset="1" stopColor="#26383e" /></linearGradient><filter id="hero-note-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity=".22" /></filter></defs>
    <rect x="42" y="33" width="300" height="186" rx="15" fill="#101d23" opacity=".6" />
    <rect x="42" y="24" width="300" height="186" rx="15" fill="url(#hero-neck)" stroke="#72888b" strokeWidth="1" />
    {Array.from({ length: 6 }, (_, i) => <line key={`s${i}`} x1="25" x2="365" y1={45 + i * 29} y2={45 + i * 29} stroke="#a5b7b4" opacity=".6" strokeWidth={.8 + i * .17} />)}
    {Array.from({ length: 6 }, (_, i) => <line key={`f${i}`} x1={42 + i * 60} x2={42 + i * 60} y1="24" y2="210" stroke={i === 0 ? '#f9b391' : '#72878a'} strokeWidth={i === 0 ? 5 : 1.5} />)}
    {positions.map((p, i) => <g className="hero-note" style={{ '--note-delay': `${i * 65}ms` } as CSSProperties} key={positionKey(p)} transform={`translate(${42 + (p.fret - .5) * 60},${45 + (p.string - 1) * 29})`}><circle r="24" fill="none" stroke="#fff" opacity=".08" /><circle r="19" fill={NOTES[pitchAt(p)].colour} stroke="#fff" strokeWidth="2" filter="url(#hero-note-shadow)" /><text textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="700" fill="#24343a">{NOTES[pitchAt(p)].name}</text></g>)}
    <circle cx="192" cy="224" r="3" fill="#a4b6af" /><circle cx="312" cy="224" r="3" fill="#a4b6af" />
  </svg>;
}
