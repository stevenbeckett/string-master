import { BARRE_LESSON, LEARNING_LESSONS, LESSONS } from './lessons';
import { validBarreSettings, type BarrePracticeSettings } from './chords';
import { validOpenSettings, type OpenChordSettings } from './openChords';

export const STORAGE_KEY = 'string-master:v1';
export type LessonProgress = { lastAccuracy: number; bestAccuracy: number; completedAt: string; visits: number };
export type Progress = { version: 1; sound: boolean; lessons: Record<string, LessonProgress>; barrePractice?: BarrePracticeSettings; openPractice?: OpenChordSettings };
export const emptyProgress = (sound = true, barrePractice?: BarrePracticeSettings, openPractice?: OpenChordSettings): Progress => ({ version: 1, sound, lessons: {}, ...(barrePractice ? { barrePractice } : {}), ...(openPractice ? { openPractice } : {}) });
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const browserStore = () => window.localStorage;
const percent = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;

export function loadProgress(getStore: () => Store = browserStore): { progress: Progress; notice: string } {
  try {
    const raw = getStore().getItem(STORAGE_KEY);
    if (!raw) return { progress: emptyProgress(), notice: '' };
    const data = JSON.parse(raw);
    if (data?.version !== 1 || typeof data.sound !== 'boolean' || !data.lessons || typeof data.lessons !== 'object' || Array.isArray(data.lessons)) throw new Error('Invalid saved progress');
    const lessons: Progress['lessons'] = {};
    for (const lesson of [...LESSONS, BARRE_LESSON]) {
      const entry = data.lessons[lesson.id];
      if (entry && percent(entry.lastAccuracy) && percent(entry.bestAccuracy) && entry.bestAccuracy >= entry.lastAccuracy && typeof entry.completedAt === 'string' && !Number.isNaN(Date.parse(entry.completedAt)) && Number.isInteger(entry.visits) && entry.visits > 0) lessons[lesson.id] = entry;
    }
    return { progress: { version: 1, sound: data.sound, lessons, ...(validBarreSettings(data.barrePractice) ? { barrePractice: data.barrePractice } : {}), ...(validOpenSettings(data.openPractice) ? { openPractice: data.openPractice } : {}) }, notice: '' };
  } catch {
    return { progress: emptyProgress(), notice: 'Saved progress is unavailable. You can still practise in this session.' };
  }
}
export function saveProgress(progress: Progress, getStore: () => Store = browserStore): boolean {
  try { getStore().setItem(STORAGE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
export function recordCompletion(progress: Progress, id: string, accuracy: number): Progress {
  const previous = progress.lessons[id];
  return { ...progress, lessons: { ...progress.lessons, [id]: { lastAccuracy: accuracy, bestAccuracy: Math.max(previous?.bestAccuracy ?? 0, accuracy), completedAt: new Date().toISOString(), visits: (previous?.visits ?? 0) + 1 } } };
}
export const nextLesson = (progress: Progress) => LEARNING_LESSONS.find((l) => !progress.lessons[l.id]) ?? LEARNING_LESSONS[0];
export const completedLessonCount = (progress: Progress) => LEARNING_LESSONS.filter((lesson) => !!progress.lessons[lesson.id]).length;
