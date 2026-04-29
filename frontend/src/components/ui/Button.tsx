import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
    className?: string;
};

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
    const variants: Record<ButtonVariant, string> = {
        primary: 'text-white shadow-[0_4px_24px_rgba(147,51,234,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(147,51,234,0.45)] hover:brightness-105 active:translate-y-0',
        secondary: 'text-text-muted border-2 border-border bg-surface hover:text-primary hover:border-primary hover:bg-primary-light',
        accent: 'text-white shadow-[0_4px_0_rgba(120,200,200,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(120,200,200,1)] hover:brightness-110',
        ghost: 'bg-white/40 backdrop-blur-sm border border-border text-text-muted hover:text-text-primary hover:bg-primary-light',
        danger: 'bg-red-500 text-white shadow-[0_4px_0_rgba(180,0,0,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,0,0,1)] hover:bg-red-600'
    };

    const bgStyle = variant === 'primary'
        ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }
        : variant === 'accent'
            ? { background: 'linear-gradient(135deg, var(--color-cyan), var(--color-primary))' }
            : undefined;

    return (
        <button
            className={`px-6 py-2.5 rounded-pill font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            style={bgStyle}
            {...props}
        >
            {children}
        </button>
    );
};
