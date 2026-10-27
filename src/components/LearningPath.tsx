import type { CSSProperties } from 'react';
import { LEARNING_LESSONS, type Lesson } from '../lessons';
import { NOTES, STRINGS } from '../music';
import { completedLessonCount, nextLesson, type Progress } from '../progress';
import { Icon } from './Icon';

function LessonCard({ lesson, progress, recommended, open }: { lesson: Lesson; progress: Progress; recommended: boolean; open: () => void }) {
  const saved = progress.lessons[lesson.id];
  const className = `lesson-card ${recommended ? 'recommended-card' : ''} ${saved ? 'completed-card' : ''}`;
  if (lesson.kind === 'test') return <button className={`${className} final-test-card`} onClick={open} aria-label={`Open ${lesson.title}`}><span className="lesson-card-icon"><Icon name={saved ? 'check' : 'spark'} size={24} /></span><span className="final-test-copy"><span className="eyebrow">FINAL OCTAVE TEST {recommended && <span className="recommended-label">UP NEXT</span>}</span><strong>All twelve notes, from memory.</strong><span>Frets 1–12 · a fresh board · automatic progression</span></span><span className="final-test-meta">{saved ? <>Completed<small>Last {saved.lastAccuracy}% · Best {saved.bestAccuracy}%</small></> : <>12-note recall<small>Hints available</small></>}</span><span className="card-arrow"><Icon name="arrow" size={20} /></span></button>;
  const count = lesson.kind === 'open' || lesson.kind === 'review' ? 6 : lesson.band.end - lesson.band.start + 1;
  return <button className={className} onClick={open} aria-label={`Open ${lesson.title}`}><div className="lesson-card-top"><span className="lesson-card-icon"><Icon name={saved ? 'check' : lesson.kind === 'open' ? 'sun' : lesson.kind === 'review' ? 'spark' : 'path'} size={19} /></span>{recommended && <span className="recommended-label">UP NEXT</span>}{saved && <span className="completed-label">Completed</span>}<span className="card-arrow"><Icon name="arrow" size={18} /></span></div><h3>{lesson.kind === 'open' ? lesson.title : `Frets ${lesson.band.start}–${lesson.band.end}`}</h3><p>{lesson.subtitle}</p><div className="lesson-card-meta">{saved ? <span>Last <b>{saved.lastAccuracy}%</b> · Best <b>{saved.bestAccuracy}%</b></span> : <span>Learn → Place → Recall</span>}<span className="note-count">{count} notes</span></div></button>;
}

export function LearningPath({ progress, openLesson, goDashboard }: { progress: Progress; openLesson: (id: string) => void; goDashboard: () => void }) {
  const completed = completedLessonCount(progress);
  const suggested = nextLesson(progress);
  const allDone = completed === LEARNING_LESSONS.length;
  const card = (lesson: Lesson) => <LessonCard key={lesson.id} lesson={lesson} progress={progress} recommended={!allDone && lesson.id === suggested.id} open={() => openLesson(lesson.id)} />;
  return <section className="learning-path-page">
    <button className="text-button back-link" aria-label="Back to dashboard" onClick={goDashboard}><Icon name="back" size={16} /> Dashboard</button>
    <div className="course-heading"><div><p className="eyebrow">LEARNING · LEARN, PLACE, RECALL</p><h1 id="page-title" tabIndex={-1}>Learning path</h1><p>Start with the open strings. Build one string at a time, then test the whole octave.</p></div><p className="completion-pill">{completed} of {LEARNING_LESSONS.length} lessons completed</p></div>
    <div className="path-progress" role="progressbar" aria-label="Lessons completed" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={LEARNING_LESSONS.length}><span style={{ width: `${completed / LEARNING_LESSONS.length * 100}%` }} /></div>
    <div className="course-next"><div><span className="eyebrow">{allDone ? 'REVISIT ANY LESSON' : 'RECOMMENDED NEXT'}</span><strong>{suggested.title}</strong><p>Every lesson is open. Repeat any part whenever you like.</p></div><button className="button primary" onClick={() => openLesson(suggested.id)}>{allDone ? 'Revisit the open strings' : completed ? 'Continue learning' : 'Start with open strings'}<Icon name="arrow" size={18} /></button></div>
    <div className="start-row"><div className="group-heading"><span className="group-number intro-number"><Icon name="sun" size={25} /></span><div><p className="group-kicker">THE STARTING POINT</p><h2>Meet your strings</h2><p>Six open strings. Six familiar starting notes.</p></div></div>{card(LEARNING_LESSONS[0])}</div>
    {STRINGS.map((string) => <section className="string-section" key={string.id} style={{ '--section-colour': NOTES[string.midi % 12].colour } as CSSProperties} aria-label={`${string.name} string lessons`}><div className="group-heading"><span className="group-number">{string.note}<small>{string.id}</small></span><div><p className="group-kicker">STRING {string.id} · {string.description}</p><h2>The {string.name} string</h2><p>Three fret bands, followed by a full-octave recall test.</p></div><span className="string-section-count">{LEARNING_LESSONS.filter((lesson) => lesson.string === string.id && progress.lessons[lesson.id]).length} / 4 complete</span></div><div className="lesson-grid">{LEARNING_LESSONS.filter((lesson) => lesson.string === string.id).map(card)}</div></section>)}
    <section className="string-section review-section" aria-label="Mixed string reviews"><div className="group-heading"><span className="group-number"><Icon name="spark" size={24} /></span><div><p className="group-kicker">BRING IT TOGETHER</p><h2>Across the strings</h2><p>Find familiar notes on a mixture of strings.</p></div></div><div className="lesson-grid">{LEARNING_LESSONS.filter((lesson) => lesson.kind === 'review').map(card)}</div></section>
  </section>;
}
