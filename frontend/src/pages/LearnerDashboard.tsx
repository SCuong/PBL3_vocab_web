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
                title: `Đã học ${day.totalWords || 0} từ`,
                meta: new Date(`${day.date}T00:00:00`).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }),
                detail: Array.isArray(day.topicTitles) && day.topicTitles.length > 0
                    ? day.topicTitles.join(', ')
                    : 'Đã ghi nhận phiên học',
            }))
    ), [gameData?.studyHistoryDetails]);

    const achievements = useMemo(() => {
        const streak = Number(gameData?.streak ?? 0);
        const xp = Number(gameData?.xp ?? 0);
        const learned = learnedWordIds.length || Number(gameData?.learnedWords ?? 0);
        return [
            { label: 'Phiên học đầu tiên', unlocked: historyDates.length > 0, icon: <Play size={16} /> },
            { label: 'Chuỗi 7 ngày', unlocked: streak >= 7, icon: <Flame size={16} /> },
            { label: '100 từ vựng', unlocked: learned >= 100, icon: <BookOpen size={16} /> },
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

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <PageHeader
                className="mb-8"
                eyebrow="Bảng điều khiển học tập"
                title={`Chào mừng trở lại${currentUser?.username ? `, ${currentUser.username}` : ''}`}
                action={(
                    <Button variant="primary" onClick={handleContinue} disabled={continuing}>
                        <Play size={16} /> {continuing ? 'Đang tải...' : 'Tiếp tục học'}
                    </Button>
                )}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardStat
                    variant="flat"
                    icon={<Flame size={20} />}
                    label="Chuỗi ngày học"
                    value={`${Number(gameData?.streak ?? 0)} ngày`}
                    detail={gameData?.lastStudyDate ? `Hoạt động gần nhất ${gameData.lastStudyDate}` : 'Bắt đầu hôm nay để tạo chuỗi'}
                    tone="warning"
                />
                <DashboardStat
                    variant="flat"
                    icon={<Target size={20} />}
                    label="Mức độ thành thạo"
                    value={`${masteryPct}%`}
                    detail={`${topicStats.totals.learned} / ${topicStats.totals.total} từ đã thành thạo`}
                    tone="success"
                />
                <DashboardStat
                    variant="flat"
                    icon={<CalendarClock size={20} />}
                    label="Cần ôn tập"
                    value={reviewForecast.today}
                    detail={`Ước tính ${reviewForecast.week} lượt trong tuần`}
                    tone="primary"
                />
                <DashboardStat
                    variant="flat"
                    icon={<Sparkles size={20} />}
                    label="Cấp độ XP"
                    value={`Cấp ${level.level}`}
                    detail={`${level.currentLevelXp} / ${level.nextLevelXp} XP`}
                    tone="accent"
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <DashboardCard variant="flat" title="Dự báo ôn tập" subtitle="Tổng quan hàng đợi SM-2 theo tiến trình hiện tại.">
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            ['Hôm nay', reviewForecast.today, 'primary'],
                            ['Ngày mai', reviewForecast.tomorrow, 'cyan'],
                            ['Tuần này', reviewForecast.week, 'accent'],
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
                                    {reviewForecast.today > 0 ? 'Có lượt ôn tập đang chờ hôm nay' : 'Hôm nay chưa có lượt ôn gấp'}
                                </p>
                                <p className="mt-1 text-sm text-text-muted">
                                    Ưu tiên ôn từ đến hạn trước khi học thêm từ mới.
                                </p>
                            </div>
                            <Button variant="primary" onClick={handleContinue} disabled={continuing}>
                                <Play size={16} /> {reviewForecast.today > 0 ? 'Ôn tập ngay' : 'Bắt đầu học'}
                            </Button>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard variant="flat" title="Tiếp tục nhanh" subtitle="Phiên học phù hợp nhất, mở bằng một lần bấm.">
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
                                            ? `${topicStats.nextTopic.stats.review} từ sẵn sàng ôn tập`
                                            : `${topicStats.nextTopic.stats?.new ?? 0} từ mới có thể học`}
                                    </p>
                                </div>
                            </div>
                            <Button variant="primary" className="mt-5 w-full" onClick={handleContinue} disabled={continuing}>
                                <Play size={16} /> Bắt đầu phiên học
                            </Button>
                            <Button variant="ghost" className="mt-3 w-full" onClick={() => navigate(PATHS.learning)}>
                                Duyệt chủ đề
                            </Button>
                        </div>
                    ) : (
                        <EmptyState
                            icon={<BookOpen size={20} />}
                            title="Chưa có phiên học"
                            description="Thêm chủ đề từ vựng hoặc làm mới tiến trình học để tiếp tục."
                        />
                    )}
                </DashboardCard>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3 dashboard-defer">
                <DashboardCard variant="flat" title="XP và mức độ thành thạo" subtitle="Tiến độ cấp độ và phạm vi từ vựng đã nắm.">
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-display font-bold uppercase tracking-wide text-text-muted">
                                    Cấp {level.level}
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
                            <span className="font-display font-bold text-text-primary">Phạm vi thành thạo</span>
                            <span className="text-text-muted">{topicStats.totals.learned}/{topicStats.totals.total}</span>
                        </div>
                        <ProgressBar value={topicStats.totals.learned} max={topicStats.totals.total} tone="success" label={`${masteryPct}% đã thành thạo`} />
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl bg-surface p-3">
                            <p className="text-lg font-display font-bold text-text-primary">{topicStats.totals.fresh}</p>
                            <p className="text-[11px] text-text-muted">Từ mới</p>
                        </div>
                        <div className="rounded-xl bg-surface p-3">
                            <p className="text-lg font-display font-bold text-text-primary">{topicStats.totals.review}</p>
                            <p className="text-[11px] text-text-muted">Ôn tập</p>
                        </div>
                        <div className="rounded-xl bg-surface p-3">
                            <p className="text-lg font-display font-bold text-text-primary">{topicStats.totals.learned}</p>
                            <p className="text-[11px] text-text-muted">Thành thạo</p>
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard variant="flat" title="Hoạt động học gần đây" subtitle="Các phiên học đã lưu gần nhất.">
                    {timelineItems.length > 0 ? (
                        <Timeline items={timelineItems} />
                    ) : (
                        <EmptyState
                            icon={<History size={20} />}
                            title="Chưa có hoạt động"
                            description="Hoàn thành một phiên học để hiển thị dòng thời gian."
                        />
                    )}
                </DashboardCard>

                <DashboardCard variant="flat" title="Huy hiệu thành tích" subtitle="Các mốc sẽ mở khóa khi bạn học.">
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
                                    {achievement.unlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-success-color/20 bg-success-color/10 p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} className="text-success-color" />
                            <p className="text-sm text-text-primary">
                                Duy trì ôn tập đúng hạn để ghi nhớ lâu dài.
                            </p>
                        </div>
                    </div>
                </DashboardCard>
            </div>
        </div>
    );
};

export default LearnerDashboard;
