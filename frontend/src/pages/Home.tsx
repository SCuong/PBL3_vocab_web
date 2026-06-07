import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Brain, Activity, ChevronRight, Play, Volume2, Star } from 'lucide-react';
import { PATHS } from '../routes/paths';
import { typography } from '../components/ui';
import { useAppContext } from '../context/AppContext';

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
                <span className="w-3.5 rounded-sm block bg-linear-to-t from-primary to-secondary" style={{ height: '42px' }} />
            </div>
        </div>

        {/* Main flashcard */}
        <div className="hv-main-card">
            <div className="hv-card-spine" />
            <div className="hv-card-body">
                <div className="font-display text-3xl font-bold text-text-primary tracking-normal leading-none">Improve</div>
                <div className="flex items-center gap-2 text-base text-text-muted mb-1">
                    /ɪmˈpruːv/
                    <button className="w-6 h-6 rounded-full bg-primary-light text-primary flex items-center justify-center flex-shrink-0 hover:bg-primary hover:text-text-on-accent transition-colors" aria-label="Phát âm">
                        <Volume2 size={14} />
                    </button>
                </div>
                <div className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">verb</div>
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

        {/* Soft ambient glow behind card */}
        <div className="home-hero-glow" aria-hidden="true" />
    </div>
);

/* ── Feature data ───────────────────────────────────────────────────── */
const features = [
    { icon: <Layers size={22} />, tone: 'text-primary bg-primary/10', title: 'Lặp lại ngắt quãng', desc: 'Ghi nhớ thông minh với thuật toán khoa học' },
    { icon: <Brain size={22} />, tone: 'text-accent bg-accent/10', title: 'Spaced Repetition', desc: 'Ôn đúng lúc bạn sắp quên để ghi nhớ lâu dài' },
    { icon: <Activity size={22} />, tone: 'text-cyan bg-cyan/10', title: 'Theo dõi tiến độ', desc: 'Thống kê chi tiết giúp bạn tiến bộ mỗi ngày' },
];

/* ── Topics data ────────────────────────────────────────────────────── */
const topics = [
    { emoji: '💬', name: 'Giao tiếp hàng ngày', count: '10 chủ đề', tone: 'hover:border-primary' },
    { emoji: '💼', name: 'Công việc & Học tập', count: '9 chủ đề', tone: 'hover:border-cyan' },
    { emoji: '🏥', name: 'Sức khoẻ', count: '5 chủ đề', tone: 'hover:border-success-color' },
    { emoji: '✈️', name: 'Giải trí & Du lịch', count: '5 chủ đề', tone: 'hover:border-warning-color' },
    { emoji: '🏠', name: 'Cuộc sống hàng ngày', count: '10 chủ đề', tone: 'hover:border-accent' },
    { emoji: '💭', name: 'Cảm xúc & Ý kiến', count: '5 chủ đề', tone: 'hover:border-primary' },
    { emoji: '🔬', name: 'Văn hoá & Khoa học', count: '6 chủ đề', tone: 'hover:border-cyan' },
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
            { threshold: 0.22, rootMargin: '0px 0px -18% 0px' }
        );
        items.forEach(item => obs.observe(item));
        return () => obs.disconnect();
    }, []);
    return ref;
}

