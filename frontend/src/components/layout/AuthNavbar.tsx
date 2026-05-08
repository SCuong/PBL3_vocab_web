import { Logo } from '../../assets/Logo';

type AuthNavbarProps = {
    onNavigate: (page: string) => void;
};

export const AuthNavbar = ({ onNavigate }: AuthNavbarProps) => (
    <nav
        className="sticky top-0 z-50 border-b border-border/40"
        style={{
            background: 'color-mix(in srgb, var(--color-bg-light) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
        }}
    >
        <div className="h-16 flex items-center justify-center">
            <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-3 cursor-pointer select-none transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                aria-label="VocabLearning home"
            >
                <Logo size={36} />
                <span className="font-display text-lg font-bold text-text-primary tracking-tight">
                    VocabLearning
                </span>
            </button>
        </div>
    </nav>
);
