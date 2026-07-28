import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, Play, Volume2, Star,
    MessageCircle, Briefcase, HeartPulse, Plane, House, Smile, Microscope, Library,
    Target, BookOpen, Gamepad2,
} from 'lucide-react';
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

/* ── Topics data ────────────────────────────────────────────────────── */
const topics = [
    { icon: MessageCircle, name: 'Giao tiếp hàng ngày', count: '10 chủ đề' },
    { icon: Briefcase, name: 'Công việc & Học tập', count: '9 chủ đề' },
    { icon: House, name: 'Cuộc sống hàng ngày', count: '10 chủ đề' },
    { icon: Microscope, name: 'Văn hoá & Khoa học', count: '6 chủ đề' },
    { icon: HeartPulse, name: 'Sức khoẻ', count: '5 chủ đề' },
    { icon: Plane, name: 'Giải trí & Du lịch', count: '5 chủ đề' },
    { icon: Smile, name: 'Cảm xúc & Ý kiến', count: '5 chủ đề' },
];

/* ── Steps data ─────────────────────────────────────────────────────── */
const steps = [
    { num: '01', icon: Target, title: 'Chọn chủ đề', desc: 'Từ 50+ chủ đề phân loại theo cấp độ CEFR.' },
    { num: '02', icon: BookOpen, title: 'Học flashcard', desc: 'Thẻ lật 3D kèm phát âm IPA và ví dụ thực tế.' },
    { num: '03', icon: Gamepad2, title: 'Luyện tập & ôn lại', desc: 'Trò chơi ghép từ, quiz, và nhắc ôn đúng lúc.' },
];

/* ── Spaced-repetition schedule (the method, not a claim) ───────────── */
const schedule = [
    { label: 'Ngày 1', note: 'Học lần đầu' },
    { label: 'Ngày 3', note: 'Nhắc lại' },
    { label: 'Ngày 7', note: 'Củng cố' },
    { label: 'Ngày 21', note: 'Ghi nhớ dài hạn' },
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
            { threshold: 0.18, rootMargin: '0px 0px -12% 0px' }
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

            {/* ── CÁCH HOẠT ĐỘNG ── */}
            <section className="ss-row ss-row--flip ss-band home-defer">
                <div className="ss-proof home-fade-in" style={{ transitionDelay: '0ms' }}>
                    <ol className="ss-stepper">
                        {steps.map(step => (
                            <li key={step.num} className="ss-step">
                                <span className="ss-step-mark">
                                    <step.icon size={20} strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0">
                                    <div className="ss-step-num">{step.num}</div>
                                    <h3 className="ss-step-title">{step.title}</h3>
                                    <p className="ss-step-desc">{step.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="ss-text home-fade-in" style={{ transitionDelay: '120ms' }}>
                    <h2 className={typography.sectionTitle}>Ba bước, rồi bạn vào việc</h2>
                    <p className="ss-lede">
                        Không có bảng điều khiển rắc rối. Chọn một chủ đề, lật vài tấm thẻ,
                        rồi để hệ thống nhắc bạn ôn đúng lúc.
                    </p>
                    <div className="ss-actions">
                        <button onClick={() => navigate(PATHS.learning)} className="ss-chip">
                            Bắt đầu học
                            <ChevronRight size={14} className="shrink-0" />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── CHỦ ĐỀ ── */}
            <section className="ss-row home-defer">
                <div className="ss-text home-fade-in" style={{ transitionDelay: '0ms' }}>
                    <h2 className={typography.sectionTitle}>Chọn thứ bạn thật sự cần nói</h2>
                    <p className="ss-lede">
                        2.400+ từ vựng, chia theo 7 nhóm chính và hơn 50 chủ đề nhỏ — từ hội thoại
                        hằng ngày tới công việc, sức khoẻ và du lịch.
                    </p>
                    <div className="ss-actions">
                        <button onClick={() => navigate(PATHS.vocabulary)} className="ss-chip">
                            <Library size={14} className="shrink-0" />
                            Xem tất cả chủ đề
                        </button>
                    </div>
                </div>

                <div className="ss-proof home-fade-in" style={{ transitionDelay: '120ms' }}>
                    <ul className="ss-topics">
                        {topics.map(topic => (
                            <li key={topic.name}>
                                <button onClick={() => navigate(PATHS.vocabulary)} className="ss-topic">
                                    <span className="ss-topic-icon">
                                        <topic.icon size={18} strokeWidth={1.75} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="ss-topic-name">{topic.name}</span>
                                        <span className="ss-topic-count">{topic.count}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ── GHI NHỚ ── */}
            <section className="ss-row ss-row--flip ss-band home-defer">
                <div className="ss-proof home-fade-in" style={{ transitionDelay: '0ms' }}>
                    <ol className="ss-schedule">
                        {schedule.map((slot, i) => (
                            <li key={slot.label} className="ss-slot" style={{ ['--slot-fill' as string]: `${28 + i * 24}%` }}>
                                <span className="ss-slot-label">{slot.label}</span>
                                <span className="ss-slot-track" aria-hidden="true"><span className="ss-slot-fill" /></span>
                                <span className="ss-slot-note">{slot.note}</span>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="ss-text home-fade-in" style={{ transitionDelay: '120ms' }}>
                    <h2 className={typography.sectionTitle}>Ôn đúng lúc bạn sắp quên</h2>
                    <p className="ss-lede">
                        Lặp lại ngắt quãng giãn dần khoảng cách giữa các lần ôn. Mỗi lần nhớ lại
                        thành công, từ đó được đẩy xa hơn — nên bạn ôn ít đi mà nhớ lâu hơn.
                    </p>
                    <p className="ss-note">
                        Chuỗi ngày học và tiến độ từng chủ đề được ghi lại, để bạn thấy mình
                        đang đi tới đâu.
                    </p>
                </div>
            </section>

            {/* ── KẾT TRANG ── */}
            {!currentUser && (
                <section className="ss-close home-defer">
                    <div className="home-fade-in">
                        <p className="ss-close-line">Sẵn sàng bắt đầu chưa?</p>
                        <p className="ss-close-sub">
                            Đăng ký miễn phí và mở khoá toàn bộ kho từ vựng ngay hôm nay.
                        </p>
                        <div className="ss-actions ss-actions--close">
                            <button onClick={() => navigate(PATHS.register)} className="btn-primary !px-10 !py-4 !text-base">
                                Tạo tài khoản miễn phí
                            </button>
                            <button onClick={() => navigate(PATHS.vocabulary)} className="ss-chip">
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
