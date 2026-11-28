import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Award,
    BookOpen,
    Check,
    Flame,
    History,
    Lock,
    Play,
    ShieldCheck,
    Target,
    Trophy,
} from 'lucide-react';
import { Button } from '../components/ui';
import {
    DashboardCard,
    DashboardStat,
    EmptyState,
    ProgressBar,
    Timeline,
} from '../components/dashboard';
import { useAppContext } from '../context/AppContext';
import { PATHS } from '../routes/paths';
import { vocabularyApi } from '../services/vocabularyApi';
import { dashboardApi, type LearnerDashboard as LearnerDashboardData } from '../services/dashboardApi';
import { mapLearningVocabularyToUiModel } from '../utils/vocabularyMapper';
import { getTopicIllustration } from '../utils/vocabIllustrations';
import { playLumoVoice } from '../utils/sound';

const getLevel = (xp: number) => {
    const normalized = Number.isFinite(xp) ? Math.max(0, xp) : 0;
    const level = Math.floor(normalized / 1000) + 1;
    const currentLevelXp = normalized % 1000;
    return { level, currentLevelXp, nextLevelXp: 1000 };
};

const LearnerDashboard = () => {
    const navigate = useNavigate();
    const {
        currentUser,
        gameData,
        learningTopicGroups,
        learnedWordIds,
        totalReviewCount,
        addToast,
    } = useAppContext();
    const [continuing, setContinuing] = useState(false);
    const [dashboard, setDashboard] = useState<LearnerDashboardData | null>(null);
    const [dashboardError, setDashboardError] = useState(false);
    const [revealed, setRevealed] = useState(false);

    // Drive the on-mount entrance: flip the reveal class one frame after mount so
    // cards transition from hidden → visible instead of all appearing at once.
    useEffect(() => {
        const id = requestAnimationFrame(() => setRevealed(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Real analytics (streak, XP, recent activity, due reviews, mastery) come from
    // the backend dashboard endpoint, not local game data. Local values are only a
    // fallback while loading or if the request fails.
    useEffect(() => {
        let cancelled = false;
        setDashboardError(false);
        dashboardApi.getLearnerDashboard()
            .then((data) => { if (!cancelled) setDashboard(data); })
            .catch(() => { if (!cancelled) setDashboardError(true); });
        return () => { cancelled = true; };
    }, []);

    const topicStats = useMemo(() => {
        const topics = learningTopicGroups.flatMap((group: any) => group.topics ?? []);
        const totals = topics.reduce(
            (acc: { total: number; learned: number; review: number; fresh: number }, topic: any) => {
                acc.total += Number(topic.stats?.total ?? 0);
                acc.learned += Number(topic.stats?.learned ?? 0);
                acc.review += Number(topic.stats?.review ?? 0);
                acc.fresh += Number(topic.stats?.new ?? 0);
                return acc;
            },
            { total: 0, learned: 0, review: 0, fresh: 0 },
        );
        const nextTopic = topics.find((topic: any) => Number(topic.stats?.review ?? 0) > 0)
            ?? topics.find((topic: any) => Number(topic.stats?.new ?? 0) > 0)
            ?? topics[0]
            ?? null;
        return { topics, totals, nextTopic };
    }, [learningTopicGroups]);

    const historyDates = useMemo(
        () => Array.isArray(gameData?.studyHistory) ? gameData.studyHistory : [],
        [gameData?.studyHistory],
    );

    const timelineItems = useMemo(() => {
        if (dashboard && dashboard.recentActivity.length > 0) {
            return dashboard.recentActivity.slice(0, 5).map((activity) => ({
                id: String(activity.sessionId ?? activity.date),
                title: `Đã học ${activity.wordsStudied || 0} từ`,
                // Full timestamp so separate real sessions on the same day read distinctly.
                meta: new Date(activity.date).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }),
                detail: activity.topicName?.trim() ? activity.topicName : 'Đã ghi nhận phiên học',
            }));
        }
        return Object.values(gameData?.studyHistoryDetails ?? {})
            .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 5)
            .map((day: any) => ({
                id: day.date,
                title: `Đã học ${day.totalWords || 0} từ`,
                meta: new Date(`${day.date}T00:00:00`).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
                detail: Array.isArray(day.topicTitles) && day.topicTitles.length > 0
                    ? day.topicTitles.join(', ')
                    : 'Đã ghi nhận phiên học',
            }));
    }, [dashboard, gameData?.studyHistoryDetails]);

    const xp = dashboard?.xp.totalXp ?? Number(gameData?.xp ?? 0);
    const level = dashboard
        ? {
            level: dashboard.xp.level,
            currentLevelXp: dashboard.xp.currentLevelXp,
            nextLevelXp: dashboard.xp.nextLevelXp,
        }
        : getLevel(xp);
    const streak = dashboard?.streak ?? Number(gameData?.streak ?? 0);

    const stats = useMemo(() => {
        if (dashboard) {
            const mastery = dashboard.masteryProgress;
            return {
                total: mastery.totalWords,
                learned: mastery.learnedWords,
                mastered: mastery.masteredWords,
                review: mastery.reviewWords,
                fresh: Math.max(0, mastery.totalWords - mastery.learnedWords),
            };
        }
        return {
            total: topicStats.totals.total,
            learned: topicStats.totals.learned,
            mastered: topicStats.totals.learned,
            review: topicStats.totals.review,
            fresh: topicStats.totals.fresh,
        };
    }, [dashboard, topicStats.totals]);

    const achievements = useMemo(() => {
        const badgeLabelVi: Record<string, string> = {
            'first-session': 'Phiên học đầu tiên',
            'week-streak': 'Chuỗi 7 ngày',
            'hundred-words': '100 từ vựng',
            'mastery': 'Bậc thầy ghi nhớ',
            'xp-1000': '1.000 XP',
        };
        if (dashboard && dashboard.badges.length > 0) {
            const iconForBadge = (key: string) => {
                switch (key) {
                    case 'first-session': return <Play size={16} />;
                    case 'week-streak': return <Flame size={16} />;
                    case 'hundred-words': return <BookOpen size={16} />;
                    case 'mastery': return <Award size={16} />;
                    case 'xp-1000': return <Trophy size={16} />;
                    default: return <ShieldCheck size={16} />;
                }
            };
            return dashboard.badges.map((badge) => ({
                label: badgeLabelVi[badge.key] ?? badge.label,
                unlocked: badge.unlocked,
                icon: iconForBadge(badge.key),
            }));
        }
        const localStreak = Number(gameData?.streak ?? 0);
        const localXp = Number(gameData?.xp ?? 0);
        const learned = learnedWordIds.length || Number(gameData?.learnedWords ?? 0);
        return [
            { label: 'Phiên học đầu tiên', unlocked: historyDates.length > 0, icon: <Play size={16} /> },
            { label: 'Chuỗi 7 ngày', unlocked: localStreak >= 7, icon: <Flame size={16} /> },
            { label: '100 từ vựng', unlocked: learned >= 100, icon: <BookOpen size={16} /> },
            { label: '1.000 XP', unlocked: localXp >= 1000, icon: <Trophy size={16} /> },
        ];
    }, [dashboard, gameData?.learnedWords, gameData?.streak, gameData?.xp, historyDates.length, learnedWordIds.length]);

    const masteryPct = stats.total > 0
        ? Math.round((stats.learned / stats.total) * 100)
        : 0;
    const reviewForecast = dashboard
        ? {
            today: dashboard.reviewForecast.dueToday,
            tomorrow: dashboard.reviewForecast.dueTomorrow,
            week: dashboard.reviewForecast.dueThisWeek,
        }
        : {
            today: totalReviewCount,
            tomorrow: Math.max(0, Math.round(totalReviewCount * 0.35)),
            week: Math.max(totalReviewCount, Math.round(totalReviewCount * 2.4)),
        };

    const handleContinue = async () => {
        if (!topicStats.nextTopic?.id) {
            navigate(PATHS.learning);
            return;
        }
        setContinuing(true);
        try {
            const items = await vocabularyApi.getLearningByTopic(topicStats.nextTopic.id);
            if (!items || items.length === 0) {
                addToast('Chưa có từ vựng cho chủ đề này.', 'info');
                navigate(PATHS.learning);
                return;
            }
            navigate(PATHS.learningStudy, {
                state: {
                    topicId: topicStats.nextTopic.id,
                    words: items.map(mapLearningVocabularyToUiModel),
                    mode: (topicStats.nextTopic.stats?.review ?? 0) > 0 ? 'review' : null,
                },
            });
        } catch {
            addToast('Không thể tải phiên học tiếp theo.', 'info');
        } finally {
            setContinuing(false);
        }
    };

    const reveal = revealed ? 'is-visible' : '';
    const nextTopic = topicStats.nextTopic;
    const nextReview = Number(nextTopic?.stats?.review ?? 0);
    const levelPct = level.nextLevelXp > 0 ? Math.round((level.currentLevelXp / level.nextLevelXp) * 100) : 0;
    const learning = Math.max(0, stats.learned - stats.mastered);
    const segments = [
        { label: 'Thành thạo', value: stats.mastered, className: 'bg-primary' },
        { label: 'Đang học', value: learning, className: 'bg-primary/45' },
        { label: 'Chưa học', value: stats.fresh, className: 'bg-bg-secondary' },
    ];
    const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayHeatmap = dashboard?.heatmap?.find(h => h.date?.startsWith(todayIso));
    const studiedTodayCount = todayHeatmap?.wordsStudied ?? 0;
    const studiedToday = studiedTodayCount > 0 || (dashboard?.recentActivity?.some(a => a.date?.startsWith(todayIso)) ?? false);
    const dailyGoal = 5;
    const dailyPct = Math.min(100, Math.round((studiedTodayCount / dailyGoal) * 100));
    const goalCircumference = 2 * Math.PI * 17;
    const goalOffset = goalCircumference - (dailyPct / 100) * goalCircumference;

    const populatedTopics = useMemo(
        () => topicStats.topics.filter((t: any) => Number(t.stats?.total ?? 0) > 0).slice(0, 4),
        [topicStats.topics],
    );

    const handleOpenTopic = async (topicId: number, mode?: string) => {
        setContinuing(true);
        try {
            const items = await vocabularyApi.getLearningByTopic(topicId);
            if (!items || items.length === 0) {
                addToast('Chưa có từ vựng cho chủ đề này.', 'info');
                return;
            }
            const search = new URLSearchParams({ topicId: String(topicId) });
            if (mode === 'dialogue') search.set('tab', 'dialogue');
            else if (mode) search.set('mode', mode);
            navigate(`${PATHS.learningStudy}?${search.toString()}`, {
                state: {
                    topicId,
                    words: items.map(mapLearningVocabularyToUiModel),
                    mode: mode === 'dialogue' ? null : (mode ?? null),
                },
            });
        } catch {
            addToast('Không thể tải phiên học.', 'info');
        } finally {
            setContinuing(false);
        }
    };

    const dueNow = Math.max(reviewForecast.today, stats.review);

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <header className={`dashboard-fade-in ${reveal} mb-5 flex flex-wrap items-center justify-between gap-4`}>
                <div className="flex items-center gap-3.5">
                    <img
                        src={studiedToday ? '/mascot-lumo-happy.webp' : '/mascot-lumo-reading.webp'}
                        alt="Lumo"
                        width={56}
                        height={64}
                        onClick={() => playLumoVoice('greet')}
                        title="Chạm Lumo"
                        className="hidden h-auto w-[56px] shrink-0 cursor-pointer transition-transform duration-200 hover:scale-105 sm:block"
                    />
                    <div>
                        <h1 className="text-[1.65rem] font-bold leading-tight tracking-[-0.02em] text-text-primary sm:text-[2rem]">
                            Chào {currentUser?.username || 'bạn'}, sẵn sàng học chưa?
                        </h1>
                        <p className="mt-1 text-sm text-text-muted">
                            <span className="capitalize">{today}</span>
                            {' · '}
                            {studiedToday ? (
                                <span className="font-semibold text-success-color">Đã giữ chuỗi hôm nay</span>
                            ) : (
                                <span>2 phút ôn nhanh để giữ chuỗi {streak} ngày</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2" aria-label="Mục tiêu hôm nay">
                    <svg className="h-10 w-10 -rotate-90" viewBox="0 0 42 42" aria-hidden="true">
                        <circle cx="21" cy="21" r="17" fill="none" stroke="var(--bg-secondary)" strokeWidth="4.5" />
                        <circle
                            cx="21"
                            cy="21"
                            r="17"
                            fill="none"
                            stroke="var(--success-color)"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray={goalCircumference}
                            strokeDashoffset={goalOffset}
                        />
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-text-muted">Mục tiêu hôm nay</span>
                        <span className="text-sm font-bold tabular-nums text-text-primary">
                            {Math.min(studiedTodayCount, dailyGoal)} / {dailyGoal} từ ({dailyPct}%)
                        </span>
                    </div>
                </div>
            </header>

            {dashboardError && (
                <div className="mb-5 rounded-[var(--radius-container)] border border-warning-color/30 bg-warning-color/10 p-4 text-sm text-text-primary" role="status">
                    Không tải được số liệu từ máy chủ. Đang hiển thị dữ liệu trên máy này.
                </div>
            )}

            {/* Hero Action Stage: Solid deep brand surface + full-bleed illustration */}
            <section
                aria-labelledby="today-heading"
                className={`dashboard-fade-in ${reveal} grid overflow-hidden rounded-[var(--radius-container)] bg-[#27124C] text-white md:grid-cols-[1.18fr_1fr]`}
            >
                <div className="flex flex-col justify-center p-6 sm:p-8">
                    <h2 id="today-heading" className="text-2xl font-extrabold leading-tight tracking-[-0.025em] text-white sm:text-[1.9rem]">
                        {dueNow > 0 ? `${dueNow} từ đến hạn ôn hôm nay` : 'Đã xong hàng đợi ôn hôm nay'}
                    </h2>
                    <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-[#E3DCF5]">
                        {nextTopic
                            ? `${nextTopic.title} · Ngày mai ${reviewForecast.tomorrow} từ · Tuần này ${reviewForecast.week} từ.`
                            : 'Chọn một chủ đề bên dưới để bắt đầu phiên học ngắn trong 2 phút.'}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2.5">
                        <button
                            type="button"
                            disabled={continuing}
                            onClick={handleContinue}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-element)] bg-[#F59E0B] px-5 text-sm font-bold text-[#171026] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#FBBF24] disabled:opacity-60 cursor-pointer"
                        >
                            <Play size={16} aria-hidden />
                            {continuing ? 'Đang mở...' : dueNow > 0 ? `Ôn tập ngay (${dueNow} từ)` : 'Tiếp tục học'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(PATHS.learning)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-element)] border border-white/35 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
                        >
                            Chọn chủ đề khác
                        </button>
                    </div>
                </div>
                <div className="relative min-h-[200px] bg-[#F4EFE6]">
                    <img
                        src="/illustrations/hero-learning-banner.webp"
                        alt="Mascot Lumo đồng hành học từ vựng VocabLearning"
                        className="h-full w-full object-cover"
                    />
                </div>
            </section>

            {/* Visual Learning Journey of Populated Topics */}
            {populatedTopics.length > 0 && (
                <section className={`dashboard-fade-in ${reveal} mt-6`} aria-label="Lộ trình chủ đề đang mở">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold tracking-[-0.015em] text-text-primary">Lộ trình học tập</h2>
                            <p className="text-sm text-text-muted">Các chủ đề đã có từ vựng sẵn sàng học ngay</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate(PATHS.learning)}
                            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                        >
                            Xem tất cả chủ đề →
                        </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {populatedTopics.map((topic: any, idx: number) => {
                            const tTotal = Number(topic.stats?.total ?? 0);
                            const tLearned = Number(topic.stats?.learned ?? 0);
                            const tReview = Number(topic.stats?.review ?? 0);
                            const tPct = tTotal > 0 ? Math.round((tLearned / tTotal) * 100) : 0;
                            const isDone = tTotal > 0 && tLearned >= tTotal && tReview === 0;
                            return (
                                <article
                                    key={topic.id}
                                    className={`flex flex-col overflow-hidden rounded-[var(--radius-container)] border bg-surface transition-transform duration-150 hover:-translate-y-0.5 ${
                                        tReview > 0 ? 'border-primary' : 'border-border'
                                    }`}
                                >
                                    <div className="relative aspect-[16/9] bg-bg-secondary">
                                        <img
                                            src={getTopicIllustration(topic.title, idx)}
                                            alt={topic.title}
                                            className="h-full w-full object-cover"
                                        />
                                        <span
                                            className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                                isDone
                                                    ? 'bg-success-color/15 text-success-color'
                                                    : tReview > 0
                                                      ? 'bg-primary text-text-on-accent'
                                                      : 'bg-surface text-text-primary'
                                            }`}
                                        >
                                            {isDone ? 'Đã xong' : tReview > 0 ? `${tReview} cần ôn` : `${tTotal} từ`}
                                        </span>
                                    </div>
                                    <div className="flex flex-1 flex-col p-4">
                                        <h3 className="line-clamp-1 text-base font-bold text-text-primary">{topic.title}</h3>
                                        <p className="mt-1 text-xs font-medium text-text-muted tabular-nums">
                                            {tLearned} / {tTotal} từ · {tPct}%
                                        </p>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-secondary">
                                            <div
                                                className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-300"
                                                style={{ transform: `scaleX(${tPct / 100})` }}
                                            />
                                        </div>
                                        <div className="mt-auto flex gap-2 pt-3">
                                            <Button
                                                className="flex-1"
                                                size="sm"
                                                variant={tReview > 0 ? 'primary' : 'secondary'}
                                                onClick={() => handleOpenTopic(topic.id, tReview > 0 ? 'review' : undefined)}
                                            >
                                                {tReview > 0 ? `Ôn (${tReview})` : isDone ? 'Ôn lại' : 'Học'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleOpenTopic(topic.id, 'dialogue')}
                                            >
                                                Hội thoại
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-3">
                <DashboardStat
                    className={`dashboard-fade-in ${reveal} delay-[80ms]`}
                    icon={<Flame />}
                    label="Chuỗi ngày học"
                    value={`${streak} ngày`}
                    detail={
                        studiedToday ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-success-color">
                                <Check size={14} aria-hidden /> Đã giữ chuỗi hôm nay
                            </span>
                        ) : streak > 0 ? (
                            'Học hôm nay để giữ chuỗi'
                        ) : (
                            'Bắt đầu chuỗi mới hôm nay'
                        )
                    }
                    tone="warning"
                />
                <DashboardStat
                    className={`dashboard-fade-in ${reveal} delay-[140ms]`}
                    icon={<Target />}
                    label="Từ đã học"
                    value={<>{stats.learned}<span className="text-lg font-semibold text-text-muted"> / {stats.total}</span></>}
                    detail={`${masteryPct}% kho từ`}
                    tone="success"
                />
                <DashboardStat
                    className={`dashboard-fade-in ${reveal} delay-[200ms] col-span-2 lg:col-span-1`}
                    icon={<Award />}
                    label={`Cấp ${level.level}`}
                    value={`${xp.toLocaleString('vi-VN')} XP`}
                    detail={
                        <span className="mt-1 block">
                            <ProgressBar value={level.currentLevelXp} max={level.nextLevelXp} label={`Tiến độ lên cấp ${level.level + 1}`} hideLabel />
                            <span className="mt-2 block tabular-nums">{level.currentLevelXp} / {level.nextLevelXp} XP · {levelPct}%</span>
                        </span>
                    }
                />
            </div>

            <div className="dashboard-defer mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-3">
                <DashboardCard className={`dashboard-fade-in ${reveal} delay-[260ms]`} title="Độ bền trí nhớ" subtitle={`Phân bố ${stats.total} từ theo mức ghi nhớ`}>
                    {(() => {
                        const lv1 = Math.max(0, stats.review);
                        const lv2 = Math.max(0, Math.ceil(Math.max(0, learning - lv1) * 0.6));
                        const lv3 = Math.max(0, Math.max(0, learning - lv1) - lv2);
                        const lv4 = Math.max(0, Math.floor(stats.mastered * 0.4));
                        const lv5 = Math.max(0, stats.mastered - lv4);
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
                        return (
                            <>
                                <div className="grid grid-cols-5 items-end gap-2 pt-2">
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
                                        const isDone = idx < todayDow ? idx >= Math.max(0, todayDow - Math.max(0, streak - (studiedToday ? 1 : 0))) : idx === todayDow && studiedToday;
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
                            </>
                        );
                    })()}
                </DashboardCard>

                <DashboardCard className={`dashboard-fade-in ${reveal} delay-[320ms]`} title="Hoạt động gần đây">
                    {timelineItems.length > 0 ? (
                        <Timeline items={timelineItems} />
                    ) : (
                        <EmptyState
                            icon={<History size={20} />}
                            title="Chưa có hoạt động"
                            description="Hoàn thành một phiên học để thấy lịch sử tại đây."
                        />
                    )}
                </DashboardCard>

                <DashboardCard className={`dashboard-fade-in ${reveal} delay-[380ms]`} title="Huy hiệu" subtitle={`${achievements.filter(a => a.unlocked).length} / ${achievements.length} đã mở khóa`}>
                    <ul className="divide-y divide-border">
                        {achievements.map(achievement => (
                            <li key={achievement.label} className="flex items-center gap-3 py-2.5">
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                        achievement.unlocked ? 'bg-primary text-text-on-accent' : 'border border-dashed border-border-emphasized text-text-muted'
                                    }`}
                                    aria-hidden
                                >
                                    {achievement.unlocked ? achievement.icon : <Lock size={14} />}
                                </span>
                                <span className={`min-w-0 flex-1 truncate text-sm ${achievement.unlocked ? 'font-semibold text-text-primary' : 'text-text-muted'}`}>
                                    {achievement.label}
                                </span>
                                <span className="text-xs text-text-muted">{achievement.unlocked ? 'Đã đạt' : 'Chưa đạt'}</span>
                            </li>
                        ))}
                    </ul>
                </DashboardCard>
            </div>
        </div>
    );
};

export default LearnerDashboard;
