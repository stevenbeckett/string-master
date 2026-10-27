import { frequency } from './music';

let context: AudioContext | undefined;
export async function playChord(midis: number[], enabled: boolean): Promise<boolean> {
  if (!enabled) return true;
  try {
    if (!context || context.state === 'closed') context = new AudioContext();
    if (context.state === 'suspended') await context.resume();
    const time = context.currentTime;
    for (let i = 0; i < midis.length; i++) {
      const start = time + i * .045;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency(midis[i]);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.12 / Math.sqrt(midis.length), start + .012);
      gain.gain.exponentialRampToValueAtTime(.001, start + .7);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + .75);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }
    return true;
  } catch { return false; }
}
export const playNote = (midi: number, enabled: boolean) => playChord([midi], enabled);
