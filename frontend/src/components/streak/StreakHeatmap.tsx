type StreakHeatmapProps = {
    history: string[];
};

export const StreakHeatmap = ({ history }: StreakHeatmapProps) => {
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="heatmap-grid flex flex-wrap gap-1">
            {days.map(day => (
                <div
                    key={day}
                    className={`w-3 h-3 rounded-sm ${history.includes(day) ? 'bg-cyan' : 'bg-purple/10'}`}
                    title={day}
                />
            ))}
        </div>
    );
};
