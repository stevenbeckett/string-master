import type { CSSProperties } from 'react';

export type IconName = 'maximise' | 'minimise' | 'home' | 'arrow' | 'back' | 'sound' | 'mute' | 'settings' | 'path' | 'book' | 'check' | 'close' | 'sun' | 'spark' | 'repeat' | 'help' | 'play' | 'shuffle' | 'search' | 'chord' | 'stop';
const paths: Record<IconName, string> = {
  maximise: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  minimise: 'M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5',
  home: 'm3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7',
  arrow: 'M4 12h15m-6-6 6 6-6 6', back: 'M20 12H5m6-6-6 6 6 6',
  sound: 'M11 5 6 9H3v6h3l5 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  mute: 'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6',
  settings: 'm9 3-1 3-3 1-2 3 2 2v3l3 2 1 3h5l1-3 3-2v-3l2-2-2-3-3-1-1-3H9Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  path: 'M4 5h4v4H4V5Zm12 10h4v4h-4v-4ZM8 7h6a4 4 0 0 1 0 8h-4a2 2 0 0 0 0 4h6',
  book: 'M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1m0-15c3-2 7-2 10-1v15c-4-1-7-1-10 1V5Z',
  check: 'm5 12 4 4L19 6', close: 'm6 6 12 12M18 6 6 18',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',
  repeat: 'M4 10a8 8 0 0 1 14-5l2 2m0-5v5h-5M20 14A8 8 0 0 1 6 19l-2-2m0 5v-5h5',
  help: 'M9 9a3 3 0 1 1 4 3c-1 .4-1 1-1 2m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  play: 'm8 4 12 8-12 8V4Z',
  stop: 'M6 6h12v12H6V6Z',
  shuffle: 'm18 14 4 4-4 4M18 2l4 4-4 4M2 18h2.5a6 6 0 0 0 5-3L14 9a6 6 0 0 1 5-3h3M2 6h2.5a6 6 0 0 1 5 3l4.5 6a6 6 0 0 0 5 3H22',
  search: 'm21 21-5-5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
  chord: 'M5 3v18M10 3v18M15 3v18M20 3v18M3 6h19M3 12h19M3 18h19M4 6h17M10 12h6',
};
export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
export function BrandMark() {
  return <svg className="brand-mark" width="42" height="42" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="14" fill="currentColor" /><g stroke="#352e30" strokeWidth="1.6"><path d="M13 11v26M24 11v26M35 11v26M10 18h28M10 30h28" /></g><circle cx="24" cy="18" r="5" fill="#e0f78d" /><circle cx="35" cy="30" r="4" fill="#fff7e8" /></svg>;
}
