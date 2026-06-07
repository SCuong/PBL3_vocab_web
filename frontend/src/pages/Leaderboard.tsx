import { useCallback, useEffect, useRef, useState } from 'react';
import { Crown, Medal, Flame, CheckCircle2, Trophy, RotateCcw } from 'lucide-react';
import { PageTitle } from '../components/ui';
import { ProfileFrameOverlay } from '../components/profile/ProfileFrameOverlay';
import { useAppContext } from '../context/AppContext';
import { loadProfilePreferences } from '../utils/profilePreferences';
import { normalizeAvatarUrl } from '../utils/avatarPresets';
import { leaderboardApi, type LeaderboardEntry } from '../services/leaderboardApi';

const initialOf = (username: string) => (username?.trim()?.[0] ?? '?').toUpperCase();

// Visual config per podium rank. Avatars keep the brand gradient; the medal/
// crown icon carries the gold/silver/bronze meaning so it stays consistent
// with the purple/cyan style without looking candy-like.
const podiumStyle = (rank: number) => {
    if (rank === 1) return { Icon: Crown, icon: 'text-[#F5B82E]', avatar: 'from-primary to-accent', ring: 'border-accent', ped: 'bg-accent/15 border-accent/30' };
    if (rank === 2) return { Icon: Medal, icon: 'text-slate-400', avatar: 'from-cyan to-primary', ring: 'border-cyan', ped: 'bg-cyan/12 border-cyan/30' };
    return { Icon: Medal, icon: 'text-amber-600', avatar: 'from-secondary to-primary', ring: 'border-secondary', ped: 'bg-secondary/15 border-secondary/30' };
};

const rankBadgeTone = (rank: number) => {
    if (rank === 1) return 'bg-accent/15 text-accent';
    if (rank === 2) return 'bg-cyan/15 text-cyan';
    return 'bg-secondary/15 text-secondary';
};

