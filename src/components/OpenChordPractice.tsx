import { useEffect, useState } from 'react';
import { DEFAULT_PRACTICE_MINUTES, keyName, validChordSeconds, validPracticeMinutes } from '../chords';
import { openChordPool, randomOpenChord, type OpenChordOptions, type OpenChordSettings } from '../openChords';
import { stringInfo } from '../music';
import { ChordSelection } from './ChordSelection';
import { ChordPracticeStage } from './ChordPracticeStage';
import { Icon } from './Icon';
import { useChordPlayer } from './useChordPlayer';

export function OpenChordPractice({ settings, onSettingsChange, playChord }: {
  settings: OpenChordSettings;
  onSettingsChange: (settings: OpenChordSettings) => void;
  playChord: (midis: number[]) => void;
}) {
  const [prompt, setPrompt] = useState(() => ({ token: crypto.randomUUID(), chord: randomOpenChord(settings) }));
  const [secondsInput, setSecondsInput] = useState(String(settings.seconds));
  const practiceMinutes = settings.practiceMinutes ?? DEFAULT_PRACTICE_MINUTES;
  const [practiceMinutesInput, setPracticeMinutesInput] = useState(String(practiceMinutes));
  const validSeconds = validChordSeconds(Number(secondsInput));
  const validPracticeDuration = validPracticeMinutes(Number(practiceMinutesInput));
  const duration = validSeconds ? Number(secondsInput) : settings.seconds;
  const practiceDuration = (validPracticeDuration ? Number(practiceMinutesInput) : practiceMinutes) * 60;
  const pool = openChordPool(settings);
  const chord = prompt.chord;
  const { running, remaining, remainingDisplay, progress, practiceRemaining, practiceProgress, finished, togglePractice, startPractice, stopPractice } = useChordPlayer(duration, practiceDuration, prompt.token,
    () => setPrompt((previous) => ({ token: crypto.randomUUID(), chord: randomOpenChord(settings, previous.chord?.id) })), validSeconds && validPracticeDuration && !!chord);
  useEffect(() => { document.getElementById('page-title')?.focus({ preventScroll: true }); }, []);
  useEffect(() => { setSecondsInput(String(settings.seconds)); }, [settings.seconds]);
  useEffect(() => { setPracticeMinutesInput(String(practiceMinutes)); }, [practiceMinutes]);

  function changeOptions(change: Partial<OpenChordOptions>) {
    const updated = { ...settings, ...change };
    onSettingsChange(updated);
    if (updated.quality !== settings.quality || updated.key?.tonic !== settings.key?.tonic || updated.key?.mode !== settings.key?.mode) {
      setPrompt((previous) => ({ token: crypto.randomUUID(), chord: randomOpenChord(updated, previous.chord?.id) }));
    }
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

  return <section className="lesson-page barre-page open-chord-page">
    <div className="lesson-heading"><div><p className="eyebrow">COMPUTER-LED · GUITAR-IN-HAND PRACTICE</p><h1 id="page-title" tabIndex={-1}>Open chord practice</h1></div><button type="button" className={`button primary barre-player-control ${running ? 'player-running' : ''}`} disabled={!running && (!validSeconds || !validPracticeDuration || !chord)} onClick={togglePractice}><Icon name={running ? 'stop' : 'play'} size={17} />{running ? 'Stop practice' : 'Start practice'}</button></div>
    <ChordSelection practiceKey={settings.key} running={running} onChange={(key) => changeOptions({ key })} idPrefix="open" availableChords={pool} note="Only matching shapes from the eight open chords are included." randomTitle="Eight familiar open chords." randomDescription="C, A, G, E, D, A minor, E minor and D minor." />
    <div className="barre-options">
      <fieldset disabled={running}><legend>Chord type</legend><div>{(['both', 'major', 'minor'] as const).map((quality) => <button key={quality} type="button" aria-pressed={settings.quality === quality} onClick={() => changeOptions({ quality })}>{quality === 'both' ? 'Major + minor' : quality === 'major' ? 'Major only' : 'Minor only'}</button>)}</div></fieldset>
      <div className="barre-duration"><label htmlFor="open-seconds">Seconds per chord</label><div><input id="open-seconds" type="number" min="1" max="300" step="1" inputMode="numeric" value={secondsInput} disabled={running} aria-invalid={!validSeconds} aria-describedby="open-interval-help" onChange={(event) => changeSeconds(event.target.value)} /><span>seconds</span></div></div>
      <div className="barre-duration"><label htmlFor="open-practice-minutes">Practice duration</label><div><input id="open-practice-minutes" type="number" min="1" max="300" step="1" inputMode="numeric" value={practiceMinutesInput} disabled={running} aria-invalid={!validPracticeDuration} aria-describedby="open-duration-help" onChange={(event) => changePracticeMinutes(event.target.value)} /><span>minutes</span></div></div>
      <p><span>{pool.length} open chord{pool.length === 1 ? '' : 's'}</span><small>Open position · no barre shapes</small></p>
    </div>
    <p id="open-interval-help" className={`barre-settings-help ${!validSeconds ? 'invalid-duration' : ''}`} role={!validSeconds ? 'alert' : undefined}>{!validSeconds ? 'Choose a whole number from 1 to 300 seconds.' : running ? 'Stop practice to change the key, chord types or timing.' : 'Choose all random chords or a key, set your pace and duration, then press Start.'}</p>
    <p id="open-duration-help" className={`barre-settings-help ${!validPracticeDuration ? 'invalid-duration' : ''}`} role={!validPracticeDuration ? 'alert' : undefined}>{!validPracticeDuration ? 'Choose a whole number from 1 to 300 minutes.' : 'The session stops automatically when this duration ends.'}</p>
    {chord ? <>
      <ChordPracticeStage chord={chord} practiceKey={settings.key} promptToken={prompt.token} running={running} remaining={remaining} remainingDisplay={remainingDisplay} progress={progress} duration={duration} practiceRemaining={practiceRemaining} practiceProgress={practiceProgress} practiceDuration={practiceDuration} finished={finished} canStart={validSeconds && validPracticeDuration} onStart={startPractice} onStop={stopPractice} playChord={playChord} labelMode={settings.labels ?? 'fingers'} onLabelModeChange={(labels) => onSettingsChange({ ...settings, labels })} singleChord={pool.length === 1} />
      <div className="barre-workspace">
        <div className="barre-coach">
          <div className="hint-panel"><div className="hint-copy"><Icon name="chord" size={20} /><div><h3>{chord.rootString === 6 ? 'Strum all six strings.' : `Start on the ${stringInfo(chord.rootString).name} string.`}</h3><p>{chord.rootString === 6 ? 'All six strings belong in this shape.' : `Strum from the ${stringInfo(chord.rootString).name} string down towards high e. Skip the strings marked ×.`}</p><p>{chord.tip}</p></div></div></div>
          <p className="barre-tip"><Icon name="spark" size={16} /><span>○ means play the string open. × means leave it out. Pick through each string slowly to check that every note rings clearly.</span></p>
          {pool.length === 1 && <p className="barre-tip">Only one chord fits these filters. It repeats each interval.</p>}
        </div>
      </div>
    </> : <div className="open-chord-empty" role="status"><Icon name="chord" size={32} /><h2>No matching open chords</h2><p>These eight open shapes do not include a {settings.quality === 'both' ? 'major or minor' : settings.quality} chord in {settings.key ? keyName(settings.key) : 'this selection'}. Choose another key or chord type, or use all random chords.</p><button className="button secondary" onClick={() => changeOptions({ key: null })}>Use all random chords</button></div>}
    <p className="barre-footnote">Index = 1 · middle = 2 · ring = 3 · little finger = 4. Practice only; no scores or self-ratings.</p>
  </section>;
}
