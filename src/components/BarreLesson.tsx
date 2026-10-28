import { useEffect, useState } from 'react';
import { DEFAULT_PRACTICE_MINUTES, chordPool, keyTriads, validChordSeconds, validPracticeMinutes, type BarrePracticeSettings, type ChordOptions } from '../chords';
import { type Session } from '../session';
import { Icon } from './Icon';
import { ChordSelection } from './ChordSelection';
import { ChordPracticeStage } from './ChordPracticeStage';
import { useChordPlayer } from './useChordPlayer';

export function BarreLesson({ session: s, playChord, openLesson, settings, onSettingsChange }: {
  session: Session;
  playChord: (midis: number[]) => void;
  openLesson: (id: string, options?: ChordOptions) => void;
  settings: BarrePracticeSettings;
  onSettingsChange: (settings: BarrePracticeSettings) => void;
}) {
  const { prompt: chord, options } = s.barre!;
  const [secondsInput, setSecondsInput] = useState(String(settings.seconds));
  const practiceMinutes = settings.practiceMinutes ?? DEFAULT_PRACTICE_MINUTES;
  const [practiceMinutesInput, setPracticeMinutesInput] = useState(String(practiceMinutes));
  const validSeconds = validChordSeconds(Number(secondsInput));
  const validPracticeDuration = validPracticeMinutes(Number(practiceMinutesInput));
  const duration = validSeconds ? Number(secondsInput) : settings.seconds;
  const practiceDuration = (validPracticeDuration ? Number(practiceMinutesInput) : practiceMinutes) * 60;
  const { running, remaining, remainingDisplay, progress, practiceRemaining, practiceProgress, finished, togglePractice, startPractice, stopPractice } = useChordPlayer(duration, practiceDuration, s.id, () => openLesson(s.lesson.id, options), validSeconds && validPracticeDuration);
  const rootString = chord.shape === 'E' ? 'low E (6th)' : 'A (5th)';
  const activeKey = options.key;
  const availableTriads = activeKey ? keyTriads(activeKey).filter((triad) => options.quality === 'both' || triad.quality === options.quality) : [];

  useEffect(() => { document.getElementById('page-title')?.focus({ preventScroll: true }); }, []);
  useEffect(() => { setSecondsInput(String(settings.seconds)); }, [settings.seconds]);
  useEffect(() => { setPracticeMinutesInput(String(practiceMinutes)); }, [practiceMinutes]);
  function changeOptions(change: Partial<ChordOptions>) {
    onSettingsChange({ ...settings, ...change });
  }
  function changeSeconds(value: string) {
    setSecondsInput(value);
    const seconds = Number(value);
    if (validChordSeconds(seconds)) onSettingsChange({ ...settings, seconds });
  }
  function changePracticeMinutes(value: string) {
    setPracticeMinutesInput(value);
    const minutes = Number(value);
    if (validPracticeMinutes(minutes)) onSettingsChange({ ...settings, practiceMinutes: minutes });
  }

  return <section className="lesson-page barre-page timed-barre-page">
    <div className="lesson-heading"><div><p className="eyebrow">COMPUTER-LED · GUITAR-IN-HAND PRACTICE</p><h1 id="page-title" tabIndex={-1}>Barre chord practice</h1></div><button type="button" className={`button primary barre-player-control ${running ? 'player-running' : ''}`} disabled={!running && (!validSeconds || !validPracticeDuration)} onClick={togglePractice}><Icon name={running ? 'stop' : 'play'} size={17} />{running ? 'Stop practice' : 'Start practice'}</button></div>
    <ChordSelection practiceKey={activeKey} running={running} onChange={(key) => changeOptions({ key })} idPrefix="barre" availableChords={availableTriads} note="Diminished chord omitted; major/minor shapes only." randomTitle="Explore all 12 roots." randomDescription="Random chords using your chosen shapes and chord types." />
    <div className="barre-options">
      <fieldset disabled={running}><legend>Shape</legend><div>{(['both', 'E', 'A'] as const).map((shape) => <button key={shape} type="button" aria-pressed={options.shape === shape} onClick={() => changeOptions({ shape })}>{shape === 'both' ? 'Both shapes' : `${shape} shape`}</button>)}</div></fieldset>
      <fieldset disabled={running}><legend>Chord type</legend><div>{(['both', 'major', 'minor'] as const).map((quality) => <button key={quality} type="button" aria-pressed={options.quality === quality} onClick={() => changeOptions({ quality })}>{quality === 'both' ? 'Major + minor' : quality === 'major' ? 'Major only' : 'Minor only'}</button>)}</div></fieldset>
      <div className="barre-duration"><label htmlFor="barre-seconds">Seconds per chord</label><div><input id="barre-seconds" type="number" min="1" max="300" step="1" inputMode="numeric" value={secondsInput} disabled={running} aria-invalid={!validSeconds} aria-describedby="barre-interval-help" onChange={(event) => changeSeconds(event.target.value)} /><span>seconds</span></div></div>
      <div className="barre-duration"><label htmlFor="barre-practice-minutes">Practice duration</label><div><input id="barre-practice-minutes" type="number" min="1" max="300" step="1" inputMode="numeric" value={practiceMinutesInput} disabled={running} aria-invalid={!validPracticeDuration} aria-describedby="barre-duration-help" onChange={(event) => changePracticeMinutes(event.target.value)} /><span>minutes</span></div></div>
      <p><span>{chordPool(options).length} combinations</span><small>Barre frets 1–12</small></p>
    </div>
    <p id="barre-interval-help" className={`barre-settings-help ${!validSeconds ? 'invalid-duration' : ''}`} role={!validSeconds ? 'alert' : undefined}>{!validSeconds ? 'Choose a whole number from 1 to 300 seconds.' : running ? 'Stop practice to change the key, chord types, shapes or timing.' : 'Choose all random chords or a key, set your pace and duration, then press Start.'}</p>
    <p id="barre-duration-help" className={`barre-settings-help ${!validPracticeDuration ? 'invalid-duration' : ''}`} role={!validPracticeDuration ? 'alert' : undefined}>{!validPracticeDuration ? 'Choose a whole number from 1 to 300 minutes.' : 'The session stops automatically when this duration ends.'}</p>
    <ChordPracticeStage chord={chord} practiceKey={activeKey} promptToken={s.id} running={running} remaining={remaining} remainingDisplay={remainingDisplay} progress={progress} duration={duration} practiceRemaining={practiceRemaining} practiceProgress={practiceProgress} practiceDuration={practiceDuration} finished={finished} canStart={validSeconds && validPracticeDuration} onStart={startPractice} onStop={stopPractice} playChord={playChord} labelMode={settings.labels ?? 'fingers'} onLabelModeChange={(labels) => onSettingsChange({ ...settings, labels })} />
    <div className="barre-workspace">
      <div className="barre-coach">
        <div className="hint-panel"><div className="hint-copy"><Icon name="chord" size={20} /><div><h3>Build it from the root.</h3><p>The {chord.shape} shape has its root on the <strong>{rootString} string</strong>, at <strong>fret {chord.fret}</strong>. Barre {chord.shape === 'E' ? 'all six strings' : 'strings 5 through 1'} there.</p><p>{chord.shape === 'A' ? 'Keep the low E string muted. ' : ''}{chord.quality === 'minor' ? 'The minor shape lowers the third by one fret compared with its major shape.' : 'Keep the major shape’s spacing as you move it along the neck.'}</p></div></div></div>
        {chord.shape === 'A' && chord.quality === 'major' && <p className="barre-tip"><Icon name="spark" size={16} /><span>The ring finger makes a small barre across D, G and B. Muting high e is also a valid A-shape major voicing if the ring finger brushes it.</span></p>}
        {chord.fret > 10 && <p className="barre-tip"><Icon name="path" size={16} /><span>The barre is in the first 12 frets. This shape’s other fingers reach fret {chord.fret + 2}.</span></p>}
      </div>
    </div>
    <p className="barre-footnote">Index = 1 · middle = 2 · ring = 3 · little finger = 4. Play along at your chosen pace; stop whenever you want a break.</p>
  </section>;
}
