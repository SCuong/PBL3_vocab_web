import { useCallback, useEffect, useState } from 'react';
import {
    AlertTriangle, ChevronDown, ChevronLeft,
    ChevronRight, ChevronUp, Clock, Loader2, RefreshCw,
    Users, BookOpen, BookMarked,
} from 'lucide-react';
import { Button } from '../../components/ui';
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

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => (
    <div className="glass-card p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-0.5">
                {label}
            </p>
            <p className="text-2xl font-display font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

interface SortHeaderProps {
    label: string;
    sortKey: SortKey;
    sort: SortState;
    onSort: (key: SortKey) => void;
}

const SortHeader = ({ label, sortKey, sort, onSort }: SortHeaderProps) => {
    const isActive = sort.by === sortKey;
    return (
        <th
            onClick={() => onSort(sortKey)}
            className="px-4 py-3.5 text-left text-xs font-display font-bold text-text-muted uppercase tracking-wider cursor-pointer select-none group whitespace-nowrap"
        >
            <div className="flex items-center gap-1">
                {label}
                <span className={`transition-opacity ${isActive ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-40'}`}>
                    {isActive && sort.direction === 'asc'
                        ? <ChevronUp size={12} />
                        : <ChevronDown size={12} />
                    }
                </span>
            </div>
        </th>
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

    const inputClass =
        'px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary transition-colors';
    const labelClass = 'text-xs font-display font-bold text-text-muted';

    const rows: LearningOverviewRow[] = result?.rows ?? [];

    return (
        <div>
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    icon={<Users size={22} className="text-white" />}
                    label="Active Users"
                    value={result?.activeUserCount ?? '—'}
                    color="bg-primary"
                />
                <StatCard
                    icon={<BookOpen size={22} className="text-white" />}
                    label="Topics Studied"
                    value={result?.learnedTopicCount ?? '—'}
                    color="bg-cyan"
                    // reuse cyan via inline style
                />
                <StatCard
                    icon={<BookMarked size={22} className="text-white" />}
                    label="Words Studied"
                    value={result?.totalWordsStudied?.toLocaleString() ?? '—'}
                    color="bg-accent"
                />
                <StatCard
                    icon={<Clock size={22} className="text-white" />}
                    label="Active Hours"
                    value={result ? result.totalActiveHours.toFixed(1) : '—'}
                    color="bg-secondary"
                />
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <p className={`${labelClass} mb-1.5`}>From Date</p>
                    <input
                        type="date"
                        className={inputClass}
                        value={filters.fromDate}
                        onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                    />
                </div>
                <div>
                    <p className={`${labelClass} mb-1.5`}>To Date</p>
                    <input
                        type="date"
                        className={inputClass}
                        value={filters.toDate}
                        onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="primary" onClick={applyFilters} disabled={loading}>
                        Apply
                    </Button>
                    {(filters.fromDate || filters.toDate) && (
                        <Button variant="ghost" onClick={clearFilters} disabled={loading}>
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
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

                        {/* Pagination */}
                        {(result?.totalPages ?? 0) > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10">
                                <span className="text-xs text-text-muted">
                                    Page {result!.page} of {result!.totalPages} — {result!.totalRows} rows total
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-3 text-sm font-display font-bold text-text-primary">
                                        {page} / {result!.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(result!.totalPages, p + 1))}
                                        disabled={page === result!.totalPages}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminOverview;
