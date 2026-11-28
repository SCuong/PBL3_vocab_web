import {
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
    useId,
} from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { Pagination as AstryxPagination } from '@astryxdesign/core/Pagination';
import { Spinner } from '@astryxdesign/core/Spinner';
import { AppDialog } from '../ui';

export const adminFocusRingClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary';

const fieldBase =
    `w-full min-h-10 rounded-[var(--radius-element)] border border-border-emphasized bg-surface text-sm text-text-primary placeholder:text-text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${adminFocusRingClass}`;

export const adminInputClass = `${fieldBase} px-4 py-2.5`;
export const adminLabelClass = 'block text-sm font-medium text-text-primary';

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
                <label htmlFor={fieldId} className={adminLabelClass}>
                    {label}
                    {required && <span className="ml-1 text-danger-color">*</span>}
                </label>
            )}
            {children({ id: fieldId, describedBy })}
            {hint && <p id={hintId} className="text-xs text-text-muted">{hint}</p>}
            {error && <p id={errorId} className="text-xs font-medium text-danger-color" role="alert">{error}</p>}
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

export const Modal = ({ title, children, onClose, size = 'md', footer }: ModalProps) => (
    <AppDialog isOpen onClose={onClose} title={title} footer={footer} width={size === 'sm' ? 400 : size === 'lg' ? 560 : 480}>
        {children}
    </AppDialog>
);

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    icon: ReactNode;
    tone?: 'neutral' | 'primary' | 'danger';
    'aria-label': string;
};

export const IconButton = ({ icon, tone = 'neutral', className = '', type = 'button', onClick, disabled, title, 'aria-label': ariaLabel }: IconButtonProps) => (
    <AstryxButton
        type={type}
        variant="ghost"
        size="md"
        isIconOnly
        icon={icon}
        label={ariaLabel}
        tooltip={title}
        onClick={onClick}
        isDisabled={disabled}
        className={`${
            disabled
                ? '!opacity-30 !cursor-not-allowed pointer-events-none'
                : tone === 'danger'
                  ? 'hover:!text-danger-color'
                  : tone === 'primary'
                    ? 'hover:!text-primary'
                    : ''
        } ${className}`}
    />
);

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
            className={`px-4 py-2 text-sm font-medium text-text-muted ${className}`}
        >
            <button
                type="button"
                onClick={onSort}
                className={`group inline-flex w-full cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-surface-hover hover:text-text-primary ${justifyClass} ${adminFocusRingClass}`}
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
    <div className="overflow-hidden rounded-[var(--radius-container)] border border-border bg-surface">
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
                    <tr className="border-b border-border">
                        {headers.map(header => (
                            <th
                                key={header.key}
                                scope="col"
                                className={`px-4 py-3 text-sm font-medium text-text-muted ${
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
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-text-muted">{summary}</span>
            <AstryxPagination page={page} totalPages={totalPages} onChange={onPageChange} variant="compact" size="sm" label="Phân trang" />
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
    const toneClass = tone === 'cyan' ? 'text-cyan' : tone === 'accent' || tone === 'secondary' ? 'text-secondary' : 'text-primary';

    return (
        <div className="rounded-[var(--radius-container)] border border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-text-muted">
                <span className={`inline-flex [&_svg]:!h-4 [&_svg]:!w-4 [&_svg]:!text-current ${toneClass}`} aria-hidden>{icon}</span>
                {label}
            </p>
            <p className="mt-3 truncate text-[1.75rem] font-bold leading-none tracking-[-0.02em] tabular-nums text-text-primary">{value}</p>
        </div>
    );
};

type ErrorNoticeProps = {
    children: ReactNode;
};

export const ErrorNotice = ({ children }: ErrorNoticeProps) => (
    <div role="alert" className="flex items-center gap-2 rounded-[var(--radius-element)] bg-danger-color/10 px-4 py-3 text-sm text-danger-color">
        {children}
    </div>
);

export const LoadingBlock = ({ children }: { children: ReactNode }) => (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-text-muted" role="status">
        <Spinner size="sm" />
        {children}
    </div>
);
