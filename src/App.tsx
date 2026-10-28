import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BARRE_LESSON, COLLECTION_LESSON, LEARNING_LESSONS, LESSONS } from './lessons';

import { createSession, sessionReducer, sessionResults, type SessionAction, type Session } from './session';
import { completedLessonCount, emptyProgress, loadProgress, recordCompletion, saveProgress } from './progress';
import { playChord as playChordAudio, playNote } from './audio';
import { DEFAULT_BARRE_SETTINGS, type BarrePracticeSettings, type ChordOptions } from './chords';
import { BrandMark, Icon } from './components/Icon';
import { Dashboard } from './components/Dashboard';
import { LearningPath } from './components/LearningPath';
import { Alphabet, LearningSession } from './components/LearningSession';
import { DEFAULT_OPEN_SETTINGS, OPEN_CHORD_PRACTICE_ID } from './openChords';
import { OpenChordPractice } from './components/OpenChordPractice';
import { ChordFinder } from './components/ChordFinder';

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={close} onClick={(event) => { if (event.target === event.currentTarget) close(); }}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><Icon name="close" /></button></div>{children}</dialog>;
}

export default function App() {
  const [initial] = useState(() => loadProgress());
  const [progress, setProgress] = useState(initial.progress);
  const [notice, setNotice] = useState(initial.notice);
  const [storageReady, setStorageReady] = useState(!initial.notice);
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<'dashboard' | 'learning' | 'open-chords' | 'chord-finder'>('dashboard');
  const openChords = page === 'open-chords';
  const chordFinder = page === 'chord-finder';
  const [modal, setModal] = useState<'settings' | 'guide' | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const recorded = useRef('');
  const count = completedLessonCount(progress);

  useEffect(() => { const saved = saveProgress(progress); setStorageReady(saved); if (!saved) setNotice('Progress cannot be saved in this browser. You can still practise in this session.'); }, [progress]);
  useEffect(() => {
    if (session?.phase === 'results' && session.lesson.kind !== 'barre' && recorded.current !== session.id) {
      recorded.current = session.id;
      setProgress((previous) => recordCompletion(previous, session.lesson.id, sessionResults(session).accuracy));
    }
  }, [session]);
  useEffect(() => { if (!openChords && session?.lesson.kind !== 'barre') document.getElementById('page-title')?.focus({ preventScroll: true }); }, [session?.id, session?.phase, session?.lesson.kind, page, openChords]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [session?.phase]);

  function openLesson(id: string, options?: ChordOptions) {
    if (id === OPEN_CHORD_PRACTICE_ID) {
      setSession(null);
      setPage('open-chords');
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const lesson = id === BARRE_LESSON.id ? BARRE_LESSON : LESSONS.find((l) => l.id === id);
    if (lesson) {
      setPage(lesson.kind === 'collect' || lesson.kind === 'barre' ? 'dashboard' : 'learning');
      const preferences = progress.barrePractice ?? DEFAULT_BARRE_SETTINGS;
      setSession(createSession(lesson, Math.random, session?.collection?.pitch, { options: options ?? session?.barre?.options ?? { shape: preferences.shape, quality: preferences.quality, key: preferences.key }, previousId: session?.barre?.prompt.id }));
      if (!(session?.lesson.kind === 'barre' && lesson.kind === 'barre')) window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  function changeBarreSettings(settings: BarrePracticeSettings) {
    setProgress((previous) => ({ ...previous, barrePractice: settings }));
    if (session?.barre && (session.barre.options.shape !== settings.shape || session.barre.options.quality !== settings.quality || session.barre.options.key?.tonic !== settings.key?.tonic || session.barre.options.key?.mode !== settings.key?.mode)) openLesson(BARRE_LESSON.id, { shape: settings.shape, quality: settings.quality, key: settings.key });
  }
  const dispatch = useCallback((action: SessionAction) => setSession((s) => s ? sessionReducer(s, action) : s), []);
  function play(midi: number) { void playNote(midi, progress.sound).then((ok) => { if (!ok) setNotice('Sound is unavailable here. The visual puzzles are ready to use.'); }); }
  function playChord(midis: number[]) { void playChordAudio(midis, progress.sound).then((ok) => { if (!ok) setNotice('Sound is unavailable here. You can still compare the chord diagram.'); }); }
  function goHome() { setSession(null); setPage('dashboard'); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function goLearning() { setSession(null); setPage('learning'); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function goChordFinder() { setSession(null); setPage('chord-finder'); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function closeModal() { setModal(null); setResetConfirm(false); }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to practice</a>
    <aside className="sidebar">
      <button className="brand" onClick={goHome} aria-label="String Master home"><BrandMark /><span>string<span className="brand-light">master</span><small>FIND YOUR FREQUENCY</small></span></button>
      <nav aria-label="Main navigation">
        <button className={`nav-link ${!session && page === 'dashboard' ? 'active' : ''}`} onClick={goHome} aria-label="Dashboard" aria-current={!session && page === 'dashboard' ? 'page' : undefined}><Icon name="home" /><span className="nav-label">Dashboard</span></button>
        <div className="nav-section" role="group" aria-label="Learning"><p className="nav-section-title">Learning</p><button className={`nav-link ${page === 'learning' ? 'active' : ''}`} onClick={goLearning} aria-label="Learning path" aria-current={page === 'learning' ? 'page' : undefined}><Icon name="path" /><span className="nav-label">Learning path</span><span className="nav-count">{LEARNING_LESSONS.length}</span></button><button className={`nav-link ${chordFinder ? 'active' : ''}`} onClick={goChordFinder} aria-label="Open chord finder" aria-current={chordFinder ? 'page' : undefined}><Icon name="chord" /><span className="nav-label">Chord finder</span></button><button className="nav-link" onClick={() => setModal('guide')} aria-label="A quick guide"><Icon name="book" /><span className="nav-label">A quick guide</span></button></div>
        <div className="nav-section" role="group" aria-label="Practice"><p className="nav-section-title">Practice</p><button className={`nav-link ${session?.lesson.kind === 'collect' ? 'active' : ''}`} onClick={() => openLesson(COLLECTION_LESSON.id)} aria-label="Find every instance" aria-current={session?.lesson.kind === 'collect' ? 'page' : undefined}><Icon name="search" /><span className="nav-label">Find every instance</span></button><button className={`nav-link ${session?.lesson.kind === 'barre' ? 'active' : ''}`} onClick={() => openLesson(BARRE_LESSON.id)} aria-label="Barre chord practice" aria-current={session?.lesson.kind === 'barre' ? 'page' : undefined}><Icon name="chord" /><span className="nav-label">Barre chords</span></button><button className={`nav-link ${openChords ? 'active' : ''}`} onClick={() => openLesson(OPEN_CHORD_PRACTICE_ID)} aria-label="Open chord practice" aria-current={openChords ? 'page' : undefined}><Icon name="chord" /><span className="nav-label">Open chords</span></button></div>
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-course-progress"><div><span>Learning progress</span><strong>{count} / {LEARNING_LESSONS.length}</strong></div><div className="path-progress"><span style={{ width: `${count / LEARNING_LESSONS.length * 100}%` }} /></div></div>
        <button className="nav-link settings-link" onClick={() => setModal('settings')} aria-label="Settings"><Icon name="settings" /><span className="nav-label">Settings</span></button>
        <div className="local-label"><span className="live-dot" /> {storageReady ? 'Progress saved on this browser' : 'Progress kept for this session'}</div>
      </div>
    </aside>
    <div className={`main-shell ${session || openChords ? 'in-session' : ''}`}>
      <header className="topbar">
        <div className="topbar-title"><span className="topbar-icon"><Icon name={chordFinder ? 'chord' : session || openChords ? 'play' : page === 'learning' ? 'path' : 'home'} size={18} /></span><strong>{openChords || session?.lesson.kind === 'collect' || session?.lesson.kind === 'barre' ? 'Practice' : page === 'learning' || chordFinder ? 'Learning' : 'Dashboard'}</strong><span className="topbar-separator">/</span><span className="topbar-subtitle">{session?.lesson.title ?? (openChords ? 'Open chord practice' : chordFinder ? 'Open chord finder' : page === 'learning' ? 'Your learning path' : 'Your guitar studio')}</span></div>
        <div className="topbar-tools"><span className="tuning-badge"><span className="live-dot" /> 6 strings · Standard tuning</span><button className="icon-button" aria-label={progress.sound ? 'Mute sound' : 'Enable sound'} title={progress.sound ? 'Mute sound' : 'Enable sound'} onClick={() => { setProgress((p) => ({ ...p, sound: !p.sound })); if (!progress.sound) void playNote(64, true); }}><Icon name={progress.sound ? 'sound' : 'mute'} size={19} /></button></div>
      </header>
      <main id="main-content">
        {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}
        {chordFinder ? <ChordFinder playChord={playChord} goBack={goLearning} /> : openChords ? <OpenChordPractice settings={progress.openPractice ?? DEFAULT_OPEN_SETTINGS} onSettingsChange={(settings) => setProgress((previous) => ({ ...previous, openPractice: settings }))} playChord={playChord} /> : session ? <LearningSession session={session} dispatch={dispatch} play={play} playChord={playChord} onBarreSettingsChange={changeBarreSettings} progress={progress} openLesson={openLesson} goHome={session.lesson.kind === 'collect' ? goHome : goLearning} /> : page === 'learning' ? <LearningPath progress={progress} openLesson={openLesson} goDashboard={goHome} /> : <Dashboard progress={progress} openLesson={openLesson} openPath={goLearning} />}
      </main>
    </div>
    {modal === 'settings' && <Modal title="Make yourself comfortable" close={closeModal}><p className="modal-intro">A few simple settings for your practice.</p><label className="sound-setting"><span><strong>Hear the notes</strong><small>Play a gentle tone when you explore or answer correctly.</small></span><input type="checkbox" checked={progress.sound} onChange={(event) => setProgress((p) => ({ ...p, sound: event.target.checked }))} /></label><div className="settings-detail"><strong>Your learning stays here</strong><p>Completed lessons, recall accuracy and chord practice settings are saved in this browser. In-progress puzzles restart and timed practice stops when you leave or refresh. There’s no account or cloud sync.</p></div><div className="reset-section">{resetConfirm ? <><h3>Clear your lesson history?</h3><p>This clears completion and accuracy for these {LEARNING_LESSONS.length} lessons and note-finding history. Your sound preference and chord practice settings stay the same.</p><div className="reset-actions"><button className="button danger small" onClick={() => { setProgress(emptyProgress(progress.sound, progress.barrePractice, progress.openPractice)); setSession(null); setPage('dashboard'); setResetConfirm(false); }}>Clear learning progress</button><button className="button secondary small" onClick={() => setResetConfirm(false)}>Keep my progress</button></div></> : <button className="text-button" onClick={() => setResetConfirm(true)}><Icon name="repeat" size={16} /> Reset learning progress</button>}</div></Modal>}
    {modal === 'guide' && <Modal title="A small guide to getting familiar" close={closeModal}><div className="guide-steps"><div><b>1</b><span><strong>See the pattern</strong><p>Start with a small part of the neck. Click the notes to hear them and notice their order.</p></span></div><div><b>2</b><span><strong>Build your map</strong><p>Drag notes into place, or select a piece and click its position. Pieces can be used more than once.</p></span></div><div><b>3</b><span><strong>Find it from memory</strong><p>On a fresh board, find the requested note on the named string. Hints show you how to work it out.</p></span></div></div><Alphabet /><p className="guide-footnote">The diagram has the thin high-E string at the top and the thick low-E at the bottom. “Open” means no fret is held. Return after a break and repeat a lesson to check what you remember.</p><button className="button primary" onClick={closeModal}>Let’s get familiar <Icon name="arrow" size={17} /></button></Modal>}
  </div>;
}
