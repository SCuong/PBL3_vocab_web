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
            <div className="auth-navbar-inner">
                <button
                    onClick={() => navigate(PATHS.home)}
                    className="auth-navbar-logo"
                    aria-label="VocabLearning home"
                >
                    <Logo size={36} />
                    <span className="auth-navbar-logo-text">
                        VocabLearning
                    </span>
                </button>
                <ThemeToggle className="auth-navbar-toggle absolute top-1/2 -translate-y-1/2" />
            </div>
        </nav>
    );
};
