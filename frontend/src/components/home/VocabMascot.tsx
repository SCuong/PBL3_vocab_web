import { useEffect, useRef, useState } from 'react';
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useReducedMotion,
    useSpring,
} from 'framer-motion';

export type MascotMood =
    | 'idle'
    | 'flipped'
    | 'known'
    | 'unsure'
    | 'forgot'
    | 'done'
    | 'reading'
    | 'headphones'
    | 'cool'
    | 'peek-side'
    | 'peek-up';
type MascotPose =
    | 'idle'
    | 'happy'
    | 'thinking'
    | 'oops'
    | 'reading'
    | 'headphones'
    | 'cool'
    | 'peek-side'
    | 'peek-up';

const POSE_SRC: Record<MascotPose, string> = {
    idle: '/mascot-lumo.webp',
    happy: '/mascot-lumo-happy.webp',
    thinking: '/mascot-lumo-thinking.webp',
    oops: '/mascot-lumo-oops.webp',
    reading: '/mascot-lumo-reading.webp',
    headphones: '/mascot-lumo-headphones.webp',
    cool: '/mascot-lumo-cool.webp',
    'peek-side': '/mascot-lumo-peek-side.webp',
    'peek-up': '/mascot-lumo-peek-up.webp',
};

const DEFAULT_MESSAGES: Record<MascotMood, string> = {
    idle: 'Chạm thẻ để thử 1 từ — hoặc kéo nhẹ mình.',
    flipped: 'Bạn nhớ từ này tới đâu?',
    known: 'Nhớ rõ rồi. Hẹn gặp lại ngày mai.',
    unsure: 'Chưa chắc cũng ổn — cuối phiên ôn lại.',
    forgot: 'Quên là bước đầu để nhớ lâu.',
    done: 'Xong phiên thử rồi. Giữ nhịp này nhé.',
    reading: 'Cùng mở sổ xem từng từ mới nhé.',
    headphones: 'Nghe kỹ phát âm rồi chọn đáp án nhé.',
    cool: 'Quá đỉnh! Bạn giữ chuỗi rất đều tay.',
    'peek-side': 'Mình đang xem bạn ghép từ nè.',
    'peek-up': 'Lịch ôn SM-2 tự sắp xếp theo trí nhớ của bạn.',
};

const INTERACTION_LINES = [
    'Bấm thẻ bên dưới để thử 1 vòng ôn thật.',
    'Nghe phát âm bằng nút loa trên thẻ nhé.',
    'Giữ chuột kéo nhẹ mình rồi thả ra thử xem.',
    'Từ nào quên sẽ tự quay lại cuối phiên.',
];

type VocabMascotProps = {
    mood: MascotMood;
    message?: string;
    size?: number;
    className?: string;
    showBubble?: boolean;
    interactive?: boolean;
    trackPointer?: boolean;
};

let posesPreloaded = false;

