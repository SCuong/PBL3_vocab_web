import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

type ThemeToggleProps = {
    className?: string;
};

/**
 * Miniature celestial sky button paired with the compositor-thread
 * top-to-bottom dawn / twilight cascade in useTheme.ts + index.css.
 */
export const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            onClick={() => toggleTheme()}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            aria-pressed={isDark}
            className={`celestial-toggle ${isDark ? 'is-dark' : 'is-light'} ${className}`.trim()}
        >
            <span className="celestial-star celestial-star--a" aria-hidden="true" />
            <span className="celestial-star celestial-star--b" aria-hidden="true" />
            <span className="celestial-icon-single" aria-hidden="true">
                {isDark ? (
                    <Moon size={16} strokeWidth={2.25} className="celestial-moon-svg" />
                ) : (
                    <Sun size={17} strokeWidth={2.25} className="celestial-sun-svg" />
                )}
            </span>
        </button>
    );
};
