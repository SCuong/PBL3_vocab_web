import { useEffect, useMemo, useState } from 'react';
import { Search, Volume2, X, Sparkles, Loader2, ChevronDown, RotateCcw } from 'lucide-react';
import { CEFR_LEVELS } from '../constants/appConstants';
import { Badge, Button, PageTitle, typography } from '../components/ui';
import { vocabularyApi } from '../services/vocabularyApi';
import { apiFetch } from '../services/apiClient';
import { playPronunciationAudio } from '../utils/audio';
import { mapVocabularyToUiModel } from '../utils/vocabularyMapper';
import { useAppContext } from '../context/AppContext';

const PAGE_SIZE = 24;

type AiCollocation = {
    phrase: string;
    meaning: string;
    example: string;
};

type AiConfusingWord = {
    word: string;
    difference: string;
};

type AiCommonMistake = {
    wrong: string;
    correct: string;
    explanation: string;
};

type VocabularyAiResponse = {
    summary: string;
    quickUsage: string;
    collocations: AiCollocation[];
    confusingWords: AiConfusingWord[];
    commonMistakes: AiCommonMistake[];
    explanation: string;
    isFallback: boolean;
};

type AiSectionKey = 'usage' | 'collocations' | 'confusingWords' | 'commonMistakes';

type AiAssistantPanelProps = {
    response: VocabularyAiResponse | null;
    error: string;
    isLoading: boolean;
    openSection: AiSectionKey | null;
    onToggleSection: (section: AiSectionKey) => void;
    onRetry: () => void;
};

