import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { LUMO_MOOD_IMAGE, type LumoMood } from '../../services/lumoTutorService';
import { RiveMascot } from './RiveMascot';

interface LumoLiveMascotProps {
  mood?: LumoMood;
  size?: number;
  /** Enables real-time 3D head-turn toward the user's cursor */
  trackCursor?: boolean;
  /** Enables jelly-squish hop + heart/star burst when clicked/poked */
  interactive?: boolean;
  /** Optional Rive .riv animation file path (e.g. '/animations/lumo-rive.riv') */
  riveSrc?: string;
  /** Optional Rive state machine name */
  riveStateMachine?: string;
  /** Optional looping video URL (.webm/.mp4) for future Veo/Rive video loops */
  videoSrc?: string;
  className?: string;
  onPoke?: () => void;
}

type BurstParticle = {
  id: number;
  char: string;
  x: number;
  y: number;
  rotate: number;
};

const MOOD_IDLE_VARIANTS: Record<LumoMood, { y: number[]; rotate: number[]; scaleX: number[]; scaleY: number[]; duration: number }> = {
  default: {
    y: [0, -3.5, 0],
    rotate: [0, -2, 1.5, 0],
    scaleX: [1, 0.97, 1.03, 1],
    scaleY: [1, 1.035, 0.97, 1],
    duration: 3.4,
  },
  happy: {
    y: [0, -6, 0, -3, 0],
    rotate: [0, -5, 5, -2, 0],
    scaleX: [1, 0.94, 1.06, 0.98, 1],
    scaleY: [1, 1.07, 0.94, 1.02, 1],
    duration: 2.1,
  },
  thinking: {
    y: [0, -2.5, 0],
    rotate: [-4, 4, -4],
    scaleX: [1, 0.98, 1.02, 1],
    scaleY: [1, 1.025, 0.98, 1],
    duration: 3.8,
  },
  headphones: {
    y: [0, -4.5, 0, -4.5, 0],
    rotate: [-6, 6, -6, 6, -6],
    scaleX: [1, 1.04, 0.97, 1.04, 1],
    scaleY: [1, 0.96, 1.04, 0.96, 1],
    duration: 1.6,
  },
  reading: {
    y: [0, -2, 0],
    rotate: [-2.5, 2.5, -2.5],
    scaleX: [1, 0.985, 1.015, 1],
    scaleY: [1, 1.02, 0.985, 1],
    duration: 4.0,
  },
  oops: {
    y: [0, -3, 0],
    rotate: [0, -8, 8, -5, 5, 0],
    scaleX: [1, 1.05, 0.96, 1],
    scaleY: [1, 0.95, 1.04, 1],
    duration: 2.2,
  },
  cool: {
    y: [0, -4, 0],
    rotate: [0, 3, -2, 0],
    scaleX: [1, 0.97, 1.03, 1],
    scaleY: [1, 1.03, 0.97, 1],
    duration: 3.0,
  },
};

