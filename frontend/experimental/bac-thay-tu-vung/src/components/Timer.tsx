interface TimerProps {
  /** Seconds remaining. */
  value: number;
  /** Total seconds — used for the ring fill ratio. */
  total: number;
}

const RADIUS = 36;
const CIRC = 2 * Math.PI * RADIUS;

export function Timer({ value, total }: TimerProps) {
  const safe = Math.max(0, Math.min(value, total));
  const ratio = total > 0 ? safe / total : 0;
  const offset = CIRC * (1 - ratio);

  let stateClass = '';
  if (safe <= 5) stateClass = 'is-critical';
  else if (safe <= 10) stateClass = 'is-warning';

  return (
    <div className={`timer ${stateClass}`} role="timer" aria-live="off" aria-label={`Time left ${safe} seconds`}>
      <svg viewBox="0 0 80 80" width="84" height="84" aria-hidden="true">
        <circle className="timer__track" cx="40" cy="40" r={RADIUS} />
        <circle
          className="timer__fill"
          cx="40"
          cy="40"
          r={RADIUS}
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="timer__value">{safe}</span>
    </div>
  );
}
