export function ChordTimer({ running, remaining, duration, progress, singleChord = false }: { running: boolean; remaining: number; duration: number; progress: number; singleChord?: boolean }) {
  const circumference = 2 * Math.PI * 26;
  const urgent = running && remaining <= Math.min(3, duration);
  return <div className={`barre-timer-card ${running ? 'timer-running' : ''} ${urgent ? 'timer-urgent' : ''}`}>
    <div className="chord-timer-dial" role="progressbar" aria-label="Time remaining for this chord" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={remaining}>
      <svg viewBox="0 0 60 60" aria-hidden="true"><circle className="timer-ring-track" cx="30" cy="30" r="26" /><circle className="timer-ring-progress" data-testid="timer-progress" cx="30" cy="30" r="26" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 30 30)" style={{ transitionDuration: progress === 1 ? '0s' : undefined }} /></svg>
      <div className="barre-countdown" role="timer" aria-live="off"><strong key={running ? remaining : 'ready'} className={running ? 'timer-digit-change' : ''} data-testid="barre-remaining">{remaining}</strong><span>s</span></div>
    </div>
    <div className="chord-timer-copy"><div className="barre-player-status" role="status"><span className="live-dot" />{running ? 'Practice running' : 'Ready when you are'}</div><span className="barre-timer-label">{running ? singleChord ? 'Until this chord repeats' : urgent ? 'Next chord coming' : 'Until the next chord' : 'Seconds per chord'}</span></div>
  </div>;
}
