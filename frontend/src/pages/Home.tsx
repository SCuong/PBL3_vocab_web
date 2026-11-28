import {
    Fragment,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AnimatePresence,
    LayoutGroup,
    animate,
    motion,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
} from 'framer-motion';
import {
    ArrowRight,
    Briefcase,
    Check,
    ChevronDown,
    Flame,
    Headphones,
    HeartPulse,
    House,
    Link2,
    MessageCircle,
    Microscope,
    Plane,
    RotateCcw,
    Smile,
    Sparkles,
    Volume2,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { PATHS } from '../routes/paths';
import { useAppContext } from '../context/AppContext';
import { PROFILE_FRAMES } from '../utils/profileFrames';
import { VocabMascot, type MascotMood } from '../components/home/VocabMascot';
import './home.css';

/* ── Hero 3D Flashcard deck (sample only) ── */
type HeroWord = {
    id: string;
    word: string;
    ipa: string;
    cefr: 'A1' | 'A2' | 'B1';
    topic: string;
    meaning: string;
    before: string;
    after: string;
    sentenceVi: string;
};

const HERO_WORDS: HeroWord[] = [
    {
        id: 'journey',
        word: 'journey',
        ipa: '/ˈdʒɜːni/',
        cefr: 'A2',
        topic: 'Giải trí & Du lịch',
        meaning: 'hành trình, chuyến đi',
        before: 'The ',
        after: ' from Hanoi to Hue takes 13 hours by train.',
        sentenceVi: 'Chuyến tàu từ Hà Nội vào Huế mất 13 tiếng.',
    },
    {
        id: 'improve',
        word: 'improve',
        ipa: '/ɪmˈpruːv/',
        cefr: 'B1',
        topic: 'Công việc & Học tập',
        meaning: 'cải thiện',
        before: 'Practice every evening to ',
        after: ' your English.',
        sentenceVi: 'Luyện tập mỗi tối để cải thiện tiếng Anh.',
    },
    {
        id: 'confident',
        word: 'confident',
        ipa: '/ˈkɒnfɪdənt/',
        cefr: 'B1',
        topic: 'Cảm xúc & Ý kiến',
        meaning: 'tự tin',
        before: 'She felt ',
        after: ' speaking in front of class.',
        sentenceVi: 'Cô ấy thấy tự tin khi nói trước lớp.',
    },
];

/* ── Act 2: Arcade Data (Ghép từ · Minitest · Nghe & chọn) ── */
type ArcadeMode = 'match' | 'minitest' | 'listen';

type MatchPair = { id: string; en: string; vi: string };
const MATCH_LEFT: MatchPair[] = [
    { id: 'journey', en: 'journey', vi: 'hành trình' },
    { id: 'improve', en: 'improve', vi: 'cải thiện' },
    { id: 'confident', en: 'confident', vi: 'tự tin' },
];
const MATCH_RIGHT: MatchPair[] = [
    { id: 'improve', en: 'improve', vi: 'cải thiện' },
    { id: 'confident', en: 'confident', vi: 'tự tin' },
    { id: 'journey', en: 'journey', vi: 'hành trình' },
];

type MinitestQ = {
    id: string;
    prompt: string;
    ipa: string;
    answer: string;
    options: string[];
};
const MINITEST_QUESTIONS: MinitestQ[] = [
    {
        id: 'q1',
        prompt: 'destination',
        ipa: '/ˌdestɪˈneɪʃn/',
        answer: 'điểm đến',
        options: ['hành lý', 'điểm đến', 'đồng nghiệp'],
    },
    {
        id: 'q2',
        prompt: 'acquaintance',
        ipa: '/əˈkweɪntəns/',
        answer: 'người quen',
        options: ['người quen', 'thói quen', 'lễ hội'],
    },
];

const LISTEN_OPTIONS = ['luggage', 'journey', 'station'] as const;

/* ── Act 4: Seven Real Topic Groups (Icon + Name only — zero descriptions!) ── */
type TopicSample = { word: string; ipa: string; cefr: 'A1' | 'A2' | 'B1'; meaning: string };
type TopicItem = {
    id: string;
    num: string;
    name: string;
    icon: LucideIcon;
    samples: [TopicSample, TopicSample, TopicSample];
};

const TOPICS: TopicItem[] = [
    {
        id: 'travel',
        num: '01',
        name: 'Giải trí & Du lịch',
        icon: Plane,
        samples: [
            { word: 'journey', ipa: '/ˈdʒɜːni/', cefr: 'A2', meaning: 'hành trình' },
            { word: 'destination', ipa: '/ˌdestɪˈneɪʃn/', cefr: 'B1', meaning: 'điểm đến' },
            { word: 'itinerary', ipa: '/aɪˈtɪnərəri/', cefr: 'B1', meaning: 'lịch trình' },
        ],
    },
    {
        id: 'comm',
        num: '02',
        name: 'Giao tiếp hàng ngày',
        icon: MessageCircle,
        samples: [
            { word: 'acquaintance', ipa: '/əˈkweɪntəns/', cefr: 'B1', meaning: 'người quen' },
            { word: 'conversation', ipa: '/ˌkɒnvəˈseɪʃn/', cefr: 'A2', meaning: 'cuộc trò chuyện' },
            { word: 'introduce', ipa: '/ˌɪntrəˈdjuːs/', cefr: 'A2', meaning: 'giới thiệu' },
        ],
    },
    {
        id: 'work',
        num: '03',
        name: 'Công việc & Học tập',
        icon: Briefcase,
        samples: [
            { word: 'improve', ipa: '/ɪmˈpruːv/', cefr: 'B1', meaning: 'cải thiện' },
            { word: 'colleague', ipa: '/ˈkɒliːɡ/', cefr: 'A2', meaning: 'đồng nghiệp' },
            { word: 'deadline', ipa: '/ˈdedlaɪn/', cefr: 'B1', meaning: 'hạn chót' },
        ],
    },
    {
        id: 'daily',
        num: '04',
        name: 'Cuộc sống hàng ngày',
        icon: House,
        samples: [
            { word: 'delicious', ipa: '/dɪˈlɪʃəs/', cefr: 'A1', meaning: 'ngon miệng' },
            { word: 'routine', ipa: '/ruːˈtiːn/', cefr: 'A2', meaning: 'thói quen' },
            { word: 'neighbor', ipa: '/ˈneɪbər/', cefr: 'A2', meaning: 'hàng xóm' },
        ],
    },
    {
        id: 'culture',
        num: '05',
        name: 'Văn hoá & Khoa học',
        icon: Microscope,
        samples: [
            { word: 'tradition', ipa: '/trəˈdɪʃn/', cefr: 'A2', meaning: 'truyền thống' },
            { word: 'discover', ipa: '/dɪˈskʌvər/', cefr: 'A2', meaning: 'khám phá' },
            { word: 'festival', ipa: '/ˈfestɪvl/', cefr: 'A1', meaning: 'lễ hội' },
        ],
    },
    {
        id: 'health',
        num: '06',
        name: 'Sức khoẻ',
        icon: HeartPulse,
        samples: [
            { word: 'balanced', ipa: '/ˈbælənst/', cefr: 'B1', meaning: 'cân bằng' },
            { word: 'energy', ipa: '/ˈenədʒi/', cefr: 'A2', meaning: 'năng lượng' },
            { word: 'recover', ipa: '/rɪˈkʌvər/', cefr: 'B1', meaning: 'hồi phục' },
        ],
    },
    {
        id: 'emotion',
        num: '07',
        name: 'Cảm xúc & Ý kiến',
        icon: Smile,
        samples: [
            { word: 'confident', ipa: '/ˈkɒnfɪdənt/', cefr: 'B1', meaning: 'tự tin' },
            { word: 'nervous', ipa: '/ˈnɜːvəs/', cefr: 'A2', meaning: 'hồi hộp' },
            { word: 'grateful', ipa: '/ˈɡreɪtfl/', cefr: 'B1', meaning: 'biết ơn' },
        ],
    },
];

const JOURNEY_PEAKS = [0.36, 0.78, 1, 0.62, 0.94, 0.48, 0.88, 0.66, 0.34];
const STREAK_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const SHOWCASE_AVATARS = [
    { id: 'avatar-1', src: '/avatars/avatar-1.webp', label: 'Lumo Học giả', group: 'mascot' as const },
    { id: 'avatar-2', src: '/avatars/avatar-2.webp', label: 'Lumo Matcha', group: 'mascot' as const },
    { id: 'avatar-3', src: '/avatars/avatar-3.webp', label: 'Lumo Anh đào', group: 'mascot' as const },
    { id: 'avatar-4', src: '/avatars/avatar-4.webp', label: 'Lumo Họa sĩ', group: 'mascot' as const },
    { id: 'avatar-5', src: '/avatars/avatar-5.webp', label: 'Lumo Quán quân', group: 'mascot' as const },
    { id: 'avatar-6', src: '/avatars/avatar-6.webp', label: 'Minh · Len xanh', group: 'learner' as const },
    { id: 'avatar-7', src: '/avatars/avatar-7.webp', label: 'Khoa · Tai nghe', group: 'learner' as const },
    { id: 'avatar-8', src: '/avatars/avatar-8.webp', label: 'Hà · Nơ tím', group: 'learner' as const },
    { id: 'avatar-9', src: '/avatars/avatar-9.webp', label: 'Nam · Mũ len', group: 'learner' as const },
];
const SLIDE_LABELS = [
    'Thử một từ',
    '3 nhịp luyện',
    'Lịch ôn SM-2',
    '7 chủ đề',
    'Bản đồ nhiệt',
    'Bắt đầu',
] as const;

// Deterministic 7×24 activity heatmap levels (0..4) — recent weeks trend denser
const HEATMAP_COLS = 24;
const HEATMAP_ROWS = 7;
const HEATMAP_CELLS: { id: number; level: 0 | 1 | 2 | 3 | 4; words: number }[] = Array.from(
    { length: HEATMAP_ROWS * HEATMAP_COLS },
    (_, i) => {
        const row = Math.floor(i / HEATMAP_COLS);
        const col = i % HEATMAP_COLS;
        const hash = (col * 37 + row * 19 + ((col * row) % 11) * 7) % 17;
        const recencyBoost = col > 16 ? 1 : col > 9 ? 0.5 : 0;
        const raw = (hash % 5) + recencyBoost;
        const level = (
            hash === 0 || hash === 5 || hash === 11
                ? 0
                : raw >= 4.2
                  ? 4
                  : raw >= 3
                    ? 3
                    : raw >= 1.8
                      ? 2
                      : 1
        ) as 0 | 1 | 2 | 3 | 4;
        const words = level === 0 ? 0 : level * 4 + ((col + row) % 3);
        return { id: i, level, words };
    },
);

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function useIsCompactViewport() {
    const [compact, setCompact] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 860 : false,
    );
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 859px)');
        const sync = () => setCompact(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);
    return compact;
}

