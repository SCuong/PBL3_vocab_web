import {
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
    useEffect,
    useId,
    useRef,
} from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-react';
import { typography } from '../ui';

export const adminFocusRingClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary';

const fieldBase =
    `w-full rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted/70 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${adminFocusRingClass}`;

export const adminInputClass = `${fieldBase} px-4 py-2.5`;
export const adminLabelClass = 'block text-xs font-display font-bold text-text-muted';

type FieldShellProps = {
    id?: string;
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    required?: boolean;
    children: (props: { id: string; describedBy?: string }) => ReactNode;
};

const FieldShell = ({ id, label, hint, error, required, children }: FieldShellProps) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const hintId = hint ? `${fieldId}-hint` : undefined;
    const errorId = error ? `${fieldId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={fieldId} className="block text-xs font-display font-bold text-text-muted">
                    {label}
                    {required && <span className="ml-1 text-danger-color">*</span>}
                </label>
            )}
            {children({ id: fieldId, describedBy })}
            {hint && <p id={hintId} className="text-xs text-text-muted">{hint}</p>}
            {error && <p id={errorId} className="text-xs font-semibold text-danger-color">{error}</p>}
        </div>
    );
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    suffix?: ReactNode;
};

export const Input = ({ label, hint, error, suffix, className = '', required, id, ...props }: InputProps) => (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
        {({ id: fieldId, describedBy }) => {
            const input = (
                <input
                    id={fieldId}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(error) || undefined}
                    required={required}
                    className={`${fieldBase} px-4 py-2.5 ${suffix ? 'pr-10' : ''} ${className}`}
                    {...props}
                />
            );
            return suffix ? (
                <div className="relative">
                    {input}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">{suffix}</div>
                </div>
            ) : input;
        }}
    </FieldShell>
);

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
};

export const TextArea = ({ label, hint, error, className = '', required, id, ...props }: TextAreaProps) => (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
        {({ id: fieldId, describedBy }) => (
            <textarea
                id={fieldId}
                aria-describedby={describedBy}
                aria-invalid={Boolean(error) || undefined}
                required={required}
                className={`${fieldBase} px-4 py-2.5 resize-none ${className}`}
                {...props}
            />
        )}
    </FieldShell>
);

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
};

export const Select = ({ label, hint, error, className = '', required, id, children, ...props }: SelectProps) => (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
        {({ id: fieldId, describedBy }) => (
            <select
                id={fieldId}
                aria-describedby={describedBy}
                aria-invalid={Boolean(error) || undefined}
                required={required}
                className={`${fieldBase} px-4 py-2.5 cursor-pointer ${className}`}
                {...props}
            >
                {children}
            </select>
        )}
    </FieldShell>
);

type ModalProps = {
    title: ReactNode;
    children: ReactNode;
    onClose: () => void;
    size?: 'sm' | 'md' | 'lg';
    closeLabel?: string;
    footer?: ReactNode;
};

export const Modal = ({ title, children, onClose, size = 'md', closeLabel = 'Close dialog', footer }: ModalProps) => {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-lg' : 'max-w-md';

    useEffect(() => {
        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        panelRef.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
                return;
            }

            if (event.key !== 'Tab' || !panelRef.current) return;

            const focusable = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter(element => element.offsetParent !== null);

            if (focusable.length === 0) {
                event.preventDefault();
                panelRef.current.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            previousActiveElement?.focus();
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`glass-card w-full ${sizeClass} max-h-[90vh] overflow-y-auto p-6 shadow-2xl ${adminFocusRingClass}`}
            >
                <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 id={titleId} className={typography.modalTitle}>
                        {title}
                    </h2>
                    <IconButton
                        type="button"
                        aria-label={closeLabel}
                        title={closeLabel}
                        onClick={onClose}
                        icon={<X size={16} />}
                    />
                </div>
                {children}
                {footer && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{footer}</div>}
            </div>
        </div>
    );
};

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    icon: ReactNode;
    tone?: 'neutral' | 'primary' | 'danger';
    'aria-label': string;
};

export const IconButton = ({ icon, tone = 'neutral', className = '', type = 'button', ...props }: IconButtonProps) => {
    const toneClass =
        tone === 'danger'
            ? 'text-text-muted hover:bg-danger-color/10 hover:text-danger-color'
            : tone === 'primary'
                ? 'text-text-muted hover:bg-primary/10 hover:text-primary'
                : 'text-text-muted hover:bg-primary/10 hover:text-text-primary';

    return (
        <button
            type={type}
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${adminFocusRingClass} ${toneClass} ${className}`}
            {...props}
        >
            {icon}
        </button>
    );
};

