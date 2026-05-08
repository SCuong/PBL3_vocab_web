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
                <span
                    className="font-display text-2xl font-extrabold leading-none"
                    style={{
                        background: 'linear-gradient(90deg, var(--color-cyan) 0%, #e879f9 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    VL
                </span>
                <span className="font-display text-lg font-bold text-text-primary tracking-tight">
                    VocabLearning
                </span>
            </button>
        </div>
    </nav>
);
