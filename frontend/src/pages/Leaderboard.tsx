import { useCallback, useEffect, useRef, useState } from 'react';
import { Medal, Flame, CheckCircle2, RotateCcw } from 'lucide-react';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Button } from '../components/ui';
import { ProfileFrameOverlay } from '../components/profile/ProfileFrameOverlay';
import { useAppContext } from '../context/AppContext';
import { loadProfilePreferences } from '../utils/profilePreferences';
import { normalizeAvatarUrl } from '../utils/avatarPresets';
import { leaderboardApi, type LeaderboardEntry } from '../services/leaderboardApi';



const Leaderboard = () => {
    const { profileFrameKey, currentUser: authUser } = useAppContext();
    // Avatar is a local preference (per browser) — only the current user's is known
    // client-side. Other rows fall back to the initial.
    const currentUserAvatar = authUser?.userId
        ? normalizeAvatarUrl(loadProfilePreferences(authUser.userId).avatarUrl)
        : undefined;
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

    const isMeRow = (u: LeaderboardEntry) =>
        Boolean(u.isCurrentUser || (authUser?.userId != null && Number(u.userId) === Number(authUser.userId)));

    const top3 = entries.slice(0, 3);
    const rest = entries.slice(3);
    const currentUserOutside = currentUser != null && !entries.some((e) => e.userId === currentUser.userId);
    const headerReveal = mounted ? 'is-visible' : '';
    const reveal = listRevealed ? 'is-visible' : '';
    const me = currentUser ?? entries.find(isMeRow) ?? null;
    const above = me ? entries.find(e => e.rank === me.rank - 1) : undefined;

    const avatar = (u: LeaderboardEntry, size: 40 | 48) => {
        const isMe = isMeRow(u);
        return (
            <span className="relative inline-flex shrink-0">
                <Avatar src={isMe ? currentUserAvatar : undefined} name={u.username} size={size} />
                {isMe && <ProfileFrameOverlay frameKey={profileFrameKey} />}
            </span>
        );
    };

    const meta = (u: LeaderboardEntry) => (
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
            <span>Cấp {u.level}</span>
            <span className="inline-flex items-center gap-1"><Flame size={12} aria-hidden />{u.streak} ngày</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} aria-hidden />{u.masteredWords} từ</span>
        </span>
    );

    const youTag = <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-text-on-accent">Bạn</span>;

    const renderRow = (u: LeaderboardEntry, delay: number) => {
        const isMe = isMeRow(u);
        return (
        <li
            key={u.userId}
            className={`leaderboard-fade-in ${reveal} flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 ${isMe ? 'bg-primary-light' : ''}`}
            style={{ transitionDelay: `${delay}ms` }}
            aria-current={isMe ? 'true' : undefined}
        >
            <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-text-muted">{u.rank}</span>
            {avatar(u, 40)}
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-text-primary">{u.username}</span>
                    {isMe && youTag}
                </span>
                {meta(u)}
            </span>
            <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">
                {u.totalXp.toLocaleString('vi-VN')} <span className="font-normal text-text-muted">XP</span>
            </span>
        </li>
        );
    };

    const MEDAL = ['var(--color-icon-warning, #d4a017)', 'var(--text-muted)', '#b46a3c'];

    return (
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
            <header className={`leaderboard-fade-in ${headerReveal} mb-6 sm:mb-8`}>
                <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-text-primary sm:text-[2.125rem]">Bảng xếp hạng</h1>
            </header>

            {loading ? (
                <div className="space-y-3" aria-busy="true" aria-label="Đang tải bảng xếp hạng">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-[var(--radius-container)] bg-bg-secondary motion-safe:animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="vocab-empty">
                    <p className="font-semibold text-text-primary">Chưa thể tải bảng xếp hạng</p>
                    <p className="mt-1 text-sm">Kiểm tra kết nối rồi thử lại.</p>
                    <Button variant="secondary" className="mx-auto mt-4" onClick={() => void load()}>
                        <RotateCcw size={16} aria-hidden /> Thử lại
                    </Button>
                </div>
            ) : entries.length === 0 ? (
                <div className="vocab-empty">
                    <p className="font-semibold text-text-primary">Chưa có ai trên bảng xếp hạng</p>
                    <p className="mt-1 text-sm">Hoàn thành một phiên học để ghi tên đầu tiên.</p>
                </div>
            ) : (
                <>
                    {me && (
                        <section
                            className={`leaderboard-fade-in ${headerReveal} mb-4 flex items-center gap-4 rounded-[var(--radius-container)] border border-primary/25 bg-surface p-4 sm:p-5`}
                            aria-label="Hạng của bạn"
                        >
                            <span className="text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-primary">#{me.rank}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-text-primary">Hạng của bạn</span>
                                <span className="block text-sm text-text-muted">
                                    {above
                                        ? <>Cần thêm <span className="font-semibold tabular-nums text-text-primary">{(above.totalXp - me.totalXp + 1).toLocaleString('vi-VN')} XP</span> để vượt {above.username}</>
                                        : me.rank === 1 ? 'Bạn đang dẫn đầu. Giữ chuỗi để giữ hạng.' : `${me.totalXp.toLocaleString('vi-VN')} XP`}
                                </span>
                            </span>
                        </section>
                    )}

                    <ol
                        className={`mb-4 grid gap-3 ${
                            top3.length === 1
                                ? 'sm:mx-auto sm:max-w-sm sm:grid-cols-1'
                                : top3.length === 2
                                  ? 'sm:mx-auto sm:max-w-2xl sm:grid-cols-2'
                                  : 'sm:grid-cols-3'
                        }`}
                        aria-label="Top 3"
                    >
                        {top3.map((u, i) => {
                            const isMe = isMeRow(u);
                            const isSingle = top3.length === 1;
                            return (
                            <li
                                key={u.userId}
                                className={`leaderboard-fade-in ${reveal} flex items-center gap-5 rounded-[var(--radius-container)] border-2 bg-surface p-4 sm:flex-col sm:gap-4 sm:p-5 ${
                                    isSingle ? 'sm:items-center sm:text-center' : 'sm:items-start'
                                } ${
                                    isMe ? 'border-primary/40' : 'border-border'
                                }`}
                                style={{ transitionDelay: `${i * 50}ms` }}
                            >
                                <span className={`flex items-center gap-2 text-sm font-semibold text-text-muted ${isSingle ? 'sm:justify-center' : 'sm:w-full'}`}>
                                    <Medal size={18} style={{ color: MEDAL[i] }} aria-hidden />
                                    <span className="sr-only sm:not-sr-only">Hạng {u.rank}</span>
                                </span>
                                <span className="py-1">{avatar(u, 48)}</span>
                                <span className="min-w-0 flex-1 sm:w-full">
                                    <span className={`flex items-center gap-2 ${isSingle ? 'sm:justify-center' : ''}`}>
                                        <span className="truncate font-semibold text-text-primary">{u.username}</span>
                                        {isMe && youTag}
                                    </span>
                                    <span className="mt-1 block text-xl font-bold tabular-nums tracking-[-0.01em] text-text-primary">
                                        {u.totalXp.toLocaleString('vi-VN')} <span className="text-sm font-medium text-text-muted">XP</span>
                                    </span>
                                </span>
                            </li>
                            );
                        })}
                    </ol>

                    {(rest.length > 0 || currentUserOutside) && (
                        <ol className="divide-y divide-border overflow-hidden rounded-[var(--radius-container)] border border-border bg-surface" start={4}>
                            {rest.map((u, i) => renderRow(u, Math.min(i * 35, 300)))}
                            {currentUserOutside && currentUser && renderRow(currentUser, 300)}
                        </ol>
                    )}
                </>
            )}
        </div>
    );
};

export default Leaderboard;
