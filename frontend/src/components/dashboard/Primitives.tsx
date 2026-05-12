import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { typography } from '../ui';

type Tone = 'primary' | 'cyan' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

const toneText: Record<Tone, string> = {
    primary: 'text-primary',
    cyan: 'text-cyan',
    accent: 'text-accent',
    success: 'text-success-color',
    warning: 'text-warning-color',
    danger: 'text-danger-color',
    muted: 'text-text-muted',
};

const toneBg: Record<Tone, string> = {
    primary: 'bg-primary',
    cyan: 'bg-cyan',
    accent: 'bg-accent',
    success: 'bg-success-color',
    warning: 'bg-warning-color',
    danger: 'bg-danger-color',
    muted: 'bg-text-muted',
};

export const DashboardCard = ({
    title,
    subtitle,
    action,
    children,
    className = '',
}: {
    title?: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) => (
    <section className={`glass-card p-5 sm:p-6 ${className}`}>
        {(title || subtitle || action) && (
            <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    {title && <h2 className={typography.cardTitle}>{title}</h2>}
                    {subtitle && <p className={`mt-1 ${typography.cardDescription}`}>{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
        )}
        {children}
    </section>
);

export const DashboardStat = ({
    icon,
    label,
    value,
    detail,
    tone = 'primary',
}: {
    icon: ReactNode;
    label: ReactNode;
    value: ReactNode;
    detail?: ReactNode;
    tone?: Tone;
}) => (
    <DashboardCard className="min-h-[132px]">
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <p className="text-xs font-display font-bold uppercase tracking-wide text-text-muted">{label}</p>
                <p className={`mt-2 truncate ${typography.statValue}`}>{value}</p>
                {detail && <p className="mt-2 text-xs text-text-muted">{detail}</p>}
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneBg[tone]}/15 ${toneText[tone]}`}>
                {icon}
            </div>
        </div>
    </DashboardCard>
);

export const ProgressBar = ({
    value,
    max = 100,
    tone = 'primary',
    label,
}: {
    value: number;
    max?: number;
    tone?: Tone;
    label?: ReactNode;
}) => {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div>
            {label && <div className="mb-2 text-xs font-semibold text-text-muted">{label}</div>}
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-hover">
                <div
                    className={`h-full rounded-full ${toneBg[tone]} transition-[width] duration-300`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export type HeatmapCell = {
    date: string;
    label: string;
    value: number;
};

export const ActivityHeatmap = ({ cells }: { cells: HeatmapCell[] }) => {
    const max = Math.max(1, ...cells.map(cell => cell.value));
    return (
        <div className="grid grid-cols-7 gap-2" role="list" aria-label="Activity heatmap">
            {cells.map(cell => {
                const ratio = cell.value / max;
                const level =
                    cell.value === 0 ? 'bg-surface-hover border-border'
                        : ratio < 0.35 ? 'bg-primary/25 border-primary/20'
                            : ratio < 0.7 ? 'bg-primary/55 border-primary/30'
                                : 'bg-primary border-primary/60';
                return (
                    <div key={cell.date} role="listitem" className="space-y-1">
                        <div
                            className={`aspect-square rounded-md border ${level}`}
                            aria-label={`${cell.label}: ${cell.value} activity points`}
                        />
                        <p className="truncate text-center text-[10px] text-text-muted">{cell.label}</p>
                    </div>
                );
            })}
        </div>
    );
};

export const MiniBarChart = ({
    data,
    tone = 'primary',
    height = 96,
}: {
    data: { label: string; value: number }[];
    tone?: Tone;
    height?: number;
}) => {
    const max = Math.max(1, ...data.map(item => item.value));
    return (
        <div className="flex items-end gap-2" style={{ height }}>
            {data.map(item => (
                <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex w-full items-end rounded-md bg-surface-hover" style={{ height: height - 22 }}>
                        <div
                            className={`w-full rounded-md ${toneBg[tone]}`}
                            style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
                            aria-label={`${item.label}: ${item.value}`}
                        />
                    </div>
                    <span className="max-w-full truncate text-[10px] text-text-muted">{item.label}</span>
                </div>
            ))}
        </div>
    );
};

export const Timeline = ({
    items,
}: {
    items: { id: string; title: ReactNode; meta: ReactNode; detail?: ReactNode }[];
}) => (
    <div className="space-y-4">
        {items.map(item => (
            <div key={item.id} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_15%,transparent)]" />
                <div className="min-w-0">
                    <p className="text-sm font-display font-bold text-text-primary">{item.title}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{item.meta}</p>
                    {item.detail && <p className="mt-1 text-xs text-text-secondary">{item.detail}</p>}
                </div>
            </div>
        ))}
    </div>
);

export const EmptyState = ({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: ReactNode;
    description: ReactNode;
}) => (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        <p className="font-display text-sm font-bold leading-snug text-text-primary">{title}</p>
        <p className="mt-1 max-w-sm text-xs text-text-muted">{description}</p>
    </div>
);

export const LoadingState = ({ label = 'Loading dashboard...' }: { label?: string }) => (
    <div className="flex items-center justify-center gap-3 py-24 text-text-muted">
        <Loader2 size={22} className="animate-spin text-primary" />
        <span className="font-display font-bold">{label}</span>
    </div>
);
