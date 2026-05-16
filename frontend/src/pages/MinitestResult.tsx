import { ChevronRight } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button, typography } from '../components/ui';
import { PATHS } from '../routes/paths';

const ENCOURAGEMENT_MESSAGES = {
    excellent: [
        '🎉 Tuyệt vời! Bạn gần như thành thạo rồi!',
        '🌟 Xuất sắc! Hãy giữ phong độ này!',
        '🚀 Bạn đang tiến bộ rất nhanh!',
    ],
    good: [
        '👏 Làm tốt lắm!',
        '💪 Khá ổn rồi, chỉ cần thêm một chút nữa!',
        '🛤️ Bạn đang đi đúng hướng!',
    ],
    average: [
        '💪 Cố thêm chút nữa nhé!',
        '📚 Bạn đã nắm được một phần rồi!',
        '🔁 Ôn lại vài từ nữa là sẽ tốt hơn!',
    ],
    low: [
        '😊 Không sao, học lại một chút nhé!',
        '🧠 Sai nhiều cũng là một cách học tốt',
        '🔥 Hãy thử lại, bạn sẽ làm tốt hơn!',
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
    const state = location.state as { score?: number; total?: number; detail?: any } | null;

    if (!state || state.score === undefined || state.total === undefined) {
        return <Navigate to={PATHS.learning} replace />;
    }

    const { score, total, detail } = state;
    const message = getEncouragementMessage(score, total);

    return (
        <div className="max-w-4xl mx-auto px-6 py-24">
            <div className="learning-card p-6 sm:p-10 lg:p-12 text-center relative overflow-hidden minitest-result-enter">
                <div className="mesh-orb w-64 h-64 bg-primary top-[-32px] right-[-32px] opacity-20" />
                <div className="relative z-10">
                    <div className="text-[4rem] sm:text-[5rem] lg:text-[6rem] font-display font-extrabold bg-linear-to-r from-cyan via-purple to-pink bg-clip-text text-transparent mb-8 leading-none">
                        {score}<span className="text-[1.75rem] text-text-muted">/{total}</span>
                    </div>
                    <h2 className={`${typography.sectionTitle} mb-6`}>{message}</h2>

                    {detail?.bonus > 0 && (
                        <div className="mb-12 inline-block px-6 py-3 bg-linear-to-r from-yellow-400 to-orange-500 rounded-pill text-text-on-accent font-bold shadow-lg animate-bounce">
                            🔥 Perfect Translation Bonus: +50 XP
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto mb-16">
                        <div className="p-6 bg-purple/5 rounded-2xl border border-purple/10">
                            <div className="text-text-muted text-sm uppercase font-bold mb-2">Điền Từ</div>
                            <div className="text-3xl font-bold text-primary">{detail?.fill || 0}/5</div>
                        </div>
                        <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10">
                            <div className="text-text-muted text-sm uppercase font-bold mb-2">Dịch Câu</div>
                            <div className="text-3xl font-bold text-secondary">{detail?.translation || 0}/4</div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Button variant="primary" className="px-12 py-5 text-xl" onClick={() => navigate(PATHS.learning)}>
                            Tiếp tục lộ trình <ChevronRight size={24} />
                        </Button>
                        <Button variant="secondary" className="px-12 py-5 text-xl" onClick={() => navigate(PATHS.home)}>
                            Về trang chủ
                        </Button>
                        <Button
                            variant="ghost"
                            className="px-12 py-5 text-xl"
                            onClick={() => navigate(PATHS.learningReview, { state: { detail } })}
                        >
                            Xem lại đáp án 📝
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MinitestResult;
