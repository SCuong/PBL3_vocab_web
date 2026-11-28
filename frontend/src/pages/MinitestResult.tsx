import { useEffect } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { ProgressBar } from '../components/dashboard';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { useAppContext } from '../context/AppContext';
import { PATHS } from '../routes/paths';
import { playLumoVoice, playSfx } from '../utils/sound';

const ENCOURAGEMENT_MESSAGES = {
    excellent: [
        'Tuyệt vời! Bạn gần như thành thạo rồi!',
        'Xuất sắc! Hãy giữ phong độ này!',
        'Bạn đang tiến bộ rất nhanh!',
    ],
    good: [
        'Làm tốt lắm!',
        'Khá ổn rồi, chỉ cần thêm một chút nữa!',
        'Bạn đang đi đúng hướng!',
    ],
    average: [
        'Cố thêm chút nữa nhé!',
        'Bạn đã nắm được một phần rồi!',
        'Ôn lại vài từ nữa là sẽ tốt hơn!',
    ],
    low: [
        'Không sao, học lại một chút nhé!',
        'Sai nhiều cũng là một cách học tốt',
        'Hãy thử lại, bạn sẽ làm tốt hơn!',
    ],
};

function getEncouragementMessage(score: number, total: number): string {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    const pick = (msgs: string[]) => msgs[Math.floor(Math.random() * msgs.length)];

    if (percentage >= 90) return pick(ENCOURAGEMENT_MESSAGES.excellent);
    if (percentage >= 70) return pick(ENCOURAGEMENT_MESSAGES.good);
    if (percentage >= 50) return pick(ENCOURAGEMENT_MESSAGES.average);
    return pick(ENCOURAGEMENT_MESSAGES.low);
}

const MinitestResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, refreshLearnerAnalytics } = useAppContext();
    const isGuest = !currentUser;
    const state = location.state as { score?: number; total?: number; detail?: any } | null;

    useEffect(() => {
        if (!state || state.score === undefined || state.total === undefined) return;
        playSfx('complete');
        if (!isGuest) {
            void refreshLearnerAnalytics();
        }
    }, [state, isGuest, refreshLearnerAnalytics]);

    if (!state || state.score === undefined || state.total === undefined) {
        return <Navigate to={PATHS.learning} replace />;
    }

    const { score, total, detail } = state;
    const message = getEncouragementMessage(score, total);

    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const mascotSrc =
        percent >= 80
            ? '/mascot-lumo-cool.webp'
            : percent >= 50
              ? '/mascot-lumo-happy.webp'
              : '/mascot-lumo-thinking.webp';
    const fillMax = typeof detail?.fillTotal === 'number' && detail.fillTotal > 0 ? detail.fillTotal : 5;
    const translationMax = typeof detail?.translationTotal === 'number' && detail.translationTotal > 0
        ? detail.translationTotal
        : Math.max(0, total - fillMax) || 5;
    const xpEarned = typeof detail?.xpEarned === 'number' ? detail.xpEarned : 0;
    const sections = [
        { label: 'Điền từ', value: detail?.fill || 0, max: fillMax },
        { label: 'Dịch câu', value: detail?.translation || 0, max: translationMax },
    ].filter((section) => section.max > 0);

    return (
        <div className="mx-auto max-w-xl px-4 py-5 sm:py-8">
            <section className="minitest-result-enter glass-card p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-text-muted">Kết quả kiểm tra</p>
                        <p className="mt-2 flex items-baseline gap-2">
                            <span className="text-[4rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-text-primary sm:text-[5rem]">{score}</span>
                            <span className="text-2xl font-semibold tabular-nums text-text-muted">/ {total}</span>
                            <span className="ml-2 rounded-full border-2 border-primary/25 bg-primary-light px-3 py-1 text-sm font-bold tabular-nums text-primary">{percent}%</span>
                        </p>
                    </div>
                    <img
                        src={mascotSrc}
                        alt={percent >= 50 ? 'Lumo chúc mừng' : 'Lumo động viên'}
                        width={92}
                        height={104}
                        onClick={() => playLumoVoice(percent >= 50 ? 'celebrate' : 'greet')}
                        className="h-auto w-[84px] shrink-0 cursor-pointer transition-transform hover:scale-105 sm:w-[96px]"
                    />
                </div>
                <h1 className="mt-4 text-xl font-bold text-text-primary sm:text-2xl">{message}</h1>

                <div className="mt-4 flex flex-wrap gap-2">
                    {!isGuest && xpEarned > 0 && (
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-sm font-semibold tabular-nums text-primary">
                            <Sparkles size={15} aria-hidden /> +{xpEarned} XP
                        </p>
                    )}
                    {detail?.bonus > 0 && (
                        <p className="inline-flex items-center gap-2 rounded-full bg-warning-color/10 px-3 py-1.5 text-sm font-semibold text-warning-color">
                            <Sparkles size={16} aria-hidden /> Dịch đúng hết: +50 XP thưởng
                        </p>
                    )}
                </div>

                <dl className="mt-6 space-y-3.5">
                    {sections.map(section => (
                        <div key={section.label}>
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <dt className="font-medium text-text-primary">{section.label}</dt>
                                <dd className="font-semibold tabular-nums text-text-muted">{section.value} / {section.max}</dd>
                            </div>
                            <ProgressBar value={section.value} max={section.max} label={section.label} hideLabel />
                        </div>
                    ))}
                </dl>

                {isGuest && (
                    <div className="mt-8 rounded-[var(--radius-element)] border border-primary/20 bg-primary-light p-4">
                        <p className="text-sm font-semibold text-text-primary">Bạn vừa hoàn thành bài kiểm tra thử!</p>
                        <p className="mt-1 text-sm text-text-muted">
                            Đăng ký miễn phí để lưu kết quả, nhận lịch ôn tập SM-2 và mở khoá toàn bộ chủ đề.
                        </p>
                        <Button className="mt-3" fullWidth onClick={() => navigate(PATHS.register)}>
                            Tạo tài khoản miễn phí <ChevronRight size={18} aria-hidden />
                        </Button>
                    </div>
                )}

                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                    <Button fullWidth variant={isGuest ? 'secondary' : 'primary'} onClick={() => navigate(PATHS.learning)}>
                        Tiếp tục học <ChevronRight size={18} aria-hidden />
                    </Button>
                    <Button fullWidth variant="secondary" onClick={() => navigate(PATHS.learningReview, { state: { detail } })}>
                        Xem lại đáp án
                    </Button>
                </div>
                <Button fullWidth variant="ghost" className="mt-2" onClick={() => navigate(isGuest ? PATHS.home : PATHS.profile)}>
                    {isGuest ? 'Về trang chủ' : 'Xem thống kê ở Hồ sơ'}
                </Button>
            </section>
        </div>
    );
};

export default MinitestResult;
