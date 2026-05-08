import { useEffect, useRef } from 'react';

export interface TimerOptions {
  /** Tick interval in ms. Defaults to 1000. */
  intervalMs?: number;
  /** When false, the timer stays paused. Toggle to drive countdown lifecycle. */
  active: boolean;
  /** Called once per interval while active. Receive a count of fired ticks. */
  onTick: () => void;
  /**
   * Re-arms the timer when this value changes (e.g. switch to a new question).
   * Without it, the timer would keep accumulating ticks from the prior round.
   */
  resetKey?: unknown;
}

/**
 * Lightweight setInterval wrapper. Avoids the classic stale-closure bug by
 * holding `onTick` in a ref so callers can pass inline functions safely.
 */
export function useTimer({ active, onTick, intervalMs = 1000, resetKey }: TimerOptions): void {
  const cb = useRef(onTick);
  cb.current = onTick;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => cb.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs, resetKey]);
}
