import { BARRE_LESSON, COLLECTION_LESSON, LEARNING_LESSONS } from '../lessons';
import { OPEN_CHORD_PRACTICE_ID } from '../openChords';
import { completedLessonCount, nextLesson, type Progress } from '../progress';
import { MiniFretboard } from './Fretboard';
import { Icon, type IconName } from './Icon';

export function Dashboard({ progress, openLesson, openPath }: { progress: Progress; openLesson: (id: string) => void; openPath: () => void }) {
  const completed = completedLessonCount(progress);
  const suggested = nextLesson(progress);
  const finished = completed === LEARNING_LESSONS.length;
  const search = progress.lessons[COLLECTION_LESSON.id];
  const activities: { title: string; section: string; icon: IconName; description: string; detail: string; action: () => void }[] = [
    { title: 'Learning path', section: 'LEARNING', icon: 'path', description: 'Build your fretboard knowledge, one small lesson at a time.', detail: `${LEARNING_LESSONS.length} lessons · Learn → Place → Recall`, action: openPath },
    { title: 'Find every instance', section: 'PRACTICE · FRETBOARD', icon: 'search', description: 'Find a note across all 22 frets, or explore the complete note map.', detail: search ? `Last ${search.lastAccuracy}% · Best ${search.bestAccuracy}% without help` : 'Find notes · show all notes · highlight a pitch', action: () => openLesson(COLLECTION_LESSON.id) },
    { title: 'Barre chord practice', section: 'PRACTICE · CHORDS', icon: 'chord', description: 'Play E- and A-shaped major/minor chords at your own pace.', detail: 'Random chords or a key · timed Start / Stop', action: () => openLesson(BARRE_LESSON.id) },
    { title: 'Open chord practice', section: 'PRACTICE · CHORDS', icon: 'sun', description: 'Get comfortable changing between eight familiar open chords.', detail: 'C · A · G · E · D · Am · Em · Dm', action: () => openLesson(OPEN_CHORD_PRACTICE_ID) },
  ];
  return <section className="dashboard-page">
    <div className="dashboard-heading"><p className="eyebrow">YOUR GUITAR STUDIO</p><h1 id="page-title" tabIndex={-1}>Choose your next session.</h1><p>Learn the notes, explore the neck, or pick up your guitar and play.</p></div>
    <div className="dashboard-layout"><section className="dashboard-resume" aria-labelledby="resume-heading"><div><p className="eyebrow">{finished ? 'YOUR LEARNING PATH IS COMPLETE' : completed ? 'PICK UP WHERE YOU LEFT OFF' : 'A GOOD PLACE TO BEGIN'}</p><h2 id="resume-heading">{suggested.title}</h2><p>{finished ? 'Revisit a lesson whenever you want a refresher.' : 'A short demonstration, a jumbled placement puzzle, then recall from memory.'}</p><div className="dashboard-resume-actions"><button className="button primary" onClick={() => openLesson(suggested.id)}>{finished ? 'Revisit the open strings' : completed ? 'Continue learning' : 'Start with open strings'}<Icon name="arrow" size={19} /></button><button className="dashboard-path-link" onClick={openPath}>View learning path</button></div><span className="dashboard-resume-progress">{completed} of {LEARNING_LESSONS.length} lessons completed</span></div><div className="dashboard-art" aria-hidden="true"><MiniFretboard /></div></section>
    <div className="dashboard-activities"><div className="dashboard-section-heading"><h2>Choose an activity</h2><span>Every activity is open.</span></div>
    <div className="activity-grid">{activities.map((activity) => <button key={activity.title} className={`activity-card ${activity.section === 'LEARNING' ? 'learning-activity' : ''}`} onClick={activity.action} aria-label={`Open ${activity.title}`}><span className="activity-icon"><Icon name={activity.icon} size={26} /></span><span className="eyebrow">{activity.section}</span><h3>{activity.title}</h3><p>{activity.description}</p><span className="activity-detail">{activity.detail}</span><span className="activity-arrow"><Icon name="arrow" size={20} /></span></button>)}</div></div></div>
  </section>;
}
