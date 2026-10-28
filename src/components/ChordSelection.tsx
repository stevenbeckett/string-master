import { useState } from 'react';
import { KEY_ROOT_NAMES, type ChordKey } from '../chords';

export function ChordSelection({ practiceKey, running, onChange, idPrefix }: {
  practiceKey?: ChordKey | null;
  running: boolean;
  onChange: (key: ChordKey | null) => void;
  idPrefix: string;
}) {
  const [chosenKey, setChosenKey] = useState<ChordKey>(practiceKey ?? { tonic: 0, mode: 'major' });
  function changeKey(change: Partial<ChordKey>) {
    const key = { ...chosenKey, ...change };
    setChosenKey(key);
    onChange(key);
  }
  return <div className="barre-options barre-source-options">
    <fieldset disabled={running}><legend>Chord selection</legend><div><button type="button" aria-pressed={!practiceKey} onClick={() => onChange(null)}>All random chords</button><button type="button" aria-pressed={!!practiceKey} onClick={() => onChange(chosenKey)}>Chords in a key</button></div></fieldset>
    <div className="barre-key-field"><label htmlFor={`${idPrefix}-key-root`}>Key root</label><select id={`${idPrefix}-key-root`} value={chosenKey.tonic} disabled={running || !practiceKey} onChange={(event) => changeKey({ tonic: Number(event.target.value) })}>{KEY_ROOT_NAMES[chosenKey.mode].map((name, tonic) => <option key={tonic} value={tonic}>{name}</option>)}</select></div>
    <div className="barre-key-field"><label htmlFor={`${idPrefix}-key-type`}>Key type</label><select id={`${idPrefix}-key-type`} value={chosenKey.mode} disabled={running || !practiceKey} onChange={(event) => changeKey({ mode: event.target.value as ChordKey['mode'] })}><option value="major">Major</option><option value="minor">Natural minor</option></select></div>
  </div>;
}
