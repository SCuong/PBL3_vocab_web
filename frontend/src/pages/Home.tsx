import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layers, Brain, Activity, ChevronRight, Play, Volume2 } from 'lucide-react';
import { PATHS } from '../routes/paths';

/* ── Chibi Mascot (SVG) ─────────────────────────────────────────────── */
const ChibiMascot = () => (
    <div className="chibi-wrap" aria-hidden="true">
        <svg viewBox="0 0 200 200" className="chibi-svg">
            <circle cx="100" cy="100" r="70" fill="#FFF" stroke="#CC99FF" strokeWidth="4" />
            <circle cx="75" cy="90" r="8" fill="#3D1A6E" />
            <circle cx="125" cy="90" r="8" fill="#3D1A6E" />
            <circle cx="78" cy="87" r="3" fill="#FFF" />
            <circle cx="128" cy="87" r="3" fill="#FFF" />
            <circle cx="60" cy="115" r="8" fill="#FFBBFF" opacity="0.6" />
            <circle cx="140" cy="115" r="8" fill="#FFBBFF" opacity="0.6" />
            <path d="M 85 130 Q 100 145 115 130" fill="none" stroke="#3D1A6E" strokeWidth="4" strokeLinecap="round" />
            <path d="M 50 60 L 100 30 L 150 60 L 100 90 Z" fill="#CC99FF" stroke="#3D1A6E" strokeWidth="3" />
            <rect x="95" y="15" width="10" height="20" fill="#3D1A6E" />
            <circle cx="160" cy="75" r="6" fill="#99FFFF" />
            <path d="M 150 60 Q 160 65 160 75" fill="none" stroke="#3D1A6E" strokeWidth="2" />
            <rect x="75" y="145" width="50" height="35" rx="5" fill="#FFBBFF" stroke="#3D1A6E" strokeWidth="3" />
            <line x1="85" y1="155" x2="115" y2="155" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="85" y1="165" x2="115" y2="165" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="chibi-shadow" />
    </div>
);

/* ── Hero Visual (flashcard + floating cards) ───────────────────────── */
const HeroVisual = () => (
    <div className="relative min-h-[520px] flex items-center justify-center">
        {/* Floating: Streak */}
        <div className="hv-float hv-streak">
            <div className="text-xs font-semibold text-text-muted mb-2">🔥 Chuỗi hiện tại</div>
            <div className="font-display text-2xl font-bold text-primary leading-none mb-1">12 ngày</div>
            <div className="text-xs text-text-muted">Cố gắng lên!</div>
            <div className="flex items-end gap-1 mt-3">
                {[18, 26, 16, 32, 24, 36].map((h, i) => (
                    <span key={i} className="w-3.5 rounded-sm bg-primary-light block" style={{ height: `${h}px` }} />
                ))}
                <span className="w-3.5 rounded-sm block" style={{ height: '42px', background: 'linear-gradient(to top, var(--color-primary), var(--color-secondary))' }} />
            </div>
        </div>

        {/* Main flashcard */}
        <div className="hv-main-card">
            <div className="hv-card-spine" />
            <div className="hv-card-body">
                <div className="font-display text-3xl font-bold text-text-primary tracking-tight leading-none">Improve</div>
                <div className="flex items-center gap-2 text-base text-text-muted mb-1">
                    /ɪmˈpruːv/
                    <button className="w-6 h-6 rounded-full bg-primary-light text-primary flex items-center justify-center flex-shrink-0 hover:bg-primary hover:text-white transition-colors" aria-label="Phát âm">
                        <Volume2 size={14} />
                    </button>
                </div>
                <div className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">verb</div>
                <div className="text-sm font-semibold text-text-primary leading-snug">make or become better</div>
                <div className="text-xs text-text-muted mb-2">cải thiện, nâng cao</div>
                <div className="text-xs font-bold text-accent tracking-wide">Example</div>
                <div className="text-xs text-text-primary italic leading-relaxed">We need to improve our skills every day.</div>
                <div className="text-xs text-text-muted leading-snug">Chúng ta cần cải thiện kỹ năng mỗi ngày.</div>
            </div>
        </div>

        {/* Floating: Review */}
        <div className="hv-float hv-review">
            <div className="text-xs font-semibold text-text-muted mb-2">✅ Ôn tập hôm nay</div>
            <div className="font-display text-2xl font-bold text-primary leading-none mb-1">15 từ</div>
            <div className="hv-review-bar-wrap">
                <div className="hv-review-bar" style={{ width: '47%' }} />
            </div>
            <div className="text-xs text-text-muted">7 đã hoàn thành</div>
        </div>

        {/* Chibi mascot */}
        <ChibiMascot />

        {/* Decorative orbs */}
        <div className="home-orb w-48 h-48 bg-primary top-[-20px] right-[30%]" />
        <div className="home-orb w-36 h-36 bg-accent bottom-10 right-[40%] opacity-25" />
        <div className="home-orb w-24 h-24 bg-cyan top-1/2 right-[5%] opacity-30" />
    </div>
);