/* ── Main Home Component ────────────────────────────────────────────── */
const Home = () => {
    const navigate = useNavigate();
    const { currentUser } = useAppContext();
    const fadeRef = useFadeIn();

    return (
        <div ref={fadeRef}>
            {/* ── HERO ── */}
            <section className="min-h-[calc(100dvh-64px)] px-4 py-10 sm:px-8 sm:py-20 lg:py-24 flex items-center">
                <div className="max-w-[1200px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Text */}
                    <div className="flex flex-col gap-5 sm:gap-6">
                        <div className="home-fade-in inline-flex items-center gap-3 bg-primary-light/80 text-primary text-sm sm:text-base font-semibold px-5 py-2.5 rounded-full border border-primary/15 w-fit shadow-[0_1px_2px_var(--shadow-color)]" style={{ transitionDelay: '0ms' }}>
                            <Star size={18} fill="currentColor" strokeWidth={1.75} className="text-[#F5B82E] shrink-0" />
                            Học thông minh – Nhớ lâu hơn
                        </div>

                        <h1 className={`${typography.heroTitle} home-hero-title home-fade-in`} style={{ transitionDelay: '140ms' }}>
                            Học từ vựng<br />tiếng Anh
                            <span className="block bg-clip-text text-transparent bg-linear-to-r from-primary to-cyan">
                                dễ dàng &amp; hiệu quả
                            </span>
                        </h1>

                        <p className="home-fade-in text-base sm:text-lg text-text-secondary leading-relaxed max-w-[46ch]" style={{ transitionDelay: '280ms' }}>
                            Phương pháp lặp lại ngắt quãng kết hợp trò chơi thú vị giúp bạn ghi nhớ từ vựng tự nhiên và bền vững.
                        </p>

                        <div className="home-fade-in flex items-center gap-3 flex-wrap sm:gap-4" style={{ transitionDelay: '420ms' }}>
                            <button
                                onClick={() => navigate(PATHS.learning)}
                                className="btn-primary w-full justify-center !px-8 !py-4 !text-sm !font-bold sm:w-auto"
                            >
                                Bắt đầu học ngay
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => navigate(PATHS.vocabulary)}
                                className="btn-secondary w-full justify-center !px-5 !py-3 !text-sm !font-semibold inline-flex items-center gap-3 sm:w-auto"
                            >
                                <span className="w-7 h-7 bg-primary-light rounded-full flex items-center justify-center text-primary flex-shrink-0">
                                    <Play size={14} fill="currentColor" />
                                </span>
                                Xem từ vựng
                            </button>
                        </div>
                    </div>

                    {/* Right: Visual */}
                    <div className="home-fade-in hidden lg:block" style={{ transitionDelay: '560ms' }}>
                        <HeroVisual />
                    </div>
                </div>
            </section>

            {/* ── FEATURES STRIP ── */}
            <section className="home-feature-strip border-t border-b border-primary/10 py-10 px-4 flex justify-center sm:px-8 sm:py-14" aria-label="Tính năng nổi bật">
                <div className="w-full max-w-[1280px] grid grid-cols-1 md:grid-cols-3 items-stretch">
                    {features.map((feat, i) => (
                        <div key={i} className="flex items-center">
                            {i > 0 && <div className="hidden md:block w-px h-16 bg-primary/15 mx-0" />}
                            <div className="home-fade-in flex-1 flex items-center gap-4 px-2 py-4 text-left sm:gap-5 sm:px-7 lg:px-12" style={{ transitionDelay: `${i * 180}ms` }}>
                                <div className={`home-feature-icon ${feat.tone}`}>
                                    {feat.icon}
                                </div>
                                <div>
                                    <div className="font-display font-extrabold text-lg lg:text-xl leading-tight text-text-primary">{feat.title}</div>
                                    <div className="text-[0.9375rem] lg:text-base text-text-secondary mt-1 leading-relaxed">{feat.desc}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── TOPICS ── */}
            <section className="px-4 py-14 sm:px-8 sm:py-20 lg:py-24">
                <div className="max-w-[1200px] mx-auto">
                    <div className="home-fade-in text-center mb-12">
                        <h2 className={`${typography.sectionTitle} block w-full text-center`}>
                            Khám phá chủ đề
                        </h2>
                        <p className="text-base sm:text-lg text-text-secondary mt-3 text-center block w-full mx-auto">
                            2,400+ từ vựng được phân loại theo 7 chủ đề chính và 50+ chủ đề nhỏ
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {topics.map((topic, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(PATHS.vocabulary)}
                                className={`home-fade-in home-topic-card group text-left ${topic.tone}`}
                                style={{ transitionDelay: `${i * 110}ms` }}
                            >
                                <span className="text-[28px] relative z-10">{topic.emoji}</span>
                                <span className="font-bold text-sm text-text-primary relative z-10">{topic.name}</span>
                                <span className="text-xs text-text-muted relative z-10">{topic.count}</span>
                            </button>
                        ))}
                        <button
                            onClick={() => navigate(PATHS.vocabulary)}
                            className="home-fade-in home-topic-card text-left"
                            style={{ transitionDelay: `${topics.length * 110}ms`, borderStyle: 'dashed' }}
                        >
                            <span className="text-[28px] relative z-10">📚</span>
                            <span className="font-bold text-sm text-text-primary relative z-10">Xem tất cả</span>
                            <span className="text-xs text-text-muted relative z-10">50+ chủ đề →</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="home-defer px-4 py-14 sm:px-8 sm:py-20 lg:py-24 bg-bg-light border-t border-b border-border">
                <div className="max-w-[1200px] mx-auto">
                    <div className="home-fade-in text-center mb-12">
                        <h2 className={`${typography.sectionTitle} block w-full text-center`}>
                            Cách hoạt động
                        </h2>
                        <p className="text-base sm:text-lg text-text-secondary mt-3 text-center block w-full mx-auto">
                            Ba bước đơn giản để bắt đầu hành trình học từ vựng
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6">
                        {steps.map((step, i) => (
                            <div key={i} className="contents">
                                {i > 0 && (
                                    <div className="hidden md:flex justify-center text-[2.75rem] text-primary/40 font-display">→</div>
                                )}
                                <div className="home-fade-in home-step-card" style={{ transitionDelay: `${i * 160}ms` }}>
                                    <div className="text-xs font-bold text-primary tracking-[0.1em] mb-3">{step.num}</div>
                                    <div className="text-[40px] mb-4">{step.icon}</div>
                                    <h3 className="font-display font-bold text-xl text-text-primary mb-3">{step.title}</h3>
                                    <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {!currentUser && (
                <section className="home-cta-section home-defer px-4 py-14 sm:px-8 sm:py-20 lg:py-24">
                    <div className="home-fade-in max-w-[680px] mx-auto px-0 text-center relative z-10 sm:px-8">
                        <div className="home-cta-bounce text-[3rem] mb-4 block" aria-hidden="true">
                            📚
                        </div>
                        <h2 className={`${typography.sectionTitle} text-text-primary mb-4`}>
                            Sẵn sàng bắt đầu chưa?
                        </h2>
                        <p className="text-base sm:text-lg text-text-secondary mb-8 leading-relaxed">
                            Đăng ký miễn phí và khám phá toàn bộ kho từ vựng ngay hôm nay.
                        </p>
                        <div className="flex flex-col justify-center items-center gap-3 sm:flex-row sm:gap-4">
                            <button
                                onClick={() => navigate(PATHS.register)}
                                className="inline-flex w-full items-center justify-center font-display font-bold text-base text-text-on-accent bg-linear-to-r from-primary to-accent rounded-full shadow-[0_4px_24px_var(--shadow-color)] hover:brightness-105 hover:-translate-y-0.5 hover:shadow-[0_10px_34px_var(--shadow-color)] active:translate-y-0 active:scale-[0.98] transition-[transform,filter,box-shadow] duration-200 px-6 py-4 cursor-pointer sm:w-auto sm:px-10"
                            >
                                Tạo tài khoản miễn phí
                            </button>
                            <button
                                onClick={() => navigate(PATHS.vocabulary)}
                                className="inline-flex w-full items-center justify-center font-display font-bold text-sm text-primary bg-surface border-2 border-primary/20 rounded-full hover:border-primary/35 hover:bg-primary-light hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-[transform,background-color,border-color] duration-200 px-6 py-4 cursor-pointer sm:w-auto sm:px-8"
                            >
                                Xem từ vựng trước
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default Home;
