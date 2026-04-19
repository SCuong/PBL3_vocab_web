export const Footer = () => (
    <footer className="mt-20 py-12 border-t border-primary/10 bg-white/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
                <div className="font-display font-extrabold text-2xl bg-linear-to-r from-cyan to-pink bg-clip-text text-transparent mb-2">VocabLearning</div>
                <p className="text-text-muted text-sm tracking-wide uppercase font-bold opacity-60">© 2026 Build with Sparkles ✨</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 text-sm">
                <div className="font-bold text-primary uppercase tracking-[0.2em] mb-1">Contact Us</div>
                <a
                    href="mailto:thai.na20p0161@gmail.com"
                    className="text-text-primary hover:text-primary transition-colors font-medium underline underline-offset-4 decoration-primary/30"
                >
                    thai.na20p0161@gmail.com
                </a>
            </div>
        </div>
    </footer>
);
