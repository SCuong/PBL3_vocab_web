export const Footer = () => (
    <footer className="bg-surface border-t border-border py-8 px-8">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3 font-display font-bold text-sm text-text-primary">
                <span
                    className="font-display text-xl font-extrabold leading-none"
                    style={{
                        background: 'linear-gradient(90deg, var(--color-cyan) 0%, #e879f9 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    VL
                </span>
                <span>VocabLearning</span>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-1 items-center">
                <span className="text-xs font-bold text-text-muted uppercase tracking-[0.08em] mb-0.5">Contact us</span>
                <a
                    href="mailto:thai.na20p0161@gmail.com"
                    className="text-sm text-primary hover:text-accent transition-colors hover:underline"
                >
                    thai.na20p0161@gmail.com
                </a>
                <a
                    href="mailto:vumanhcuongppt@gmail.com"
                    className="text-sm text-primary hover:text-accent transition-colors hover:underline"
                >
                    vumanhcuongppt@gmail.com
                </a>
            </div>

            {/* Copyright */}
            <p className="text-xs text-text-muted">
                &copy; 2026 VocabLearning — PBL3 Project
            </p>
        </div>
    </footer>
);
