import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';
import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState';
import { Spinner } from '@astryxdesign/core/Spinner';
import { typography } from '../ui';

type Tone = 'primary' | 'cyan' | 'accent' | 'success' | 'warning' | 'danger' | 'muted';

const toneText: Record<Tone, string> = {
    primary: 'text-primary',
    cyan: 'text-cyan',
    accent: 'text-secondary',
    success: 'text-success-color',
    warning: 'text-warning-color',
    danger: 'text-danger-color',
    muted: 'text-text-muted',
};

const toneBg: Record<Tone, string> = {
    primary: 'bg-primary',
    cyan: 'bg-cyan',
    accent: 'bg-secondary',
    success: 'bg-success-color',
    warning: 'bg-warning-color',
    danger: 'bg-danger-color',
    muted: 'bg-text-muted',
};

const toneProgress = {
    primary: 'accent', cyan: 'accent', accent: 'accent', muted: 'neutral',
    success: 'success', warning: 'warning', danger: 'error',
} as const;

export type DashboardCardVariant = 'glass' | 'flat';

/** Section card: Astryx Card with an optional title row. */
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
    variant?: DashboardCardVariant;
}) => (
    <Card padding={0} className={`p-5 sm:p-6 ${className}`}>
        <section>
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
    </Card>
);

/** Headline metric: small labelled icon, large tabular value, quiet detail. */
export const DashboardStat = ({
    icon,
    label,
    value,
    detail,
    tone = 'primary',
    className = '',
}: {
    icon: ReactNode;
    label: ReactNode;
    value: ReactNode;
    detail?: ReactNode;
    tone?: Tone;
    variant?: DashboardCardVariant;
    className?: string;
}) => (
    <Card padding={0} className={`p-5 ${className}`}>
        <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
            <span className={`inline-flex shrink-0 [&_svg]:h-4 [&_svg]:w-4 ${toneText[tone]}`} aria-hidden>{icon}</span>
            {label}
        </p>
        <p className="mt-3 truncate text-3xl font-bold leading-none tracking-[-0.02em] tabular-nums text-text-primary">{value}</p>
        {detail && <div className="mt-2 text-sm text-text-muted">{detail}</div>}
    </Card>
);

export const ProgressBar = ({
    value,
    max = 100,
    tone = 'primary',
    label,
    hideLabel,
}: {
    value: number;
    max?: number;
    tone?: Tone;
    label?: ReactNode;
    hideLabel?: boolean;
}) => (
    <div>
        {label && !hideLabel && <div className="mb-2 text-sm font-medium text-text-muted">{label}</div>}
        <AstryxProgressBar
            label={typeof label === 'string' ? label : 'Tiến độ'}
            isLabelHidden
            value={Math.max(0, Math.min(value, max))}
            max={max > 0 ? max : 1}
            variant={toneProgress[tone]}
        />
    </div>
);

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
                        <p className="truncate text-center text-xs text-text-muted">{cell.label}</p>
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
    maxVisibleLabels,
}: {
    data: { label: string; value: number }[];
    tone?: Tone;
    height?: number;
    maxVisibleLabels?: number;
}) => {
    const max = Math.max(1, ...data.map(item => item.value));
    const labelStep = maxVisibleLabels && data.length > maxVisibleLabels
        ? Math.ceil((data.length - 1) / Math.max(1, maxVisibleLabels - 1))
        : 1;
    const visibleTicks = data
        .filter((_, index) => index === 0 || index === data.length - 1 || index % labelStep === 0)
        .map((item) => item.label);

    return (
        <div className="flex flex-col">
            <div className="flex items-end gap-1.5" style={{ height: Math.max(64, height - 22) }}>
                {data.map((item) => (
                    <div
                        key={item.label}
                        className="flex h-full min-w-0 flex-1 items-end rounded-md bg-surface-hover"
                        title={`${item.label}: ${item.value}`}
                    >
                        <div
                            className={`w-full rounded-md ${toneBg[tone]}`}
                            style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
                            aria-label={`${item.label}: ${item.value}`}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-medium tabular-nums text-text-muted">
                {visibleTicks.map((label, idx) => (
                    <span key={`${label}-${idx}`} className="whitespace-nowrap">
                        {label}
                    </span>
                ))}
            </div>
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
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary-light" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{item.title}</p>
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
    title: string;
    description?: string;
}) => <AstryxEmptyState icon={icon} title={title} description={description} isCompact />;

export const LoadingState = ({ label = 'Đang tải…' }: { label?: string }) => (
    <div className="flex items-center justify-center gap-3 py-24 text-text-muted" role="status">
        <Spinner size="md" />
        <span className="font-medium">{label}</span>
    </div>
);