const Leaderboard = () => {
    const { profileFrameKey, currentUser: authUser } = useAppContext();
    // Avatar is a local preference (per browser) — only the current user's is known
    // client-side. Other rows fall back to the initial.
    const currentUserAvatar = authUser?.userId
        ? normalizeAvatarUrl(loadProfilePreferences(authUser.userId).avatarUrl)
        : undefined;
    const renderAvatarInner = (u: LeaderboardEntry) =>
        u.isCurrentUser && currentUserAvatar
            ? <img src={currentUserAvatar} alt="" className="h-full w-full rounded-full object-cover" />
            : initialOf(u.username);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [listRevealed, setListRevealed] = useState(false);
    const reqId = useRef(0);

    // Same request/data shape as before; wrapped so the error state can retry.
    // A request id guards against stale responses and unmount (replaces the
    // previous `cancelled` flag).
    const load = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setError(false);
        try {
            const data = await leaderboardApi.get();
            if (id !== reqId.current) return;
            setEntries(Array.isArray(data.entries) ? data.entries : []);
            setCurrentUser(data.currentUser ?? null);
        } catch {
            if (id === reqId.current) setError(true);
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
        return () => { reqId.current++; };
    }, [load]);

    // Header/state cards reveal on mount.
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Podium + rows reveal once the first list of results has loaded.
    useEffect(() => {
        if (listRevealed || loading || error || entries.length === 0) return;
        const id = requestAnimationFrame(() => setListRevealed(true));
        return () => cancelAnimationFrame(id);
    }, [listRevealed, loading, error, entries]);

    const top3 = entries.slice(0, 3);
    const currentUserOutside = currentUser != null && !entries.some((e) => e.userId === currentUser.userId);
    const headerReveal = mounted ? 'is-visible' : '';
    const reveal = listRevealed ? 'is-visible' : '';

    const metaRow = (u: LeaderboardEntry) => (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-text-muted">
            <span>Cấp {u.level}</span>
            <span className="inline-flex items-center gap-1"><Flame size={12} className="text-warning-color" />{u.streak}</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-success-color" />{u.masteredWords}</span>
        </div>
    );

    // One ranking row, shared by the list and the appended current-user row.
    const renderRow = (u: LeaderboardEntry, delay: number) => (
        <div
            key={u.userId}
            className={`leaderboard-fade-in ${reveal} flex items-center gap-3 p-3.5 sm:gap-5 sm:p-5 ${u.isCurrentUser ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'hover:bg-purple/5'}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <div className="shrink-0">
                {u.rank <= 3 ? (
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold sm:h-9 sm:w-9 ${rankBadgeTone(u.rank)}`}>{u.rank}</span>
                ) : (
                    <span className="flex w-8 justify-center font-mono text-sm font-bold text-text-muted sm:w-10 sm:text-base">{u.rank}</span>
                )}
            </div>
            <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-display font-bold text-primary sm:h-11 sm:w-11">
                    {renderAvatarInner(u)}
                </div>
                {u.isCurrentUser && <ProfileFrameOverlay frameKey={profileFrameKey} sizeClass="h-[165%] w-[165%]" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-text-primary">{u.username}</span>
                    {u.isCurrentUser && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Bạn</span>
                    )}
                </div>
                {metaRow(u)}
            </div>
            <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-bold text-primary sm:text-base">{u.totalXp.toLocaleString('vi-VN')}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">XP</div>
            </div>
        </div>
    );

    // Desktop podium spot (rank 1 is the tallest/most prominent).
    const podiumSpot = (u: LeaderboardEntry) => {
        const s = podiumStyle(u.rank);
        const Icon = s.Icon;
        const big = u.rank === 1;
        const delay = u.rank === 1 ? 0 : u.rank === 2 ? 90 : 160;
        const pedHeight = u.rank === 1 ? 'h-40 max-w-36 text-5xl' : u.rank === 2 ? 'h-28 max-w-32 text-4xl' : 'h-20 max-w-28 text-3xl';
        return (
            <div
                key={u.userId}
                className={`leaderboard-fade-in ${reveal} flex min-w-0 flex-1 flex-col items-center`}
                style={{ transitionDelay: `${delay}ms` }}
            >
                <div className="relative mb-2">
                    <div className={`rounded-full border-4 ${s.ring} p-1 shadow-lg ${big ? 'h-24 w-24' : 'h-20 w-20'}`}>
                        <div className={`flex h-full w-full items-center justify-center rounded-full bg-linear-to-br ${s.avatar} font-display font-bold text-text-on-accent ${big ? 'text-2xl' : 'text-xl'}`}>
                            {renderAvatarInner(u)}
                        </div>
                    </div>
                    {u.isCurrentUser && <ProfileFrameOverlay frameKey={profileFrameKey} sizeClass="h-[150%] w-[150%]" />}
                    <Icon size={big ? 28 : 20} className={`absolute -top-3 left-1/2 -translate-x-1/2 ${s.icon} drop-shadow`} aria-hidden />
                </div>
                <div className="max-w-full truncate px-1 text-sm font-bold text-text-primary">
                    {u.username}
                    {u.isCurrentUser && <span className="ml-1 text-[10px] font-bold uppercase text-primary">Bạn</span>}
                </div>
                <div className="mb-2 font-mono text-xs font-bold text-primary">{u.totalXp.toLocaleString('vi-VN')} XP</div>
                <div className={`flex w-full items-center justify-center rounded-t-xl border-x border-t font-display ${s.ped} ${pedHeight}`}>{u.rank}</div>
            </div>
        );
    };

    // Mobile featured card for a top-3 entry (podium stacks cleanly here).
    const mobileTopCard = (u: LeaderboardEntry, i: number) => {
        const s = podiumStyle(u.rank);
        const Icon = s.Icon;
        return (
            <div
                key={u.userId}
                className={`leaderboard-fade-in ${reveal} flex items-center gap-3 rounded-2xl border p-4 ${u.rank === 1 ? 'border-accent/30 bg-accent/5' : 'border-border bg-surface'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
            >
                <div className="relative shrink-0">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br ${s.avatar} text-xl font-display font-bold text-text-on-accent`}>
                        {renderAvatarInner(u)}
                    </div>
                    {u.isCurrentUser && <ProfileFrameOverlay frameKey={profileFrameKey} sizeClass="h-[150%] w-[150%]" />}
                    <Icon size={18} className={`absolute -top-1.5 -right-1.5 ${s.icon} drop-shadow`} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold text-text-muted">{u.rank}.</span>
                        <span className="truncate font-bold text-text-primary">{u.username}</span>
                        {u.isCurrentUser && (
                            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Bạn</span>
                        )}
                    </div>
                    {metaRow(u)}
                </div>
                <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-bold text-primary">{u.totalXp.toLocaleString('vi-VN')}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">XP</div>
                </div>
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
            <header className={`leaderboard-fade-in ${headerReveal} relative mb-8 overflow-hidden rounded-3xl border border-primary/10 bg-surface/60 px-6 py-8 text-center sm:mb-12 sm:py-10`}>
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-16 left-1/4 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
                    <div className="absolute -top-12 right-1/4 h-40 w-40 translate-x-1/2 rounded-full bg-cyan/20 blur-3xl" />
                </div>
                <div className="relative">
                    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-primary">
                        <Trophy size={14} /> Cộng đồng VocabLearning
                    </span>
                    <PageTitle>Bảng xếp hạng</PageTitle>
                    <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary sm:text-base">
                        Xếp hạng theo tổng XP — học mỗi ngày để vươn lên top đầu.
                    </p>
                </div>
            </header>

            {loading ? (
                <div className={`leaderboard-fade-in ${headerReveal} space-y-8`} aria-hidden>
                    <div className="hidden items-end justify-center gap-4 sm:flex">
                        {[2, 1, 3].map((rank) => (
                            <div key={rank} className="flex flex-1 flex-col items-center">
                                <div className={`mb-3 rounded-full bg-primary/10 ${rank === 1 ? 'h-24 w-24' : 'h-20 w-20'} animate-pulse`} />
                                <div className="mb-3 h-3 w-20 rounded bg-primary/10 animate-pulse" />
                                <div className={`w-full rounded-t-xl bg-primary/10 animate-pulse ${rank === 1 ? 'h-40 max-w-36' : rank === 2 ? 'h-28 max-w-32' : 'h-20 max-w-28'}`} />
                            </div>
                        ))}
                    </div>
                    <div className="glass-card divide-y divide-purple/10 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3.5 sm:gap-5 sm:p-5">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 animate-pulse" />
                                <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 animate-pulse sm:h-11 sm:w-11" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-1/3 rounded bg-primary/10 animate-pulse" />
                                    <div className="h-3 w-1/4 rounded bg-primary/10 animate-pulse" />
                                </div>
                                <div className="h-4 w-14 shrink-0 rounded bg-primary/10 animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className={`leaderboard-fade-in ${headerReveal} mx-auto max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-[0_8px_30px_var(--shadow-color)]`}>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-color/15 text-warning-color">
                        <Trophy size={26} />
                    </div>
                    <h2 className="font-display text-xl font-bold text-text-primary">Chưa thể tải bảng xếp hạng</h2>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-text-muted">Vui lòng thử lại sau.</p>
                    <button type="button" onClick={() => void load()} className="btn-primary mx-auto mt-5 inline-flex">
                        <RotateCcw size={16} /> Thử lại
                    </button>
                </div>
            ) : entries.length === 0 ? (
                <div className={`leaderboard-fade-in ${headerReveal} mx-auto max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-[0_8px_30px_var(--shadow-color)]`}>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Trophy size={26} />
                    </div>
                    <h2 className="font-display text-xl font-bold text-text-primary">Chưa có dữ liệu xếp hạng</h2>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-text-muted">Hãy học mỗi ngày để ghi tên lên bảng xếp hạng!</p>
                </div>
            ) : (
                <>
                    {/* Mobile: top 3 stacked as featured cards */}
                    <div className="mb-8 space-y-3 sm:hidden">
                        {top3.map((u, i) => mobileTopCard(u, i))}
                    </div>

                    {/* Desktop: podium (rank 2 · 1 · 3) */}
                    <div className="mb-12 hidden items-end justify-center gap-4 sm:flex">
                        {top3.length > 1 && podiumSpot(top3[1])}
                        {top3.length > 0 && podiumSpot(top3[0])}
                        {top3.length > 2 && podiumSpot(top3[2])}
                    </div>

                    {/* Full ranking list */}
                    <div className="glass-card divide-y divide-purple/10 overflow-hidden">
                        {entries.map((u, i) => renderRow(u, Math.min(i * 40, 360)))}
                        {currentUserOutside && currentUser && renderRow(currentUser, 360)}
                    </div>
                </>
            )}
        </div>
    );
};

export default Leaderboard;
