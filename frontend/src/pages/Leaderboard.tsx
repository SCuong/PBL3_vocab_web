import { useEffect, useState } from 'react';
import { PageTitle } from '../components/ui';
import { leaderboardApi, type LeaderboardEntry } from '../services/leaderboardApi';

const initialOf = (username: string) => (username?.trim()?.[0] ?? '?').toUpperCase();

const Leaderboard = () => {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [currentUser, setCurrentUser] = useState<LeaderboardEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);
        leaderboardApi.get()
            .then((data) => {
                if (cancelled) return;
                setEntries(Array.isArray(data.entries) ? data.entries : []);
                setCurrentUser(data.currentUser ?? null);
            })
            .catch(() => { if (!cancelled) setError(true); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const top3 = entries.slice(0, 3);
    // Show the current user's own row below the list when they're outside the visible entries.
    const currentUserOutside = currentUser != null && !entries.some((e) => e.userId === currentUser.userId);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="text-center mb-12"><PageTitle>Bảng xếp hạng</PageTitle></header>

            {loading ? (
                <div className="text-center text-text-muted py-16">Đang tải bảng xếp hạng...</div>
            ) : error ? (
                <div className="text-center text-text-muted py-16">Không thể tải bảng xếp hạng. Vui lòng thử lại sau.</div>
            ) : entries.length === 0 ? (
                <div className="text-center text-text-muted py-16">Chưa có dữ liệu xếp hạng. Hãy học để ghi tên lên bảng!</div>
            ) : (
                <>
                    <div className="podium items-end mb-16 flex justify-center gap-4">
                        {top3.length > 1 && (
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full border-4 border-primary p-1 mb-2 shadow-lg"><div className="w-full h-full rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-2xl font-display font-bold text-text-on-accent">{initialOf(top3[1].username)}</div></div>
                                <div className="font-bold text-sm mb-2">{top3[1].username}</div>
                                <div className="w-32 h-32 bg-primary/20 rounded-t-xl flex items-center justify-center text-[2rem] font-display border-x border-t border-primary/30">2</div>
                            </div>
                        )}
                        {top3.length > 0 && (
                            <div className="flex flex-col items-center">
                                <div className="w-24 h-24 rounded-full border-4 border-accent p-1 mb-4 shadow-xl scale-110"><div className="w-full h-full rounded-full bg-linear-to-br from-accent to-secondary flex items-center justify-center text-[1.75rem] font-display font-bold text-text-on-accent">{initialOf(top3[0].username)}</div></div>
                                <div className="font-bold mb-2">{top3[0].username}</div>
                                <div className="w-40 h-48 bg-accent/20 rounded-t-xl flex items-center justify-center text-[3rem] font-display border-x border-t border-accent/30 shadow-inner">1</div>
                            </div>
                        )}
                        {top3.length > 2 && (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full border-4 border-secondary p-1 mb-2 shadow-sm"><div className="w-full h-full rounded-full bg-linear-to-br from-secondary to-primary flex items-center justify-center text-xl font-display font-bold text-text-on-accent">{initialOf(top3[2].username)}</div></div>
                                <div className="font-bold text-xs mb-2">{top3[2].username}</div>
                                <div className="w-28 h-24 bg-secondary/20 rounded-t-xl flex items-center justify-center text-3xl font-display border-x border-t border-secondary/30">3</div>
                            </div>
                        )}
                    </div>

                    <div className="glass-card divide-y divide-purple/10">
                        {entries.map((u) => (
                            <div
                                key={u.userId}
                                className={`flex items-center gap-6 p-6 transition-colors ${u.isCurrentUser ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-purple/5'}`}
                            >
                                <div className="font-mono text-xl font-bold w-10 text-text-muted">#{u.rank}</div>
                                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-lg font-display font-bold text-primary shadow-sm border border-primary/10">{initialOf(u.username)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate">
                                        {u.username}
                                        {u.isCurrentUser && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary">Bạn</span>}
                                    </div>
                                    <div className="text-xs text-text-muted">Cấp {u.level} · 🔥 {u.streak} ngày</div>
                                </div>
                                <div className="font-mono text-primary font-bold">{u.totalXp.toLocaleString('vi-VN')} XP</div>
                            </div>
                        ))}

                        {currentUserOutside && currentUser && (
                            <div className="flex items-center gap-6 p-6 bg-primary/10 ring-1 ring-primary/30">
                                <div className="font-mono text-xl font-bold w-10 text-text-muted">#{currentUser.rank}</div>
                                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-lg font-display font-bold text-primary shadow-sm border border-primary/10">{initialOf(currentUser.username)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate">
                                        {currentUser.username}
                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-primary">Bạn</span>
                                    </div>
                                    <div className="text-xs text-text-muted">Cấp {currentUser.level} · 🔥 {currentUser.streak} ngày</div>
                                </div>
                                <div className="font-mono text-primary font-bold">{currentUser.totalXp.toLocaleString('vi-VN')} XP</div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Leaderboard;
