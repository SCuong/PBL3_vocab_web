type StreakHeatmapProps = {
    history?: string[];
    startDate?: string | null;
    selectedDate?: string | null;
    onSelectDate?: (day: string) => void;
};

const toLocalIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isIsoDateString = (value: unknown): value is string => (
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
);

const normalizeDateInput = (value: unknown) => {
    if (!value || typeof value !== 'string') {
        return null;
    }

    const asIsoDate = value.slice(0, 10);
    if (isIsoDateString(asIsoDate)) {
        return asIsoDate;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return toLocalIsoDate(parsed);
};

export const StreakHeatmap = ({ history = [], startDate, selectedDate, onSelectDate }: StreakHeatmapProps) => {
    const historySet = new Set(history);

    const today = new Date();
    const normalizedStartDate = normalizeDateInput(startDate);
    const startAnchor = normalizedStartDate
        ? new Date(`${normalizedStartDate}T00:00:00`)
        : (() => {
            const fallback = new Date(today);
            fallback.setDate(fallback.getDate() - 29);
            return fallback;
        })();

    const safeStart = Number.isNaN(startAnchor.getTime()) || startAnchor > today
        ? (() => {
            const fallback = new Date(today);
            fallback.setDate(fallback.getDate() - 29);
            return fallback;
        })()
        : startAnchor;

    const totalDays = Math.max(1, Math.floor((today.getTime() - safeStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);

    const days = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(safeStart);
        d.setDate(safeStart.getDate() + i);
        return toLocalIsoDate(d);
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
