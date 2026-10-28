import { useEffect, useRef, useState } from 'react';

// A fresh prompt token restarts the full interval, even if a one-chord pool repeats.
export function useChordPlayer(duration: number, practiceDuration: number, promptToken: string, next: () => void, canStart: boolean) {
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(duration * 1000);
  const [practiceRemainingMs, setPracticeRemainingMs] = useState(practiceDuration * 1000);
  const [finished, setFinished] = useState(false);
  const remaining = Math.ceil(remainingMs / 1000);
  const remainingDisplay = running ? (Math.ceil(remainingMs / 100) / 10).toFixed(1) : String(remaining);
  const progress = running ? Math.max(0, Math.min(1, remainingMs / (duration * 1000))) : 1;
  const practiceRemaining = Math.ceil(practiceRemainingMs / 1000);
  const practiceProgress = finished ? 0 : running ? Math.max(0, Math.min(1, practiceRemainingMs / (practiceDuration * 1000))) : 1;
  const runningRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const practiceDeadlineRef = useRef<number | undefined>(undefined);
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);
  useEffect(() => {
    if (!running) {
      setPracticeRemainingMs(practiceDuration * 1000);
      setFinished(false);
    }
  }, [practiceDuration]);

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
      const now = performance.now();
      const sessionLeft = (practiceDeadlineRef.current ?? now) - now;
      if (sessionLeft <= 0) {
        window.clearInterval(timer);
        runningRef.current = false;
        timerRef.current = undefined;
        practiceDeadlineRef.current = undefined;
        setPracticeRemainingMs(0);
        setFinished(true);
        setRunning(false);
        return;
      }
      setPracticeRemainingMs(sessionLeft);
      const left = deadline - now;
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
    practiceDeadlineRef.current = undefined;
    setRunning(false);
    setRemainingMs(duration * 1000);
    setPracticeRemainingMs(practiceDuration * 1000);
    setFinished(false);
  }
  function startPractice() {
    if (!running && canStart) {
      practiceDeadlineRef.current = performance.now() + practiceDuration * 1000;
      runningRef.current = true;
      setRemainingMs(duration * 1000);
      setPracticeRemainingMs(practiceDuration * 1000);
      setFinished(false);
      setRunning(true);
    }
  }
  function togglePractice() { if (running) stopPractice(); else startPractice(); }
  return { running, remaining, remainingDisplay, progress, practiceRemaining, practiceProgress, finished, togglePractice, startPractice, stopPractice };
}
