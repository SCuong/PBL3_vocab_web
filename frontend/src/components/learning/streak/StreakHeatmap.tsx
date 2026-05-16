import { memo } from 'react';

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

const StreakHeatmapComponent = ({ history = [], startDate, selectedDate, onSelectDate }: StreakHeatmapProps) => {
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
            {days.map(day => {
                const classes = ['heatmap-cell'];
                if (historySet.has(day)) classes.push('is-active');
                if (selectedDate === day) classes.push('is-selected');
                return (
                    <button
                        key={day}
                        type="button"
                        className={classes.join(' ')}
                        title={day}
                        onClick={() => onSelectDate?.(day)}
                    />
                );
            })}
        </div>
    );
};

export const StreakHeatmap = memo(StreakHeatmapComponent);
