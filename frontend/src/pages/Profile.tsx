import { useEffect, useMemo, useState } from 'react';
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
import { useAppContext } from '../context/AppContext';
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
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${format2Digits(minutes)}m`;
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
    const [showLearnedWords, setShowLearnedWords] = useState(false);
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
        if (!showLearnedWords) return;

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
    }, [showLearnedWords, learnedWordIds, onAddToast]);

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

    // Total learning time from per-session timeSpentSeconds.
    const totalTimeLabel = useMemo(() => {
        let totalSeconds = 0;
        for (const day of Object.values(studyHistoryDetails) as any[]) {
            if (!day || !Array.isArray(day.sessions)) continue;
            for (const session of day.sessions) {
                const seconds = Number(session?.timeSpentSeconds);
                if (Number.isFinite(seconds) && seconds > 0) {
                    totalSeconds += seconds;
                }
            }
        }
        return formatDuration(totalSeconds);
    }, [studyHistoryDetails]);

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
                <section className="bg-surface border border-border shadow-[0_4px_24px_-12px_rgba(124,93,250,0.18)] rounded-[20px] p-4 sm:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div className="flex items-start gap-4 sm:gap-6 min-w-0">
                            <div className="relative shrink-0">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                    className="w-16 h-16 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-border shadow-sm"
                                    />
                                ) : (
                                    <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-2xl sm:text-4xl font-display font-bold text-text-on-accent border-4 border-border shadow-sm">
                                        {initials}
                                    </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                                    ✦
                                </span>
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary leading-tight truncate">
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
                                className="flex-1 justify-center px-4 py-2.5 md:flex-none md:px-5"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil size={16} /> Chỉnh sửa hồ sơ
                            </Button>
                            <button
                                type="button"
                                onClick={openTaglineEditor}
                                title="Chỉnh sửa giới thiệu"
                                aria-label="Chỉnh sửa giới thiệu"
                                className="w-11 h-11 rounded-full border border-border bg-surface hover:bg-surface-hover flex items-center justify-center text-text-muted hover:text-primary transition-colors cursor-pointer active:scale-95"
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>

                    {/* ── Inline stats row with vertical dividers ─────────── */}
                    <div className="mt-7 pt-6 border-t border-border grid grid-cols-2 md:grid-cols-4 md:divide-x divide-border gap-y-5">
                        {stats.map((s) => (
                            <div key={s.key} className="flex flex-col items-start text-left px-2 sm:px-4 md:px-5">
                                <div className={`flex items-center gap-1.5 ${s.accent}`}>
                                    {s.icon}
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                                        {s.label}
                                    </span>
                                </div>
                                <div className="text-2xl md:text-[28px] font-display font-bold text-text-primary mt-1 leading-none">
                                    {s.value}
                                </div>
                                {s.subtext && (
                                    <div className="text-[11px] text-text-muted mt-1.5 truncate max-w-full">
                                        {s.subtext}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── 2-column grid: Study history + Quick notes ──────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Study history */}
                    <section className="bg-surface border border-border shadow-[0_4px_24px_-12px_rgba(124,93,250,0.15)] rounded-[20px] p-4 sm:p-7">
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
                                    <span className="text-[11px] text-text-muted">
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
                    <section className="bg-surface border border-border shadow-[0_4px_24px_-12px_rgba(124,93,250,0.15)] rounded-[20px] p-4 sm:p-7">
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

                        {isLoadingStickyNotes ? (
                            <p className="text-sm text-text-muted">Đang tải ghi chú...</p>
                        ) : sortedStickyNotes.length === 0 ? (
                            <p className="text-sm text-text-muted">Bạn chưa có ghi chú nào.</p>
                        ) : (
                            <div className="max-h-[22rem] overflow-y-auto pr-1">
                                <div className="flex flex-col gap-3">
                                    {sortedStickyNotes.map((note) => (
                                        <div
                                            key={note.stickyNoteId}
                                            className={`rounded-2xl border p-3.5 text-text-primary shadow-sm ${getNoteColorClass(note.color)}`}
                                        >
                                            <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5 flex items-center justify-between gap-3">
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
                    {/* Vocabulary notebook (formerly Learned words) */}
                    <section className="bg-surface border border-border shadow-[0_4px_24px_-12px_rgba(124,93,250,0.15)] rounded-[20px] p-4 sm:p-7">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <BookOpen size={18} className="text-primary" /> Sổ từ vựng
                                </h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                                        {learnedCount.toLocaleString('vi-VN')} từ đã thuộc
                                    </span>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                className="px-4 py-2 text-sm shrink-0"
                                onClick={() => setShowLearnedWords((prev) => !prev)}
                            >
                                {showLearnedWords ? 'Ẩn' : 'Hiện'}
                            </Button>
                        </div>

                        {!showLearnedWords ? (
                            <p className="text-sm text-text-muted">Nhấn Hiện để xem sổ từ vựng của bạn.</p>
                        ) : isLoadingLearnedWords ? (
                            <p className="text-sm text-text-muted">Đang tải...</p>
                        ) : learnedWords.length === 0 ? (
                            <p className="text-sm text-text-muted">Bạn chưa có từ nào đã thuộc.</p>
                        ) : (
                            <>
                                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                                        <input
                                            type="text"
                                            value={vocabSearch}
                                            onChange={(e) => setVocabSearch(e.target.value)}
                                            placeholder="Tìm trong sổ..."
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border text-text-primary placeholder:text-text-muted rounded-full outline-none focus:border-primary/50 transition-colors"
                                        />
                                    </div>
                                    <select
                                        value={vocabCefr}
                                        onChange={(e) => setVocabCefr(e.target.value as CefrFilter)}
                                        className="px-4 py-2 text-sm bg-surface border border-border text-text-primary rounded-full outline-none focus:border-primary/50 transition-colors cursor-pointer"
                                    >
                                        {CEFR_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt === 'ALL' ? 'Tất cả CEFR' : opt}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="border border-border rounded-2xl overflow-hidden">
                                    <div className="max-h-80 overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-surface-hover text-text-muted text-[10px] uppercase tracking-wider sticky top-0 z-10">
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
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
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
                    <section className="bg-surface border border-border shadow-[0_4px_24px_-12px_rgba(124,93,250,0.15)] rounded-[20px] p-4 sm:p-7">
                        <h2 className="text-lg font-bold text-text-primary mb-1">Bảo mật</h2>
                        <p className="text-xs text-text-muted mb-5">
                            Quản lý mật khẩu, email và tài khoản của bạn.
                        </p>

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
                                    <div className="text-xs text-text-muted mt-0.5">
                                        Cập nhật mật khẩu để bảo vệ tài khoản.
                                    </div>
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
                                    <div className="text-xs text-text-muted mt-0.5">
                                        Đăng xuất khỏi thiết bị này.
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-text-muted shrink-0" />
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsDeleteAccountModalOpen(true)}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-border hover:border-red-300 hover:bg-red-50/70 transition-colors text-left cursor-pointer active:scale-[0.99]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                                    <Trash2 size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-red-600">Xóa tài khoản</div>
                                    <div className="text-xs text-text-muted mt-0.5">
                                        Hành động này không thể hoàn tác.
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-red-400 shrink-0" />
                            </button>
                        </div>
                    </section>
                </div>

            </div>

            {isTaglineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-0 sm:items-center sm:px-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsTaglineModalOpen(false)}
                    />
                    <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface rounded-t-3xl shadow-2xl border border-border sm:rounded-3xl">
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
                            <div className="text-[11px] text-text-muted text-right">
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
