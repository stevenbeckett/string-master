import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { NOTES } from '../music';
import { chordAlias, chordMidis, keyName, pitchName, type BarreChord, type ChordKey, type ChordLabelMode } from '../chords';
import type { OpenChord } from '../openChords';
import { ChordDiagram } from './ChordDiagram';
import { ChordTimer } from './ChordTimer';
import { Icon } from './Icon';

export function ChordPracticeStage({ chord, practiceKey, promptToken, running, remaining, progress, duration, canStart, onStart, onStop, playChord, labelMode, onLabelModeChange, singleChord = false }: {
  chord: BarreChord | OpenChord;
  practiceKey?: ChordKey | null;
  promptToken: string;
  running: boolean;
  remaining: number;
  progress: number;
  duration: number;
  canStart: boolean;
  onStart: () => void;
  onStop: () => void;
  playChord: (midis: number[]) => void;
  labelMode: ChordLabelMode;
  onLabelModeChange: (mode: ChordLabelMode) => void;
  singleChord?: boolean;
}) {
  const [maximised, setMaximised] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const maximiseRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const stopRef = useRef<HTMLButtonElement>(null);
  const minimiseRef = useRef<HTMLButtonElement>(null);
  const nativeFullscreen = useRef(false);
  const wantsFullscreen = useRef(false);
  const stageId = useId();
  const barre = 'shape' in chord ? chord : null;
  const title = barre ? 'Barre chord practice' : 'Open chord practice';
  const alias = chordAlias(chord, practiceKey);

  async function maximise() {
    const stage = stageRef.current;
    if (!stage) return;
    wantsFullscreen.current = true;
    setMaximised(true);
    // Keep the same mounted stage and player when native fullscreen is unavailable.
    try {
      if (document.fullscreenEnabled && stage.requestFullscreen) await stage.requestFullscreen();
      if (!wantsFullscreen.current && document.fullscreenElement === stage) await document.exitFullscreen();
    } catch { /* Expanded in-page view stays usable. */ }
  }
  async function minimise() {
    wantsFullscreen.current = false;
    if (document.fullscreenElement === stageRef.current) {
      try { await document.exitFullscreen(); } catch { wantsFullscreen.current = true; return; }
    }
    nativeFullscreen.current = false;
    setMaximised(false);
  }

  useEffect(() => {
    const stage = stageRef.current;
    function changed() {
      if (document.fullscreenElement === stage) {
        nativeFullscreen.current = true;
        if (!wantsFullscreen.current) void document.exitFullscreen().catch(() => {});
      } else if (nativeFullscreen.current) { nativeFullscreen.current = false; wantsFullscreen.current = false; setMaximised(false); }
    }
    document.addEventListener('fullscreenchange', changed);
    return () => {
      document.removeEventListener('fullscreenchange', changed);
      wantsFullscreen.current = false;
      if (document.fullscreenElement === stage) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!maximised) return;
    const stage = stageRef.current!;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Isolate the expanded stage from navigation and controls behind it.
    const outside: { element: HTMLElement; inert: boolean; ariaHidden: string | null }[] = [];
    let child: HTMLElement = stage;
    while (child.parentElement) {
      const parent = child.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== child && sibling instanceof HTMLElement) {
          outside.push({ element: sibling, inert: sibling.inert, ariaHidden: sibling.getAttribute('aria-hidden') });
          sibling.inert = true;
          sibling.setAttribute('aria-hidden', 'true');
        }
      }
      if (parent === document.body) break;
      child = parent;
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); void minimise(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(stage.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !stage.contains(active))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || !stage.contains(active))) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      document.body.style.overflow = previousOverflow;
      for (const item of outside) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden');
        else item.element.setAttribute('aria-hidden', item.ariaHidden);
      }
      maximiseRef.current?.focus({ preventScroll: true });
    };
  }, [maximised]);
  useEffect(() => {
    if (maximised) (running ? stopRef.current : canStart ? startRef.current : minimiseRef.current)?.focus({ preventScroll: true });
  }, [maximised, running, canStart]);

  return <section id={stageId} ref={stageRef} className={`chord-practice-stage ${maximised ? 'is-maximised' : ''}`} role={maximised ? 'dialog' : undefined} aria-modal={maximised ? true : undefined} aria-label={maximised ? `${title} · full-screen fretboard` : undefined}>
    {maximised && <div className="practice-fullscreen-toolbar"><div><p className="eyebrow">{title}</p><span>{!canStart ? 'Minimise to choose a valid interval.' : singleChord ? 'One chord fits these filters; it repeats each interval.' : 'Play along at your chosen pace. Escape also minimises.'}</span></div><div className="practice-fullscreen-controls"><button ref={startRef} type="button" className="button primary" disabled={running || !canStart} onClick={onStart}><Icon name="play" size={17} />Start practice</button><button ref={stopRef} type="button" className="button secondary" disabled={!running} onClick={onStop}><Icon name="stop" size={17} />Stop practice</button><button ref={minimiseRef} type="button" className="button secondary" onClick={() => void minimise()}><Icon name="minimise" size={18} />Minimise</button></div></div>}
    <div className="barre-prompt chord-spotlight" style={{ '--chord-accent': NOTES[chord.root].colour } as CSSProperties}><div className="chord-announcer" aria-live="polite" aria-atomic="true"><div key={promptToken} className="chord-entry" data-testid="chord-entry" data-prompt-token={promptToken}><p className="eyebrow">PLAY THIS CHORD{practiceKey ? ` · ${keyName(practiceKey)}` : ''}</p><h2 data-testid="chord-name"><span className="chord-root-name">{pitchName(chord.root, practiceKey)}</span>{' '}<span className="chord-quality-name">{chord.quality}</span></h2>{alias && <p className="chord-alias">Also called {alias}</p>}</div></div><div className="chord-prompt-side"><span className="barre-shape-badge" data-testid={barre ? 'chord-shape' : undefined}>{barre ? `${barre.shape} shape` : 'Open chord'}</span><ChordTimer running={running} remaining={remaining} progress={progress} duration={duration} singleChord={singleChord} /></div></div>
    <div className="barre-answer"><div className="barre-answer-heading"><div><p className="eyebrow">{labelMode === 'notes' ? 'SEE THE NOTES' : 'PLAY THE SHAPE'}</p><h3>{barre ? <>Barre at fret <span data-testid="barre-fret">{barre.fret}</span></> : 'Open chord · full octave'}</h3></div><div className="barre-answer-actions"><button type="button" className="button secondary small" onClick={() => playChord(chordMidis(chord))}><Icon name="sound" size={16} />Hear chord</button><div className="chord-label-switch" role="group" aria-label="Chart labels"><button type="button" aria-pressed={labelMode === 'fingers'} onClick={() => onLabelModeChange('fingers')}>Fingers</button><button type="button" aria-pressed={labelMode === 'notes'} onClick={() => onLabelModeChange('notes')}>Notes</button></div>{!maximised && <button ref={maximiseRef} type="button" className="button practice-maximise" aria-controls={stageId} aria-haspopup="dialog" onClick={() => void maximise()}><Icon name="maximise" size={18} />Maximise fretboard</button>}</div></div><ChordDiagram chord={chord} practiceKey={practiceKey} labelMode={labelMode} /></div>
  </section>;
}
