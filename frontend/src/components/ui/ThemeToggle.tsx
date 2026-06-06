import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type ThemeToggleProps = {
    className?: string;
};

export const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            className={`relative inline-block h-9 w-16 shrink-0 cursor-pointer rounded-full border p-0 shadow-inner transition-colors duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${
                isDark ? 'border-primary/35 bg-[#1a1230]' : 'border-primary/20 bg-[#fffaf4]'
            } ${className}`}
        >
            <span className="sr-only">{isDark ? 'Dark mode enabled' : 'Light mode enabled'}</span>
            <span
                aria-hidden="true"
                className={`absolute left-1 top-[3px] h-7 w-7 rounded-full border transition-transform duration-300 ease-out ${
                    isDark
                        ? 'translate-x-7 border-primary/35 bg-[#f8fafc] shadow-[0_5px_16px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.9)]'
                        : 'translate-x-0 border-warning-color/30 bg-white shadow-[0_5px_14px_rgba(217,119,6,0.24),inset_0_1px_0_rgba(255,255,255,0.95)]'
                }`}
            />
            <span className={`absolute left-1 top-[3px] z-10 grid h-7 w-7 place-items-center leading-none transition-colors duration-300 ${isDark ? 'text-text-muted/70' : 'text-warning-color'}`}>
                <Sun className="block h-4 w-4" aria-hidden="true" />
            </span>
            <span className={`absolute right-1 top-[3px] z-10 grid h-7 w-7 place-items-center leading-none transition-colors duration-300 ${isDark ? 'text-[#4c1d95]' : 'text-text-muted/70'}`}>
                <Moon className="block h-4 w-4 translate-x-[0.75px] -translate-y-[0.5px]" aria-hidden="true" />
            </span>
        </button>
    );
};
