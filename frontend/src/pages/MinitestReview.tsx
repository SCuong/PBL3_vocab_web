import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '../components/ui';
import { PATHS } from '../routes/paths';

type FillReviewItem = {
    prompt: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
};

type TranslationReviewItem = {
    englishSentence: string;
    correctTranslation: string;
    userAnswer: string;
    isCorrect: boolean;
};

const MinitestReview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as {
        detail?: {
            fillReview?: FillReviewItem[];
            review?: TranslationReviewItem[];
        };
    } | null;

    if (!state?.detail) {
        return <Navigate to={PATHS.learning} replace />;
    }

    const fillItems = Array.isArray(state.detail?.fillReview) ? state.detail.fillReview : [];
    const items = Array.isArray(state.detail?.review) ? state.detail.review : [];
    const totalCount = fillItems.length + items.length;
    const totalCorrect =
        fillItems.filter(item => item.isCorrect).length +
        items.filter(item => item.isCorrect).length;

    return (
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
            <header className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-text-primary">Xem lại đáp án</h1>
                    {totalCount > 0 && (
                        <p className="mt-1 text-sm text-text-muted">
                            Đúng <span className="font-semibold tabular-nums text-text-primary">{totalCorrect}</span> / {totalCount} câu
                        </p>
                    )}
                </div>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} aria-hidden /> Kết quả
                </Button>
            </header>

            {totalCount === 0 ? (
                <p className="vocab-empty">Chưa có dữ liệu để xem lại.</p>
            ) : (
                <div className="space-y-8">
                    {fillItems.length > 0 && (
                        <section aria-labelledby="review-fill-heading">
                            <h2 id="review-fill-heading" className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
                                Bài 1: Chọn từ đúng ({fillItems.filter(i => i.isCorrect).length} / {fillItems.length})
                            </h2>
                            <ol className="space-y-3">
                                {fillItems.map((item, index) => (
                                    <li key={`fill-${index}`} className="rounded-[var(--radius-container)] border-2 border-border bg-surface p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                                    item.isCorrect ? 'bg-success-color text-text-on-accent' : 'bg-danger-color text-text-on-accent'
                                                }`}
                                                aria-label={item.isCorrect ? 'Đúng' : 'Sai'}
                                            >
                                                {item.isCorrect ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-text-muted">Câu {index + 1}</p>
                                                <p className="mt-0.5 font-semibold text-text-primary">{item.prompt}</p>
                                                <p className="mt-3 text-sm text-text-muted">
                                                    Đáp án đúng: <span className="font-semibold text-success-color">{item.correctAnswer}</span>
                                                </p>
                                                {!item.isCorrect && (
                                                    <p className="mt-1 text-sm text-text-muted">
                                                        Bạn chọn: <span className="font-semibold text-danger-color">{item.userAnswer || 'Không trả lời'}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}

                    {items.length > 0 && (
                        <section aria-labelledby="review-trans-heading">
                            <h2 id="review-trans-heading" className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">
                                Bài 2: Sắp xếp câu ({items.filter(i => i.isCorrect).length} / {items.length})
                            </h2>
                            <ol className="space-y-3">
                                {items.map((item, index) => (
                                    <li key={`trans-${index}`} className="rounded-[var(--radius-container)] border-2 border-border bg-surface p-4 sm:p-5">
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                                    item.isCorrect ? 'bg-success-color text-text-on-accent' : 'bg-danger-color text-text-on-accent'
                                                }`}
                                                aria-label={item.isCorrect ? 'Đúng' : 'Sai'}
                                            >
                                                {item.isCorrect ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-text-muted">Câu {index + 1}</p>
                                                <p className="mt-0.5 font-semibold text-text-primary">{item.englishSentence}</p>
                                                <p className="mt-3 text-sm text-text-muted">
                                                    Đáp án đúng: <span className="font-semibold text-success-color">{item.correctTranslation}</span>
                                                </p>
                                                {!item.isCorrect && (
                                                    <p className="mt-1 text-sm text-text-muted">
                                                        Bạn chọn: <span className="font-semibold text-danger-color">{item.userAnswer || 'Không trả lời'}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default MinitestReview;