/* ── Feature data ───────────────────────────────────────────────────── */
const features = [
    { icon: <Layers size={22} />, color: '#a855f7', title: 'Lặp lại ngắt quãng', desc: 'Ghi nhớ thông minh với thuật toán khoa học' },
    { icon: <Brain size={22} />, color: '#9333ea', title: 'Spaced Repetition', desc: 'Ôn đúng lúc bạn sắp quên để ghi nhớ lâu dài' },
    { icon: <Activity size={22} />, color: '#06b6d4', title: 'Theo dõi tiến độ', desc: 'Thống kê chi tiết giúp bạn tiến bộ mỗi ngày' },
];

/* ── Topics data ────────────────────────────────────────────────────── */
const topics = [
    { emoji: '💬', name: 'Giao tiếp hàng ngày', count: '10 chủ đề', tc: '#9333ea', tl: '#f3e8ff' },
    { emoji: '💼', name: 'Công việc & Học tập', count: '9 chủ đề', tc: '#2563eb', tl: '#eff6ff' },
    { emoji: '🏥', name: 'Sức khoẻ', count: '5 chủ đề', tc: '#059669', tl: '#ecfdf5' },
    { emoji: '✈️', name: 'Giải trí & Du lịch', count: '5 chủ đề', tc: '#d97706', tl: '#fffbeb' },
    { emoji: '🏠', name: 'Cuộc sống hàng ngày', count: '10 chủ đề', tc: '#db2777', tl: '#fdf2f8' },
    { emoji: '💭', name: 'Cảm xúc & Ý kiến', count: '5 chủ đề', tc: '#7c3aed', tl: '#f5f3ff' },
    { emoji: '🔬', name: 'Văn hoá & Khoa học', count: '6 chủ đề', tc: '#0891b2', tl: '#ecfeff' },
];

/* ── Steps data ─────────────────────────────────────────────────────── */
const steps = [
    { num: '01', icon: '🎯', title: 'Chọn chủ đề', desc: 'Chọn chủ đề bạn muốn học từ 50+ chủ đề được phân loại rõ ràng theo cấp độ CEFR.' },
    { num: '02', icon: '🃏', title: 'Học flashcard', desc: 'Học từ vựng qua flashcard 3D kết hợp với phát âm chuẩn IPA và ví dụ thực tế.' },
    { num: '03', icon: '🎮', title: 'Luyện tập & Ôn tập', desc: 'Củng cố kiến thức qua trò chơi matching, quiz và hệ thống nhắc ôn tập thông minh.' },
];

/* ── IntersectionObserver hook for fade-in ───────────────────────────── */
function useFadeIn() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const items = el.querySelectorAll('.home-fade-in');
        const obs = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }),
            { threshold: 0.1 }
        );
        items.forEach(item => obs.observe(item));
        return () => obs.disconnect();
    }, []);
    return ref;
}

