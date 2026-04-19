const Leaderboard = ({ gameData }: any) => {
    const leaderboard = gameData?.leaderboard || [];
    const top3 = leaderboard.slice(0, 3);

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="text-center mb-16"><h1 className="text-4xl mb-4">Bảng xếp hạng</h1></header>
            <div className="podium items-end mb-16 flex justify-center gap-4">
                {top3.length > 1 && (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full border-4 border-primary p-1 mb-2 shadow-lg"><div className="w-full h-full rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-3xl">{top3[1].avatar}</div></div>
                        <div className="font-bold text-sm mb-2">{top3[1].username}</div>
                        <div className="w-32 h-32 bg-primary/20 rounded-t-xl flex items-center justify-center text-4xl font-display border-x border-t border-primary/30">2</div>
                    </div>
                )}
                {top3.length > 0 && (
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full border-4 border-accent p-1 mb-4 shadow-xl scale-110"><div className="w-full h-full rounded-full bg-linear-to-br from-accent to-secondary flex items-center justify-center text-4xl">{top3[0].avatar}</div></div>
                        <div className="font-bold mb-2">{top3[0].username}</div>
                        <div className="w-40 h-48 bg-accent/20 rounded-t-xl flex items-center justify-center text-6xl font-display border-x border-t border-accent/30 shadow-inner">1</div>
                    </div>
                )}
                {top3.length > 2 && (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full border-4 border-secondary p-1 mb-2 shadow-sm"><div className="w-full h-full rounded-full bg-linear-to-br from-secondary to-primary flex items-center justify-center text-2xl">{top3[2].avatar}</div></div>
                        <div className="font-bold text-xs mb-2">{top3[2].username}</div>
                        <div className="w-28 h-24 bg-secondary/20 rounded-t-xl flex items-center justify-center text-3xl font-display border-x border-t border-secondary/30">3</div>
                    </div>
                )}
            </div>
            <div className="glass-card divide-y divide-purple/10">
                {leaderboard.map((u: any, i: number) => (
                    <div key={u.id} className="flex items-center gap-6 p-6 hover:bg-purple/5 transition-colors">
                        <div className="font-mono text-xl font-bold w-10 text-text-muted">#{i + 1}</div>
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm border border-primary/10">{u.avatar}</div>
                        <div className="flex-1 font-bold">{u.username}</div>
                        <div className="font-mono text-primary font-bold">{u.xp} XP</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Leaderboard;
