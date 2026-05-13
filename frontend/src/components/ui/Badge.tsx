import type { ReactNode } from 'react';

type BadgeVariant = 'purple' | 'cyan' | 'pink' | 'green' | 'warn' | 'red' | 'accent';

type BadgeProps = {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
};

export const Badge = ({ children, variant = 'purple', className = '' }: BadgeProps) => {
    const variants: Record<BadgeVariant, string> = {
        purple: 'bg-purple/30 text-primary border-purple/50',
        cyan: 'bg-cyan/30 text-cyan border-cyan/50',
        pink: 'bg-pink/20 text-pink border-pink/30',
        green: 'bg-success-color/10 text-success-color border-success-color/20',
        warn: 'bg-warning-color/10 text-warning-color border-warning-color/20',
        red: 'bg-danger-color/10 text-danger-color border-danger-color/20',
        accent: 'bg-accent/20 text-text-primary border-accent/40'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
