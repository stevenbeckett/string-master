function formatPracticeTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ChordTimer({ running, remaining, remainingDisplay, duration, progress, practiceRemaining, practiceProgress, practiceDuration, finished, singleChord = false }: { running: boolean; remaining: number; remainingDisplay: string; duration: number; progress: number; practiceRemaining: number; practiceProgress: number; practiceDuration: number; finished: boolean; singleChord?: boolean }) {
  const circumference = 2 * Math.PI * 26;
  const urgent = running && remaining <= Math.min(3, duration);
  const practiceUrgent = running && practiceRemaining <= 10;
  return <>
    <div className={`barre-timer-card chord-change-timer-card ${running ? 'timer-running' : ''} ${urgent ? 'timer-urgent' : ''}`}>
      <div className="chord-timer-dial" role="progressbar" aria-label="Time remaining for this chord" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={remaining}>
        <svg viewBox="0 0 60 60" aria-hidden="true"><circle className="timer-ring-track" cx="30" cy="30" r="26" /><circle className="timer-ring-progress" data-testid="timer-progress" cx="30" cy="30" r="26" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 30 30)" style={{ transitionDuration: progress === 1 ? '0s' : undefined }} /></svg>
        <div className="barre-countdown" role="timer" aria-label={`${remainingDisplay} seconds remaining for this chord`} aria-live="off"><strong key={running ? remaining : 'ready'} className={running ? 'timer-digit-change' : ''} aria-hidden="true">{remainingDisplay}</strong><span aria-hidden="true">s</span></div>
      </div>
      <div className="chord-timer-copy"><span className="timer-widget-label">{singleChord ? 'CHORD REPEATS IN' : 'NEXT CHORD IN'}</span><span className="sr-only" data-testid="barre-remaining">{remaining}</span><span className="sr-only" role="status">{finished ? 'Practice complete' : running ? 'Practice running' : 'Ready when you are'}</span></div>
    </div>
    <div className={`barre-timer-card practice-session-timer-card ${running ? 'timer-running' : ''} ${practiceUrgent ? 'timer-urgent' : ''} ${finished ? 'timer-finished' : ''}`}>
      <div className="chord-timer-dial practice-session-dial" role="progressbar" aria-label="Practice time remaining" aria-valuemin={0} aria-valuemax={practiceDuration} aria-valuenow={practiceRemaining}>
        <svg viewBox="0 0 60 60" aria-hidden="true"><circle className="timer-ring-track" cx="30" cy="30" r="26" /><circle className="timer-ring-progress" data-testid="practice-timer-progress" cx="30" cy="30" r="26" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - practiceProgress)} transform="rotate(-90 30 30)" style={{ transitionDuration: practiceProgress === 1 ? '0s' : undefined }} /></svg>
        <div className="barre-countdown" role="timer" aria-live="off"><strong data-testid="practice-remaining">{formatPracticeTime(practiceRemaining)}</strong></div>
      </div>
      <div className="chord-timer-copy"><span className="timer-widget-label">{finished ? 'SESSION COMPLETE' : 'PRACTICE LEFT'}</span></div>
    </div>
  </>;
}