/* ── Main Home Component ────────────────────────────────────────────── */
const Home = () => {
    const navigate = useNavigate();
    const fadeRef = useFadeIn();

    return (
        <div ref={fadeRef}>
            {/* ── HERO ── */}
            <section className="px-8 flex items-center" style={{ minHeight: 'calc(100vh - 64px)', padding: 'clamp(4rem, 8vw, 6rem) 2rem' }}>
                <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Text */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col gap-6"
                    >
                        <div className="inline-flex items-center gap-2 bg-primary-light text-primary text-sm font-semibold px-4 py-2 rounded-full border border-border w-fit">
                            <span className="text-sm">⭐</span>
                            Học thông minh – Nhớ lâu hơn
                        </div>

                        <h1 className="font-display font-bold text-text-primary leading-[1.1]" style={{ fontSize: 'clamp(2.5rem, 1rem + 4vw, 4.5rem)', letterSpacing: '-0.03em' }}>
                            Học từ vựng<br />tiếng Anh
                            <span className="block bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 60%, var(--color-cyan) 100%)' }}>
                                dễ dàng &amp; hiệu quả
                            </span>
                        </h1>

                        <p className="text-text-secondary leading-relaxed max-w-[46ch]" style={{ fontSize: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)' }}>
                            Phương pháp lặp lại ngắt quãng kết hợp trò chơi thú vị giúp bạn ghi nhớ từ vựng tự nhiên và bền vững.
                        </p>

                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                onClick={() => navigate(PATHS.learning)}
                                className="btn-primary !px-8 !py-4 !text-sm !font-bold"
                            >
                                Bắt đầu học ngay
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => navigate(PATHS.vocabulary)}
                                className="btn-secondary !px-5 !py-3 !text-sm !font-semibold inline-flex items-center gap-3"
                            >
                                <span className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center text-primary flex-shrink-0">
                                    <Play size={14} fill="currentColor" />
                                </span>
                                Xem từ vựng
                            </button>
                        </div>
                    </motion.div>

                    {/* Right: Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="hidden lg:block"
                    >
                        <HeroVisual />
                    </motion.div>
                </div>
            </section>

            {/* ── FEATURES STRIP ── */}
            <section className="bg-surface border-t border-b border-border py-8 px-8 flex justify-center" aria-label="Tính năng nổi bật">
                <div className="w-full max-w-[1100px] flex items-center justify-center">
                    {features.map((feat, i) => (
                        <div key={i} className="flex items-center">
                            {i > 0 && <div className="w-px h-11 bg-border mx-0" />}
                            <div className="home-fade-in flex-1 flex items-center justify-center gap-4 px-8 py-2 text-left" style={{ transitionDelay: `${i * 60}ms` }}>
                                <div className="home-feature-icon" style={{ background: `color-mix(in srgb, ${feat.color} 12%, transparent)`, color: feat.color }}>
                                    {feat.icon}
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-text-primary">{feat.title}</div>
                                    <div className="text-xs text-text-muted mt-0.5">{feat.desc}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TOPICS ── */}
            <section className="px-8" style={{ padding: 'clamp(4rem, 7vw, 6rem) 2rem' }}>
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="font-display font-bold text-text-primary block w-full text-center" style={{ fontSize: 'clamp(2rem, 1.2rem + 2.5vw, 3.5rem)', letterSpacing: '-0.025em' }}>
                            Khám phá chủ đề
                        </h2>
                        <p className="text-text-secondary mt-3 text-center block w-full mx-auto" style={{ fontSize: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', maxWidth: '100%' }}>
                            2,400+ từ vựng được phân loại theo 7 chủ đề chính và 50+ chủ đề nhỏ
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {topics.map((topic, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(PATHS.vocabulary)}
                                className="home-fade-in home-topic-card group text-left"
                                style={{ transitionDelay: `${i * 60}ms`, '--tc': topic.tc, '--tl': topic.tl } as React.CSSProperties}
                                onMouseEnter={e => {
                                    const el = e.currentTarget;
                                    el.style.borderColor = topic.tc;
                                    el.style.boxShadow = `0 8px 24px color-mix(in srgb, ${topic.tc} 20%, transparent)`;
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget;
                                    el.style.borderColor = '';
                                    el.style.boxShadow = '';
                                }}
                            >
                                <span className="text-[28px] relative z-10">{topic.emoji}</span>
                                <span className="font-bold text-sm text-text-primary relative z-10">{topic.name}</span>
                                <span className="text-xs text-text-muted relative z-10">{topic.count}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => navigate(PATHS.vocabulary)}
                            className="home-fade-in home-topic-card text-left"
                            style={{ transitionDelay: `${topics.length * 60}ms`, borderStyle: 'dashed' }}
                        >
                            <span className="text-[28px] relative z-10">📚</span>
                            <span className="font-bold text-sm text-text-primary relative z-10">Xem tất cả</span>
                            <span className="text-xs text-text-muted relative z-10">50+ chủ đề →</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="px-8 bg-bg-light border-t border-b border-border" style={{ padding: 'clamp(4rem, 7vw, 6rem) 2rem' }}>
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="font-display font-bold text-text-primary block w-full text-center" style={{ fontSize: 'clamp(2rem, 1.2rem + 2.5vw, 3.5rem)', letterSpacing: '-0.025em' }}>
                            Cách hoạt động
                        </h2>
                        <p className="text-text-secondary mt-3 text-center block w-full mx-auto" style={{ fontSize: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', maxWidth: '100%' }}>
                            Ba bước đơn giản để bắt đầu hành trình học từ vựng
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6">
                        {steps.map((step, i) => (
                            <div key={i} className="contents">
                                {i > 0 && (
                                    <div className="hidden md:flex justify-center text-primary/40 font-display" style={{ fontSize: 'clamp(2rem, 1.2rem + 2.5vw, 3.5rem)' }}>→</div>
                                )}
                                <div className="home-fade-in home-step-card" style={{ transitionDelay: `${i * 60}ms` }}>
                                    <div className="text-xs font-bold text-primary tracking-[0.1em] mb-3">{step.num}</div>
                                    <div className="text-[40px] mb-4">{step.icon}</div>
                                    <h3 className="font-bold text-text-primary mb-3" style={{ fontSize: 'clamp(1.125rem, 1rem + 0.75vw, 1.5rem)' }}>{step.title}</h3>
                                    <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section className="home-cta-section" style={{ padding: 'clamp(4rem, 8vw, 6rem) 2rem' }}>
                <div className="max-w-[680px] mx-auto px-8 text-center relative z-10">
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-5xl mb-4 block"
                    >
                        📚
                    </motion.div>
                    <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(2rem, 1.2rem + 2.5vw, 3.5rem)', letterSpacing: '-0.025em' }}>
                        Sẵn sàng bắt đầu chưa?
                    </h2>
                    <p className="text-white/85 mb-8 leading-relaxed" style={{ fontSize: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)' }}>
                        Đăng ký miễn phí và khám phá toàn bộ kho từ vựng ngay hôm nay.
                    </p>
                    <div className="flex justify-center items-center gap-4 flex-wrap">
                        <button
                            onClick={() => navigate(PATHS.register)}
                            className="inline-flex items-center font-display font-bold text-base text-primary bg-white rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:brightness-[0.97] hover:-translate-y-0.5 transition-all"
                            style={{ padding: '1rem 2.5rem' }}
                        >
                            Tạo tài khoản miễn phí
                        </button>
                        <button
                            onClick={() => navigate(PATHS.vocabulary)}
                            className="inline-flex items-center font-display font-bold text-sm text-white border-2 border-white/50 rounded-full hover:border-white hover:bg-white/15 transition-all"
                            style={{ padding: '1rem 2rem' }}
                        >
                            Xem từ vựng trước
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
