# String Master

A local, desktop-first guitar fretboard trainer. Learn standard six-string tuning through calm placement puzzles and note-finding practice, including a full-neck search from open strings through fret 22.

## Run locally

Use Node.js 24 and pnpm 11. From this directory:

```powershell
pnpm install
pnpm dev
```

Open **http://127.0.0.1:5173/**. Keep the terminal running while you practise. Stop the server with Ctrl+C. The app runs entirely in your browser; it needs no account, microphone, or external service.

If pnpm is not on your PATH inside Codex, the bundled runtime can run it:

```powershell
node "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs" dev
```

## Practise

1. Start on the **Dashboard**. Continue the recommended lesson, open the **Learning path**, or choose one of the three **Practice** tools. The left navigation keeps Learning and Practice in separate groups.
2. Study a short explanation. Click the coloured notes to hear their pitches. The first lesson introduces the twelve-note alphabet and shared sharp/flat names.
3. Drag reusable note pieces to their positions. They start **jumbled by default**. Alternatively, click a piece, then click the board. Use **Jumble** below the pieces to shuffle them again while keeping your placements. For keyboard use, Tab to the palette, use left/right arrows to choose a note in the displayed order, and press Enter to move to the board. Arrow keys move between positions; Enter places the selected note. Escape clears your selection. The live score tracks attempts, correct answers, misses, hints and accuracy; missed positions are highlighted and explained beside the board.
4. Find requested notes on a fresh board. Each prompt names a string, so the two open E strings are distinct answers. Correct answers play their tone, show a brief confirmation, then **automatically advance** after 550 ms. The final answer opens the results automatically. Wrong answers stay on the current prompt. Hints explain an open-string anchor, show the chromatic steps, then reveal the position. Leaving the lesson cancels a pending transition.
5. Read your recall result. Repeat the lesson after a break to see what you remember without the map.

The **Learning path** contains 28 structured lessons: open strings, three fret bands for each string (0–4, 5–8, 9–12), a final octave test for each string, and three mixed reviews. The **Practice** section contains **Find every instance**, **Barre chord practice** and **Open chord practice**. The dashboard presents these four destinations without listing every lesson. Course completion and recommendations use only the 28 learning lessons; earlier note-finding results are retained as practice history. Chord practice remains unscored. All twelve pitch names are available from the start; each accidental uses one piece with both names, such as C♯ / D♭. Review positions and recall order vary without adapting to your history.

The interface uses a larger type hierarchy, with 16 px base text and readable controls and captions. Note markers have fixed readable sizes and enough room between strings and frets. The 22-fret board scrolls horizontally on narrower windows; the full map fits on larger desktop screens. This preserves the larger sharp/flat labels without overlapping adjacent notes.

Each string ends with **All 12 notes in the octave**. This final test starts directly on a blank board and asks for all twelve distinct notes once each, in random order, across frets 1–12. Fret 12 includes the open string’s note one octave higher, so the open note is not asked twice. Hints and retries remain available and affect unaided accuracy as usual. Existing completion and accuracy records are preserved when the six new tests are added.

**Unaided accuracy** is the percentage of recall prompts answered correctly on the first try without hints. Placement mistakes and placement hints do not reduce recall accuracy. Help and retries remain available throughout. Completion records practice, not a claim of mastery.

### Find every instance

Open this mode from **Practice** in the sidebar or its dashboard card. A random note appears; find every matching position across all six strings, including open strings and frets 1–22. Matching sharp/flat spellings represent the same note. Found positions stay visible and count once, with a running total and progress by string. Arrow keys and Enter work here too; focusing a position brings it into view when the neck is wider than the screen.

Hints first suggest a string, then highlight a smaller fret range, then reveal one missing position. Click a revealed position to collect it. A string clue marks every remaining match on that string as assisted. The result shows the percentage of positions found without help, plus incorrect guesses separately. Completing the whole map saves a lesson result. **New random note** starts a fresh board at any time, using a different note; partial rounds are not saved. Your earlier lesson history is retained.

