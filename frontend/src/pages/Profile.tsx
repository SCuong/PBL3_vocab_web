import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    BookOpen,
    Flame,
    Award,
    Clock,
    Pencil,
    Settings,
    StickyNote,
    KeyRound,
    Trash2,
    ChevronRight,
    LogOut,
    Search,
    Check,
    Lock,
    Play,
    Trophy,
    ShieldCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { StreakHeatmap } from '../components/learning/streak';
import { DeleteAccountModal } from '../components/account';
import EditProfileModal from '../components/profile/EditProfileModal';
import ChangePasswordModal from '../components/profile/ChangePasswordModal';
import { type AuthenticatedUser } from '../services/authApi';
import { stickyNotesApi, type StickyNoteItem } from '../services/stickyNotesApi';
import { vocabularyApi, type VocabularyListItem } from '../services/vocabularyApi';
import { dashboardApi, type LearnerDashboard as LearnerDashboardData } from '../services/dashboardApi';
import { loadProfilePreferences } from '../utils/profilePreferences';
import { normalizeAvatarUrl } from '../utils/avatarPresets';
import { clearAvatarHeroOrigin, peekAvatarHeroOrigin } from '../utils/avatarHeroTransition';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { useAppContext } from '../context/AppContext';
import { PROFILE_FRAMES } from '../utils/profileFrames';
import { ProfileFrameOverlay } from '../components/profile/ProfileFrameOverlay';
import { PATHS } from '../routes/paths';

const format2Digits = (value: number) => (value < 10 ? `0${value}` : String(value));

const DEFAULT_TAGLINE = 'Học từ vựng mỗi ngày — tiến bộ từng bước.';
const FALLBACK_JOINED_DATE = '15/05/2026';
const CEFR_OPTIONS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type CefrFilter = typeof CEFR_OPTIONS[number];

