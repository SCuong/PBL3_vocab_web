import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Award,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    Flame,
    History,
    Play,
    ShieldCheck,
    Sparkles,
    Target,
    Trophy,
} from 'lucide-react';
import { Button, PageHeader, typography } from '../components/ui';
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
import { mapLearningVocabularyToUiModel } from '../utils/vocabularyMapper';

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

    const timelineItems = useMemo(() => (
        Object.values(gameData?.studyHistoryDetails ?? {})
            .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 5)
            .map((day: any) => ({
                id: day.date,
                title: `${day.totalWords || 0} words studied`,
                meta: new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                }),
                detail: Array.isArray(day.topicTitles) && day.topicTitles.length > 0
                    ? day.topicTitles.join(', ')
                    : 'Learning session recorded',
            }))
    ), [gameData?.studyHistoryDetails]);

    const achievements = useMemo(() => {
        const streak = Number(gameData?.streak ?? 0);
        const xp = Number(gameData?.xp ?? 0);
        const learned = learnedWordIds.length || Number(gameData?.learnedWords ?? 0);
        return [
            { label: 'First session', unlocked: historyDates.length > 0, icon: <Play size={16} /> },
            { label: '7-day streak', unlocked: streak >= 7, icon: <Flame size={16} /> },
            { label: '100 words', unlocked: learned >= 100, icon: <BookOpen size={16} /> },
            { label: '1,000 XP', unlocked: xp >= 1000, icon: <Trophy size={16} /> },
        ];
    }, [gameData?.learnedWords, gameData?.streak, gameData?.xp, historyDates.length, learnedWordIds.length]);

    const xp = Number(gameData?.xp ?? 0);
    const level = getLevel(xp);
    const masteryPct = topicStats.totals.total > 0
        ? Math.round((topicStats.totals.learned / topicStats.totals.total) * 100)
        : 0;
    const reviewForecast = {
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
                addToast('No vocabulary available for this topic yet.', 'info');
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
            addToast('Could not load the next learning session.', 'info');
        } finally {
            setContinuing(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <PageHeader
                className="mb-8"
                eyebrow="Learner dashboard"
                title={`Welcome back${currentUser?.username ? `, ${currentUser.username}` : ''}`}
                description="Track streak, mastery, SM-2 reviews, XP, and recent learning progress in one place."
                action={(
                    <Button variant="primary" onClick={handleContinue} disabled={continuing}>
                        <Play size={16} /> {continuing ? 'Loading...' : 'Continue learning'}
                    </Button>
                )}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardStat
                    icon={<Flame size={20} />}
                    label="Daily streak"
                    value={`${Number(gameData?.streak ?? 0)} days`}
                    detail={gameData?.lastStudyDate ? `Last activity ${gameData.lastStudyDate}` : 'Start today to build streak'}
                    tone="warning"
                />
                <DashboardStat
                    icon={<Target size={20} />}
                    label="Mastery"
                    value={`${masteryPct}%`}
                    detail={`${topicStats.totals.learned} of ${topicStats.totals.total} words mastered`}
                    tone="success"
                />
                <DashboardStat
                    icon={<CalendarClock size={20} />}
                    label="Reviews due"
                    value={reviewForecast.today}
                    detail={`${reviewForecast.week} estimated this week`}
                    tone="primary"
                />
                <DashboardStat
                    icon={<Sparkles size={20} />}
                    label="XP level"
                    value={`Level ${level.level}`}
                    detail={`${level.currentLevelXp} / ${level.nextLevelXp} XP`}
                    tone="accent"
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <DashboardCard title="Review forecast" subtitle="SM-2 queue snapshot from current progress state.">
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            ['Today', reviewForecast.today, 'primary'],
                            ['Tomorrow', reviewForecast.tomorrow, 'cyan'],
                            ['This week', reviewForecast.week, 'accent'],
                        ].map(([label, value, tone]) => (
                            <div key={String(label)} className="rounded-2xl border border-border bg-surface p-5">
                                <p className="text-xs font-display font-bold uppercase tracking-wide text-text-muted">{label}</p>
                                <p className={`mt-3 ${typography.metricValue}`}>{value}</p>
                                <div className="mt-4">
                                    <ProgressBar value={Number(value)} max={Math.max(1, reviewForecast.week)} tone={tone as any} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-display font-bold text-text-primary">
                                    {reviewForecast.today > 0 ? 'Reviews are waiting today' : 'No urgent reviews today'}
                                </p>
                                <p className="mt-1 text-sm text-text-muted">
                                    Prioritize due reviews before adding new vocabulary.
                                </p>
                            </div>
                            <Button variant="primary" onClick={handleContinue} disabled={continuing}>
                                <Play size={16} /> {reviewForecast.today > 0 ? 'Review now' : 'Start learning'}
                            </Button>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard title="Quick continue" subtitle="Best next session, one click away.">
                    {topicStats.nextTopic ? (
                        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                    <BookOpen size={22} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-display font-bold text-text-primary">{topicStats.nextTopic.title}</p>
                                    <p className="mt-1 text-xs text-text-muted">
                                        {topicStats.nextTopic.stats?.review > 0
                                            ? `${topicStats.nextTopic.stats.review} words ready for review`
                                            : `${topicStats.nextTopic.stats?.new ?? 0} new words available`}
                                    </p>
                                </div>
                            </div>
                            <Button variant="primary" className="mt-5 w-full" onClick={handleContinue} disabled={continuing}>
                                <Play size={16} /> Start session
                            </Button>
                            <Button variant="ghost" className="mt-3 w-full" onClick={() => navigate(PATHS.learning)}>
                                Browse topics
                            </Button>
                        </div>
                    ) : (
                        <EmptyState
                            icon={<BookOpen size={20} />}
                            title="No session available"
                            description="Add vocabulary topics or refresh learning progress to continue."
                        />
                    )}
                </DashboardCard>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <DashboardCard title="XP and mastery" subtitle="Level progress with vocabulary coverage.">
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-display font-bold uppercase tracking-wide text-text-muted">
                                    Level {level.level}
                                </p>
                                <p className={`mt-2 ${typography.metricValue}`}>{xp.toLocaleString()} XP</p>
                            </div>
                            <Award size={36} className="text-accent" />
                        </div>
                        <div className="mt-5">
                            <ProgressBar value={level.currentLevelXp} max={level.nextLevelXp} tone="accent" />
                        </div>
                    </div>
                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-display font-bold text-text-primary">Mastery coverage</span>
                            <span className="text-text-muted">{topicStats.totals.learned}/{topicStats.totals.total}</span>
                        </div>
                        <ProgressBar value={topicStats.totals.learned} max={topicStats.totals.total} tone="success" label={`${masteryPct}% mastered`} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-surface p-3">
                            <p className="text-lg font-display font-bold text-text-primary">{topicStats.totals.fresh}</p>
                            <p className="text-[11px] text-text-muted">New</p>
                        </div>
                        <div className="rounded-xl bg-surface p-3">
                            <p className="text-lg font-display font-bold text-text-primary">{topicStats.totals.review}</p>
                            <p className="text-[11px] text-text-muted">Review</p>
                        </div>
                        <div className="rounded-xl bg-surface p-3">
                            <p className="text-lg font-display font-bold text-text-primary">{topicStats.totals.learned}</p>
                            <p className="text-[11px] text-text-muted">Mastered</p>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard title="Recent learning activity" subtitle="Latest saved study sessions.">
                    {timelineItems.length > 0 ? (
                        <Timeline items={timelineItems} />
                    ) : (
                        <EmptyState
                            icon={<History size={20} />}
                            title="No activity yet"
                            description="Complete a learning session to populate your timeline."
                        />
                    )}
                </DashboardCard>

                <DashboardCard title="Achievement badges" subtitle="Milestones unlock as you study.">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {achievements.map(achievement => (
                            <div
                                key={achievement.label}
                                className={`rounded-2xl border p-4 text-center ${
                                    achievement.unlocked
                                        ? 'border-primary/25 bg-primary/10 text-primary'
                                        : 'border-border bg-surface text-text-muted'
                                }`}
                            >
                                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-surface">
                                    {achievement.unlocked ? achievement.icon : <ShieldCheck size={16} />}
                                </div>
                                <p className="text-xs font-display font-bold text-text-primary">{achievement.label}</p>
                                <p className="mt-1 text-[11px] text-text-muted">
                                    {achievement.unlocked ? 'Unlocked' : 'Locked'}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-success-color/20 bg-success-color/10 p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-success-color" />
                            <p className="text-sm text-text-primary">
                                Keep reviews current to protect long-term recall.
                            </p>
                        </div>
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
};

export default LearnerDashboard;