Enable **Show all notes** to study every labelled position from the open strings to fret 22. Pick a note from the twelve-note selector, or click a position on the board, to highlight all matching pitches while keeping every other name visible. Sharp/flat equivalents share one selection. **Clear highlight** leaves the complete map visible without an emphasis. Board clicks play their pitches; arrow keys and Enter also work. Study clicks do not collect finds, make guesses, finish a round or save a score.

Hide the map or choose **Back to finding notes** to resume the same search. Previously collected positions stay collected; unanswered names and highlighting disappear again. Positions still unfound when you view the map count as assisted, so the result is labelled **Found without help**. A new random note while the study map is open stays in study view and receives the same assistance treatment. New searches started with the map hidden begin without map assistance.

### Barre chord practice

Open **Barre chords** under Practice in the sidebar or its dashboard card. Choose E shape, A shape or both, and major, minor or both. Set **Seconds per chord** to a whole number from 1–300 (default: 10), and **Practice duration** to 1–300 minutes (default: 2). Press **Start practice** and play along on your guitar. The chord name, shape and fingering diagram stay visible, with countdowns to the next random chord and the end of the practice session. Practice stops automatically when its duration ends. Shape and chord-type filters cover 48 combinations across all twelve roots; prompts retain those filters and avoid repeating the exact chord/shape immediately.

