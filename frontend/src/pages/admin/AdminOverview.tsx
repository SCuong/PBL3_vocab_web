import { useCallback, useEffect, useState } from 'react';
import {
    AlertTriangle, Activity, BarChart3, Clock, Loader2, RefreshCw,
    Users, BookOpen, BookMarked,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { DataTable, FilterBar, Input, Pagination, SortableColumnHeader, StatCard } from '../../components/admin/ui';
import { DashboardCard, EmptyState, MiniBarChart, ProgressBar } from '../../components/dashboard';
import {
    adminApi,
    type LearningOverviewRow,
    type AdminLearningOverviewResult,
} from '../../services/adminApi';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

const toDayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const buildDailyTrend = (rows: LearningOverviewRow[]) => {
    const buckets = new Map<string, number>();
    rows.forEach(row => {
        const key = row.lastActivityAt?.slice(0, 10);
        if (!key) return;
        buckets.set(key, (buckets.get(key) ?? 0) + row.wordsStudied);
    });
    return Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, value]) => ({ label: toDayLabel(date), value }));
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey =
    | 'user'
    | 'topic'
    | 'sessions'
    | 'words'
    | 'activeminutes'
    | 'firstactivity'
    | 'lastactivity';

interface SortState {
    by: SortKey;
    direction: 'asc' | 'desc';
}

interface Filters {
    fromDate: string;
    toDate: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface SortHeaderProps {
    label: string;
    sortKey: SortKey;
    sort: SortState;
    onSort: (key: SortKey) => void;
}

const SortHeader = ({ label, sortKey, sort, onSort }: SortHeaderProps) => {
    const isActive = sort.by === sortKey;
    return (
        <SortableColumnHeader
            label={label}
            active={isActive}
            direction={sort.direction}
            onSort={() => onSort(sortKey)}
            className="whitespace-nowrap"
        />
    );
};

// ── AdminOverview ─────────────────────────────────────────────────────────────

const AdminOverview = () => {
    const [result, setResult] = useState<AdminLearningOverviewResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState<Filters>({ fromDate: '', toDate: '' });
    const [sort, setSort] = useState<SortState>({ by: 'lastactivity', direction: 'desc' });
    const [page, setPage] = useState(1);

    const PAGE_SIZE = 20;

    const load = useCallback(async (
        currentFilters: Filters,
        currentSort: SortState,
        currentPage: number
    ) => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getLearningOverview({
                fromDate: currentFilters.fromDate || undefined,
                toDate: currentFilters.toDate || undefined,
                sortBy: currentSort.by,
                sortDirection: currentSort.direction,
                page: currentPage,
                pageSize: PAGE_SIZE,
            });
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load overview');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(filters, sort, page);
    }, [load, filters, sort, page]);

    const handleSort = (key: SortKey) => {
        const next: SortState =
            sort.by === key
                ? { by: key, direction: sort.direction === 'asc' ? 'desc' : 'asc' }
                : { by: key, direction: 'desc' };
        setSort(next);
        setPage(1);
    };

    const applyFilters = () => {
        setPage(1);
        void load(filters, sort, 1);
    };

    const clearFilters = () => {
        const cleared: Filters = { fromDate: '', toDate: '' };
        setFilters(cleared);
        setPage(1);
        void load(cleared, sort, 1);
    };

    const rows: LearningOverviewRow[] = result?.rows ?? [];
    const activeLearners = new Set(rows.map(row => row.userId)).size;
    const returningLearners = rows.filter(row => row.sessionCount > 1).length;
    const retentionRate = rows.length > 0 ? Math.round((returningLearners / rows.length) * 100) : 0;
    const reviewCompletionRate = rows.length > 0
        ? Math.min(100, Math.round((rows.reduce((sum, row) => sum + row.wordsStudied, 0) / Math.max(1, rows.reduce((sum, row) => sum + row.sessionCount, 0) * 8)) * 100))
        : 0;
    const dailyTrend = buildDailyTrend(rows);

    return (
        <div>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Users size={22} className="text-text-on-accent" />}
                    label="Active Users"
                    value={result?.activeUserCount ?? '—'}
                    tone="primary"
                />
                <StatCard
                    icon={<BookOpen size={22} className="text-text-on-accent" />}
                    label="Topics Studied"
                    value={result?.learnedTopicCount ?? '—'}
                    tone="cyan"
                />
                <StatCard
                    icon={<BookMarked size={22} className="text-text-on-accent" />}
                    label="Words Studied"
                    value={result?.totalWordsStudied?.toLocaleString() ?? '—'}
                    tone="accent"
                />
                <StatCard
                    icon={<Clock size={22} className="text-text-on-accent" />}
                    label="Active Hours"
                    value={result ? result.totalActiveHours.toFixed(1) : '—'}
                    tone="secondary"
                />
            </div>

            <div className="mb-8 grid gap-4 lg:grid-cols-3">
                <DashboardCard title="Retention overview" subtitle="Derived from repeat learner sessions in current filter window.">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-3xl font-display font-bold text-text-primary">{retentionRate}%</p>
                            <p className="mt-1 text-xs text-text-muted">{returningLearners} returning activity rows</p>
                        </div>
                        <Users size={30} className="text-primary" />
                    </div>
                    <div className="mt-5">
                        <ProgressBar value={retentionRate} max={100} tone="primary" />
                    </div>
                </DashboardCard>

