import { useCallback, useEffect, useState } from 'react';
import {
    Activity, AlertTriangle, BarChart3, BookMarked, BookOpen, Clock,
    Loader2, RefreshCw, Users,
} from 'lucide-react';
import { Button } from '../../components/ui';
import {
    DataTable, FilterBar, Input, Pagination, SortableColumnHeader, StatCard,
} from '../../components/admin/ui';
import { DashboardCard, EmptyState, MiniBarChart, ProgressBar } from '../../components/dashboard';
import {
    adminApi,
    type AdminLearningOverviewResult,
    type DailyLearningTrend,
    type ExerciseFailureItem,
    type LearningOverviewRow,
    type RetentionAnalytics,
    type ReviewCompletionAnalytics,
    type VocabularyDifficultyItem,
} from '../../services/adminApi';

type SortKey = 'user' | 'topic' | 'sessions' | 'words' | 'activeminutes' | 'firstactivity' | 'lastactivity';
type SortState = { by: SortKey; direction: 'asc' | 'desc' };
type Filters = { fromDate: string; toDate: string };

const PAGE_SIZE = 20;

const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainder = Math.round(minutes % 60);
    return hours === 0 ? `${remainder} phút` : `${hours} giờ ${remainder ? `${remainder} phút` : ''}`.trim();
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');