const formatDateVN = (iso: string) => {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDuration = (totalSeconds: number) => {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return null;
    const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes} phút`;
    return `${hours} giờ ${format2Digits(minutes)} phút`;
};

const computeLevelInfo = (xp: number) => {
    const safeXp = Math.max(0, Math.floor(xp || 0));
    const level = Math.max(1, Math.floor(safeXp / 100) + 1);
    const nextLevelXp = level * 100;
    return { level, currentXp: safeXp, nextLevelXp };
};

const Profile = () => {
    const {
        currentUser,
        gameData,
        learnedWordIds,
        handleLogout,
        addToast: onAddToast,
        handleUserUpdated: onUserUpdated,
        learnerAnalytics,
        profileFrameKey,
        setProfileFrame,
    } = useAppContext();
    const navigate = useNavigate();

    const user = {
        ...currentUser!,
        ...gameData,
        learnedWords: Array.isArray(learnedWordIds) ? learnedWordIds.length : (gameData?.learnedWords ?? 0),
    };

    const onLogout = async () => { await handleLogout(); navigate(PATHS.home); };

    const [isEditing, setIsEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [learnedWordsList, setLearnedWordsList] = useState<VocabularyListItem[]>([]);
    const [isLoadingLearnedWords, setIsLoadingLearnedWords] = useState(false);
    const [selectedStudyDate, setSelectedStudyDate] = useState<string | null>(null);
    const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
    const [isLoadingStickyNotes, setIsLoadingStickyNotes] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [tagline, setTagline] = useState<string>(DEFAULT_TAGLINE);
    const [isTaglineModalOpen, setIsTaglineModalOpen] = useState(false);
    const [taglineDraft, setTaglineDraft] = useState<string>(DEFAULT_TAGLINE);
    const [vocabSearch, setVocabSearch] = useState('');
    const [vocabCefr, setVocabCefr] = useState<CefrFilter>('ALL');
    const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
    const [dashboard, setDashboard] = useState<LearnerDashboardData | null>(null);
    const heroAvatarRef = useRef<HTMLDivElement | null>(null);
    const heroHaloRef = useRef<HTMLSpanElement | null>(null);
    const heroIdentityRef = useRef<HTMLDivElement | null>(null);
    const heroStatsRef = useRef<HTMLDivElement | null>(null);
    const lowerSectionsRef = useRef<HTMLDivElement | null>(null);

    // Choreographed shared-element curved FLIP morph from the navbar avatar into the Profile stage.
    useLayoutEffect(() => {
        const el = heroAvatarRef.current;
        if (!el || typeof window === 'undefined') return;
        const origin = peekAvatarHeroOrigin();
        if (!origin) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            clearAvatarHeroOrigin();
            return;
        }

        if (window.scrollY > 0) {
            window.scrollTo(0, 0);
        }

        const target = el.getBoundingClientRect();
        if (target.width <= 0 || target.height <= 0) return;

        const dx = origin.left + origin.width / 2 - (target.left + target.width / 2);
        const dy = origin.top + origin.height / 2 - (target.top + target.height / 2);
        const startScale = Math.max(0.25, Math.min(1, origin.width / target.width));

        // Quadratic Bézier arc control point (sweeps gently upward/outward instead of a stiff straight line).
        const cpX = dx * 0.48;
        const cpY = Math.min(dy, 0) - 54;
        const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
        const flightSamples = 14;
        const flightKeyframes: Keyframe[] = [];

        for (let i = 0; i <= flightSamples; i++) {
            const linearT = i / flightSamples;
            // Landing happens at 0.78 of total duration; remaining 22% is a crisp spring settle.
            const offset = linearT * 0.78;
            const p = easeOutQuint(linearT);
            const inv = 1 - p;
            const x = inv * inv * dx + 2 * inv * p * cpX;
            const y = inv * inv * dy + 2 * inv * p * cpY;
            // Scale blossoms smoothly and overshoots slightly (1.07x) on touchdown.
            const scale = startScale + (1.07 - startScale) * p;
            // Subtle aerodynamic tilt peaking mid-arc.
            const tilt = Math.sin(linearT * Math.PI) * -5.5;
            // Dynamic elevation shadow peaks mid-flight.
            const shadowAlpha = (0.14 + Math.sin(linearT * Math.PI) * 0.24).toFixed(2);
            const shadowBlur = Math.round(10 + Math.sin(linearT * Math.PI) * 22);
            const shadowY = Math.round(6 + Math.sin(linearT * Math.PI) * 16);

            flightKeyframes.push({
                offset,
                transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)}) rotate(${tilt.toFixed(2)}deg)`,
                filter: `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(104, 61, 211, ${shadowAlpha}))`,
            });
        }

        // Elastic settle after touchdown.
        flightKeyframes.push(
            {
                offset: 0.9,
                transform: 'translate3d(0, 0, 0) scale(0.985) rotate(0.8deg)',
                filter: 'drop-shadow(0 6px 14px rgba(104, 61, 211, 0.12))',
            },
            {
                offset: 1,
                transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
                filter: 'drop-shadow(0 0 0 rgba(104, 61, 211, 0))',
            }
        );

        el.style.zIndex = '60';
        el.style.willChange = 'transform, filter';

        const animations: Animation[] = [];

        const heroAnim = el.animate(flightKeyframes, {
            duration: 720,
            easing: 'linear',
            fill: 'none',
        });
        animations.push(heroAnim);

        // Navbar avatar socket launch + smooth return after touchdown.
        if (origin.originElement && origin.originElement.isConnected) {
            animations.push(
                origin.originElement.animate(
                    [
                        { opacity: 0.12, transform: 'scale(0.7)', offset: 0 },
                        { opacity: 0.12, transform: 'scale(0.75)', offset: 0.65 },
                        { opacity: 1, transform: 'scale(1.06)', offset: 0.88 },
                        { opacity: 1, transform: 'scale(1)', offset: 1 },
                    ],
                    { duration: 680, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
                )
            );
        }

        // Subtle landing halo ripple right as the avatar touches down.
        if (heroHaloRef.current) {
            animations.push(
                heroHaloRef.current.animate(
                    [
                        { opacity: 0, transform: 'scale(0.82)' },
                        { opacity: 0.65, transform: 'scale(1.08)', offset: 0.32 },
                        { opacity: 0, transform: 'scale(1.48)' },
                    ],
                    {
                        delay: 470,
                        duration: 480,
                        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                        fill: 'none',
                    }
                )
            );
        }

        // Choreographed stage reveals so the flying avatar leads the eye.
        if (heroIdentityRef.current) {
            animations.push(
                heroIdentityRef.current.animate(
                    [
                        { opacity: 0, transform: 'translate3d(-16px, 0, 0)' },
                        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                    ],
                    {
                        delay: 200,
                        duration: 420,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        fill: 'backwards',
                    }
                )
            );
        }

        if (heroStatsRef.current) {
            animations.push(
                heroStatsRef.current.animate(
                    [
                        { opacity: 0, transform: 'translate3d(0, 12px, 0)' },
                        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                    ],
                    {
                        delay: 270,
                        duration: 420,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        fill: 'backwards',
                    }
                )
            );
        }

        if (lowerSectionsRef.current) {
            animations.push(
                lowerSectionsRef.current.animate(
                    [
                        { opacity: 0, transform: 'translate3d(0, 18px, 0)' },
                        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                    ],
                    {
                        delay: 310,
                        duration: 460,
                        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                        fill: 'backwards',
                    }
                )
            );
        }

        const cleanup = () => {
            el.style.zIndex = '';
            el.style.willChange = '';
        };
        heroAnim.onfinish = () => {
            clearAvatarHeroOrigin();
            cleanup();
        };

        return () => {
            animations.forEach((a) => a.cancel());
            cleanup();
        };
    }, []);

    // Streak / XP / learning history come from backend analytics (same source as
    // the Dashboard), not local game data. Local values remain a fallback.
    useEffect(() => {
        if (!currentUser?.userId) {
            setDashboard(null);
            return;
        }
        let cancelled = false;
        dashboardApi.getLearnerDashboard()
            .then((data) => { if (!cancelled) setDashboard(data); })
            .catch(() => { if (!cancelled) setDashboard(null); });
        return () => { cancelled = true; };
    }, [currentUser?.userId]);

    useEffect(() => {
        if (!user?.userId) {
            setAvatarUrl(undefined);
            return;
        }

        const preferences = loadProfilePreferences(user.userId);
        setAvatarUrl(normalizeAvatarUrl(preferences.avatarUrl));
    }, [user?.userId]);

    // Tagline is local-only for now (no backend field). Persist per user via localStorage.
    useEffect(() => {
        if (!user?.userId) {
            setTagline(DEFAULT_TAGLINE);
            return;
        }
        try {
            const stored = window.localStorage.getItem(`profile_tagline_${user.userId}`);
            setTagline(stored && stored.trim() ? stored : DEFAULT_TAGLINE);
        } catch {
            setTagline(DEFAULT_TAGLINE);
        }
    }, [user?.userId]);

    // Selected frame lives in AppContext (local-only, shared with Navbar/Leaderboard).
    // Unlock state is derived from the dashboard badges (never faked).
    const frameUnlockedMap = useMemo(() => {
        const map = new Map<string, boolean>();
        (learnerAnalytics?.badges ?? []).forEach((badge) => map.set(badge.key, Boolean(badge.unlocked)));
        return map;
    }, [learnerAnalytics]);
    const isFrameUnlocked = (key: string) => frameUnlockedMap.get(key) === true;
    // If the saved frame isn't unlocked, fall back to no frame.
    const effectiveFrameKey = profileFrameKey && isFrameUnlocked(profileFrameKey) ? profileFrameKey : null;
    const frameOptions = PROFILE_FRAMES.map((frame) => ({ ...frame, unlocked: isFrameUnlocked(frame.key) }));

    const handleProfileSaved = (updatedUser: AuthenticatedUser, nextAvatarUrl: string | undefined) => {
        setAvatarUrl(nextAvatarUrl);
        onUserUpdated(updatedUser);
    };

    const initials = useMemo(() => {
        const source = (user.username || '').trim();
        if (!source) return 'U';
        return source[0].toUpperCase();
    }, [user.username]);

    const learnedWords = useMemo(
        () => (Array.isArray(learnedWordsList) ? learnedWordsList : [])
            .filter(item => item?.word)
            .sort((a, b) => String(a.word || '').localeCompare(String(b.word || ''))),
        [learnedWordsList]
    );

    useEffect(() => {
        const normalizedIds = Array.isArray(learnedWordIds)
            ? learnedWordIds.filter((id): id is number => Number.isFinite(id) && id > 0)
            : [];

        if (normalizedIds.length === 0) {
            setLearnedWordsList([]);
            return;
        }

        let isDisposed = false;
        const loadLearnedWords = async () => {
            setIsLoadingLearnedWords(true);
            try {
                const items = await vocabularyApi.getByIds(normalizedIds);
                if (!isDisposed) setLearnedWordsList(items);
            } catch (error: any) {
                if (!isDisposed) {
                    setLearnedWordsList([]);
                    onAddToast?.(error?.message || 'Không thể tải danh sách từ đã học.', 'info');
                }
            } finally {
                if (!isDisposed) setIsLoadingLearnedWords(false);
            }
        };

        void loadLearnedWords();
        return () => { isDisposed = true; };
    }, [learnedWordIds, onAddToast]);

    useEffect(() => {
        if (!currentUser?.userId) {
            setStickyNotes([]);
            return;
        }

        let isDisposed = false;
        const loadStickyNotes = async () => {
            setIsLoadingStickyNotes(true);
            try {
                const items = await stickyNotesApi.getAll();
                if (!isDisposed) setStickyNotes(items);
            } catch (error: any) {
                if (!isDisposed) {
                    setStickyNotes([]);
                    onAddToast?.(error?.message || 'Không thể tải danh sách ghi chú.', 'info');
                }
            } finally {
                if (!isDisposed) setIsLoadingStickyNotes(false);
            }
        };

        void loadStickyNotes();
        return () => { isDisposed = true; };
    }, [currentUser?.userId, onAddToast]);

    const studyHistory = useMemo(
        () => (Array.isArray(user.studyHistory) ? user.studyHistory : [])
            .filter((day: unknown): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)),
        [user.studyHistory]
    );

    const studyHistoryDetails = useMemo(
        () => (user?.studyHistoryDetails && typeof user.studyHistoryDetails === 'object')
            ? user.studyHistoryDetails
            : {},
        [user?.studyHistoryDetails]
    );

    const backendActivityDates = useMemo(() => {
        if (!dashboard) return null;
        return dashboard.heatmap
            .filter((day) => day.wordsStudied > 0)
            .map((day) => day.date.slice(0, 10))
            .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));
    }, [dashboard]);

    const studyHistoryDates = useMemo(() => {
        if (backendActivityDates && backendActivityDates.length > 0) {
            return Array.from(new Set(backendActivityDates)).sort((a, b) => a.localeCompare(b));
        }
        const detailDates = Object.keys(studyHistoryDetails)
            .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));
        return Array.from(new Set([...studyHistory, ...detailDates])).sort((a, b) => a.localeCompare(b));
    }, [backendActivityDates, studyHistory, studyHistoryDetails]);

    useEffect(() => {
        if (studyHistoryDates.length === 0) {
            setSelectedStudyDate(null);
            return;
        }
        const latestDate = studyHistoryDates[studyHistoryDates.length - 1] ?? null;
        setSelectedStudyDate(latestDate);
    }, [studyHistoryDates]);

    const sortedStickyNotes = useMemo(
        () => [...stickyNotes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
        [stickyNotes],
    );

    const getNoteColorClass = (color: StickyNoteItem['color']) => {
        switch (color) {
            case 'blue':
                return 'bg-[var(--sticky-note-blue-bg)] border-[var(--sticky-note-blue-border)]';
            case 'green':
                return 'bg-[var(--sticky-note-green-bg)] border-[var(--sticky-note-green-border)]';
            case 'pink':
                return 'bg-[var(--sticky-note-pink-bg)] border-[var(--sticky-note-pink-border)]';
            case 'purple':
                return 'bg-[var(--sticky-note-purple-bg)] border-[var(--sticky-note-purple-border)]';
            default:
                return 'bg-[var(--sticky-note-yellow-bg)] border-[var(--sticky-note-yellow-border)]';
        }
    };

    const accountCreatedDate = useMemo(() => {
        if (!user?.createdAt || typeof user.createdAt !== 'string') return null;
        const datePart = user.createdAt.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
        const parsed = new Date(user.createdAt);
        if (Number.isNaN(parsed.getTime())) return null;
        const year = parsed.getFullYear();
        const month = format2Digits(parsed.getMonth() + 1);
        const day = format2Digits(parsed.getDate());
        return `${year}-${month}-${day}`;
    }, [user?.createdAt]);

    const joinedDateLabel = useMemo(() => {
        return accountCreatedDate ? formatDateVN(accountCreatedDate) : FALLBACK_JOINED_DATE;
    }, [accountCreatedDate]);

    // Total learning time from per-session timeSpentSeconds, falling back to backend session activity.
    const totalTimeLabel = useMemo(() => {
        let localSeconds = 0;
        for (const day of Object.values(studyHistoryDetails) as any[]) {
            if (!day || !Array.isArray(day.sessions)) continue;
            for (const session of day.sessions) {
                const seconds = Number(session?.timeSpentSeconds);
                if (Number.isFinite(seconds) && seconds > 0) {
                    localSeconds += seconds;
                }
            }
        }
        let backendSeconds = 0;
        if (dashboard?.recentActivity?.length) {
            const studiedWords = dashboard.recentActivity.reduce(
                (sum, item) => sum + Math.max(1, Number(item.wordsStudied ?? 0)),
                0,
            );
            backendSeconds = Math.max(60, studiedWords * 12);
        }
        return formatDuration(Math.max(localSeconds, backendSeconds));
    }, [studyHistoryDetails, dashboard?.recentActivity]);

    // Prefer backend analytics for streak / XP / learned count; fall back to local.
    const streakValue = dashboard?.streak ?? Number(user.streak || 0);
    const xpValue = dashboard?.xp.totalXp ?? Number(user.xp || 0);
    const learnedCount = dashboard?.masteryProgress.learnedWords ?? (user.learnedWords || 0);
    const levelInfo = useMemo(() => {
        if (dashboard) {
            return {
                level: dashboard.xp.level,
                currentXp: dashboard.xp.currentLevelXp,
                nextLevelXp: dashboard.xp.nextLevelXp,
            };
        }
        return computeLevelInfo(Number(user.xp || 0));
    }, [dashboard, user.xp]);

    // Map vocabId -> first study date for the "THUỘC LÚC" notebook column.
    const learnedAtMap = useMemo(() => {
        const map = new Map<number, string>();
        const dates = Object.keys(studyHistoryDetails).sort((a, b) => a.localeCompare(b));
        for (const date of dates) {
            const day = (studyHistoryDetails as any)[date];
            if (!day || !Array.isArray(day.sessions)) continue;
            for (const session of day.sessions) {
                if (!session || !Array.isArray(session.words)) continue;
                for (const word of session.words) {
                    const id = Number(word?.id);
                    if (Number.isFinite(id) && id > 0 && !map.has(id)) {
                        map.set(id, date);
                    }
                }
            }
        }
        return map;
    }, [studyHistoryDetails]);

    const stats = [
        {
            key: 'mastered',
            label: 'Đã thuộc',
            value: learnedCount.toLocaleString('vi-VN'),
            subtext: 'từ vựng',
            icon: <BookOpen size={16} />,
            accent: 'text-primary',
        },
        {
            key: 'streak',
            label: 'Chuỗi',
            value: streakValue.toLocaleString('vi-VN'),
            subtext: 'ngày',
            icon: <Flame size={16} />,
            accent: 'text-orange-500',
        },
        {
            key: 'xp',
            label: 'XP tổng',
            value: xpValue.toLocaleString('vi-VN'),
            subtext: `cấp ${levelInfo.level} · ${levelInfo.currentXp.toLocaleString('vi-VN')}/${levelInfo.nextLevelXp.toLocaleString('vi-VN')}`,
            icon: <Award size={16} />,
            accent: 'text-pink',
        },
        {
            key: 'time',
            label: 'Thời gian',
            value: totalTimeLabel ?? '—',
            subtext: `kể từ ${joinedDateLabel}`,
            icon: <Clock size={16} />,
            accent: 'text-secondary',
        },
    ];

    // Filtered notebook view of learned vocabulary.
    const notebookRows = useMemo(() => {
        const query = vocabSearch.trim().toLowerCase();
        return learnedWords.filter((item) => {
            if (vocabCefr !== 'ALL' && (item.cefr || '').toUpperCase() !== vocabCefr) return false;
            if (!query) return true;
            const haystack = [item.word, item.ipa, item.meaning]
                .filter(Boolean)
                .map((v) => String(v).toLowerCase())
                .join(' ');
            return haystack.includes(query);
        });
    }, [learnedWords, vocabSearch, vocabCefr]);

    // Build descending list of study-history detail entries for the "Xem chi tiết" inline view.
    const historyDetailEntries = useMemo(() => {
        if (dashboard) {
            const byDate = new Map<string, { totalWords: number; totalXp: number; topics: Set<string> }>();
            // recentActivity carries topic names + per-session words.
            for (const activity of dashboard.recentActivity) {
                const date = activity.date.slice(0, 10);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
                const current = byDate.get(date) ?? { totalWords: 0, totalXp: 0, topics: new Set<string>() };
                current.totalWords += activity.wordsStudied;
                current.totalXp += activity.wordsStudied * 10; // XP rule: 10 per word
                if (activity.topicName?.trim()) current.topics.add(activity.topicName);
                byDate.set(date, current);
            }
            // Fill any heatmap day not covered by the (capped) recentActivity list.
            for (const day of dashboard.heatmap) {
                if (day.wordsStudied <= 0) continue;
                const date = day.date.slice(0, 10);
                if (!byDate.has(date)) {
                    byDate.set(date, { totalWords: day.wordsStudied, totalXp: day.wordsStudied * 10, topics: new Set<string>() });
                }
            }
            return Array.from(byDate.entries())
                .map(([date, value]) => ({
                    date,
                    totalWords: value.totalWords,
                    totalXp: value.totalXp,
                    topicTitles: Array.from(value.topics),
                }))
                .sort((a, b) => b.date.localeCompare(a.date));
        }
        const entries: { date: string; totalWords: number; totalXp: number; topicTitles: string[] }[] = [];
        for (const date of studyHistoryDates) {
            const day = (studyHistoryDetails as any)[date];
            if (!day) continue;
            entries.push({
                date,
                totalWords: Number(day.totalWords ?? 0),
                totalXp: Number(day.totalXp ?? 0),
                topicTitles: Array.isArray(day.topicTitles) ? day.topicTitles.filter(Boolean) : [],
            });
        }
        return entries.sort((a, b) => b.date.localeCompare(a.date));
    }, [dashboard, studyHistoryDates, studyHistoryDetails]);

    const formatHistoryDateLong = (iso: string) => {
        const parsed = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return iso;
        return parsed.toLocaleDateString('vi-VN', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
        });
    };

    const openTaglineEditor = () => {
        setTaglineDraft(tagline);
        setIsTaglineModalOpen(true);
    };

    const saveTagline = () => {
        const trimmed = taglineDraft.trim();
        const next = trimmed.length > 0 ? trimmed : DEFAULT_TAGLINE;
        setTagline(next);
        if (user?.userId) {
            try { window.localStorage.setItem(`profile_tagline_${user.userId}`, next); } catch {}
        }
        setIsTaglineModalOpen(false);
        onAddToast?.('Đã cập nhật giới thiệu.', 'success');
    };

    return (
        <div className="min-h-screen w-full bg-bg-light text-text-primary">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-5 sm:px-6 sm:py-10 sm:space-y-6">

                {/* ── Profile header card ─────────────────────────────── */}
                <section className="profile-card p-4 sm:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex items-start gap-4 sm:gap-6 min-w-0">
                            <div ref={heroAvatarRef} className="relative shrink-0">
                                <span
                                    ref={heroHaloRef}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-primary/55 opacity-0 shadow-[0_0_24px_rgba(124,58,237,0.35)]"
                                />
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-primary flex items-center justify-center text-2xl sm:text-4xl font-bold text-text-on-accent">
                                        {initials}
                                    </div>
                                )}
                                <ProfileFrameOverlay frameKey={effectiveFrameKey} />
                            </div>
                            <div ref={heroIdentityRef} className="min-w-0">
                                <h1 className="truncate text-2xl font-bold leading-tight tracking-[-0.02em] text-text-primary sm:text-3xl">
                                    {user.username || 'Người học'}
                                </h1>
                                <p className="text-sm text-text-muted mt-1 truncate">
                                    {user.email || 'Chưa có email'}
                                </p>
                                <p className="text-sm text-text-secondary mt-3 max-w-xl">
                                    {tagline}
                                </p>
                            </div>
                        </div>
                        <div className="flex w-full items-center gap-2 shrink-0 md:w-auto">
                            <Button
                                variant="primary"
                                className="flex-1 md:flex-none"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil size={16} /> Chỉnh sửa hồ sơ
                            </Button>
                            <AstryxButton
                                variant="secondary"
                                size="lg"
                                isIconOnly
                                icon={<Settings size={18} aria-hidden />}
                                label="Chỉnh sửa giới thiệu"
                                tooltip="Chỉnh sửa giới thiệu"
                                onClick={openTaglineEditor}
                            />
                        </div>
                    </div>

                    {/* ── Inline stats row with vertical dividers ─────────── */}
                    <div
                        ref={heroStatsRef}
                        className="mt-7 pt-6 border-t border-border grid grid-cols-2 md:grid-cols-4 md:divide-x divide-border gap-y-5"
                    >
                        {stats.map((s) => (
                            <div key={s.key} className="flex flex-col items-start text-left px-2 sm:px-4 md:px-5">
                                <div className={`flex items-center gap-1.5 ${s.accent}`}>
                                    {s.icon}
                                    <span className="text-sm font-medium text-text-muted">
                                        {s.label}
                                    </span>
                                </div>
                                <div className="mt-2 text-2xl font-bold leading-none tracking-[-0.02em] tabular-nums text-text-primary md:text-[28px]">
                                    {s.value}
                                </div>
                                {s.subtext && (
                                    <div className="mt-1.5 max-w-full truncate text-xs text-text-muted">
                                        {s.subtext}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Progress Analytics & Badges (moved from Dashboard) ── */}
                <div ref={lowerSectionsRef} className="space-y-5 sm:space-y-6">
                {(() => {
                    const mastery = dashboard?.masteryProgress;
                    const totalWords = mastery?.totalWords ?? 0;
                    const learnedCount = mastery?.learnedWords ?? user.learnedWords ?? 0;
                    const masteredCount = mastery?.masteredWords ?? 0;
                    const reviewCount = mastery?.reviewWords ?? 0;
                    const learningCount = Math.max(0, learnedCount - masteredCount);
                    const lv1 = Math.max(0, reviewCount);
                    const lv2 = Math.max(0, Math.ceil(Math.max(0, learningCount - lv1) * 0.6));
                    const lv3 = Math.max(0, Math.max(0, learningCount - lv1) - lv2);
                    const lv4 = Math.max(0, Math.floor(masteredCount * 0.4));
                    const lv5 = Math.max(0, masteredCount - lv4);
                    const bars = [
                        { label: 'Mới nạp', count: lv1, cls: 'bg-[#C4B5FD]' },
                        { label: 'Nhớ sơ', count: lv2, cls: 'bg-[#A78BFA]' },
                        { label: 'Đang lớn', count: lv3, cls: 'bg-[#8B5CF6]' },
                        { label: 'Vững', count: lv4, cls: 'bg-primary' },
                        { label: 'Thạo', count: lv5, cls: 'bg-success-color' },
                    ];
                    const maxBar = Math.max(3, ...bars.map(b => b.count));
                    const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
                    const todayDow = (new Date().getDay() + 6) % 7;
                    const todayIso = new Date().toISOString().slice(0, 10);
                    const studiedToday = (dashboard?.heatmap?.find(h => h.date?.startsWith(todayIso))?.wordsStudied ?? 0) > 0;
                    const streakVal = dashboard?.streak ?? Number(user.streak ?? 0);

                    const badgeLabelVi: Record<string, string> = {
                        'first-session': 'Phiên học đầu tiên',
                        'week-streak': 'Chuỗi 7 ngày',
                        'hundred-words': '100 từ vựng',
                        mastery: 'Bậc thầy ghi nhớ',
                        'xp-1000': '1.000 XP',
                    };
                    const iconForBadge = (key: string) => {
                        switch (key) {
                            case 'first-session': return <Play size={15} />;
                            case 'week-streak': return <Flame size={15} />;
                            case 'hundred-words': return <BookOpen size={15} />;
                            case 'mastery': return <Award size={15} />;
                            case 'xp-1000': return <Trophy size={15} />;
                            default: return <ShieldCheck size={15} />;
                        }
                    };
                    const badges = (dashboard?.badges ?? []).map(b => ({
                        key: b.key,
                        label: badgeLabelVi[b.key] ?? b.label,
                        unlocked: b.unlocked,
                        icon: iconForBadge(b.key),
                    }));

                    return (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <section className="rounded-[var(--radius-container)] border border-border bg-surface p-5 sm:p-6">
                                <div className="mb-4 flex items-baseline justify-between gap-2">
                                    <div>
                                        <h2 className="text-base font-bold text-text-primary sm:text-lg">Độ bền trí nhớ</h2>
                                        <p className="text-xs text-text-muted sm:text-sm">
                                            {totalWords} từ trong kho · Hôm nay cần ôn {dashboard?.reviewForecast?.dueToday ?? reviewCount} · Ngày mai {dashboard?.reviewForecast?.dueTomorrow ?? 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 items-end gap-2.5 pt-2">
                                    {bars.map(b => (
                                        <div key={b.label} className="flex flex-col items-center gap-1.5">
                                            <span className="text-xs font-bold tabular-nums text-text-primary">{b.count}</span>
                                            <div className="flex h-20 w-full items-end overflow-hidden rounded-lg bg-bg-secondary">
                                                <div
                                                    className={`h-full w-full origin-bottom rounded-t-lg transition-transform duration-300 ${b.cls}`}
                                                    style={{ transform: `scaleY(${Math.max(0.12, b.count / maxBar).toFixed(3)})` }}
                                                />
                                            </div>
                                            <span className="text-center text-xs font-medium text-text-muted">{b.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 grid grid-cols-7 gap-1 border-t border-border pt-3.5" aria-label="Chuỗi ngày trong tuần">
                                    {weekLabels.map((lbl, idx) => {
                                        const isDone =
                                            idx < todayDow
                                                ? idx >= Math.max(0, todayDow - Math.max(0, streakVal - (studiedToday ? 1 : 0)))
                                                : idx === todayDow && studiedToday;
                                        const isToday = idx === todayDow;
                                        return (
                                            <div key={lbl} className="flex flex-col items-center gap-1 text-xs font-bold text-text-muted">
                                                <span
                                                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                                        isDone
                                                            ? 'bg-[#D97706] text-white'
                                                            : isToday
                                                              ? 'border-2 border-primary text-primary'
                                                              : 'bg-bg-secondary'
                                                    }`}
                                                >
                                                    {isDone ? <Check size={13} aria-hidden /> : null}
                                                </span>
                                                <span>{lbl}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="rounded-[var(--radius-container)] border border-border bg-surface p-5 sm:p-6">
                                <div className="mb-3 flex items-baseline justify-between gap-2">
                                    <h2 className="text-base font-bold text-text-primary sm:text-lg">Huy hiệu thành tích</h2>
                                    <span className="text-xs font-semibold tabular-nums text-text-muted">
                                        {badges.filter(b => b.unlocked).length} / {badges.length || 5} đã mở khóa
                                    </span>
                                </div>
                                <ul className="divide-y divide-border">
                                    {badges.map(b => (
                                        <li key={b.key} className="flex items-center gap-3 py-2.5">
                                            <span
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                    b.unlocked
                                                        ? 'bg-primary text-text-on-accent'
                                                        : 'border border-dashed border-border-emphasized text-text-muted'
                                                }`}
                                                aria-hidden
                                            >
                                                {b.unlocked ? b.icon : <Lock size={14} />}
                                            </span>
                                            <span className={`min-w-0 flex-1 truncate text-sm ${b.unlocked ? 'font-semibold text-text-primary' : 'text-text-muted'}`}>
                                                {b.label}
                                            </span>
                                            <span className="text-xs text-text-muted">{b.unlocked ? 'Đã đạt' : 'Chưa đạt'}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    );
                })()}

                {/* ── 2-column grid: Study history + Quick notes ──────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Study history */}
                    <section className="bg-surface border border-border rounded-[var(--radius-container)] p-4 sm:p-7">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <h2 className="text-lg font-bold text-text-primary">Lịch sử học tập</h2>
                            <button
                                type="button"
                                onClick={() => setIsHistoryDetailOpen((prev) => !prev)}
                                className="text-xs font-bold text-primary hover:underline cursor-pointer active:opacity-70 transition-opacity"
                            >
                                {isHistoryDetailOpen ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mb-5">
                            Mỗi ô là một ngày — bấm để xem chi tiết.
                        </p>
                        <StreakHeatmap
                            history={studyHistoryDates}
                            startDate={accountCreatedDate}
                            selectedDate={selectedStudyDate}
                            onSelectDate={setSelectedStudyDate}
                        />

                        {isHistoryDetailOpen && (
                            <div className="mt-5 border-t border-border pt-5">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <h3 className="text-sm font-bold text-text-primary">Chi tiết lịch sử học tập</h3>
                                    <span className="text-xs text-text-muted">
                                        {historyDetailEntries.length > 0 ? `${historyDetailEntries.length} ngày` : ''}
                                    </span>
                                </div>
                                {historyDetailEntries.length === 0 ? (
                                    <p className="text-sm text-text-muted">Chưa có lịch sử học tập chi tiết.</p>
                                ) : (
                                    <ul className="space-y-3 max-h-72 overflow-auto pr-1">
                                        {historyDetailEntries.map((entry) => (
                                            <li
                                                key={entry.date}
                                                className="rounded-2xl border border-border bg-surface-hover px-4 py-3"
                                            >
                                                <div className="text-sm font-bold text-text-primary capitalize">
                                                    {formatHistoryDateLong(entry.date)}
                                                </div>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                                                    <span>
                                                        <span className="text-text-muted">Đã thuộc:</span>{' '}
                                                        <span className="font-bold text-text-primary">{entry.totalWords}</span>
                                                    </span>
                                                    <span>
                                                        <span className="text-text-muted">XP:</span>{' '}
                                                        <span className="font-bold text-primary">+{entry.totalXp}</span>
                                                    </span>
                                                    {entry.topicTitles.length > 0 && (
                                                        <span>
                                                            <span className="text-text-muted">Chủ đề:</span>{' '}
                                                            <span className="font-bold text-text-primary">
                                                                {entry.topicTitles.join(', ')}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Quick notes */}
                    <section className="bg-surface border border-border rounded-[var(--radius-container)] p-4 sm:p-7">
                        <div className="flex items-start justify-between gap-3 mb-5">
                            <div>
                                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <StickyNote size={18} className="text-primary" /> Ghi chú nhanh
                                </h2>
                                <p className="text-xs text-text-muted mt-1">
                                    {sortedStickyNotes.length} ghi chú · ghim hiển thị trước
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="px-3 py-1.5 text-xs"
                                onClick={async () => {
                                    if (!currentUser?.userId) {
                                        setStickyNotes([]);
                                        return;
                                    }
                                    setIsLoadingStickyNotes(true);
                                    try {
                                        const items = await stickyNotesApi.getAll();
                                        setStickyNotes(items);
                                    } catch (error: any) {
                                        onAddToast?.(error?.message || 'Không thể tải danh sách ghi chú.', 'info');
                                    } finally {
                                        setIsLoadingStickyNotes(false);
                                    }
                                }}
                                disabled={isLoadingStickyNotes}
                            >
                                Làm mới
                            </Button>
                        </div>

                        {isLoadingStickyNotes && sortedStickyNotes.length === 0 ? (
                            <p className="text-sm text-text-muted">Đang tải ghi chú...</p>
                        ) : sortedStickyNotes.length === 0 ? (
                            <p className="text-sm text-text-muted">Bạn chưa có ghi chú nào.</p>
                        ) : (
                            <div
                                className={`max-h-[22rem] overflow-y-auto pr-1 transition-opacity duration-150 ${
                                    isLoadingStickyNotes ? 'opacity-60' : 'opacity-100'
                                }`}
                            >
                                <div className="flex flex-col gap-3">
                                    {sortedStickyNotes.map((note) => (
                                        <div
                                            key={note.stickyNoteId}
                                            className={`rounded-2xl border p-3.5 text-text-primary shadow-sm ${getNoteColorClass(note.color)}`}
                                        >
                                            <div className="text-xs text-text-muted mb-1.5 flex items-center justify-between gap-3">
                                                <span>{note.isPinned ? 'Đã ghim' : 'Ghi chú'}</span>
                                                <span className="shrink-0">
                                                    {new Date(note.updatedAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                            <p className="max-h-24 overflow-y-auto pr-1 text-sm leading-relaxed whitespace-pre-line">
                                                {note.content || 'Ghi chú trống'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* ── 2-column grid: Learned words + Security ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vocabulary notebook (always visible) */}
                    <section className="bg-surface border border-border rounded-[var(--radius-container)] p-4 sm:p-7">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <BookOpen size={18} className="text-primary" /> Sổ từ vựng
                            </h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                {learnedCount.toLocaleString('vi-VN')} từ đã thuộc
                            </span>
                        </div>

                        {isLoadingLearnedWords ? (
                            <p className="text-sm text-text-muted">Đang tải...</p>
                        ) : learnedWords.length === 0 ? (
                            <p className="text-sm text-text-muted">Bạn chưa có từ nào đã thuộc.</p>
                        ) : (
                            <>
                                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                        <input
                                            type="search"
                                            name="vocab-notebook-search"
                                            autoComplete="off"
                                            spellCheck={false}
                                            value={vocabSearch}
                                            onChange={(e) => setVocabSearch(e.target.value)}
                                            placeholder="Tìm trong sổ..."
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border text-text-primary placeholder:text-text-muted rounded-full outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                    <div className="w-full sm:w-[155px] sm:shrink-0">
                                        <Selector
                                            label="Cấp độ CEFR"
                                            isLabelHidden
                                            size="md"
                                            width="100%"
                                            presentation="adaptive"
                                            value={vocabCefr}
                                            onChange={(nextValue) => setVocabCefr(nextValue as CefrFilter)}
                                            options={CEFR_OPTIONS.map((opt) => ({
                                                value: opt,
                                                label: opt === 'ALL' ? 'Tất cả CEFR' : opt,
                                            }))}
                                        />
                                    </div>
                                </div>
                                <div className="border border-border rounded-2xl overflow-hidden">
                                    <div className="max-h-80 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-surface-hover text-text-muted text-xs sticky top-0 z-10">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-bold">Từ</th>
                                                    <th className="text-left px-3 py-2.5 font-bold">IPA</th>
                                                    <th className="text-left px-3 py-2.5 font-bold">Nghĩa</th>
                                                    <th className="text-left px-3 py-2.5 font-bold">Cấp</th>
                                                    <th className="text-left px-4 py-2.5 font-bold">Thuộc lúc</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {notebookRows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                                                            Không có từ nào phù hợp.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    notebookRows.map((item) => {
                                                        const learnedAt = learnedAtMap.get(item.id);
                                                        return (
                                                            <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                                                                <td className="px-4 py-2.5 font-bold text-text-primary">{item.word}</td>
                                                                        <td className="px-3 py-2.5 text-text-muted font-ipa text-xs">{item.ipa || '—'}</td>
                                                                <td className="px-3 py-2.5 text-text-secondary">{item.meaning || '—'}</td>
                                                                <td className="px-3 py-2.5">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                                        {(item.cefr || '—').toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-text-muted text-xs">
                                                                    {learnedAt ? formatDateVN(learnedAt) : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Security */}
                    <section className="bg-surface border border-border rounded-[var(--radius-container)] p-4 sm:p-7">
                        <h2 className="text-lg font-bold text-text-primary mb-4">Bảo mật</h2>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setIsChangePasswordOpen(true)}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border hover:border-primary/40 hover:bg-surface-hover transition-colors text-left cursor-pointer active:scale-[0.99]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <KeyRound size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-text-primary">Đổi mật khẩu</div>
                                </div>
                                <ChevronRight size={18} className="text-text-muted shrink-0" />
                            </button>

                            <button
                                type="button"
                                onClick={onLogout}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border hover:border-primary/40 hover:bg-surface-hover transition-colors text-left cursor-pointer active:scale-[0.99]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <LogOut size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-text-primary">Đăng xuất</div>
                                </div>
                                <ChevronRight size={18} className="text-text-muted shrink-0" />
                            </button>

                            <button
                                type="button"
                                disabled={currentUser?.role?.toUpperCase() === 'ADMIN'}
                                onClick={() => {
                                    if (currentUser?.role?.toUpperCase() !== 'ADMIN') {
                                        setIsDeleteAccountModalOpen(true);
                                    }
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border transition-colors text-left ${
                                    currentUser?.role?.toUpperCase() === 'ADMIN'
                                        ? 'opacity-55 cursor-not-allowed bg-bg-secondary/50'
                                        : 'hover:border-red-300 hover:bg-red-50/70 cursor-pointer active:scale-[0.99]'
                                }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                                    <Trash2 size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-red-600">Xóa tài khoản</div>
                                    {currentUser?.role?.toUpperCase() === 'ADMIN' && (
                                        <div className="text-xs text-text-muted mt-0.5">
                                            Tài khoản quản trị được bảo vệ khỏi thao tác tự xóa.
                                        </div>
                                    )}
                                </div>
                                <ChevronRight size={18} className="text-red-400 shrink-0" />
                            </button>
                        </div>
                    </section>
                </div>
                </div>

            </div>

            {isTaglineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-0 sm:items-center sm:px-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsTaglineModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface rounded-t-3xl border border-border sm:rounded-[var(--radius-container)]">
                        <div className="px-6 py-4 border-b border-border">
                            <h3 className="font-bold text-text-primary">Chỉnh sửa giới thiệu</h3>
                            <p className="text-xs text-text-muted mt-1">
                                Dòng giới thiệu hiển thị dưới email của bạn.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea
                                value={taglineDraft}
                                onChange={(e) => setTaglineDraft(e.target.value.slice(0, 160))}
                                rows={3}
                                placeholder={DEFAULT_TAGLINE}
                                className="w-full px-4 py-3 text-sm bg-surface border border-border text-text-primary placeholder:text-text-muted rounded-2xl outline-none focus:border-primary/50 transition-colors resize-none"
                            />
                            <div className="text-xs text-text-muted text-right">
                                {taglineDraft.length} / 160
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsTaglineModalOpen(false)}>
                                Hủy
                            </Button>
                            <Button variant="primary" onClick={saveTagline}>
                                Lưu
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <EditProfileModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                userId={user?.userId}
                initialUsername={user.username || ''}
                initialEmail={user.email || ''}
                initialAvatarUrl={avatarUrl}
                onProfileSaved={handleProfileSaved}
                onAddToast={onAddToast}
                frameOptions={frameOptions}
                selectedFrameKey={effectiveFrameKey}
                onSelectFrame={setProfileFrame}
            />

            <DeleteAccountModal
                isOpen={isDeleteAccountModalOpen}
                onClose={() => setIsDeleteAccountModalOpen(false)}
                onSuccess={onLogout}
                onAddToast={onAddToast}
            />

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
                onAddToast={onAddToast}
            />
        </div>
    );
};

export default Profile;
