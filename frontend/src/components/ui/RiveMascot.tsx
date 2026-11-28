import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-canvas';
import type { LumoMood } from '../../services/lumoTutorService';

interface RiveMascotProps {
  /** Path to a .riv file in /public/animations/ (e.g. '/animations/lumo-rive.riv') */
  src: string;
  /** Optional explicit artboard name */
  artboard?: string;
  /** Optional explicit state machine name */
  stateMachine?: string;
  mood?: LumoMood;
  size?: number;
  /** Play a short burst occasionally instead of looping non-stop (default: true) */
  periodicPlay?: boolean;
  className?: string;
}

const BURST_DURATION_MS = 2200;
const IDLE_INTERVAL_MS = 12000;

/**
 * Production Rive mascot renderer (@rive-app/react-canvas).
 * Plays a short lively burst on load, hover, click, mood change, and every ~12s
 * so Lumo feels charming and alive without distracting non-stop motion.
 */
export function RiveMascot({
  src,
  artboard = 'Artboard',
  stateMachine,
  mood = 'default',
  size = 64,
  periodicPlay = true,
  className = '',
}: RiveMascotProps) {
  const pauseTimerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const layout = useMemo(
    () =>
      new Layout({
        fit: Fit.Contain,
        alignment: Alignment.Center,
      }),
    [],
  );

  const { rive, RiveComponent } = useRive({
    src,
    artboard,
    stateMachines: stateMachine,
    animations: stateMachine ? undefined : 'Timeline 1',
    autoplay: true,
    layout,
  });

  const playShortBurst = useCallback(() => {
    if (!rive) return;
    const target =
      stateMachine ??
      (rive.animationNames.includes('Timeline 1') ? 'Timeline 1' : undefined) ??
      rive.animationNames[0] ??
      rive.stateMachineNames[0];
    if (!target) return;

    rive.play(target);

    if (periodicPlay) {
      if (pauseTimerRef.current !== null) {
        window.clearTimeout(pauseTimerRef.current);
      }
      pauseTimerRef.current = window.setTimeout(() => {
        rive.pause();
      }, BURST_DURATION_MS);
    }
  }, [rive, stateMachine, periodicPlay]);

  // Initial friendly greeting burst + calm periodic wave every ~12s
  useEffect(() => {
    if (!rive) return;
    playShortBurst();

    if (periodicPlay) {
      intervalRef.current = window.setInterval(() => {
        playShortBurst();
      }, IDLE_INTERVAL_MS);
    }

    return () => {
      if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [rive, periodicPlay, playShortBurst]);

  // Trigger a lively burst whenever mood changes & sync any State Machine inputs if present
  useEffect(() => {
    if (!rive) return;
    playShortBurst();

    const smName = stateMachine ?? rive.stateMachineNames[0];
    if (!smName) return;

    const inputs = rive.stateMachineInputs(smName);
    if (!inputs || inputs.length === 0) return;

    const moodIndexMap: Record<LumoMood, number> = {
      default: 0,
      happy: 1,
      thinking: 2,
      headphones: 3,
      reading: 4,
      oops: 5,
      cool: 6,
    };

    for (const input of inputs) {
      const name = input.name.toLowerCase();
      if (name === 'isthinking') input.value = mood === 'thinking';
      else if (name === 'ishappy') input.value = mood === 'happy';
      else if (name === 'islistening') input.value = mood === 'headphones';
      else if (name === 'isreading') input.value = mood === 'reading';
      else if (name === 'isoops') input.value = mood === 'oops';
      else if (name === 'moodindex') input.value = moodIndexMap[mood];
      else if (name === 'trighappy' && mood === 'happy') input.fire();
      else if (name === 'trigoops' && mood === 'oops') input.fire();
    }
  }, [rive, stateMachine, mood, playShortBurst]);

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      onMouseEnter={playShortBurst}
      onClick={playShortBurst}
      data-rive-anims={rive?.animationNames.join(',') ?? ''}
      data-rive-sms={rive?.stateMachineNames.join(',') ?? ''}
      data-rive-playing={rive?.playingAnimationNames.join(',') ?? ''}
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-white ${className}`}
    >
      <RiveComponent className="h-full w-full scale-125" />
    </div>
  );
}
