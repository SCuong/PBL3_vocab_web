type StreakHeatmapProps = {
    history?: string[];
    selectedDate?: string | null;
    onSelectDate?: (day: string) => void;
};

export const StreakHeatmap = ({ history = [], selectedDate, onSelectDate }: StreakHeatmapProps) => {
    const historySet = new Set(history);

    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="heatmap-grid flex flex-wrap gap-1">
            {days.map(day => (
                <button
                    key={day}
                    type="button"
                    className={`w-3 h-3 rounded-sm transition-all cursor-pointer ${historySet.has(day) ? 'bg-cyan shadow-[0_0_8px_rgba(153,255,255,0.35)]' : 'bg-purple/10 hover:bg-primary/25'} ${selectedDate === day ? 'ring-2 ring-primary ring-offset-1 ring-offset-white/40 scale-110' : ''}`}
                    title={day}
                    onClick={() => onSelectDate?.(day)}
                />
            ))}
        </div>
    );
};
