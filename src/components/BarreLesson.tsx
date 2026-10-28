import { useEffect, useState } from 'react';
import { DEFAULT_PRACTICE_MINUTES, chordPool, validChordSeconds, validPracticeMinutes, type BarrePracticeSettings, type ChordOptions } from '../chords';
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
  const activeKey = options.key;

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
    <div className="lesson-heading"><div><h1 id="page-title" tabIndex={-1}>Barre chord practice</h1></div><button type="button" className={`button primary barre-player-control ${running ? 'player-running' : ''}`} disabled={!running && (!validSeconds || !validPracticeDuration)} onClick={togglePractice}><Icon name={running ? 'stop' : 'play'} size={17} />{running ? 'Stop practice' : 'Start practice'}</button></div>
    <ChordSelection practiceKey={activeKey} running={running} onChange={(key) => changeOptions({ key })} idPrefix="barre" />
    <div className="barre-options">
      <fieldset disabled={running}><legend>Shape</legend><div>{(['both', 'E', 'A'] as const).map((shape) => <button key={shape} type="button" aria-pressed={options.shape === shape} onClick={() => changeOptions({ shape })}>{shape === 'both' ? 'Both shapes' : `${shape} shape`}</button>)}</div></fieldset>
      <fieldset disabled={running}><legend>Chord type</legend><div>{(['both', 'major', 'minor'] as const).map((quality) => <button key={quality} type="button" aria-pressed={options.quality === quality} onClick={() => changeOptions({ quality })}>{quality === 'both' ? 'Major + minor' : quality === 'major' ? 'Major only' : 'Minor only'}</button>)}</div></fieldset>
      <div className="barre-duration"><label htmlFor="barre-seconds">Seconds per chord</label><div><input id="barre-seconds" type="number" min="1" max="300" step="1" inputMode="numeric" value={secondsInput} disabled={running} aria-invalid={!validSeconds} aria-describedby={!validSeconds ? 'barre-interval-help' : undefined} onChange={(event) => changeSeconds(event.target.value)} /><span>seconds</span></div></div>
      <div className="barre-duration"><label htmlFor="barre-practice-minutes">Practice duration</label><div><input id="barre-practice-minutes" type="number" min="1" max="300" step="1" inputMode="numeric" value={practiceMinutesInput} disabled={running} aria-invalid={!validPracticeDuration} aria-describedby={!validPracticeDuration ? 'barre-duration-help' : undefined} onChange={(event) => changePracticeMinutes(event.target.value)} /><span>minutes</span></div></div>
      <p><span>{chordPool(options).length} combinations</span><small>Barre frets 1–12</small></p>
    </div>
    {!validSeconds && <p id="barre-interval-help" className="barre-settings-help invalid-duration" role="alert">Choose a whole number from 1 to 300 seconds.</p>}
    {!validPracticeDuration && <p id="barre-duration-help" className="barre-settings-help invalid-duration" role="alert">Choose a whole number from 1 to 300 minutes.</p>}
    <ChordPracticeStage chord={chord} practiceKey={activeKey} promptToken={s.id} running={running} remaining={remaining} remainingDisplay={remainingDisplay} progress={progress} duration={duration} practiceRemaining={practiceRemaining} practiceProgress={practiceProgress} practiceDuration={practiceDuration} finished={finished} canStart={validSeconds && validPracticeDuration} onStart={startPractice} onStop={stopPractice} playChord={playChord} labelMode={settings.labels ?? 'fingers'} onLabelModeChange={(labels) => onSettingsChange({ ...settings, labels })} />
  </section>;
}