Choose **All random chords** for the full pool, or **Chords in a key** to select any of twelve key roots and either **Major** or **Natural minor**. Key mode draws from that key’s diatonic major/minor triads, intersected with your chord-type and shape filters. For example, C major offers C major, D minor, E minor, F major, G major and A minor. The diminished triad is omitted because this tool uses major/minor barre shapes. Natural minor includes the minor v chord; harmonic-minor variants are outside this mode. The available chord family is shown beside the key controls, using appropriate sharp or flat names. Key membership follows [Open Music Theory’s triad qualities](https://viva.pressbooks.pub/openmusictheory/chapter/triads/). Your mode and key are saved with the other practice settings.

Press **Stop practice** to hold the current chord and change settings. Starting again gives that chord a full interval. Leaving the tool or refreshing stops playback; your chosen settings are remembered. The timer uses elapsed time and advances once after a delayed callback, rather than rushing through missed chords.

The root/barre fret is always 1–12. The full-width fretboard shows open strings through fret 12, with high e at the top, low E at the bottom and the nut on the left. It extends to fret 13 or 14 when a high barre chord needs those frets. Finger numbers, fret numbers, muted strings, the barre, a marked root and written guidance help you form the chord. A compact countdown beside the chord name shows the time remaining. **Hear chord** plays the shown voicing with a gentle strum. An A-shape major diagram uses a ring-finger barre across D, G and B; muting high e is an accepted alternative. The shapes use the standard [E- and A-shape major/minor formulas](https://thenandimethod.com/lesson/barre-chords/).

This mode is practice only: there are no ratings, accuracy scores or lesson completions. Earlier saved chord self-ratings are retained internally for compatibility, but are excluded from lesson progress and recommendations.

Both chord tools have a **Maximise fretboard** button beside **Hear chord**. It expands the chord name, compact countdown and full fretboard, with separate **Start practice**, **Stop practice** and **Minimise** buttons visible at the top. Escape also minimises. Entering or leaving the expanded view preserves the current chord, timer and running state; use Stop to pause the sequence. The view uses native browser fullscreen when available and fills the app window if native fullscreen is blocked. Keyboard focus stays within the expanded view and returns to Maximise when it closes. The diagram continues to show all required frets, including fret 14 for high barre shapes.

The current chord appears in a prominent, pitch-coloured header and animates in at each new prompt. A compact circular countdown drains smoothly and changes colour in the final three seconds. The animations respect your system's reduced-motion preference.

Use **Fingers / Notes**, beside **Maximise fretboard**, to choose finger numbers or the actual note names at every played position, including open strings. Note names follow the selected key's sharp/flat spelling. The switch remains available in full screen and leaves the current chord and countdown running. Your label choice is saved separately for open and barre practice.

### Open chord practice

Open **Open chords** under Practice in the sidebar or its dashboard card. This is the same timed practice player for eight common open shapes: **C, A, G, E, D, Am, Em and Dm**. Choose major, minor or both; use **All random chords** or select a major/natural-minor key; set 1–300 seconds per chord and a 1–300 minute practice duration (default: 2 minutes); then press **Start practice**. Practice stops automatically when its duration ends. **Stop practice** holds the current chord, and restarting gives it a full interval and session duration. There are no scores or self-ratings. The timer, key controls and diagram renderer are shared with barre practice.

The full-width fretboard shows the first octave, from open strings through fret 12, with the nut on the left and high e at the top. Finger numbers mark fretted notes; **○** marks open strings and **×** marks strings to omit in the open-string column. The marked root and written guidance tell you where to begin strumming. The compact countdown sits beside the chord name. **Hear chord** plays the whole voicing, including open strings. The chord set follows the [eight beginner open chords in JustinGuitar’s library](https://www.justinguitar.com/chords); [Fender’s D-minor lesson](https://www.fender.com/articles/chords/learn-how-to-play-dm-guitar-chord) documents that fingering and the muted bass strings.

Key mode includes only matching chords from these eight shapes. For example, C-major practice includes C, G, Am, Em and Dm; it does not add an F barre chord. A key/filter combination with no available shapes shows an explanation and disables Start until you change the selection. If just one chord is available, it repeats at each interval with an explicit message. Otherwise, the same chord never repeats immediately. Open-chord settings are saved separately from barre-chord settings. Leaving either tool or refreshing stops its player.

## Saved progress and settings

Completed lessons, last/best recall accuracy, visit counts, sound preference, and separate open/barre practice settings are stored under the single `string-master:v1` localStorage key. They stay in this browser and origin; keep using the same address and port. An unfinished puzzle restarts after refresh or leaving the lesson. There is no cloud sync.

Settings lets you mute sound or reset learning history while preserving your sound preference and both chord practice settings. Reset only changes this app’s storage key. If storage is blocked or full, practice still works in memory and the app explains that it cannot save. Audio failure also leaves the visual games usable. Tones are synthesised locally and start after interaction.

## Validation

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e --workers=2
```

Browser tests use installed Microsoft Edge on Windows and Playwright Chromium elsewhere. On other platforms, install its browser first with `pnpm exec playwright install chromium`. The browser suite starts a local server automatically, or reuses one already on port 5173. Each test uses an isolated browser profile.

Tests cover every fretboard position, enharmonic names, lesson coverage, retries, hints, scoring, native dragging, keyboard controls, clear recall boards, saved progress, reset, and unavailable storage/audio. Timed chord practice tests cover automatic changes, Stop/restart, interval limits, filter persistence, open/muted string diagrams, empty or single-chord pools, navigation cleanup and delayed callbacks using a controlled browser clock. They also check full-screen controls, note/finger labels and saved preferences, key-specific note spellings, smooth countdown progress and reduced motion. Browser screenshots are written to `artifacts/` at 1366×768 and 1920×1080. The `dist/` directory contains the production build; `pnpm preview` serves it locally.

Learning effectiveness still needs your own trial: complete an early lesson, take a break, and repeat it without hints. Automated tests verify the exercises and scoring, not a person’s retention.

## Code layout

- `src/music.ts`: standard tuning, pitch identity, names, and frequencies.
- `src/chords.ts`: barre fingerings, chord voicings and key membership.
- `src/openChords.ts`: eight open fingerings, filtered practice pools and settings.
- `src/lessons.ts`: the 28-lesson learning path and separate practice definitions.
- `src/session.ts`: pure placement/recall state and scoring.
- `src/progress.ts`: versioned, validated browser storage.
- `src/audio.ts`: optional Web Audio tones.
- `src/components/`: fretboard, note palette, lesson flow, and icons.
- `src/App.tsx`: dashboard/navigation, settings, and saved results.

Built with React, TypeScript, Vite, Vitest, and Playwright. Node dependencies are locked in `pnpm-lock.yaml`; only esbuild’s required installation script is allowed in the pnpm workspace configuration.
