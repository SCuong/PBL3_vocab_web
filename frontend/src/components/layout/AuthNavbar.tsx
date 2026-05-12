import { useNavigate } from 'react-router-dom';
import { Logo } from '../../assets/Logo';
import { PATHS } from '../../routes/paths';
import { ThemeToggle } from '../ui';

export const AuthNavbar = () => {
    const navigate = useNavigate();

    return (
        <nav
            className="sticky top-0 z-50 border-b border-border/40 bg-bg-light/85 backdrop-blur-xl"
        >
            <div className="relative h-16 flex items-center justify-center px-16">
                <button
                    onClick={() => navigate(PATHS.home)}
                    className="flex items-center gap-3 cursor-pointer select-none transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                    aria-label="VocabLearning home"
                >
                    <Logo size={36} />
                    <span className="font-display text-lg font-bold text-text-primary tracking-normal">
                        VocabLearning
                    </span>
                </button>
                <ThemeToggle className="absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
        </nav>
    );
};
