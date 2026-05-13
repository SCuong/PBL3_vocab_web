import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
    className?: string;
};

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
    const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary';
    const variants: Record<ButtonVariant, string> = {
        primary: 'text-text-on-accent bg-linear-to-br from-primary to-accent shadow-[0_4px_24px_var(--shadow-color)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_var(--shadow-color)] hover:brightness-105 active:translate-y-0',
        secondary: 'text-text-muted border-2 border-border bg-surface hover:text-primary hover:border-primary hover:bg-primary-light',
        accent: 'text-text-on-accent bg-linear-to-br from-cyan to-primary shadow-[0_4px_0_color-mix(in_srgb,var(--accent-cyan)_70%,var(--accent-color))] active:translate-y-[2px] active:shadow-[0_2px_0_color-mix(in_srgb,var(--accent-cyan)_70%,var(--accent-color))] hover:brightness-110',
        ghost: 'bg-surface/40 backdrop-blur-sm border border-border text-text-muted hover:text-text-primary hover:bg-primary-light',
        danger: 'bg-danger-color text-text-on-accent shadow-[0_4px_0_color-mix(in_srgb,var(--danger-color)_70%,var(--text-primary))] active:translate-y-[2px] active:shadow-[0_2px_0_color-mix(in_srgb,var(--danger-color)_70%,var(--text-primary))] hover:brightness-95'
    };

    return (
        <button
            className={`px-6 py-2.5 rounded-pill font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${focusRing} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