type SortDirection = 'asc' | 'desc';

type SortableColumnHeaderProps = {
    label: ReactNode;
    active: boolean;
    direction: SortDirection;
    onSort: () => void;
    align?: 'left' | 'center' | 'right';
    className?: string;
};

export const SortableColumnHeader = ({
    label,
    active,
    direction,
    onSort,
    align = 'left',
    className = '',
}: SortableColumnHeaderProps) => {
    const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

    return (
        <th
            scope="col"
            aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`px-4 py-2 text-xs font-display font-bold uppercase tracking-wide text-text-muted ${className}`}
        >
            <button
                type="button"
                onClick={onSort}
                className={`group inline-flex w-full cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-primary/10 hover:text-text-primary ${justifyClass} ${adminFocusRingClass}`}
            >
                <span>{label}</span>
                <span
                    aria-hidden="true"
                    className={`transition-opacity ${active ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-50 group-focus-visible:opacity-70'}`}
                >
                    {active && direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
            </button>
        </th>
    );
};

type DataTableHeader = {
    key: string;
    label?: ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
};

type DataTableProps = {
    headers: DataTableHeader[];
    children: ReactNode;
    empty?: ReactNode;
    isEmpty?: boolean;
    emptyColSpan?: number;
    footer?: ReactNode;
};

export const DataTable = ({ headers, children, empty, isEmpty = false, emptyColSpan, footer }: DataTableProps) => (
    <div className="glass-card overflow-hidden">
        {headers.length === 0 ? (
            <>
                {children}
                {footer}
            </>
        ) : (
        <>
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-primary/10">
                        {headers.map(header => (
                            <th
                                key={header.key}
                                scope="col"
                                className={`px-4 py-3.5 text-xs font-display font-bold uppercase tracking-wide text-text-muted ${
                                    header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : 'text-left'
                                } ${header.className ?? ''}`}
                            >
                                {header.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {isEmpty ? (
                        <tr>
                            <td colSpan={emptyColSpan ?? headers.length} className="px-4 py-16 text-center text-sm text-text-muted">
                                {empty}
                            </td>
                        </tr>
                    ) : (
                        children
                    )}
                </tbody>
            </table>
        </div>
        {footer}
        </>
        )}
    </div>
);

type PaginationProps = {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    summary: ReactNode;
};

export const Pagination = ({ page, totalPages, onPageChange, summary }: PaginationProps) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-text-muted">{summary}</span>
            <nav className="flex items-center gap-1" aria-label="Pagination">
                <IconButton
                    aria-label="Previous page"
                    title="Previous page"
                    icon={<ChevronLeft size={16} />}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    tone="primary"
                />
                <span className="px-3 text-sm font-display font-bold text-text-primary" aria-live="polite">
                    {page} / {totalPages}
                </span>
                <IconButton
                    aria-label="Next page"
                    title="Next page"
                    icon={<ChevronRight size={16} />}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    tone="primary"
                />
            </nav>
        </div>
    );
};

type FilterBarProps = {
    children: ReactNode;
    actions?: ReactNode;
};

export const FilterBar = ({ children, actions }: FilterBarProps) => (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {children}
        </div>
        {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </div>
);

type StatCardProps = {
    icon: ReactNode;
    label: ReactNode;
    value: ReactNode;
    tone?: 'primary' | 'cyan' | 'accent' | 'secondary';
};

export const StatCard = ({ icon, label, value, tone = 'primary' }: StatCardProps) => {
    const toneClass =
        tone === 'cyan' ? 'bg-cyan' : tone === 'accent' ? 'bg-accent' : tone === 'secondary' ? 'bg-secondary' : 'bg-primary';

    return (
        <div className="glass-card flex items-center gap-4 p-5 sm:p-6">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="mb-0.5 text-xs font-display font-bold uppercase tracking-wide text-text-muted">
                    {label}
                </p>
                <p className={`truncate ${typography.statValue}`}>{value}</p>
            </div>
        </div>
    );
};

type ErrorNoticeProps = {
    children: ReactNode;
};

export const ErrorNotice = ({ children }: ErrorNoticeProps) => (
    <div className="flex items-center gap-2 rounded-xl border border-danger-color/20 bg-danger-color/10 p-3 text-sm text-danger-color">
        {children}
    </div>
);

export const LoadingBlock = ({ children }: { children: ReactNode }) => (
    <div className="flex items-center justify-center gap-3 py-24 text-text-muted">
        {children}
    </div>
);
