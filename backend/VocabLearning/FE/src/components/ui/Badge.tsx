import type { ReactNode } from 'react';

type BadgeVariant = 'purple' | 'cyan' | 'pink' | 'green' | 'warn' | 'red' | 'accent';

type BadgeProps = {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
};

export const Badge = ({ children, variant = 'purple', className = '' }: BadgeProps) => {
    const variants: Record<BadgeVariant, string> = {
        purple: 'bg-purple/20 text-purple border-purple/30',
        cyan: 'bg-cyan/20 text-cyan border-cyan/30',
        pink: 'bg-pink/20 text-pink border-pink/30',
        green: 'bg-green-500/10 text-green-600 border-green-500/20',
        warn: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        red: 'bg-red-500/10 text-red-600 border-red-500/20',
        accent: 'bg-accent/20 text-text-primary border-accent/40'
    };

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