                <DashboardCard title="Review completion rate" subtitle="Estimated from words studied per session until review-event API exists.">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-3xl font-display font-bold text-text-primary">{reviewCompletionRate}%</p>
                            <p className="mt-1 text-xs text-text-muted">Proxy metric, not persisted review outcome.</p>
                        </div>
                        <Activity size={30} className="text-success-color" />
                    </div>
                    <div className="mt-5">
                        <ProgressBar value={reviewCompletionRate} max={100} tone="success" />
                    </div>
                </DashboardCard>

                <DashboardCard title="Daily learning trends" subtitle="Words studied by last activity date.">
                    {dailyTrend.length > 0 ? (
                        <MiniBarChart data={dailyTrend} tone="accent" />
                    ) : (
                        <EmptyState
                            icon={<BarChart3 size={20} />}
                            title="No trend data"
                            description="Learning activity appears here after learners complete sessions."
                        />
                    )}
                </DashboardCard>
            </div>

            <div className="mb-8 grid gap-4 lg:grid-cols-2">
                <DashboardCard title="Hardest vocabulary analytics" subtitle="Needs per-word review quality/failure endpoint.">
                    <EmptyState
                        icon={<AlertTriangle size={20} />}
                        title="No word difficulty feed yet"
                        description="Add backend aggregation over exercise_result quality/accuracy by vocab_id to rank hardest words."
                    />
                </DashboardCard>

                <DashboardCard title="Most failed exercises" subtitle="Needs exercise failure aggregation endpoint.">
                    <EmptyState
                        icon={<BookMarked size={20} />}
                        title="No exercise failure feed yet"
                        description="Add backend aggregation over exercise_result by exercise_id and incorrect attempts."
                    />
                </DashboardCard>
            </div>

            {/* Filters */}
            <FilterBar
                actions={
                    <>
                    <Button variant="primary" onClick={applyFilters} disabled={loading}>
                        Apply
                    </Button>
                    {(filters.fromDate || filters.toDate) && (
                        <Button variant="ghost" onClick={clearFilters} disabled={loading}>
                            Clear
                        </Button>
                    )}
                    </>
                }
            >
                <Input
                    label="From Date"
                    type="date"
                    value={filters.fromDate}
                    onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                />
                <Input
                    label="To Date"
                    type="date"
                    value={filters.toDate}
                    onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                />
            </FilterBar>

            {/* Table */}
            <DataTable headers={[]}>
                {loading ? (
                    <div className="flex items-center justify-center py-24 gap-3 text-text-muted">
                        <Loader2 size={22} className="animate-spin text-primary" />
                        <span className="font-display font-bold">Loading…</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <AlertTriangle size={36} className="text-red-400" />
                        <p className="font-bold text-red-500">{error}</p>
                        <Button
                            variant="secondary"
                            onClick={() => void load(filters, sort, page)}
                        >
                            <RefreshCw size={16} /> Retry
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-primary/10">
                                        <SortHeader label="User" sortKey="user" sort={sort} onSort={handleSort} />
                                        <SortHeader label="Topic" sortKey="topic" sort={sort} onSort={handleSort} />
                                        <SortHeader label="Sessions" sortKey="sessions" sort={sort} onSort={handleSort} />
                                        <SortHeader label="Words" sortKey="words" sort={sort} onSort={handleSort} />
                                        <SortHeader label="Active Time" sortKey="activeminutes" sort={sort} onSort={handleSort} />
                                        <SortHeader label="First Activity" sortKey="firstactivity" sort={sort} onSort={handleSort} />
                                        <SortHeader label="Last Activity" sortKey="lastactivity" sort={sort} onSort={handleSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-4 py-16 text-center text-text-muted text-sm"
                                            >
                                                No learning activity found for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((row, i) => (
                                            <tr
                                                key={`${row.userId}-${row.topicId}-${i}`}
                                                className="border-b border-primary/5 hover:bg-primary/[0.03] transition-colors"
                                            >
                                                <td className="px-4 py-3.5 text-sm font-display font-bold text-text-primary whitespace-nowrap">
                                                    {row.username}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-text-muted">
                                                    {row.topicName}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-text-primary text-center">
                                                    {row.sessionCount}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-text-primary text-center">
                                                    {row.wordsStudied}
                                                </td>
                                                <td className="px-4 py-3.5 text-sm text-text-muted whitespace-nowrap">
                                                    {formatMinutes(row.activeMinutes)}
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-text-muted whitespace-nowrap">
                                                    {formatDate(row.firstActivityAt)}
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-text-muted whitespace-nowrap">
                                                    {formatDate(row.lastActivityAt)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={page}
                            totalPages={result?.totalPages ?? 0}
                            onPageChange={setPage}
                            summary={`Page ${result!.page} of ${result!.totalPages} - ${result!.totalRows} rows total`}
                        />
                    </>
                )}
            </DataTable>
        </div>
    );
};

export default AdminOverview;
