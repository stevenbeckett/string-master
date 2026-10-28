import { memo } from 'react';
import { NOTES, pitchAt, stringInfo } from '../music';
import { chordName, pitchName, type BarreChord, type ChordKey, type ChordLabelMode } from '../chords';
import type { OpenChord } from '../openChords';
import type { FinderChord } from '../chordFinder';

export const ChordDiagram = memo(function ChordDiagram({ chord, practiceKey, labelMode = 'fingers' }: { chord: BarreChord | OpenChord | FinderChord; practiceKey?: ChordKey | null; labelMode?: ChordLabelMode }) {
  const barre = 'shape' in chord ? chord : null;
  const displayName = 'name' in chord ? chord.name : chordName(chord, practiceKey);
  const lastFret = Math.max(12, ...chord.voices.map((voice) => voice.fret ?? 0));
  const nut = 142;
  const end = 1080;
  const fretWidth = (end - nut) / lastFret;
  const xAt = (fret: number) => fret === 0 ? 100 : nut + (fret - .5) * fretWidth;
  const yAt = (string: number) => 56 + (string - 1) * 34;
  const isRoot = (string: number) => string === chord.rootString;

  return <figure className="chord-diagram">
    <div className="chord-neck-scroll" tabIndex={0} role="region" aria-label={`Chord fretboard, open strings through fret ${lastFret}`}>
      <svg viewBox="0 0 1120 278" role="img" data-last-fret={lastFret} data-label-mode={labelMode} aria-label={`${displayName}, ${barre ? `${barre.shape} shape, barre at fret ${barre.fret}` : 'kind' in chord && chord.kind === 'finder' ? 'suggested voicing' : 'open position'}`}>
        <rect className="chord-neck-surface" x="66" y="40" width={end - 66} height="202" rx="12" />
        <rect className="chord-open-surface" x="66" y="40" width={nut - 66} height="202" rx="12" />
        {lastFret > 12 && <rect className="chord-neck-extension" x={nut + 12 * fretWidth} y="40" width={(lastFret - 12) * fretWidth} height="202" />}
        {[3, 5, 7, 9, 15, 17, 19, 21].filter((fret) => fret <= lastFret).map((fret) => <circle className="chord-inlay" key={fret} cx={xAt(fret)} cy="141" r="7" />)}
        {lastFret >= 12 && <><circle className="chord-inlay" cx={xAt(12)} cy="73" r="7" /><circle className="chord-inlay" cx={xAt(12)} cy="209" r="7" /></>}
        <text className="chord-fret-label" x="25" y="23" textAnchor="middle">STRING</text>
        <text className="chord-fret-label" x={xAt(0)} y="23" textAnchor="middle">OPEN</text>
        {Array.from({ length: lastFret }, (_, i) => i + 1).map((fret) => <g key={fret}>
          <line className="chord-fret-wire" x1={nut + fret * fretWidth} x2={nut + fret * fretWidth} y1="41" y2="241" />
          <text className="chord-fret-label" data-neck-fret={fret} x={xAt(fret)} y="23" textAnchor="middle">{fret}</text>
        </g>)}
        {chord.voices.map((voice) => <g key={voice.string}>
          <text className="chord-string-label" x="22" y={yAt(voice.string) + 5} textAnchor="middle">{voice.string === 1 ? 'e' : stringInfo(voice.string).note}</text>
          <text className="chord-string-number" x="44" y={yAt(voice.string) + 4}>{voice.string}</text>
          <line className="chord-string-wire" data-string-wire={voice.string} x1="66" x2={end} y1={yAt(voice.string)} y2={yAt(voice.string)} strokeWidth={.8 + voice.string * .22} opacity={voice.fret === null ? .28 : 1} />
          {voice.fret === null && <text className="chord-mute" x={xAt(0)} y={yAt(voice.string) + 7} textAnchor="middle">×</text>}
        </g>)}
        <line className="chord-nut" x1={nut} x2={nut} y1="40" y2="242" strokeWidth="5" />
        {barre && <rect className="chord-barre" data-barre-fret={barre.fret} x={xAt(barre.fret) - 12} y={yAt(1) - 12} width="24" height={yAt(barre.rootString) - yAt(1) + 24} rx="12" />}
        {barre?.shape === 'A' && chord.quality === 'major' && <rect className="chord-barre secondary-barre" data-barre-fret={barre.fret + 2} x={xAt(barre.fret + 2) - 12} y={yAt(2) - 12} width="24" height={yAt(4) - yAt(2) + 24} rx="12" />}
        {chord.voices.filter((voice) => voice.fret !== null).map((voice) => {
          const fret = voice.fret!;
          const pitch = pitchAt({ string: voice.string, fret });
          const note = pitchName(pitch, practiceKey);
          return <g key={voice.string} data-chord-string={voice.string} data-chord-fret={fret} data-chord-finger={voice.finger}>
            <title>{`${stringInfo(voice.string).name} string, ${note}, ${fret === 0 ? 'open' : `fret ${fret}`}`}</title>
            {fret === 0 ? <><circle className="chord-open" cx={xAt(0)} cy={yAt(voice.string)} r={labelMode === 'notes' ? 15 : 13} fill="#263d41" stroke={isRoot(voice.string) ? '#ed8665' : '#dce8c9'} strokeWidth={isRoot(voice.string) ? 3.5 : 2.5} />{labelMode === 'notes' && <text className={`chord-note-name open-note-label ${note.length > 1 ? 'accidental-label' : ''}`} x={xAt(0)} y={yAt(voice.string) + 5} textAnchor="middle">{note}</text>}</> : <>
              <circle cx={xAt(fret)} cy={yAt(voice.string)} r="16" fill={NOTES[pitch].colour} stroke={isRoot(voice.string) ? '#ed8665' : '#fffefa'} strokeWidth={isRoot(voice.string) ? 4 : 2} />
              {labelMode === 'notes' ? <text className={`chord-note-name ${note.length > 1 ? 'accidental-label' : ''}`} x={xAt(fret)} y={yAt(voice.string) + 6} textAnchor="middle">{note}</text> : <text className="chord-finger-number" x={xAt(fret)} y={yAt(voice.string) + 6} textAnchor="middle">{voice.finger}</text>}
            </>}
          </g>;
        })}
        <text className="chord-fret-label" x={nut} y="270" textAnchor="middle">NUT</text>
      </svg>
    </div>
    <figcaption>{labelMode === 'notes' ? 'Notes shown' : 'Finger numbers shown'} · × = muted</figcaption>

  </figure>;
});