/* ── Precomputed 9-bar transform-only audio waveform ── */
const WaveBars = ({ active, large = false }: { active: boolean; large?: boolean }) => (
    <span className={`h26-wave ${active ? 'is-live' : ''} ${large ? 'is-large' : ''}`} aria-hidden="true">
        {JOURNEY_PEAKS.map((peak, i) => (
            <span
                key={i}
                style={{
                    ['--bar-peak' as string]: peak,
                    ['--bar-delay' as string]: `${i * 55}ms`,
                }}
            />
        ))}
    </span>
);

const Home = () => {
    const navigate = useNavigate();
    const { currentUser } = useAppContext();
    const prefersReduced = Boolean(useReducedMotion());
    const isCompact = useIsCompactViewport();
    const signedIn = Boolean(currentUser);

    const heroRef = useRef<HTMLElement>(null);
    const slideRefs = useRef<(HTMLElement | null)[]>([]);
    const activeSlideRef = useRef(0);
    const isSpringScrollingRef = useRef(false);
    const gestureCooldownRef = useRef(0);
    const wheelAccumRef = useRef(0);
    const wheelResetTimerRef = useRef<number | undefined>(undefined);
    const expectedScrollYRef = useRef<number | null>(null);
    const scrollStopRef = useRef<(() => void) | null>(null);
    const [activeSlide, setActiveSlide] = useState(0);

    const setSlideRef = useCallback((idx: number) => (el: HTMLElement | null) => {
        slideRefs.current[idx] = el;
        if (idx === 0) {
            heroRef.current = el;
        }
    }, []);
    const matchBoardRef = useRef<HTMLDivElement>(null);
    const slabsStageRef = useRef<HTMLDivElement>(null);
    const todaySlabRef = useRef<HTMLLIElement>(null);
    const tomorrowSlabRef = useRef<HTMLLIElement>(null);
    const enRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const viRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const speakTimerRef = useRef<number | undefined>(undefined);
    const flightTimerRef = useRef<number | undefined>(undefined);

    /* ── Act 1: Hero state ── */
    const [heroIdx, setHeroIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [speakingWord, setSpeakingWord] = useState<string | null>(null);
    const heroWord = HERO_WORDS[heroIdx];

    /* ── Act 2: Arcade state ── */
    const [arcadeMode, setArcadeMode] = useState<ArcadeMode>('match');
    // Match mode
    const [pickedEn, setPickedEn] = useState<string | null>(null);
    const [matchedIds, setMatchedIds] = useState<string[]>(['journey']);
    const [matchMissVi, setMatchMissVi] = useState<string | null>(null);
    const [tethers, setTethers] = useState<
        { id: string; x1: number; y1: number; x2: number; y2: number }[]
    >([]);
    // Minitest mode
    const [qIdx, setQIdx] = useState(0);
    const [qPicked, setQPicked] = useState<string | null>(null);
    const [xpPopKey, setXpPopKey] = useState(0);
    // Listen & Pick mode ("The sound becomes the answer")
    const [listenSolved, setListenSolved] = useState(false);
    const [listenMiss, setListenMiss] = useState<string | null>(null);

    /* ── Act 3: Review Sculpture state ("Your recall moves the calendar") ── */
    const [reviewRevealed, setReviewRevealed] = useState(false);
    const [reviewSlot, setReviewSlot] = useState<'today' | 'tomorrow'>('tomorrow');
    const [reviewChosen, setReviewChosen] = useState<'forgot' | 'known' | null>(null);
    const [peekerPos, setPeekerPos] = useState<{ x: number; y: number } | null>(null);
    const [flightState, setFlightState] = useState<{
        key: number;
        dir: -1 | 1;
        airborne: boolean;
    }>({ key: 0, dir: 1, airborne: false });

    /* ── Act 4: Topic Index state ── */
    const [topicId, setTopicId] = useState<string>(TOPICS[0].id);
    const activeTopic = TOPICS.find(t => t.id === topicId) ?? TOPICS[0];

    /* ── Act 5: Portrait & Heatmap state ── */
    const [avatarIdx, setAvatarIdx] = useState(0);
    const [frameIdx, setFrameIdx] = useState(3); // Bậc thầy
    const [demoXp, setDemoXp] = useState(640);
    const [xpBurstKey, setXpBurstKey] = useState(0);
    const [hoveredCell, setHoveredCell] = useState<number | null>(null);
    const activeAvatar = SHOWCASE_AVATARS[avatarIdx];
    const activeFrame = PROFILE_FRAMES[frameIdx];
    const activeCell = hoveredCell !== null ? HEATMAP_CELLS[hoveredCell] : null;

    /* ── Hero 3D tilt physics ── */
    const cardRawRx = useMotionValue(0);
    const cardRawRy = useMotionValue(0);
    const cardRx = useSpring(cardRawRx, { stiffness: 220, damping: 22 });
    const cardRy = useSpring(cardRawRy, { stiffness: 220, damping: 22 });

    /* ── Hero depth parallax ── */
    const { scrollYProgress: heroProgress } = useScroll({
        target: heroRef,
        offset: ['start start', 'end start'],
    });
    const bgWordY = useTransform(heroProgress, [0, 1], [0, 110]);
    const bgWordScale = useTransform(heroProgress, [0, 1], [1, 0.91]);
    const bgWordOpacity = useTransform(heroProgress, [0, 0.85], [1, 0.2]);
    const lumoLiftY = useTransform(heroProgress, [0, 1], [0, -34]);

    useEffect(
        () => () => {
            window.clearTimeout(speakTimerRef.current);
            window.clearTimeout(flightTimerRef.current);
            window.clearTimeout(wheelResetTimerRef.current);
            scrollStopRef.current?.();
        },
        [],
    );

    const springToSlide = useCallback(
        (nextIdx: number) => {
            const clamped = Math.max(0, Math.min(SLIDE_LABELS.length - 1, nextIdx));
            const targetEl = slideRefs.current[clamped];
            if (!targetEl) return;

            activeSlideRef.current = clamped;
            setActiveSlide(clamped);

            const targetY = Math.max(
                0,
                Math.round(targetEl.getBoundingClientRect().top + window.scrollY - 56),
            );

            scrollStopRef.current?.();

            if (prefersReduced) {
                window.scrollTo({ top: targetY, behavior: 'auto' });
                return;
            }

            isSpringScrollingRef.current = true;
            expectedScrollYRef.current = window.scrollY;
            gestureCooldownRef.current = performance.now() + 540;

            const controls = animate(window.scrollY, targetY, {
                type: 'spring',
                stiffness: 170,
                damping: 25,
                mass: 0.85,
                restDelta: 0.5,
                onUpdate: latest => {
                    expectedScrollYRef.current = latest;
                    window.scrollTo(0, latest);
                },
                onComplete: () => {
                    isSpringScrollingRef.current = false;
                    expectedScrollYRef.current = null;
                },
            });

            scrollStopRef.current = () => {
                controls.stop();
                isSpringScrollingRef.current = false;
                expectedScrollYRef.current = null;
            };
        },
        [prefersReduced],
    );

    /* ── Full-screen spring deck controller (wheel / trackpad / keyboard / scrollbar snap) ── */
    useEffect(() => {
        if (isCompact || prefersReduced) return;

        const isDeckViewport = () => window.innerWidth >= 860 && window.innerHeight >= 600;

        const findNearestSlide = () => {
            let bestIdx = 0;
            let bestDist = Number.POSITIVE_INFINITY;
            slideRefs.current.forEach((el, idx) => {
                if (!el) return;
                const dist = Math.abs(el.getBoundingClientRect().top - 56);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = idx;
                }
            });
            return { bestIdx, bestDist };
        };

        const onWheel = (e: WheelEvent) => {
            if (!isDeckViewport() || e.ctrlKey || e.metaKey) return;

            const { bestIdx } = findNearestSlide();
            activeSlideRef.current = bestIdx;

            // Allow natural scrolling below the last slide to reach the footer
            if (bestIdx === SLIDE_LABELS.length - 1 && e.deltaY > 0) {
                const lastEl = slideRefs.current[bestIdx];
                if (lastEl && lastEl.getBoundingClientRect().top <= 60) {
                    return;
                }
            }

            e.preventDefault();

            const now = performance.now();
            if (isSpringScrollingRef.current || now < gestureCooldownRef.current) {
                wheelAccumRef.current = 0;
                return;
            }

            wheelAccumRef.current += e.deltaY;
            window.clearTimeout(wheelResetTimerRef.current);
            wheelResetTimerRef.current = window.setTimeout(() => {
                wheelAccumRef.current = 0;
            }, 140);

            if (Math.abs(wheelAccumRef.current) >= 24) {
                const dir = wheelAccumRef.current > 0 ? 1 : -1;
                wheelAccumRef.current = 0;
                const next = Math.max(0, Math.min(SLIDE_LABELS.length - 1, bestIdx + dir));
                if (next !== bestIdx) {
                    springToSlide(next);
                } else {
                    // Gently spring back into exact alignment if slightly off
                    springToSlide(bestIdx);
                }
            }
        };

        const onScroll = () => {
            if (!isDeckViewport()) return;
            if (isSpringScrollingRef.current) {
                // If user grabs the native scrollbar mid-spring, yield control immediately.
                if (
                    expectedScrollYRef.current !== null &&
                    Math.abs(window.scrollY - expectedScrollYRef.current) > 36
                ) {
                    scrollStopRef.current?.();
                } else {
                    return;
                }
            }
            const { bestIdx } = findNearestSlide();
            if (bestIdx !== activeSlideRef.current) {
                activeSlideRef.current = bestIdx;
                setActiveSlide(bestIdx);
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (!isDeckViewport()) return;
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'PageDown' || (e.key === 'ArrowDown' && !e.altKey)) {
                const { bestIdx } = findNearestSlide();
                if (bestIdx < SLIDE_LABELS.length - 1) {
                    e.preventDefault();
                    springToSlide(bestIdx + 1);
                }
            } else if (e.key === 'PageUp' || (e.key === 'ArrowUp' && !e.altKey)) {
                const { bestIdx } = findNearestSlide();
                if (bestIdx > 0) {
                    e.preventDefault();
                    springToSlide(bestIdx - 1);
                }
            }
        };

        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isCompact, prefersReduced, springToSlide]);

    const syncPeekerPos = useCallback(() => {
        const stage = slabsStageRef.current;
        const target = reviewSlot === 'today' ? todaySlabRef.current : tomorrowSlabRef.current;
        if (!stage || !target) return;
        const sRect = stage.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        setPeekerPos({
            x: tRect.right - sRect.left - 134,
            y: tRect.top - sRect.top - 62,
        });
    }, [reviewSlot]);

    useLayoutEffect(() => {
        syncPeekerPos();
        window.addEventListener('resize', syncPeekerPos);
        return () => window.removeEventListener('resize', syncPeekerPos);
    }, [syncPeekerPos]);

    const speak = useCallback((word: string) => {
        if (!canSpeak) return;
        window.clearTimeout(speakTimerRef.current);
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.88;
        setSpeakingWord(word);
        utterance.onend = () => setSpeakingWord(prev => (prev === word ? null : prev));
        utterance.onerror = () => setSpeakingWord(prev => (prev === word ? null : prev));
        window.speechSynthesis.speak(utterance);
        speakTimerRef.current = window.setTimeout(() => {
            setSpeakingWord(prev => (prev === word ? null : prev));
        }, 1600);
    }, []);

    /* ── Measure exact SVG violet tethers between matched EN & VI chips ── */
    const recomputeTethers = useCallback(() => {
        const board = matchBoardRef.current;
        if (!board || arcadeMode !== 'match') {
            setTethers([]);
            return;
        }
        const bRect = board.getBoundingClientRect();
        const next: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
        matchedIds.forEach(id => {
            const leftEl = enRefs.current[id];
            const rightEl = viRefs.current[id];
            if (!leftEl || !rightEl) return;
            const l = leftEl.getBoundingClientRect();
            const r = rightEl.getBoundingClientRect();
            next.push({
                id,
                x1: l.right - bRect.left,
                y1: l.top + l.height / 2 - bRect.top,
                x2: r.left - bRect.left,
                y2: r.top + r.height / 2 - bRect.top,
            });
        });
        setTethers(next);
    }, [arcadeMode, matchedIds]);

    useLayoutEffect(() => {
        recomputeTethers();
        const onResize = () => recomputeTethers();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [recomputeTethers]);

    /* ── Handlers ── */
    const onCardMove = (e: ReactMouseEvent<HTMLDivElement>) => {
        if (prefersReduced || isCompact) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        cardRawRx.set((0.5 - py) * 11);
        cardRawRy.set((px - 0.5) * 12);
    };

    const onCardLeave = () => {
        cardRawRx.set(0);
        cardRawRy.set(0);
    };

    const handlePickEn = (id: string) => {
        if (matchedIds.includes(id)) return;
        setMatchMissVi(null);
        setPickedEn(prev => (prev === id ? null : id));
    };

    const handlePickVi = (id: string) => {
        if (matchedIds.includes(id)) return;
        if (!pickedEn) return;
        if (pickedEn === id) {
            setMatchedIds(prev => [...prev, id]);
            setPickedEn(null);
            setMatchMissVi(null);
        } else {
            setMatchMissVi(id);
            window.setTimeout(() => setMatchMissVi(null), 550);
        }
    };

    const currentQ = MINITEST_QUESTIONS[qIdx];
    const qCorrect = qPicked === currentQ.answer;

    const handlePickMinitest = (opt: string) => {
        setQPicked(opt);
        if (opt === currentQ.answer) {
            setXpPopKey(k => k + 1);
        }
    };

    const handlePickListen = (word: string) => {
        if (listenSolved) return;
        if (word === 'journey') {
            setListenMiss(null);
            setListenSolved(true);
        } else {
            setListenMiss(word);
        }
    };

    const handleChooseReview = (choice: 'forgot' | 'known') => {
        const nextSlot = choice === 'forgot' ? 'today' : 'tomorrow';
        const changed = nextSlot !== reviewSlot;
        setReviewRevealed(true);
        setReviewChosen(choice);
        setReviewSlot(nextSlot);

        if (changed && !prefersReduced) {
            const dir: -1 | 1 = nextSlot === 'today' ? -1 : 1;
            window.clearTimeout(flightTimerRef.current);
            setFlightState(prev => ({ key: prev.key + 1, dir, airborne: true }));
            flightTimerRef.current = window.setTimeout(() => {
                setFlightState(prev => ({ ...prev, airborne: false }));
            }, 420);
        }
    };

    const handleSelectFrame = (idx: number) => {
        setFrameIdx(idx);
        setDemoXp(prev => prev + 25);
        setXpBurstKey(k => k + 1);
    };

    /* ── Distinct Lumo poses across all 5 acts (zero repeats) ── */
    const heroLumoMood: MascotMood = flipped ? 'flipped' : 'idle';

    const arcadeMascotSrc =
        arcadeMode === 'listen'
            ? '/mascot-lumo-headphones.webp'
            : arcadeMode === 'minitest'
              ? qCorrect
                  ? '/mascot-lumo-happy.webp'
                  : qPicked
                    ? '/mascot-lumo-oops.webp'
                    : '/mascot-lumo-peek-side.webp'
              : matchMissVi
                ? '/mascot-lumo-oops.webp'
                : matchedIds.length === MATCH_LEFT.length
                  ? '/mascot-lumo-happy.webp'
                  : '/mascot-lumo-peek-side.webp';
    const isSidePeeking = arcadeMascotSrc === '/mascot-lumo-peek-side.webp';

    const springLayout = prefersReduced
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 250, damping: 25 };

    // Keep scroll-reveal responsive even on instant bottom jump-scrolls (End key).
    const revealView = { once: true, amount: 0.08 as const };
    const revealEase = [0.16, 1, 0.3, 1] as const;

    return (
        <div className="h26">
            {/* Floating Right-Edge Chapter Spring Dots */}
            <nav className="h26-deck-nav" aria-label="Điều hướng từng màn hình">
                {SLIDE_LABELS.map((label, idx) => (
                    <button
                        key={label}
                        type="button"
                        onClick={e => {
                            e.currentTarget.blur();
                            springToSlide(idx);
                        }}
                        className={`h26-deck-dot ${activeSlide === idx ? 'is-active' : ''}`}
                        aria-label={`Màn ${idx + 1}: ${label}`}
                        aria-current={activeSlide === idx ? 'step' : undefined}
                    >
                        <span className="h26-deck-dot-label">{label}</span>
                        <span className="h26-deck-dot-core" />
                    </button>
                ))}
            </nav>

            {/* ═══════════════════════════════════════════════════
                ACT 1 — THEATER (Full-bleed Purple 3D Soundstage)
               ═══════════════════════════════════════════════════ */}
            <section
                ref={setSlideRef(0)}
                className="h26-theater h26-slide"
                aria-labelledby="h26-hero-heading"
            >
                <motion.div
                    className="h26-bg-word"
                    style={
                        prefersReduced
                            ? undefined
                            : { y: bgWordY, scale: bgWordScale, opacity: bgWordOpacity }
                    }
                    aria-hidden="true"
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={heroWord.id}
                            initial={prefersReduced ? false : { opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReduced ? undefined : { opacity: 0, y: -16 }}
                            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {heroWord.word.toUpperCase()}
                        </motion.span>
                    </AnimatePresence>
                </motion.div>

                <div className="h26-wrap h26-theater-inner">
                    <header className="h26-lead">
                        <h1 id="h26-hero-heading" className="h26-lead-title">
                            Học từ vựng. <span>Thử ngay.</span>
                        </h1>
                        <div className="h26-hero-words" role="group" aria-label="Chọn từ thử">
                            {HERO_WORDS.map((w, i) => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => {
                                        setHeroIdx(i);
                                        setFlipped(false);
                                    }}
                                    className={`h26-chip-tab ${i === heroIdx ? 'is-active' : ''}`}
                                    aria-pressed={i === heroIdx}
                                >
                                    {w.word}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="h26-theater-arena">
                        {/* 3D Tilting + 180° Flipping Glass-Ceramic Card */}
                        <div
                            className="h26-card-scene"
                            onMouseMove={onCardMove}
                            onMouseLeave={onCardLeave}
                        >
                            <motion.div
                                className="h26-card-tilt"
                                style={
                                    prefersReduced || isCompact
                                        ? undefined
                                        : { rotateX: cardRx, rotateY: cardRy }
                                }
                            >
                                {!prefersReduced && <span className="h26-bevel-sweep" aria-hidden="true" />}

                                <motion.div
                                    className="h26-rotor"
                                    animate={{ rotateY: flipped ? 180 : 0 }}
                                    transition={
                                        prefersReduced
                                            ? { duration: 0 }
                                            : { type: 'spring', stiffness: 250, damping: 24 }
                                    }
                                >
                                    {/* FRONT */}
                                    <article className="h26-face h26-face--front" aria-hidden={flipped}>
                                        <div className="h26-face-top">
                                            <span className="h26-badge">{heroWord.cefr}</span>
                                            <span className="h26-muted-label">{heroWord.topic}</span>
                                        </div>

                                        <div className="h26-face-core">
                                            <div className="h26-word-row">
                                                <span className="h26-word-big">{heroWord.word}</span>
                                                {canSpeak && (
                                                    <button
                                                        type="button"
                                                        onClick={() => speak(heroWord.word)}
                                                        className={`h26-audio-btn ${speakingWord === heroWord.word ? 'is-speaking' : ''}`}
                                                        aria-label={`Nghe phát âm ${heroWord.word}`}
                                                        tabIndex={flipped ? -1 : 0}
                                                    >
                                                        <Volume2 size={17} aria-hidden="true" />
                                                        <WaveBars active={speakingWord === heroWord.word} />
                                                    </button>
                                                )}
                                            </div>

                                            <span className="h26-ipa">{heroWord.ipa}</span>

                                            <p className="h26-sentence">
                                                {heroWord.before}
                                                <mark>{heroWord.word}</mark>
                                                {heroWord.after}
                                            </p>
                                        </div>

                                        <div className="h26-face-foot">
                                            <button
                                                type="button"
                                                onClick={() => setFlipped(true)}
                                                className="h26-btn-primary"
                                                tabIndex={flipped ? -1 : 0}
                                            >
                                                <span>Xem nghĩa</span>
                                                <ArrowRight size={18} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </article>

                                    {/* BACK (180° rotated) */}
                                    <article className="h26-face h26-face--back" aria-hidden={!flipped}>
                                        <div className="h26-face-top">
                                            <span className="h26-badge">{heroWord.cefr}</span>
                                            <span className="h26-ipa">{heroWord.ipa}</span>
                                        </div>

                                        <div className="h26-face-core">
                                            <strong className="h26-meaning-hero">{heroWord.meaning}</strong>
                                            <p className="h26-sentence-vi">{heroWord.sentenceVi}</p>
                                        </div>

                                        <div className="h26-face-foot">
                                            <button
                                                type="button"
                                                onClick={() => setFlipped(false)}
                                                className="h26-btn-primary"
                                                tabIndex={flipped ? 0 : -1}
                                            >
                                                <RotateCcw size={16} aria-hidden="true" />
                                                <span>Lật mặt trước</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate(signedIn ? PATHS.learning : PATHS.register)}
                                                className="h26-btn-ghost"
                                                tabIndex={flipped ? 0 : -1}
                                            >
                                                <span>Học ngay</span>
                                                <ArrowRight size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </article>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Lumo on Sculptural Clay Plinth */}
                        <motion.aside
                            className="h26-lumo-col"
                            style={prefersReduced || isCompact ? undefined : { y: lumoLiftY }}
                            aria-label="Mascot Lumo"
                        >
                            <div className="h26-sat h26-sat--left" aria-hidden="true">
                                <span>IPA</span>
                                <strong>{heroWord.ipa}</strong>
                            </div>
                            <div className="h26-sat h26-sat--right" aria-hidden="true">
                                <span>SM-2</span>
                                <strong>+1 ngày</strong>
                            </div>

                            <div className="h26-lumo-wrap">
                                <VocabMascot
                                    mood={heroLumoMood}
                                    size={isCompact ? 136 : 234}
                                    showBubble={false}
                                    interactive
                                    trackPointer={!isCompact}
                                />
                            </div>
                        </motion.aside>
                    </div>
                </div>

                {/* Subtle scroll cue inviting the visitor into the notebook below */}
                <button
                    type="button"
                    onClick={() => springToSlide(1)}
                    className="h26-scroll-cue"
                    aria-label="Cuộn xuống phần chơi thử"
                >
                    <span>Cuộn để khám phá</span>
                    <ChevronDown size={16} aria-hidden="true" />
                </button>

                {/* Flowing sculptural wave ribbon bridging Hero into the notebook */}
                <div className="h26-hero-wave" aria-hidden="true">
                    <svg viewBox="0 0 1440 84" preserveAspectRatio="none" width="100%" height="100%">
                        <path
                            d="M0,36 C260,72 520,4 780,38 C1040,72 1260,12 1440,42 L1440,68 C1240,42 1020,84 760,56 C500,28 240,84 0,58 Z"
                            className="h26-hero-wave-back"
                        />
                        <path
                            d="M0,46 C320,10 620,76 960,40 C1180,16 1340,54 1440,36 L1440,56 C1320,72 1160,34 940,58 C600,90 300,28 0,64 Z"
                            className="h26-hero-wave-front"
                        />
                    </svg>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                ACT 2 — ARCADE ON RULED NOTEBOOK PAPER
               ═══════════════════════════════════════════════════ */}
            <section
                ref={setSlideRef(1)}
                id="h26-arcade-section"
                className="h26-arcade h26-slide"
                aria-labelledby="h26-arcade-heading"
            >
                <div className="h26-notebook-margin" aria-hidden="true" />
                <div className="h26-wrap">
                    <motion.div
                        className="h26-arcade-head"
                        initial={prefersReduced ? false : { opacity: 0, y: 26 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={revealView}
                        transition={{ duration: 0.5, ease: revealEase }}
                    >
                        <h2 id="h26-arcade-heading" className="h26-h2">
                            Chạm để chơi thử
                        </h2>

                        <div className="h26-mode-pills" role="tablist" aria-label="Chế độ luyện tập">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={arcadeMode === 'match'}
                                onClick={() => setArcadeMode('match')}
                                className={`h26-mode-pill ${arcadeMode === 'match' ? 'is-active' : ''}`}
                            >
                                <Link2 size={15} aria-hidden="true" />
                                <span>Ghép từ</span>
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={arcadeMode === 'minitest'}
                                onClick={() => setArcadeMode('minitest')}
                                className={`h26-mode-pill ${arcadeMode === 'minitest' ? 'is-active' : ''}`}
                            >
                                <Zap size={15} aria-hidden="true" />
                                <span>Minitest</span>
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={arcadeMode === 'listen'}
                                onClick={() => setArcadeMode('listen')}
                                className={`h26-mode-pill ${arcadeMode === 'listen' ? 'is-active' : ''}`}
                            >
                                <Headphones size={15} aria-hidden="true" />
                                <span>Nghe & chọn</span>
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        className="h26-arcade-stage"
                        initial={prefersReduced ? false : { opacity: 0, y: 32, scale: 0.985 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={revealView}
                        transition={{ duration: 0.56, delay: 0.08, ease: revealEase }}
                    >
                        <div className="h26-arcade-arena">
                            <div className="h26-arcade-main">
                            {/* MODE A: MATCH WITH TAUT VIOLET SVG TETHERS */}
                            {arcadeMode === 'match' && (
                                <div ref={matchBoardRef} className="h26-match-board">
                                    <svg className="h26-tether-svg" aria-hidden="true">
                                        {tethers.map(t => {
                                            const cx1 = t.x1 + (t.x2 - t.x1) * 0.45;
                                            const cx2 = t.x2 - (t.x2 - t.x1) * 0.45;
                                            const d = `M ${t.x1} ${t.y1} C ${cx1} ${t.y1}, ${cx2} ${t.y2}, ${t.x2} ${t.y2}`;
                                            return (
                                                <g key={t.id}>
                                                    <motion.path
                                                        d={d}
                                                        className="h26-tether-glow"
                                                        initial={prefersReduced ? false : { pathLength: 0, opacity: 0 }}
                                                        animate={{ pathLength: 1, opacity: 1 }}
                                                        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                    <motion.path
                                                        d={d}
                                                        className="h26-tether-line"
                                                        initial={prefersReduced ? false : { pathLength: 0 }}
                                                        animate={{ pathLength: 1 }}
                                                        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                                                    />
                                                    <circle cx={t.x1} cy={t.y1} r="4.5" className="h26-tether-dot" />
                                                    <circle cx={t.x2} cy={t.y2} r="4.5" className="h26-tether-dot" />
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    <div className="h26-match-col">
                                        {MATCH_LEFT.map(item => {
                                            const done = matchedIds.includes(item.id);
                                            const active = pickedEn === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    ref={el => {
                                                        enRefs.current[item.id] = el;
                                                    }}
                                                    type="button"
                                                    onClick={() => handlePickEn(item.id)}
                                                    className={`h26-match-chip ${active ? 'is-picked' : ''} ${done ? 'is-matched' : ''}`}
                                                >
                                                    <span>{item.en}</span>
                                                    {done && <Check size={16} aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="h26-match-col">
                                        {MATCH_RIGHT.map(item => {
                                            const done = matchedIds.includes(item.id);
                                            const missed = matchMissVi === item.id;
                                            return (
                                                <motion.button
                                                    key={item.id}
                                                    ref={el => {
                                                        viRefs.current[item.id] = el;
                                                    }}
                                                    type="button"
                                                    onClick={() => handlePickVi(item.id)}
                                                    animate={
                                                        missed && !prefersReduced
                                                            ? { x: [0, -7, 7, -4, 4, 0] }
                                                            : { x: 0 }
                                                    }
                                                    transition={{ duration: 0.3 }}
                                                    className={`h26-match-chip h26-match-chip--vi ${done ? 'is-matched' : ''} ${missed ? 'is-missed' : ''}`}
                                                >
                                                    {done && <Check size={16} aria-hidden="true" />}
                                                    <span>{item.vi}</span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {matchedIds.length === MATCH_LEFT.length && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMatchedIds([]);
                                                setPickedEn(null);
                                            }}
                                            className="h26-arcade-reset"
                                        >
                                            <RotateCcw size={14} aria-hidden="true" />
                                            <span>Ghép lại</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* MODE B: MINITEST WITH TIMER RING & +20 XP POP */}
                            {arcadeMode === 'minitest' && (
                                <div className="h26-minitest">
                                    <div className="h26-minitest-top">
                                        <div className="h26-timer-ring" aria-hidden="true">
                                            <svg viewBox="0 0 44 44">
                                                <circle cx="22" cy="22" r="18" className="h26-ring-bg" />
                                                <motion.circle
                                                    key={currentQ.id}
                                                    cx="22"
                                                    cy="22"
                                                    r="18"
                                                    className="h26-ring-fg"
                                                    initial={{ pathLength: 1 }}
                                                    animate={{ pathLength: qCorrect ? 1 : 0.15 }}
                                                    transition={{ duration: qCorrect ? 0.3 : 12, ease: 'linear' }}
                                                />
                                            </svg>
                                            <span>15s</span>
                                        </div>

                                        <div className="h26-minitest-word">
                                            <strong>{currentQ.prompt}</strong>
                                            <span>{currentQ.ipa}</span>
                                        </div>

                                        <AnimatePresence>
                                            {qCorrect && (
                                                <motion.span
                                                    key={xpPopKey}
                                                    initial={prefersReduced ? false : { opacity: 0, y: 12, scale: 0.7 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                                                    className="h26-xp-pop"
                                                >
                                                    +20 XP · Minh họa
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="h26-minitest-opts">
                                        {currentQ.options.map(opt => {
                                            const picked = qPicked === opt;
                                            const isRight = picked && opt === currentQ.answer;
                                            const isWrong = picked && opt !== currentQ.answer;
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => handlePickMinitest(opt)}
                                                    className={`h26-opt-btn ${isRight ? 'is-ok' : ''} ${isWrong ? 'is-missed' : ''}`}
                                                >
                                                    <span>{opt}</span>
                                                    {isRight && <Check size={16} aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {qCorrect && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQIdx(i => (i + 1) % MINITEST_QUESTIONS.length);
                                                setQPicked(null);
                                            }}
                                            className="h26-arcade-reset"
                                        >
                                            <span>Câu tiếp theo</span>
                                            <ArrowRight size={14} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* MODE C: SIGNATURE MOMENT #1 — THE SOUND BECOMES THE ANSWER */}
                            {arcadeMode === 'listen' && (
                                <div className="h26-listen-stage">
                                    <div className="h26-morph-box">
                                        <AnimatePresence mode="wait" initial={false}>
                                            {!listenSolved ? (
                                                <motion.button
                                                    key="wave-trigger"
                                                    type="button"
                                                    onClick={() => speak('journey')}
                                                    initial={prefersReduced ? false : { opacity: 0, scale: 0.92 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={prefersReduced ? undefined : { opacity: 0, scaleY: 0.08 }}
                                                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                                    className={`h26-sound-sculpture ${speakingWord === 'journey' ? 'is-speaking' : ''}`}
                                                    aria-label="Nghe từ mẫu"
                                                >
                                                    <Volume2 size={22} aria-hidden="true" />
                                                    <WaveBars active={speakingWord === 'journey'} large />
                                                </motion.button>
                                            ) : (
                                                <motion.div
                                                    key="word-revealed"
                                                    initial={prefersReduced ? false : { opacity: 0, scale: 0.82, y: 8 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                                                    className="h26-sound-answer"
                                                >
                                                    <strong>JOURNEY</strong>
                                                    <span>hành trình · /ˈdʒɜːni/</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="h26-minitest-opts">
                                        {LISTEN_OPTIONS.map(word => {
                                            const isRight = listenSolved && word === 'journey';
                                            const isMiss = listenMiss === word;
                                            return (
                                                <button
                                                    key={word}
                                                    type="button"
                                                    onClick={() => handlePickListen(word)}
                                                    className={`h26-opt-btn ${isRight ? 'is-ok' : ''} ${isMiss ? 'is-missed' : ''}`}
                                                >
                                                    <span>{word}</span>
                                                    {isRight && <Check size={16} aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {listenSolved && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setListenSolved(false);
                                                setListenMiss(null);
                                            }}
                                            className="h26-arcade-reset"
                                        >
                                            <RotateCcw size={14} aria-hidden="true" />
                                            <span>Nghe lại</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        </div>

                        {/* Lumo peeking sideways around the Match edge / vibing with headphones */}
                        <div
                            className={`h26-arcade-companion ${isSidePeeking ? 'is-peeking' : ''}`}
                            aria-hidden="true"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.img
                                    key={arcadeMascotSrc}
                                    src={arcadeMascotSrc}
                                    alt=""
                                    initial={
                                        prefersReduced
                                            ? false
                                            : isSidePeeking
                                              ? { opacity: 0, x: -24 }
                                              : { opacity: 0, scale: 0.88, y: 8 }
                                    }
                                    animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                                    exit={prefersReduced ? undefined : { opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                    className={`h26-arcade-mascot-img ${isSidePeeking ? 'is-peeking' : ''} ${speakingWord === 'journey' && arcadeMode === 'listen' ? 'is-vibing' : ''}`}
                                />
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                ACT 3 — SCULPTURE ON WOVEN TATAMI STUDY MAT
               ═══════════════════════════════════════════════════ */}
            <LayoutGroup id="h26-sm2-sculpture">
                <section
                    ref={setSlideRef(2)}
                    className="h26-sculpture h26-slide"
                    aria-labelledby="h26-sm2-heading"
                >
                    <div className="h26-tatami-heri" aria-hidden="true" />
                    <div className="h26-wrap h26-sculpture-inner">
                        <motion.div
                            className="h26-sculpture-top"
                            initial={prefersReduced ? false : { opacity: 0, y: 26 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={revealView}
                            transition={{ duration: 0.5, ease: revealEase }}
                        >
                            <div className="h26-h2-row">
                                <h2 id="h26-sm2-heading" className="h26-h2">
                                    Nhớ hay quên quyết định ngày gặp lại
                                </h2>
                                <span className="h26-h2-tag">Lịch ôn mẫu · SM-2</span>
                            </div>

                            {/* Interactive Recall Switch: hành trình -> reveal -> Quên rồi / Nhớ rõ */}
                            <div className="h26-recall-dock">
                                <button
                                    type="button"
                                    onClick={() => setReviewRevealed(r => !r)}
                                    className="h26-recall-card"
                                >
                                    <span className="h26-recall-vi">hành trình</span>
                                    <strong className={reviewRevealed ? 'is-shown' : ''}>
                                        {reviewRevealed ? 'journey' : 'Chạm hiện từ'}
                                    </strong>
                                </button>

                                <div className="h26-recall-btns" role="group" aria-label="Đánh giá mức nhớ">
                                    <button
                                        type="button"
                                        onClick={() => handleChooseReview('forgot')}
                                        className={`h26-rate-btn h26-rate-btn--forgot ${reviewChosen === 'forgot' ? 'is-active' : ''}`}
                                    >
                                        Quên rồi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleChooseReview('known')}
                                        className={`h26-rate-btn h26-rate-btn--known ${reviewChosen === 'known' ? 'is-active' : ''}`}
                                    >
                                        Nhớ rõ
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* Four Upright Architectural Monolith Slabs + Flying Peeking Lumo */}
                        <div ref={slabsStageRef} className="h26-slabs-stage">
                            {peekerPos && (
                                <motion.div
                                    className="h26-flying-peeker"
                                    aria-hidden="true"
                                    initial={prefersReduced ? false : { opacity: 0, y: peekerPos.y + 24, x: peekerPos.x }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={revealView}
                                    animate={{ x: peekerPos.x, y: peekerPos.y }}
                                    transition={
                                        prefersReduced
                                            ? { duration: 0 }
                                            : { duration: 0.62, ease: [0.22, 1, 0.36, 1] }
                                    }
                                >
                                    <motion.div
                                        key={flightState.key}
                                        initial={false}
                                        animate={
                                            flightState.key > 0 && !prefersReduced
                                                ? {
                                                      y: [0, -72, -32, 6, 0],
                                                      rotate: [
                                                          0,
                                                          flightState.dir * 16,
                                                          flightState.dir * 6,
                                                          -flightState.dir * 4,
                                                          0,
                                                      ],
                                                      scale: [1, 1.14, 1.06, 0.94, 1],
                                                  }
                                                : { y: 0, rotate: 0, scale: 1 }
                                        }
                                        transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
                                        className="h26-flying-peeker-inner"
                                    >
                                        <img
                                            src={
                                                flightState.airborne
                                                    ? flightState.dir === -1
                                                        ? '/mascot-lumo-oops.webp'
                                                        : '/mascot-lumo-happy.webp'
                                                    : '/mascot-lumo-peek-up.webp'
                                            }
                                            alt=""
                                            className={`h26-slab-peeker-img ${flightState.airborne ? 'is-airborne' : ''}`}
                                        />
                                    </motion.div>
                                </motion.div>
                            )}

                            <ol className="h26-slabs">
                                <motion.li
                                    ref={todaySlabRef}
                                    initial={prefersReduced ? false : { opacity: 0, y: 34 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={revealView}
                                    transition={{ duration: 0.48, delay: 0, ease: revealEase }}
                                    className={`h26-slab ${reviewSlot === 'today' ? 'is-lit' : ''}`}
                                >
                                    <span className="h26-slab-num">0d</span>
                                    <strong className="h26-slab-title">Hôm nay</strong>
                                    <span className="h26-slab-meta">Gặp lại cuối phiên</span>
                                    <div className="h26-slab-dock">
                                        {reviewSlot === 'today' && (
                                            <motion.div
                                                layoutId="h26-journey-tile"
                                                transition={springLayout}
                                                className="h26-slab-tile"
                                            >
                                                <strong>journey</strong>
                                                <span>/ˈdʒɜːni/</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.li>

                                <motion.li
                                    ref={tomorrowSlabRef}
                                    initial={prefersReduced ? false : { opacity: 0, y: 34 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={revealView}
                                    transition={{ duration: 0.48, delay: 0.08, ease: revealEase }}
                                    className={`h26-slab ${reviewSlot === 'tomorrow' ? 'is-lit' : ''}`}
                                >
                                    <span className="h26-slab-num">+1d</span>
                                    <strong className="h26-slab-title">Ngày mai</strong>
                                    <span className="h26-slab-meta">Ôn lần 1</span>
                                    <div className="h26-slab-dock">
                                        {reviewSlot === 'tomorrow' && (
                                            <motion.div
                                                layoutId="h26-journey-tile"
                                                transition={springLayout}
                                                className="h26-slab-tile"
                                            >
                                                <strong>journey</strong>
                                                <span>/ˈdʒɜːni/</span>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.li>

                                <motion.li
                                    initial={prefersReduced ? false : { opacity: 0, y: 34 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={revealView}
                                    transition={{ duration: 0.48, delay: 0.16, ease: revealEase }}
                                    className="h26-slab h26-slab--sample"
                                >
                                    <span className="h26-slab-num">+6d</span>
                                    <strong className="h26-slab-title">+6 ngày</strong>
                                    <span className="h26-slab-meta">Minh họa</span>
                                </motion.li>

                                <motion.li
                                    initial={prefersReduced ? false : { opacity: 0, y: 34 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={revealView}
                                    transition={{ duration: 0.48, delay: 0.24, ease: revealEase }}
                                    className="h26-slab h26-slab--sample"
                                >
                                    <span className="h26-slab-num">+21d</span>
                                    <strong className="h26-slab-title">+21 ngày</strong>
                                    <span className="h26-slab-meta">Minh họa</span>
                                </motion.li>
                            </ol>
                        </div>
                    </div>
                    <div className="h26-tatami-heri" aria-hidden="true" />
                </section>
            </LayoutGroup>

            {/* ═══════════════════════════════════════════════════
                ACT 4 — INDEX ON BULLET-JOURNAL DOT-GRID PAPER
               ═══════════════════════════════════════════════════ */}
            <section
                ref={setSlideRef(3)}
                className="h26-index h26-slide"
                aria-labelledby="h26-topics-heading"
            >
                <div className="h26-wrap">
                    <motion.div
                        className="h26-index-head"
                        initial={prefersReduced ? false : { opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={revealView}
                        transition={{ duration: 0.48, ease: revealEase }}
                    >
                        <div className="h26-h2-row">
                            <img
                                src="/mascot-lumo-reading.webp"
                                alt=""
                                aria-hidden="true"
                                width={66}
                                height={88}
                                className="h26-index-lumo"
                            />
                            <h2 id="h26-topics-heading" className="h26-h2">
                                7 chủ đề
                            </h2>
                            <span className="h26-h2-tag">A1–B1</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(PATHS.learning)}
                            className="h26-link-btn"
                        >
                            <span>Khám phá chủ đề</span>
                            <ArrowRight size={16} aria-hidden="true" />
                        </button>
                    </motion.div>

                    <motion.div
                        className="h26-index-grid"
                        initial={prefersReduced ? false : { opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={revealView}
                        transition={{ duration: 0.54, delay: 0.08, ease: revealEase }}
                    >
                        <div className="h26-topic-rail" role="tablist" aria-label="7 nhóm chủ đề">
                            {TOPICS.map(topic => {
                                const Icon = topic.icon;
                                const selected = topic.id === activeTopic.id;
                                return (
                                    <button
                                        key={topic.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        onClick={() => setTopicId(topic.id)}
                                        className={`h26-rail-item ${selected ? 'is-selected' : ''}`}
                                    >
                                        <span className="h26-rail-ico">
                                            <Icon size={17} aria-hidden="true" />
                                        </span>
                                        <span className="h26-rail-name">{topic.name}</span>
                                        <span className="h26-rail-num">{topic.num}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="h26-offset-cards" role="tabpanel">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTopic.id}
                                    initial={prefersReduced ? false : { opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={prefersReduced ? undefined : { opacity: 0 }}
                                    transition={{ duration: 0.14 }}
                                    className="h26-offset-stack"
                                >
                                    {activeTopic.samples.map((sample, i) => {
                                        const isSpeaking = speakingWord === sample.word;
                                        return (
                                            <motion.article
                                                key={sample.word}
                                                initial={
                                                    prefersReduced
                                                        ? false
                                                        : { opacity: 0, x: 24, rotateX: -14 }
                                                }
                                                animate={{ opacity: 1, x: 0, rotateX: 0 }}
                                                transition={{
                                                    duration: 0.34,
                                                    delay: prefersReduced ? 0 : i * 0.055,
                                                    ease: [0.16, 1, 0.3, 1],
                                                }}
                                                className={`h26-word-slab h26-word-slab--${i}`}
                                            >
                                                <div className="h26-word-slab-left">
                                                    <span className="h26-badge">{sample.cefr}</span>
                                                    <div>
                                                        <strong>{sample.word}</strong>
                                                        <span>{sample.ipa}</span>
                                                    </div>
                                                </div>

                                                <span className="h26-word-slab-vi">{sample.meaning}</span>

                                                {canSpeak && (
                                                    <button
                                                        type="button"
                                                        onClick={() => speak(sample.word)}
                                                        className={`h26-slab-audio ${isSpeaking ? 'is-speaking' : ''}`}
                                                        aria-label={`Nghe phát âm ${sample.word}`}
                                                    >
                                                        <Volume2 size={17} aria-hidden="true" />
                                                    </button>
                                                )}
                                            </motion.article>
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                ACT 5 — STUDY DESK HEATMAP + FRAME STUDIO
               ═══════════════════════════════════════════════════ */}
            <section
                ref={setSlideRef(4)}
                className="h26-portrait h26-slide"
                aria-labelledby="h26-progress-heading"
            >
                <div className="h26-wrap">
                    <div className="h26-progress-grid">
                        {/* Purple Activity Heatmap Dashboard Card */}
                        <motion.article
                            className="h26-heatmap-card"
                            aria-labelledby="h26-progress-heading"
                            initial={prefersReduced ? false : { opacity: 0, y: 32 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={revealView}
                            transition={{ duration: 0.52, ease: revealEase }}
                        >
                            <div className="h26-hm-top">
                                <div>
                                    <p className="h26-hm-label">Hôm nay cần ôn</p>
                                    <h2 id="h26-progress-heading" className="h26-hm-due">
                                        12 từ
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(PATHS.learning)}
                                    className="h26-hm-cta"
                                >
                                    Ôn ngay
                                </button>
                            </div>

                            <div className="h26-hm-mid">
                                <div
                                    className="h26-hm-grid"
                                    role="img"
                                    aria-label="Bản đồ nhiệt tần suất ôn tập theo ngày"
                                    onMouseLeave={() => setHoveredCell(null)}
                                >
                                    {HEATMAP_CELLS.map(cell => (
                                        <span
                                            key={cell.id}
                                            onMouseEnter={() => setHoveredCell(cell.id)}
                                            className={`h26-hm-cell h26-hm-cell--${cell.level} ${hoveredCell === cell.id ? 'is-hot' : ''}`}
                                        />
                                    ))}
                                </div>

                                <div className="h26-hm-streak-row">
                                    <span className="h26-hm-streak">
                                        <Flame size={17} aria-hidden="true" />
                                        <strong>12 ngày</strong>
                                        <span>liên tiếp</span>
                                    </span>
                                    <span className="h26-hm-inspect" aria-live="polite">
                                        {activeCell
                                            ? activeCell.words > 0
                                                ? `${activeCell.words} từ đã ôn`
                                                : 'Ngày nghỉ'
                                            : '24 tuần gần đây'}
                                    </span>
                                </div>
                            </div>

                            <div className="h26-hm-stats">
                                <div className="h26-hm-stat">
                                    <span className="h26-hm-stat-label">Cấp độ</span>
                                    <strong>Cấp 7</strong>
                                    <div className="h26-hm-bar" aria-hidden="true">
                                        <span style={{ transform: `scaleX(${Math.min(1, demoXp / 1000)})` }} />
                                    </div>
                                    <small className="tabular-nums">{demoXp.toLocaleString('vi-VN')} / 1.000 XP</small>
                                </div>

                                <div className="h26-hm-stat">
                                    <span className="h26-hm-stat-label">Đã thành thạo</span>
                                    <strong>86 từ</strong>
                                    <small>trên 214 từ đã học</small>
                                </div>

                                <div className="h26-hm-stat">
                                    <span className="h26-hm-stat-label">Ngày mai</span>
                                    <strong>8 từ</strong>
                                    <small>41 từ trong 7 ngày tới</small>
                                </div>
                            </div>
                        </motion.article>

                        {/* Oversized Interactive Avatar + Real Profile Frames */}
                        <motion.div
                            className="h26-identity-stage"
                            initial={prefersReduced ? false : { opacity: 0, y: 32 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={revealView}
                            transition={{ duration: 0.52, delay: 0.1, ease: revealEase }}
                        >
                            <h2 id="h26-rewards-heading" className="h26-h2">
                                Giữ chuỗi, mở khung
                            </h2>

                            <div className="h26-avatar-theater">
                                <div className="h26-avatar-frame-wrap">
                                    <AnimatePresence mode="wait">
                                        <motion.img
                                            key={activeAvatar.id}
                                            src={activeAvatar.src}
                                            alt={activeAvatar.label}
                                            width={146}
                                            height={146}
                                            initial={prefersReduced ? false : { opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={prefersReduced ? undefined : { opacity: 0, scale: 0.94 }}
                                            transition={{ duration: 0.2, ease: revealEase }}
                                            className="h26-avatar-img"
                                        />
                                    </AnimatePresence>
                                    <AnimatePresence mode="wait">
                                        <motion.img
                                            key={activeFrame.key}
                                            src={activeFrame.img}
                                            alt=""
                                            aria-hidden="true"
                                            width={216}
                                            height={216}
                                            initial={
                                                prefersReduced
                                                    ? false
                                                    : { opacity: 0, scale: 0.78, rotate: -14 }
                                            }
                                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                            exit={
                                                prefersReduced
                                                    ? undefined
                                                    : { opacity: 0, scale: 1.08, rotate: 10 }
                                            }
                                            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                                            className="h26-frame-overlay"
                                        />
                                    </AnimatePresence>
                                </div>

                                <div className="h26-avatar-strip" role="group" aria-label="Chọn ảnh đại diện 2D">
                                    {SHOWCASE_AVATARS.map((av, idx) => (
                                        <Fragment key={av.id}>
                                            {idx === 5 && (
                                                <span className="h26-avatar-divider" aria-hidden="true" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setAvatarIdx(idx)}
                                                className={`h26-avatar-thumb ${idx === avatarIdx ? 'is-active' : ''}`}
                                                aria-pressed={idx === avatarIdx}
                                                aria-label={av.label}
                                                title={av.label}
                                            >
                                                <img
                                                    src={av.src}
                                                    alt=""
                                                    width={30}
                                                    height={30}
                                                    loading="lazy"
                                                />
                                            </button>
                                        </Fragment>
                                    ))}
                                </div>
                                <p className="h26-avatar-caption" aria-live="polite">
                                    {activeAvatar.label}
                                </p>

                                <div className="h26-stats-strip">
                                    <div className="h26-stat-pill h26-stat-pill--flame">
                                        <Flame size={17} aria-hidden="true" />
                                        <strong>12 ngày</strong>
                                    </div>
                                    <div className="h26-stat-pill">
                                        <Sparkles size={16} aria-hidden="true" />
                                        <strong className="tabular-nums">{demoXp.toLocaleString('vi-VN')} XP</strong>
                                        <AnimatePresence>
                                            {xpBurstKey > 0 && (
                                                <motion.span
                                                    key={xpBurstKey}
                                                    initial={{ opacity: 1, y: 0 }}
                                                    animate={{ opacity: 0, y: -26 }}
                                                    transition={{ duration: 0.65 }}
                                                    className="h26-xp-float"
                                                    aria-hidden="true"
                                                >
                                                    +25 XP
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="h26-streak-dots" aria-label="Chuỗi 7 ngày trong tuần">
                                    {STREAK_DAYS.map(d => (
                                        <span key={d} className="h26-streak-day">
                                            <span className="h26-streak-dot" />
                                            <small>{d}</small>
                                        </span>
                                    ))}
                                </div>

                                <div className="h26-frame-pills" role="group" aria-label="Thử khung hồ sơ">
                                    {PROFILE_FRAMES.map((f, idx) => (
                                        <button
                                            key={f.key}
                                            type="button"
                                            onClick={() => handleSelectFrame(idx)}
                                            className={`h26-frame-btn ${idx === frameIdx ? 'is-active' : ''}`}
                                            aria-pressed={idx === frameIdx}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                ACT 6 — FULL-SCREEN DEEP-PLUM FINALE STAGE
               ═══════════════════════════════════════════════════ */}
            <section
                ref={setSlideRef(5)}
                className="h26-finale-section h26-slide"
                aria-label="Bắt đầu học cùng Lumo"
            >
                <div className="h26-wrap">
                    {/* Deep-Plum Full-Width Closing Portal with Cheering Lumo */}
                    <motion.div
                        className="h26-finale h26-finale--wide"
                        initial={prefersReduced ? false : { opacity: 0, y: 30, scale: 0.985 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={revealView}
                        transition={{ duration: 0.54, ease: revealEase }}
                    >
                        <div className="h26-finale-copy">
                            <h2 className="h26-finale-title">
                                Mỗi ngày vài phút. Nhớ lâu thật sự.
                            </h2>
                            <div className="h26-finale-actions">
                                <button
                                    type="button"
                                    onClick={() => navigate(signedIn ? PATHS.dashboard : PATHS.register)}
                                    className="h26-finale-btn"
                                >
                                    <span>{signedIn ? 'Vào học ngay' : 'Bắt đầu học'}</span>
                                    <ArrowRight size={18} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(PATHS.vocabulary)}
                                    className="h26-finale-link"
                                >
                                    Kho từ vựng
                                </button>
                            </div>
                        </div>

                        <div className="h26-finale-lumo" aria-hidden="true">
                            <img
                                src="/mascot-lumo-cool.webp"
                                alt=""
                                width={172}
                                height={194}
                                className="h26-finale-mascot-img"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default Home;
