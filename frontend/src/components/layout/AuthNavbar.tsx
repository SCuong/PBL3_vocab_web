import { useNavigate } from 'react-router-dom';
import { Logo } from '../../assets/Logo';
import { PATHS } from '../../routes/paths';
import { ThemeToggle } from '../ui';

export const AuthNavbar = () => {
    const navigate = useNavigate();

    return (
        <nav className="sticky top-0 z-50 shrink-0 border-b border-border/80 bg-surface/90 backdrop-blur-md" aria-label="Điều hướng">
            <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={() => navigate(PATHS.home)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-element)]"
                    aria-label="VocabLearning, trang chủ"
                >
                    <Logo size={30} />
                    <span className="text-[16px] font-bold tracking-[-0.015em] text-text-primary">VocabLearning</span>
                </button>
                <ThemeToggle />
            </div>
        </nav>
    );
};