const AdminOverview = () => {
    const [overview, setOverview] = useState<AdminLearningOverviewResult | null>(null);
    const [retention, setRetention] = useState<RetentionAnalytics | null>(null);
    const [review, setReview] = useState<ReviewCompletionAnalytics | null>(null);
    const [difficulty, setDifficulty] = useState<VocabularyDifficultyItem[]>([]);
    const [failures, setFailures] = useState<ExerciseFailureItem[]>([]);
    const [trends, setTrends] = useState<DailyLearningTrend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<Filters>({ fromDate: '', toDate: '' });
    const [sort, setSort] = useState<SortState>({ by: 'lastactivity', direction: 'desc' });
    const [page, setPage] = useState(1);

    const load = useCallback(async (currentFilters: Filters, currentSort: SortState, currentPage: number) => {
        setLoading(true);
        setError(null);
        try {
            const range = [currentFilters.fromDate || undefined, currentFilters.toDate || undefined] as const;
            const [overviewResult, retentionResult, reviewResult, difficultyResult, failureResult, trendResult] = await Promise.all([
                adminApi.getLearningOverview({
                    fromDate: range[0],
                    toDate: range[1],
                    sortBy: currentSort.by,
                    sortDirection: currentSort.direction,
                    page: currentPage,
                    pageSize: PAGE_SIZE,
                }),
                adminApi.getRetentionAnalytics(...range),
                adminApi.getReviewCompletionAnalytics(...range),
                adminApi.getVocabularyDifficultyAnalytics(5),
                adminApi.getExerciseFailureAnalytics(5),
                adminApi.getDailyLearningTrends(...range),
            ]);
            setOverview(overviewResult);
            setRetention(retentionResult);
            setReview(reviewResult);
            setDifficulty(difficultyResult);
            setFailures(failureResult);
            setTrends(trendResult);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu tổng quan.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(filters, sort, page);
    }, [filters, load, page, sort]);

    const handleSort = (by: SortKey) => {
        setSort(current => ({
            by,
            direction: current.by === by && current.direction === 'desc' ? 'asc' : 'desc',
        }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ fromDate: '', toDate: '' });
        setPage(1);
    };

    const rows: LearningOverviewRow[] = overview?.rows ?? [];
    const chartData = trends.map(item => ({
        label: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        value: item.wordsStudied,
    }));

    if (loading && !overview) {
        return (
            <div className="flex items-center justify-center gap-3 py-32 text-text-muted">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="font-display font-bold">Đang tải tổng quan...</span>
            </div>
        );
    }

    if (error && !overview) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-32">
                <AlertTriangle size={40} className="text-danger-color" />
                <p className="font-bold text-danger-color">{error}</p>
                <Button variant="secondary" onClick={() => void load(filters, sort, page)}>
                    <RefreshCw size={16} /> Thử lại
                </Button>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={<Users size={22} className="text-text-on-accent" />} label="Người dùng hoạt động" value={overview?.activeUserCount ?? 0} />
                <StatCard icon={<BookOpen size={22} className="text-text-on-accent" />} label="Chủ đề đã học" value={overview?.learnedTopicCount ?? 0} tone="cyan" />
                <StatCard icon={<BookMarked size={22} className="text-text-on-accent" />} label="Từ đã học" value={overview?.totalWordsStudied.toLocaleString('vi-VN') ?? 0} tone="accent" />
                <StatCard icon={<Clock size={22} className="text-text-on-accent" />} label="Giờ hoạt động" value={overview?.totalActiveHours.toFixed(1) ?? 0} tone="secondary" />
            </div>

            <div className="mb-8 grid gap-4 lg:grid-cols-3">
                <DashboardCard title="Tổng quan duy trì học tập" subtitle="Tính từ người học quay lại trong khoảng thời gian đã chọn.">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-3xl font-display font-bold text-text-primary">{retention?.retentionRate ?? 0}%</p>
                            <p className="mt-1 text-xs text-text-muted">{retention?.returningLearners ?? 0} người học quay lại</p>
                        </div>
                        <Users size={30} className="text-primary" />
                    </div>
                    <div className="mt-5"><ProgressBar value={retention?.retentionRate ?? 0} max={100} tone="primary" /></div>
                </DashboardCard>

                <DashboardCard title="Tỷ lệ hoàn thành ôn tập" subtitle="Dữ liệu thực từ kết quả bài tập và lịch ôn.">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-3xl font-display font-bold text-text-primary">{review?.completionRate ?? 0}%</p>
                            <p className="mt-1 text-xs text-text-muted">{review?.successfulReviews ?? 0}/{review?.reviewAttempts ?? 0} lượt ôn thành công</p>
                        </div>
                        <Activity size={30} className="text-success-color" />
                    </div>
                    <div className="mt-5"><ProgressBar value={review?.completionRate ?? 0} max={100} tone="success" /></div>
                </DashboardCard>

                <DashboardCard title="Xu hướng học theo ngày" subtitle="Số từ học theo ngày trong khoảng đã chọn.">
                    {chartData.some(item => item.value > 0)
                        ? <MiniBarChart data={chartData} tone="accent" />
                        : <EmptyState icon={<BarChart3 size={20} />} title="Chưa có dữ liệu xu hướng" description="Dữ liệu xuất hiện sau khi người học hoàn thành phiên học." />}
                </DashboardCard>
            </div>

            <div className="mb-8 grid gap-4 lg:grid-cols-2">
                <DashboardCard title="Phân tích từ vựng khó" subtitle="Xếp hạng theo tỷ lệ sai và chất lượng trả lời.">
                    {difficulty.length === 0 ? (
                        <EmptyState icon={<AlertTriangle size={20} />} title="Chưa có dữ liệu độ khó từ vựng" description="Cần kết quả bài tập để xác định từ khó." />
                    ) : (
                        <div className="space-y-3">
                            {difficulty.map(item => (
                                <div key={item.vocabId} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="truncate font-display font-bold text-text-primary">{item.word}</p>
                                        <p className="truncate text-xs text-text-muted">{item.topicName || 'Chưa có chủ đề'} · {item.failures}/{item.attempts} lượt sai</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-danger-color">{item.failureRate}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardCard>

                <DashboardCard title="Bài tập sai nhiều nhất" subtitle="Xếp hạng theo tỷ lệ trả lời sai.">
                    {failures.length === 0 ? (
                        <EmptyState icon={<BookMarked size={20} />} title="Chưa có dữ liệu bài tập sai" description="Cần kết quả bài tập để tạo thống kê." />
                    ) : (
                        <div className="space-y-3">
                            {failures.map(item => (
                                <div key={item.exerciseId} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="truncate font-display font-bold text-text-primary">{item.word}</p>
                                        <p className="truncate text-xs text-text-muted">{item.exerciseType} · {item.failures}/{item.attempts} lượt sai</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-bold text-danger-color">{item.failureRate}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </DashboardCard>
            </div>

            <FilterBar actions={(filters.fromDate || filters.toDate) ? <Button variant="ghost" onClick={clearFilters}>Xóa bộ lọc</Button> : undefined}>
                <Input label="Từ ngày" type="date" value={filters.fromDate} onChange={event => { setFilters(current => ({ ...current, fromDate: event.target.value })); setPage(1); }} />
                <Input label="Đến ngày" type="date" value={filters.toDate} onChange={event => { setFilters(current => ({ ...current, toDate: event.target.value })); setPage(1); }} />
            </FilterBar>

            {error && <p className="mb-4 text-sm font-semibold text-danger-color">{error}</p>}
            <DataTable headers={[]}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-primary/10">
                                {[
                                    ['Người dùng', 'user'], ['Chủ đề', 'topic'], ['Phiên học', 'sessions'],
                                    ['Số từ', 'words'], ['Thời gian', 'activeminutes'],
                                    ['Hoạt động đầu', 'firstactivity'], ['Hoạt động gần nhất', 'lastactivity'],
                                ].map(([label, key]) => (
                                    <SortableColumnHeader key={key} label={label} active={sort.by === key} direction={sort.direction} onSort={() => handleSort(key as SortKey)} />
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-text-muted">Không có hoạt động học trong khoảng đã chọn.</td></tr>
                            ) : rows.map(row => (
                                <tr key={`${row.userId}-${row.topicId}`} className="border-b border-primary/5 transition-colors hover:bg-primary/[0.03]">
                                    <td className="px-4 py-3.5 text-sm font-display font-bold text-text-primary">{row.username}</td>
                                    <td className="px-4 py-3.5 text-sm text-text-muted">{row.topicName}</td>
                                    <td className="px-4 py-3.5 text-center text-sm text-text-primary">{row.sessionCount}</td>
                                    <td className="px-4 py-3.5 text-center text-sm text-text-primary">{row.wordsStudied}</td>
                                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-text-muted">{formatMinutes(row.activeMinutes)}</td>
                                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-text-muted">{formatDate(row.firstActivityAt)}</td>
                                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-text-muted">{formatDate(row.lastActivityAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={page} totalPages={overview?.totalPages ?? 1} onPageChange={setPage} summary={`Trang ${overview?.page ?? 1}/${overview?.totalPages ?? 1} · ${overview?.totalRows ?? 0} dòng`} />
            </DataTable>
        </div>
    );
};

export default AdminOverview;