const AiAssistantPanel = ({
    response,
    error,
    isLoading,
    openSection,
    onToggleSection,
    onRetry,
}: AiAssistantPanelProps) => {
    const sectionButtonClass = 'w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-text-primary hover:bg-surface-hover transition-colors';
    const sectionBodyClass = 'px-4 pb-4 text-sm leading-relaxed text-text-secondary';

    return (
        <aside className="rounded-card border border-border bg-bg-secondary/70 p-4 md:p-5 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Sparkles size={17} />
                    </span>
                    <div>
                        <h3 className="text-base font-bold text-text-primary">Trợ lý AI</h3>
                        <p className="text-xs text-text-muted">Gợi ý học từ ngắn gọn</p>
                    </div>
                </div>
                <Badge variant="cyan" className="normal-case">Beta</Badge>
            </div>

            {isLoading && (
                <div className="space-y-3" aria-live="polite">
                    <div className="h-24 rounded-lg bg-surface animate-pulse" />
                    <div className="h-11 rounded-lg bg-surface animate-pulse" />
                    <div className="h-11 rounded-lg bg-surface animate-pulse" />
                    <div className="h-11 rounded-lg bg-surface animate-pulse" />
                </div>
            )}

            {!isLoading && error && (
                <div className="rounded-lg border border-warning-color/25 bg-warning-color/10 p-4">
                    <p className="text-sm text-text-secondary">{error}</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover cursor-pointer"
                    >
                        <RotateCcw size={15} /> Thử lại
                    </button>
                </div>
            )}

            {!isLoading && !error && response && (
                <div className="space-y-3">
                    <div className="rounded-lg border border-primary/15 bg-surface p-4">
                        <p className="text-sm leading-relaxed text-text-primary">{response.summary}</p>
                        {response.isFallback && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs text-text-muted">
                                    Đang hiển thị gợi ý cơ bản.
                                </p>
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover cursor-pointer"
                                >
                                    <RotateCcw size={13} /> Thử lại
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-lg border border-border bg-surface divide-y divide-border">
                        <section>
                            <button type="button" className={sectionButtonClass} onClick={() => onToggleSection('usage')} aria-expanded={openSection === 'usage'}>
                                Cách dùng nhanh
                                <ChevronDown size={16} className={`shrink-0 transition-transform ${openSection === 'usage' ? 'rotate-180' : ''}`} />
                            </button>
                            {openSection === 'usage' && (
                                <div className={sectionBodyClass}>
                                    {response.quickUsage || 'Chưa có gợi ý cách dùng cho từ này.'}
                                </div>
                            )}
                        </section>

                        <section>
                            <button type="button" className={sectionButtonClass} onClick={() => onToggleSection('collocations')} aria-expanded={openSection === 'collocations'}>
                                Cụm từ hay gặp
                                <ChevronDown size={16} className={`shrink-0 transition-transform ${openSection === 'collocations' ? 'rotate-180' : ''}`} />
                            </button>
                            {openSection === 'collocations' && (
                                <div className={`${sectionBodyClass} space-y-3`}>
                                    {response.collocations.length === 0 && 'Chưa có cụm từ gợi ý.'}
                                    {response.collocations.map(item => (
                                        <div key={`${item.phrase}-${item.example}`}>
                                            <p><strong className="text-text-primary">{item.phrase}</strong> · {item.meaning}</p>
                                            {item.example && <p className="mt-1 text-xs italic text-text-muted">{item.example}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section>
                            <button type="button" className={sectionButtonClass} onClick={() => onToggleSection('confusingWords')} aria-expanded={openSection === 'confusingWords'}>
                                Phân biệt dễ nhầm
                                <ChevronDown size={16} className={`shrink-0 transition-transform ${openSection === 'confusingWords' ? 'rotate-180' : ''}`} />
                            </button>
                            {openSection === 'confusingWords' && (
                                <div className={`${sectionBodyClass} space-y-3`}>
                                    {response.confusingWords.length === 0 && 'Chưa có từ dễ nhầm cần lưu ý.'}
                                    {response.confusingWords.map(item => (
                                        <p key={item.word}>
                                            <strong className="text-text-primary">{item.word}:</strong> {item.difference}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section>
                            <button type="button" className={sectionButtonClass} onClick={() => onToggleSection('commonMistakes')} aria-expanded={openSection === 'commonMistakes'}>
                                Lỗi thường gặp
                                <ChevronDown size={16} className={`shrink-0 transition-transform ${openSection === 'commonMistakes' ? 'rotate-180' : ''}`} />
                            </button>
                            {openSection === 'commonMistakes' && (
                                <div className={`${sectionBodyClass} space-y-4`}>
                                    {response.commonMistakes.length === 0 && 'Chưa có lỗi thường gặp cần lưu ý.'}
                                    {response.commonMistakes.map(item => (
                                        <div key={`${item.wrong}-${item.correct}`}>
                                            {item.wrong && <p className="text-danger-color line-through">{item.wrong}</p>}
                                            <p className="font-semibold text-success-color">{item.correct}</p>
                                            {item.explanation && <p className="mt-1 text-xs text-text-muted">{item.explanation}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </aside>
    );
};

const Vocabulary = () => {
    const { topicFilters: topics } = useAppContext();
    const [selectedWord, setSelectedWord] = useState<any>(null);
    const onSelectWord = (word: any) => {
        setSelectedWord(word);
        void vocabularyApi.getById(word.id)
            .then(detail => setSelectedWord(prev =>
                prev?.id === word.id ? mapVocabularyToUiModel(detail) : prev))
            .catch(() => { /* keep list-row data */ });
    };
    const onCloseWordDetail = () => setSelectedWord(null);
    const [items, setItems] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCefr, setSelectedCefr] = useState('ALL');
    const [selectedTopic, setSelectedTopic] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // AI State
    const [aiResponse, setAiResponse] = useState<VocabularyAiResponse | null>(null);
    const [aiError, setAiError] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [openAiSection, setOpenAiSection] = useState<AiSectionKey | null>('usage');

    // Drives the .is-open class one frame after mount so the modal fade
    // transitions from opacity:0 → 1 instead of snapping.
    const [modalActive, setModalActive] = useState(false);

    // Reset AI response when word changes; also retrigger the open animation.
    useEffect(() => {
        setAiResponse(null);
        setAiError('');
        setIsLoadingAi(false);
        setIsAiPanelOpen(false);
        setOpenAiSection('usage');
        if (!selectedWord) {
            setModalActive(false);
            return;
        }
        const id = requestAnimationFrame(() => setModalActive(true));
        return () => cancelAnimationFrame(id);
    }, [selectedWord]);

    const requestAiExplanation = async () => {
        if (!selectedWord) return;
        setIsLoadingAi(true);
        setAiError('');
        try {
            const formData = new FormData();
            formData.append('word', selectedWord.word);
            formData.append('context', selectedWord.meaning);

            const response = await apiFetch('/api/AI/Explain', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                setAiResponse(await response.json() as VocabularyAiResponse);
            } else {
                setAiError('Trợ lý AI chưa thể phân tích từ này. Vui lòng thử lại.');
            }
        } catch {
            setAiError('Không thể kết nối với trợ lý AI. Vui lòng thử lại.');
        } finally {
            setIsLoadingAi(false);
        }
    };

    const handleAskAi = () => {
        setIsAiPanelOpen(true);
        if (aiResponse && !aiError) return;
        void requestAiExplanation();
    };

    const handleRetryAi = () => {
        setAiResponse(null);
        setAiError('');
        void requestAiExplanation();
    };

    const toggleAiSection = (section: AiSectionKey) => {
        setOpenAiSection(current => current === section ? null : section);
    };

    const topicOptions = useMemo(() => {
        return topics
            .map((topic: any) => ({ value: String(topic.topicId), label: topic.name }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [topics]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [search]);

    const visiblePages = useMemo(() => {
        if (totalPages <= 0) return [] as number[];
        const left = Math.max(2, page - 2);
        const right = Math.min(totalPages - 1, page + 2);
        const range: number[] = [];
        for (let i = left; i <= right; i++) range.push(i);
        return range;
    }, [page, totalPages]);

    const loadPage = async (nextPage: number) => {
        setIsLoading(true);

        try {
            const response = await vocabularyApi.getPage({
                page: nextPage,
                pageSize: PAGE_SIZE,
                search: debouncedSearch,
                cefr: selectedCefr,
                topicId: selectedTopic === 'ALL' ? null : Number(selectedTopic)
            });

            const mappedItems = response.items.map(mapVocabularyToUiModel);
            setItems(mappedItems);
            setPage(response.page);
            setPageInput(String(response.page));
            setTotalPages(response.totalPages);
            setTotalCount(response.totalCount);
            setErrorMessage('');
        } catch (error: any) {
            setErrorMessage(error?.message || 'Không thể tải danh sách từ vựng.');
            setItems([]);
            setTotalCount(0);
            setTotalPages(0);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
        void loadPage(1);
    }, [debouncedSearch, selectedCefr, selectedTopic]);

    useEffect(() => {
        if (page <= 1) {
            return;
        }

        void loadPage(page);
    }, [page]);

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === page || isLoading) {
            return;
        }

        setPage(nextPage);
    };

    const handleGoToPage = () => {
        const nextPage = Number(pageInput);
        if (!Number.isInteger(nextPage)) {
            return;
        }

        handlePageChange(nextPage);
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <PageTitle>Từ vựng</PageTitle>
                    <p className="text-sm text-text-muted mt-2">
                        Trang {page} / {Math.max(totalPages, 1)} · Tổng {totalCount} từ vựng
                    </p>
                </div>
                <div className="w-full md:w-[640px] grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm từ vựng..."
                            className="vocab-input pl-12 pr-4"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Tìm kiếm từ vựng"
                        />
                    </div>
                    <select
                        value={selectedCefr}
                        onChange={(e) => setSelectedCefr(e.target.value)}
                        className="vocab-input cursor-pointer"
                        aria-label="Lọc theo cấp độ CEFR"
                    >
                        <option value="ALL">Tất cả cấp độ</option>
                        {CEFR_LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="vocab-input md:col-span-3 cursor-pointer"
                        aria-label="Lọc theo chủ đề"
                    >
                        <option value="ALL">Tất cả chủ đề</option>
                        {topicOptions.map(topic => (
                            <option key={topic.value} value={topic.value}>{topic.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading && (
                <div className="text-text-muted mb-6">Đang tải danh sách từ vựng...</div>
            )}

            {errorMessage && (
                <div className="text-sm text-red-500 font-medium mb-6">{errorMessage}</div>
            )}

            {!isLoading && !errorMessage && items.length === 0 && (
                <div className="vocab-empty mb-6">
                    Không tìm thấy từ vựng phù hợp.
                </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 vocab-defer">
                {items.map((v: any) => (
                    <div
                        key={v.id}
                        data-testid="vocab-card"
                        data-vocab-id={v.id}
                        className="vocab-card group"
                        onClick={() => onSelectWord(v)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <Badge variant="purple">{v.cefr}</Badge>
                            <Button
                                variant="ghost"
                                className="p-2 min-h-0 rounded-full"
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    playPronunciationAudio(v.audioUrl, v.word);
                                }}
                                aria-label={`Phát âm từ ${v.word}`}
                            >
                                <Volume2 size={16} />
                            </Button>
                        </div>
                        <h3 className="text-2xl mb-1 group-hover:text-primary transition-colors">{v.word}</h3>
                        <p className="text-text-muted font-ipa text-sm mb-4">
                            {v.transcription}
                        </p>
                        <p className="text-text-secondary line-clamp-2">{v.meaning}</p>
                    </div>
                ))}
            </div>

            {!isLoading && totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
                    <Button variant="ghost" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
                        Trước
                    </Button>

                    {/* Always page 1 */}
                    <Button variant={page === 1 ? 'primary' : 'ghost'} onClick={() => handlePageChange(1)}>
                        1
                    </Button>

                    {/* Ellipsis before window */}
                    {visiblePages.length > 0 && visiblePages[0] > 2 && (
                        <span className="px-2 text-text-muted">...</span>
                    )}

                    {/* Window around current (excludes 1 and last) */}
                    {visiblePages.map((pageNumber) => (
                        <Button
                            key={pageNumber}
                            variant={pageNumber === page ? 'primary' : 'ghost'}
                            onClick={() => handlePageChange(pageNumber)}
                        >
                            {pageNumber}
                        </Button>
                    ))}

                    {/* Ellipsis after window */}
                    {visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                        <span className="px-2 text-text-muted">...</span>
                    )}

                    {/* Always last page */}
                    {totalPages > 1 && (
                        <Button variant={page === totalPages ? 'primary' : 'ghost'} onClick={() => handlePageChange(totalPages)}>
                            {totalPages}
                        </Button>
                    )}

                    <Button variant="ghost" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
                        Sau
                    </Button>
                    <div className="flex items-center gap-2 ml-2">
                        <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleGoToPage();
                                }
                            }}
                            className="vocab-input w-24 px-3 py-2"
                            aria-label="Đến trang"
                        />
                        <Button variant="ghost" onClick={handleGoToPage}>
                            Đi
                        </Button>
                    </div>
                </div>
            )}

            {selectedWord && (
                <div
                    data-testid="vocab-modal"
                    className={`vocab-modal-overlay${modalActive ? ' is-open' : ''}`}
                    onClick={onCloseWordDetail}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        data-testid="vocab-modal-content"
                        className={`vocab-modal-card ${isAiPanelOpen ? 'max-w-6xl' : 'max-w-3xl'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="vocab-modal-header">
                            <div className="min-w-0">
                                <Badge variant="cyan" className="mb-3">{selectedWord.cefr}</Badge>
                                <h2 className={`${typography.sectionTitle} mb-1 truncate`}>{selectedWord.word}</h2>
                                <p className="text-text-muted font-ipa text-sm">
                                    {selectedWord.transcription}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="w-9 h-9 rounded-full hover:bg-primary/10 flex items-center justify-center cursor-pointer shrink-0"
                                onClick={onCloseWordDetail}
                                aria-label="Đóng chi tiết từ vựng"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={`vocab-modal-body grid gap-5 ${isAiPanelOpen ? 'lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]' : 'grid-cols-1'}`}>
                            <div className="min-w-0 space-y-6">
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        variant="primary"
                                        className="px-6"
                                        onClick={() => playPronunciationAudio(selectedWord.audioUrl, selectedWord.word)}
                                    >
                                        <Volume2 size={18} /> Nghe phát âm
                                    </Button>
                                    {selectedWord.example && (
                                        <Button
                                            variant="ghost"
                                            className="px-6"
                                            onClick={() => playPronunciationAudio(selectedWord.exampleAudioUrl, selectedWord.example)}
                                        >
                                            <Volume2 size={18} /> Nghe ví dụ
                                        </Button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleAskAi}
                                        disabled={isLoadingAi}
                                        aria-pressed={isAiPanelOpen}
                                        className={`px-5 py-2.5 rounded-pill border font-display font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:cursor-wait ${
                                            isAiPanelOpen
                                                ? 'border-primary/35 bg-primary/10 text-primary'
                                                : 'border-border bg-surface text-text-muted hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
                                        }`}
                                    >
                                        {isLoadingAi ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={16} />}
                                        Trợ lý AI
                                    </button>
                                </div>

                                <div className="rounded-card border border-primary/10 bg-primary/[0.04] p-5">
                                    <h3 className="text-sm font-bold uppercase tracking-wide text-primary mb-2">Ý nghĩa</h3>
                                    <p className="text-lg mb-4">{selectedWord.meaning}</p>
                                    {selectedWord.example && (
                                        <>
                                            <h3 className="text-sm font-bold uppercase tracking-wide text-purple mb-2">Ví dụ</h3>
                                            <p className="italic text-text-secondary leading-relaxed">"{selectedWord.example}"</p>
                                            {selectedWord.translation && (
                                                <p className="text-sm text-text-muted mt-2 italic">"{selectedWord.translation}"</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {isAiPanelOpen && (
                                <AiAssistantPanel
                                    response={aiResponse}
                                    error={aiError}
                                    isLoading={isLoadingAi}
                                    openSection={openAiSection}
                                    onToggleSection={toggleAiSection}
                                    onRetry={handleRetryAi}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vocabulary;
