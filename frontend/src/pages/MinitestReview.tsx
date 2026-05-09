import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { PATHS } from '../routes/paths';

type TranslationReviewItem = {
    englishSentence: string;
    correctTranslation: string;
    userAnswer: string;
    isCorrect: boolean;
};

const MinitestReview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as { detail?: { review?: TranslationReviewItem[] } } | null;

    if (!state?.detail) {
        return <Navigate to={PATHS.learning} replace />;
    }

    const items = Array.isArray(state.detail?.review) ? state.detail.review : [];

    return (
        <div className="max-w-4xl mx-auto px-6 py-24">
            <div className="glass-card p-12 border-2 border-primary/10">
                <h2 className="text-3xl font-bold mb-8">Xem lại đáp án</h2>
                {items.length === 0 ? (
                    <div className="text-text-muted">Chưa có dữ liệu để xem lại.</div>
                ) : (
                    <div className="space-y-6">
                        {items.map((item, index) => (
                            <div key={index} className={`p-4 rounded-xl border-2 ${item.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                                <div className="font-semibold text-lg mb-2">Câu {index + 1}: {item.englishSentence}</div>
                                <div className="text-base">
                                    <span className="text-green-700">Đáp án đúng: <strong>{item.correctTranslation}</strong></span>
                                </div>
                                <div className="text-base">
                                    <span className={item.isCorrect ? 'text-green-700' : 'text-red-700'}>
                                        Bạn đã chọn: <strong>{item.userAnswer || 'Không trả lời'}</strong>
                                    </span>
                                    <span className="ml-2">{item.isCorrect ? '✅' : '❌'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="mt-10 flex justify-end">
                    <Button variant="primary" className="px-10 py-4" onClick={() => navigate(-1)}>
                        Quay lại kết quả
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MinitestReview;
