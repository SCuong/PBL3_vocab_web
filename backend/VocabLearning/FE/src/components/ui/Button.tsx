import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    children: ReactNode;
    variant?: ButtonVariant;
    className?: string;
};

export const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
    const variants: Record<ButtonVariant, string> = {
        primary: 'bg-primary text-text-primary shadow-[0_4px_0_rgba(150,100,200,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(150,100,200,1)] hover:brightness-110',
        secondary: 'bg-secondary text-text-primary shadow-[0_4px_0_rgba(230,150,230,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(230,150,230,1)] hover:brightness-110',
        accent: 'bg-accent text-text-primary shadow-[0_4px_0_rgba(120,200,200,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(120,200,200,1)] hover:brightness-110',
        ghost: 'bg-white/40 backdrop-blur-sm border border-primary/20 hover:bg-white/60',
        danger: 'bg-red-500 text-white shadow-[0_4px_0_rgba(180,0,0,1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(180,0,0,1)] hover:bg-red-600'
    };

    return (
        <button
            className={`px-6 py-2.5 rounded-pill font-display font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
