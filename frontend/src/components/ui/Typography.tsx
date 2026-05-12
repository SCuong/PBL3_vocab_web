import type { ReactNode } from 'react';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export const typography = {
    heroTitle: 'font-display font-bold text-[2.25rem] sm:text-[2.75rem] lg:text-[3.25rem] leading-[1.08] tracking-normal text-text-primary',
    pageTitle: 'font-display font-bold text-[1.875rem] sm:text-[2rem] leading-tight tracking-normal text-text-primary',
    sectionTitle: 'font-display font-bold text-[1.5rem] sm:text-[1.75rem] leading-tight tracking-normal text-text-primary',
    modalTitle: 'font-display font-bold text-xl leading-tight tracking-normal text-text-primary',
    cardTitle: 'font-display font-bold text-base leading-snug tracking-normal text-text-primary',
    itemTitle: 'font-display font-bold text-xl leading-snug tracking-normal text-text-primary',
    eyebrow: 'text-xs font-display font-bold uppercase tracking-wide text-primary',
    pageDescription: 'text-sm sm:text-base leading-relaxed text-text-muted',
    sectionDescription: 'text-sm sm:text-base leading-relaxed text-text-secondary',
    cardDescription: 'text-xs leading-relaxed text-text-muted',
    statValue: 'font-display font-bold text-2xl leading-tight tracking-normal text-text-primary',
    metricValue: 'font-display font-bold text-3xl leading-tight tracking-normal text-text-primary',
};

type HeadingProps = {
    children: ReactNode;
    className?: string;
    id?: string;
};

export const PageTitle = ({ children, className, id }: HeadingProps) => (
    <h1 id={id} className={cx(typography.pageTitle, className)}>
        {children}
    </h1>
);

export const SectionTitle = ({ children, className, id }: HeadingProps) => (
    <h2 id={id} className={cx(typography.sectionTitle, className)}>
        {children}
    </h2>
);

type PageHeaderProps = {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    icon?: ReactNode;
    align?: 'left' | 'center';
    className?: string;
};

export const PageHeader = ({
    eyebrow,
    title,
    description,
    action,
    icon,
    align = 'left',
    className,
}: PageHeaderProps) => {
    const centered = align === 'center';

    return (
        <header
            className={cx(
                'flex flex-col gap-4',
                centered ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between',
                className,
            )}
        >
            <div className={cx('min-w-0', centered && 'mx-auto')}>
                {eyebrow && <p className={typography.eyebrow}>{eyebrow}</p>}
                <div className={cx('flex min-w-0 gap-3', centered ? 'justify-center' : 'items-center')}>
                    {icon && <div className="mt-1 shrink-0">{icon}</div>}
                    <div className="min-w-0">
                        <PageTitle className={eyebrow ? 'mt-2' : ''}>{title}</PageTitle>
                        {description && (
                            <p className={cx('mt-2 max-w-2xl', typography.pageDescription, centered && 'mx-auto')}>
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </header>
    );
};

type SectionHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    align?: 'left' | 'center';
    className?: string;
    titleClassName?: string;
    descriptionClassName?: string;
};

export const SectionHeader = ({
    title,
    description,
    action,
    align = 'left',
    className,
    titleClassName,
    descriptionClassName,
}: SectionHeaderProps) => {
    const centered = align === 'center';

    return (
        <div className={cx('flex flex-col gap-3', centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between', className)}>
            <div className="min-w-0">
                <SectionTitle className={titleClassName}>{title}</SectionTitle>
                {description && (
                    <p className={cx('mt-3 max-w-2xl', typography.sectionDescription, centered && 'mx-auto', descriptionClassName)}>
                        {description}
                    </p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
};
