import { Link } from 'react-router-dom';
import { Logo } from '../../assets/Logo';
import { PATHS } from '../../routes/paths';

export const Footer = () => (
    <footer className="border-t border-border bg-surface px-4 py-8 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
                <Logo size={28} />
                <span>VocabLearning</span>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-1 items-center">
                <span className="mb-0.5 text-sm font-medium text-text-muted">Liên hệ</span>
                <a
                    href="mailto:thai.na20p0161@gmail.com"
                    className="text-sm text-text-primary underline decoration-border underline-offset-4 transition-colors hover:decoration-primary"
                >
                    thai.na20p0161@gmail.com
                </a>
                <a
                    href="mailto:vumanhcuongppt@gmail.com"
                    className="text-sm text-text-primary underline decoration-border underline-offset-4 transition-colors hover:decoration-primary"
                >
                    vumanhcuongppt@gmail.com
                </a>
            </div>

            {/* Legal & Copyright */}
            <div className="flex flex-col items-center gap-1 md:items-end">
                <Link
                    to={PATHS.privacy}
                    className="text-sm font-medium text-text-primary underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
                >
                    Chính sách bảo mật
                </Link>
                <p className="text-sm text-text-muted">
                    &copy; 2026 VocabLearning — PBL3 Project
                </p>
            </div>
        </div>
    </footer>
);