export function LumoLiveMascot({
  mood = 'default',
  size = 56,
  trackCursor = true,
  interactive = true,
  riveSrc,
  riveStateMachine,
  videoSrc,
  className = '',
  onPoke,
}: LumoLiveMascotProps) {
  // When a real Rive .riv file is provided, render the native 120fps Rive Canvas runtime directly!
  if (riveSrc) {
    return (
      <RiveMascot
        src={riveSrc}
        stateMachine={riveStateMachine}
        mood={mood}
        size={size}
        className={`ring-2 ring-primary/25 shadow-[0_10px_22px_-8px_rgba(124,58,237,0.45)] ${className}`}
      />
    );
  }
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pokeCount, setPokeCount] = useState(0);
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  // Smooth 120fps spring cursor-tracking 3D tilt + inner face parallax
  const rawRotX = useMotionValue(0);
  const rawRotY = useMotionValue(0);
  const rawShiftX = useMotionValue(0);
  const rawShiftY = useMotionValue(0);
  const rotX = useSpring(rawRotX, { stiffness: 220, damping: 16, mass: 0.45 });
  const rotY = useSpring(rawRotY, { stiffness: 220, damping: 16, mass: 0.45 });
  const shiftX = useSpring(rawShiftX, { stiffness: 220, damping: 18, mass: 0.45 });
  const shiftY = useSpring(rawShiftY, { stiffness: 220, damping: 18, mass: 0.45 });

  useEffect(() => {
    if (!trackCursor) {
      rawRotX.set(0);
      rawRotY.set(0);
      rawShiftX.set(0);
      rawShiftY.set(0);
      return;
    }
    const handlePointerMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 220));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 220));
      rawRotY.set(dx * 26);
      rawRotX.set(-dy * 22);
      rawShiftX.set(dx * 5.5);
      rawShiftY.set(dy * 4.5);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [trackCursor, rawRotX, rawRotY, rawShiftX, rawShiftY]);

  const triggerPoke = () => {
    if (!interactive) return;
    setPokeCount((c) => c + 1);
    onPoke?.();

    const glyphs = mood === 'headphones' ? ['♪', '♫', '✦'] : mood === 'thinking' ? ['✦', '★', '?'] : ['★', '✦', '♥'];
    const baseId = Date.now();
    const burst: BurstParticle[] = glyphs.map((char, idx) => ({
      id: baseId + idx,
      char,
      x: (idx - 1) * 18 + (Math.random() * 8 - 4),
      y: -26 - Math.random() * 14,
      rotate: (idx - 1) * 20,
    }));
    setParticles((prev) => [...prev.slice(-6), ...burst]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id < baseId));
    }, 750);
  };

  const idle = MOOD_IDLE_VARIANTS[mood];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={triggerPoke}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        perspective: 420,
      }}
      className={`relative inline-flex shrink-0 select-none items-center justify-center ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Ambient Mood Floating Particles (Music notes / Thought dots / Sparkles) */}
      {mood === 'headphones' && (
        <motion.span
          aria-hidden="true"
          animate={{ y: [-2, -16], x: [0, 6], opacity: [0, 1, 0], scale: [0.7, 1.05, 0.8] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          className="pointer-events-none absolute -right-1 -top-1 text-xs font-extrabold text-primary"
        >
          ♪
        </motion.span>
      )}
      {mood === 'thinking' && (
        <motion.span
          aria-hidden="true"
          animate={{ y: [0, -10], opacity: [0, 0.9, 0], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -right-1 -top-1.5 rounded-full bg-primary-light px-1.5 py-0.5 text-[9px] font-extrabold text-primary shadow-xs"
        >
          •••
        </motion.span>
      )}

      {/* Poke/Pet Burst Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            aria-hidden="true"
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.4, rotate: 0 }}
            animate={{ opacity: 0, x: p.x, y: p.y, scale: 1.15, rotate: p.rotate }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 text-xs font-extrabold text-[#F59E0B]"
          >
            {p.char}
          </motion.span>
        ))}
      </AnimatePresence>

      {/* 3D Cursor-Tracking + Pixar Squash-and-Stretch Living Body */}
      <motion.div
        key={`poke-${pokeCount}`}
        style={{
          rotateX: rotX,
          rotateY: rotY,
          transformStyle: 'preserve-3d',
        }}
        initial={
          pokeCount > 0
            ? { scaleX: 1.18, scaleY: 0.82, y: 3 }
            : false
        }
        animate={{
          y: isHovered ? [0, -5, 0] : idle.y,
          rotate: isHovered ? [-4, 4, 0] : idle.rotate,
          scaleX: idle.scaleX,
          scaleY: idle.scaleY,
        }}
        transition={{
          duration: isHovered ? 0.55 : idle.duration,
          repeat: isHovered ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-primary/25 shadow-[0_10px_22px_-8px_rgba(124,58,237,0.45)]"
      >
        {videoSrc ? (
          <motion.video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            style={{ x: shiftX, y: shiftY, scale: 1.14 }}
            className="pointer-events-none h-full w-full object-cover"
          />
        ) : (
          <motion.img
            src={LUMO_MOOD_IMAGE[mood]}
            alt="Lumo"
            style={{ x: shiftX, y: shiftY, scale: 1.14 }}
            className="pointer-events-none h-full w-full object-cover"
          />
        )}

        {/* Living Specular Glint Sweep */}
        <motion.span
          aria-hidden="true"
          animate={{ x: ['-120%', '180%'] }}
          transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
      </motion.div>
    </div>
  );
}