export const VocabMascot = ({
    mood,
    message,
    size = 118,
    className = '',
    showBubble = true,
    interactive = true,
    trackPointer = true,
}: VocabMascotProps) => {
    const prefersReduced = useReducedMotion();
    const stageRef = useRef<HTMLDivElement>(null);
    const resetTimer = useRef<number>(undefined);
    const tapCountRef = useRef(0);
    const isDraggingRef = useRef(false);

    const [overridePose, setOverridePose] = useState<MascotPose | null>(null);
    const [overrideBubble, setOverrideBubble] = useState<string | null>(null);
    const [isBlinking, setIsBlinking] = useState(false);
    const [actionTick, setActionTick] = useState(0);

    // Smooth 3D pointer-tracking springs (body subtly turns toward cursor)
    const rawRx = useMotionValue(0);
    const rawRy = useMotionValue(0);
    const rawTx = useMotionValue(0);
    const rawTy = useMotionValue(0);
    const rotX = useSpring(rawRx, { stiffness: 160, damping: 20 });
    const rotY = useSpring(rawRy, { stiffness: 160, damping: 20 });
    const lookX = useSpring(rawTx, { stiffness: 140, damping: 22 });
    const lookY = useSpring(rawTy, { stiffness: 140, damping: 22 });

    // Preload all 4 consistent 3D poses once per browser session.
    useEffect(() => {
        if (posesPreloaded) return;
        posesPreloaded = true;
        Object.values(POSE_SRC).forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }, []);

    useEffect(() => () => window.clearTimeout(resetTimer.current), []);

    useEffect(() => {
        setOverridePose(null);
        setOverrideBubble(null);
    }, [mood, message]);

    // Natural organic blink cadence while idle.
    useEffect(() => {
        if (prefersReduced) return;
        let outer: number;
        let inner: number;
        const schedule = () => {
            outer = window.setTimeout(() => {
                setIsBlinking(true);
                inner = window.setTimeout(() => {
                    setIsBlinking(false);
                    schedule();
                }, 135);
            }, 3200 + Math.random() * 2800);
        };
        schedule();
        return () => {
            window.clearTimeout(outer);
            window.clearTimeout(inner);
        };
    }, [prefersReduced]);

    useEffect(() => {
        if (!trackPointer || prefersReduced) return;
        const onPointerMove = (e: PointerEvent) => {
            const el = stageRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / 420));
            const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / 360));
            rawRy.set(dx * 16);
            rawRx.set(-dy * 12);
            rawTx.set(dx * 5);
            rawTy.set(dy * 4);
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        return () => window.removeEventListener('pointermove', onPointerMove);
    }, [trackPointer, prefersReduced, rawRx, rawRy, rawTx, rawTy]);

    const handleTap = () => {
        if (!interactive || isDraggingRef.current) return;
        const n = tapCountRef.current + 1;
        tapCountRef.current = n;
        setActionTick(t => t + 1);
        setOverridePose(n % 3 === 0 ? 'thinking' : 'happy');
        setOverrideBubble(INTERACTION_LINES[(n - 1) % INTERACTION_LINES.length]);

        window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => {
            setOverridePose(null);
            setOverrideBubble(null);
        }, 2800);
    };

    const basePose: MascotPose =
        overridePose ?? (
            mood === 'reading' || mood === 'headphones' || mood === 'cool' || mood === 'peek-side' || mood === 'peek-up'
                ? mood
                : mood === 'known' || mood === 'done'
                    ? 'happy'
                    : mood === 'flipped' || mood === 'unsure'
                        ? 'thinking'
                        : mood === 'forgot'
                            ? 'oops'
                            : 'idle'
        );

    const activePose: MascotPose = isBlinking && basePose === 'idle' ? 'happy' : basePose;
    const bubbleText = overrideBubble ?? message ?? DEFAULT_MESSAGES[mood];
    const effectiveMood = overridePose === 'happy' ? 'known' : overridePose === 'oops' ? 'forgot' : mood;

    const characterAnimate = prefersReduced
        ? {}
        : basePose === 'happy'
            ? {
                y: [0, -14, 0, -6, 0],
                scaleX: [1, 0.93, 1.07, 0.98, 1],
                scaleY: [1, 1.09, 0.92, 1.03, 1],
                rotate: [0, -5, 5, -2, 0],
            }
            : basePose === 'oops'
                ? {
                    x: [0, -6, 6, -3, 0],
                    rotate: [0, -5, 4, -2, 0],
                    scaleY: [1, 0.95, 1.03, 1],
                }
                : basePose === 'thinking'
                    ? {
                        y: [0, -5, 0],
                        rotate: [-4, -7, -4],
                        scaleX: [1, 1.015, 1],
                        scaleY: [1, 0.985, 1],
                    }
                    : {
                        y: [0, -7, 0],
                        rotate: [0, 1.8, -1.8, 0],
                        scaleX: [1, 1.022, 0.985, 1],
                        scaleY: [1, 0.978, 1.018, 1],
                    };

    const characterTransition = basePose === 'happy' || basePose === 'oops'
        ? { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const }
        : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' as const };

    return (
        <div className={`lp-mascot ${className}`} data-mood={effectiveMood}>
            <div
                ref={stageRef}
                className={`lp-mascot-stage${interactive ? ' is-interactive' : ''}`}
                style={{ width: size, height: size }}
            >
                <motion.span
                    className="lp-mascot-shadow"
                    aria-hidden="true"
                    animate={prefersReduced ? undefined : { scaleX: [1, 0.84, 1], opacity: [0.2, 0.1, 0.2] }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                />

                <motion.div
                    className="lp-mascot-rig"
                    style={
                        prefersReduced
                            ? undefined
                            : { rotateX: rotX, rotateY: rotY, x: lookX, y: lookY, transformStyle: 'preserve-3d' }
                    }
                    drag={interactive && !prefersReduced}
                    dragSnapToOrigin
                    dragElastic={0.36}
                    dragTransition={{ bounceStiffness: 340, bounceDamping: 16 }}
                    onDragStart={() => {
                        isDraggingRef.current = true;
                        setOverridePose('oops');
                        setOverrideBubble('Kéo nhẹ tay thôi nha.');
                    }}
                    onDragEnd={() => {
                        setOverridePose('happy');
                        setOverrideBubble('Về lại chỗ cũ rồi.');
                        window.setTimeout(() => { isDraggingRef.current = false; }, 120);
                        window.clearTimeout(resetTimer.current);
                        resetTimer.current = window.setTimeout(() => {
                            setOverridePose(null);
                            setOverrideBubble(null);
                        }, 2200);
                    }}
                    whileHover={interactive && !prefersReduced ? { scale: 1.07 } : undefined}
                    whileTap={interactive && !prefersReduced ? { scaleX: 1.12, scaleY: 0.88 } : undefined}
                    onClick={handleTap}
                    role={interactive ? 'button' : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    aria-label={interactive ? 'Chạm hoặc kéo linh thú Lumo để tương tác' : undefined}
                    onKeyDown={interactive ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTap();
                        }
                    } : undefined}
                >
                    <motion.div
                        key={`${basePose}-${actionTick}`}
                        className="lp-mascot-layers"
                        animate={characterAnimate}
                        transition={characterTransition}
                    >
                        <img
                            src={POSE_SRC[activePose]}
                            alt="Lumo — linh thú học từ vựng VocabLearning"
                            width={size}
                            height={size}
                            decoding="async"
                            draggable={false}
                            className="lp-mascot-img"
                        />
                    </motion.div>
                </motion.div>
            </div>

            {showBubble && bubbleText && (
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${effectiveMood}-${bubbleText}`}
                        initial={prefersReduced ? false : { opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={prefersReduced ? undefined : { opacity: 0, y: -4, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="lp-mascot-bubble"
                    >
                        {bubbleText}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};
