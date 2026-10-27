import { useEffect, useRef, useState } from 'react';

// A fresh prompt token restarts the full interval, even if a one-chord pool repeats.
export function useChordPlayer(duration: number, promptToken: string, next: () => void, canStart: boolean) {
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(duration * 1000);
  const remaining = Math.ceil(remainingMs / 1000);
  const progress = running ? Math.max(0, Math.min(1, remainingMs / (duration * 1000))) : 1;
  const runningRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  useEffect(() => {
    if (!running) {
      runningRef.current = false;
      setRemainingMs(duration * 1000);
      return;
    }
    runningRef.current = true;
    const deadline = performance.now() + duration * 1000;
    setRemainingMs(duration * 1000);
    const timer = window.setInterval(() => {
      if (!runningRef.current) return;
      const left = deadline - performance.now();
      if (left <= 0) {
        window.clearInterval(timer);
        runningRef.current = false;
        setRemainingMs(0);
        nextRef.current();
      } else setRemainingMs(left);
    }, 100);
    timerRef.current = timer;
    return () => {
      window.clearInterval(timer);
      if (timerRef.current === timer) timerRef.current = undefined;
      runningRef.current = false;
    };
  }, [running, duration, promptToken]);

  function stopPractice() {
    runningRef.current = false;
    if (timerRef.current !== undefined) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    setRunning(false);
    setRemainingMs(duration * 1000);
  }
  function startPractice() {
    if (!running && canStart) {
      runningRef.current = true;
      setRemainingMs(duration * 1000);
      setRunning(true);
    }
  }
  function togglePractice() { if (running) stopPractice(); else startPractice(); }
  return { running, remaining, progress, togglePractice, startPractice, stopPractice };
}
