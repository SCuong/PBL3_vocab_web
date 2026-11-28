import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Check,
    ChevronDown,
    Lock,
    Play,
    RotateCcw,
    Search,
    Sparkles,
    Volume2,
    X,
} from 'lucide-react';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Spinner } from '@astryxdesign/core/Spinner';
import { CEFR_LEVELS } from '../constants/appConstants';
import { AudioWaveButton, Badge, Button } from '../components/ui';
import { vocabularyApi } from '../services/vocabularyApi';
import { apiFetch } from '../services/apiClient';
import { mapVocabularyToUiModel, type VocabularyUiItem } from '../utils/vocabularyMapper';
import { playPronunciationAudio } from '../utils/audio';
import { getAutoPlayPronunciation } from '../utils/learningPreferences';
import { useAppContext } from '../context/AppContext';
import { PATHS } from '../routes/paths';

const PAGE_SIZE = 24;

const VOCAB_PAGE_CACHE = new Map<string, {
    items: VocabularyUiItem[];
    page: number;
    totalPages: number;
    totalCount: number;
}>();

const VOCAB_DETAIL_CACHE = new Map<number, VocabularyUiItem>();

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

type AiAccordionSectionProps = {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
    bodyClassName?: string;
};

const isEditableElement = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderHighlightedExample = (sentence: string, targetWord: string): ReactNode => {
    const cleanWord = targetWord.trim();
    if (!cleanWord) return sentence;

    const matcher = new RegExp(`(\\b${escapeRegExp(cleanWord)}[a-z]*\\b)`, 'gi');
    const parts = sentence.split(matcher);
    if (parts.length <= 1) return sentence;

    return parts.map((part, idx) =>
        idx % 2 === 1 ? (
            <mark
                key={`${part}-${idx}`}
                className="rounded bg-primary-light px-0.5 font-semibold text-primary"
            >
                {part}
            </mark>
        ) : (
            part
        ),
    );
};

const AiAccordionSection = ({ title, open, onToggle, children, bodyClassName }: AiAccordionSectionProps) => (
    <section>
        <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-text-primary transition-colors duration-150 ease-[var(--ease-out)] hover:text-primary"
            onClick={onToggle}
            aria-expanded={open}
        >
            {title}
            <ChevronDown
                size={16}
                className={`shrink-0 text-text-muted transition-transform duration-200 ease-[var(--ease-out)] ${open ? 'rotate-180' : ''}`}
            />
        </button>
        <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out)] ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            aria-hidden={!open}
        >
            <div className="min-h-0 overflow-hidden">
                <div
                    className={`pb-3.5 text-sm leading-relaxed text-text-secondary transition-transform duration-200 ease-[var(--ease-out)] ${open ? 'translate-y-0' : '-translate-y-1'} ${bodyClassName ?? ''}`}
                >
                    {children}
                </div>
            </div>
        </div>
    </section>
);

type AiAssistantBodyProps = {
    response: VocabularyAiResponse | null;
    error: string;
    isLoading: boolean;
    openSection: AiSectionKey | null;
    onToggleSection: (section: AiSectionKey) => void;
    onRetry: () => void;
};

const AiAssistantBody = ({
    response,
    error,
    isLoading,
    openSection,
    onToggleSection,
    onRetry,
}: AiAssistantBodyProps) => {
    if (isLoading) {
        return (
            <div className="space-y-2.5 pt-3" aria-live="polite">
                <div className="h-14 animate-pulse rounded-[var(--radius-inner)] bg-bg-secondary" />
                <div className="h-9 animate-pulse rounded-[var(--radius-inner)] bg-bg-secondary" />
                <div className="h-9 animate-pulse rounded-[var(--radius-inner)] bg-bg-secondary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="pt-3">
                <p className="text-sm text-warning-color">{error}</p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-hover"
                >
                    <RotateCcw size={14} /> Thử lại
                </button>
            </div>
        );
    }

    if (!response) return null;

    return (
        <div className="space-y-3 pt-3">
            <div className="border-l-2 border-primary/40 pl-3.5">
                <p className="text-sm leading-relaxed text-text-primary">{response.summary}</p>
                {response.isFallback && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="text-xs text-text-muted">Đang hiển thị gợi ý cơ bản.</p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover"
                        >
                            <RotateCcw size={13} /> Thử lại
                        </button>
                    </div>
                )}
            </div>

            <div className="divide-y divide-border/75 border-t border-border/75">
                <AiAccordionSection
                    title="Cách dùng nhanh"
                    open={openSection === 'usage'}
                    onToggle={() => onToggleSection('usage')}
                >
                    {response.quickUsage || 'Chưa có gợi ý cách dùng cho từ này.'}
                </AiAccordionSection>

                {response.collocations.length > 0 && (
                    <AiAccordionSection
                        title="Cụm từ hay gặp"
                        open={openSection === 'collocations'}
                        onToggle={() => onToggleSection('collocations')}
                        bodyClassName="space-y-2.5"
                    >
                        {response.collocations.map((item) => (
                            <div key={`${item.phrase}-${item.example}`}>
                                <p>
                                    <strong className="text-text-primary">{item.phrase}</strong> · {item.meaning}
                                </p>
                                {item.example && (
                                    <p className="mt-0.5 text-xs italic text-text-muted">{item.example}</p>
                                )}
                            </div>
                        ))}
                    </AiAccordionSection>
                )}

                {response.confusingWords.length > 0 && (
                    <AiAccordionSection
                        title="Phân biệt dễ nhầm"
                        open={openSection === 'confusingWords'}
                        onToggle={() => onToggleSection('confusingWords')}
                        bodyClassName="space-y-2"
                    >
                        {response.confusingWords.map((item) => (
                            <p key={item.word}>
                                <strong className="text-text-primary">{item.word}:</strong> {item.difference}
                            </p>
                        ))}
                    </AiAccordionSection>
                )}

                {response.commonMistakes.length > 0 && (
                    <AiAccordionSection
                        title="Lỗi thường gặp"
                        open={openSection === 'commonMistakes'}
                        onToggle={() => onToggleSection('commonMistakes')}
                        bodyClassName="space-y-3"
                    >
                        {response.commonMistakes.map((item) => (
                            <div key={`${item.wrong}-${item.correct}`}>
                                {item.wrong && <p className="text-danger-color line-through">{item.wrong}</p>}
                                <p className="font-semibold text-success-color">{item.correct}</p>
                                {item.explanation && (
                                    <p className="mt-0.5 text-xs text-text-muted">{item.explanation}</p>
                                )}
                            </div>
                        ))}
                    </AiAccordionSection>
                )}
            </div>
        </div>
    );
};

const Vocabulary = () => {
    const { topicFilters: topics, learnedWordIds, currentUser } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const rowRefs = useRef<Record<number, HTMLButtonElement | null>>({});
    const detailReqIdRef = useRef(0);
    const listReqIdRef = useRef(0);
    const initialWordParamRef = useRef(searchParams.get('word')?.trim() || '');

    const [items, setItems] = useState<VocabularyUiItem[]>([]);
    const [search, setSearch] = useState(() => initialWordParamRef.current);
    const [debouncedSearch, setDebouncedSearch] = useState(() => initialWordParamRef.current);
    const [selectedCefr, setSelectedCefr] = useState('ALL');
    const [selectedTopic, setSelectedTopic] = useState(() => {
        const rawTopic = searchParams.get('topic')?.trim();
        return rawTopic && /^\d+$/.test(rawTopic) ? rawTopic : 'ALL';
    });

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Selected word (desktop always previews active entry; mobile switches between index & detail view).
    const [selectedWord, setSelectedWord] = useState<VocabularyUiItem | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
    const [slowPlayback, setSlowPlayback] = useState(false);
    const autoSpeakTimerRef = useRef<number | null>(null);

    // AI panel state (collapsed by default inside the dictionary sheet).
    const [aiResponse, setAiResponse] = useState<VocabularyAiResponse | null>(null);
    const [aiError, setAiError] = useState('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
    const [openAiSection, setOpenAiSection] = useState<AiSectionKey | null>('usage');

    // Login prompt for Guests clicking AI explanation (keeps selectedWord intact).
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginModalActive, setLoginModalActive] = useState(false);

    const [mounted, setMounted] = useState(false);

    const learnedWordIdSet = useMemo(() => new Set(learnedWordIds), [learnedWordIds]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Resolve ?topic= or ?topicName= query params (e.g. from the Home topic ticker).
    useEffect(() => {
        const rawTopic = searchParams.get('topic')?.trim();
        if (rawTopic && /^\d+$/.test(rawTopic)) {
            if (selectedTopic !== rawTopic) setSelectedTopic(rawTopic);
            return;
        }

        const rawTopicName = searchParams.get('topicName')?.trim().toLowerCase();
        if (rawTopicName && topics.length > 0) {
            const normalizedQuery = rawTopicName.replace(/&/g, 'and').replace(/\s+/g, ' ');
            const matched = topics.find((topic) => {
                const normalizedName = topic.name.trim().toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ');
                return normalizedName === normalizedQuery;
            });
            if (matched) {
                const nextValue = String(matched.topicId);
                setSelectedTopic(nextValue);
                setSearchParams(
                    (prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete('topicName');
                        next.set('topic', nextValue);
                        return next;
                    },
                    { replace: true },
                );
            }
        }
    }, [searchParams, topics, selectedTopic, setSearchParams]);

    const handleTopicChange = (value: string | null) => {
        const nextTopic = value ?? 'ALL';
        setSelectedTopic(nextTopic);
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.delete('topicName');
                if (nextTopic === 'ALL') next.delete('topic');
                else next.set('topic', nextTopic);
                return next;
            },
            { replace: true },
        );
    };

    const topicOptions = useMemo(() => {
        const nonEmpty = topics.filter((topic: any) =>
            typeof topic.wordCount === 'number' ? topic.wordCount > 0 : true,
        );
        const source = nonEmpty.length > 0 ? nonEmpty : topics;
        return source
            .map((topic: any) => ({ value: String(topic.topicId), label: topic.name }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [topics]);

    // Select a word and lazily hydrate its full examples array with stale-response protection.
    const selectWord = useCallback((word: VocabularyUiItem, openMobileSheet = false) => {
        const cached = VOCAB_DETAIL_CACHE.get(word.id);
        const resolved = cached ?? word;
        setSelectedWord(resolved);
        if (openMobileSheet) setIsMobileDetailOpen(true);
        if (autoSpeakTimerRef.current !== null) {
            window.clearTimeout(autoSpeakTimerRef.current);
            autoSpeakTimerRef.current = null;
        }
        if (getAutoPlayPronunciation() && resolved.word) {
            // Defer speech synthesis past the paint frame so 120Hz UI transitions stay instant.
            autoSpeakTimerRef.current = window.setTimeout(() => {
                autoSpeakTimerRef.current = null;
                playPronunciationAudio(resolved.audioUrl, resolved.word);
            }, 140);
        }

        if (cached) {
            setIsDetailLoading(false);
            return;
        }

        const reqId = ++detailReqIdRef.current;
        setIsDetailLoading(true);
        void vocabularyApi
            .getById(word.id)
            .then((detail) => {
                const mapped = mapVocabularyToUiModel(detail);
                VOCAB_DETAIL_CACHE.set(word.id, mapped);
                if (reqId === detailReqIdRef.current) {
                    setSelectedWord((prev) => (prev?.id === word.id ? mapped : prev));
                }
            })
            .catch(() => {
                /* keep summary row data */
            })
            .finally(() => {
                if (reqId === detailReqIdRef.current) {
                    setIsDetailLoading(false);
                }
            });
    }, []);

    // Reset AI panel when the active word id changes + preload neighbor word images for 0ms switching.
    const selectedWordId = selectedWord?.id ?? null;
    useEffect(() => {
        setAiResponse(null);
        setAiError('');
        setIsLoadingAi(false);
        setIsAiPanelOpen(false);
        setOpenAiSection('usage');

        if (!selectedWordId || items.length === 0) return;
        const idx = items.findIndex((item) => item.id === selectedWordId);
        if (idx === -1) return;
        for (const offset of [-1, 1, 2]) {
            const neighbor = items[idx + offset];
            if (neighbor?.imageUrl) {
                const preloader = new Image();
                preloader.decoding = 'async';
                preloader.src = neighbor.imageUrl;
            }
        }
    }, [selectedWordId, items]);

    useEffect(() => {
        return () => {
            if (autoSpeakTimerRef.current !== null) {
                window.clearTimeout(autoSpeakTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!showLoginModal) {
            setLoginModalActive(false);
            return;
        }
        const id = requestAnimationFrame(() => setLoginModalActive(true));
        return () => cancelAnimationFrame(id);
    }, [showLoginModal]);

    // Debounce search query.
    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 220);
        return () => window.clearTimeout(timeout);
    }, [search]);

    const loadPage = useCallback(
        async (nextPage: number) => {
            const reqId = ++listReqIdRef.current;
            const cacheKey = `${nextPage}|${debouncedSearch}|${selectedCefr}|${selectedTopic}`;
            const cached = VOCAB_PAGE_CACHE.get(cacheKey);
            if (cached) {
                setItems(cached.items);
                setPage(cached.page);
                setTotalPages(cached.totalPages);
                setTotalCount(cached.totalCount);
                setErrorMessage('');
                setIsLoading(false);
            } else {
                setIsLoading(true);
            }

            try {
                const response = await vocabularyApi.getPage({
                    page: nextPage,
                    pageSize: PAGE_SIZE,
                    search: debouncedSearch,
                    cefr: selectedCefr,
                    topicId: selectedTopic === 'ALL' ? null : Number(selectedTopic),
                });
                if (reqId !== listReqIdRef.current) return;

                const mappedItems = response.items.map(mapVocabularyToUiModel);
                VOCAB_PAGE_CACHE.set(cacheKey, {
                    items: mappedItems,
                    page: response.page,
                    totalPages: response.totalPages,
                    totalCount: response.totalCount,
                });
                setItems(mappedItems);
                setPage(response.page);
                setTotalPages(response.totalPages);
                setTotalCount(response.totalCount);
                setErrorMessage('');
            } catch (error: any) {
                if (reqId !== listReqIdRef.current) return;
                if (!cached) {
                    setErrorMessage(error?.message || 'Không thể tải danh sách từ vựng.');
                    setItems([]);
                    setTotalCount(0);
                    setTotalPages(0);
                }
            } finally {
                if (reqId === listReqIdRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [debouncedSearch, selectedCefr, selectedTopic],
    );

    useEffect(() => {
        setPage(1);
        void loadPage(1);
    }, [loadPage]);

    useEffect(() => {
        if (page <= 1) return;
        void loadPage(page);
    }, [page, loadPage]);

    // Auto-select the matching ?word= entry or the first result whenever the page list changes.
    useEffect(() => {
        if (items.length === 0) {
            setSelectedWord(null);
            setIsMobileDetailOpen(false);
            return;
        }

        const requestedWord = initialWordParamRef.current.toLowerCase();
        if (requestedWord) {
            const exact = items.find((item) => item.word.toLowerCase() === requestedWord);
            if (exact) {
                initialWordParamRef.current = '';
                selectWord(exact, false);
                return;
            }
        }

        setSelectedWord((current) => {
            if (current && items.some((item) => item.id === current.id)) {
                return VOCAB_DETAIL_CACHE.get(current.id) ?? current;
            }
            return current;
        });

        if (!selectedWordId || !items.some((item) => item.id === selectedWordId)) {
            selectWord(items[0], false);
        }
    }, [items, selectedWordId, selectWord]);

    // Keyboard shortcuts: '/' focuses search, Up/Down glides through entries, Escape dismisses modal.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (showLoginModal) {
                    setShowLoginModal(false);
                    return;
                }
                if (document.activeElement === searchInputRef.current) {
                    if (search) setSearch('');
                    else searchInputRef.current?.blur();
                }
                return;
            }

            if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
                if (!isEditableElement(event.target)) {
                    event.preventDefault();
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                }
                return;
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (showLoginModal || items.length === 0) return;
                const targetEl = event.target as HTMLElement | null;
                if (targetEl && targetEl !== searchInputRef.current && isEditableElement(targetEl)) {
                    return;
                }
                event.preventDefault();
                const currentIdx = items.findIndex((item) => item.id === selectedWordId);
                const nextIdx =
                    event.key === 'ArrowDown'
                        ? (currentIdx + 1) % items.length
                        : (currentIdx - 1 + items.length) % items.length;
                const nextItem = items[nextIdx];
                if (nextItem) {
                    selectWord(nextItem, false);
                    rowRefs.current[nextItem.id]?.scrollIntoView({ block: 'nearest' });
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [items, selectedWordId, selectWord, showLoginModal, search]);

    const handlePageChange = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || nextPage === page || isLoading) return;
        setPage(nextPage);
    };

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
                body: formData,
            });

            if (response.ok) {
                setAiResponse((await response.json()) as VocabularyAiResponse);
            } else {
                setAiError('Trợ lý AI chưa thể phân tích từ này. Vui lòng thử lại.');
            }
        } catch {
            setAiError('Không thể kết nối với trợ lý AI. Vui lòng thử lại.');
        } finally {
            setIsLoadingAi(false);
        }
    };

    const handleToggleAi = () => {
        if (!currentUser) {
            setShowLoginModal(true);
            return;
        }
        if (isAiPanelOpen) {
            setIsAiPanelOpen(false);
            return;
        }
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
        setOpenAiSection((current) => (current === section ? null : section));
    };

    const playbackRate = slowPlayback ? 0.75 : 1;
    const activeExamples = useMemo(() => {
        if (!selectedWord) return [];
        if (selectedWord.examples.length > 0) return selectedWord.examples;
        if (selectedWord.example) {
            return [
                {
                    id: 0,
                    exampleEn: selectedWord.example,
                    exampleVi: selectedWord.translation,
                    audioUrl: selectedWord.exampleAudioUrl,
                },
            ];
        }
        return [];
    }, [selectedWord]);

    const isSelectedLearned = selectedWord ? learnedWordIdSet.has(selectedWord.id) : false;

    return (
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-5 sm:px-6 lg:h-[calc(100dvh-57px)] lg:overflow-hidden lg:px-8 lg:py-5">
            {/* Top Command Bar */}
            <header className={`vocab-fade-in ${mounted ? 'is-visible' : ''} shrink-0 space-y-3`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-text-primary sm:text-[1.85rem]">
                            Từ vựng
                        </h1>
                        <p className="text-sm text-text-muted">
                            <span className="font-semibold tabular-nums text-text-primary">{totalCount}</span> từ
                            {totalPages > 1 && <> · Trang {page}/{totalPages}</>}
                        </p>
                    </div>
                    {isLoading && (
                        <span className="inline-flex items-center gap-2 text-xs font-medium text-text-muted" role="status">
                            <Spinner size="sm" /> Đang tải…
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                    {/* Fast Search Input with '/' shortcut hint */}
                    <div className="relative flex min-w-0 flex-1 items-center">
                        <Search
                            size={17}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3.5 text-text-muted"
                        />
                        <input
                            ref={searchInputRef}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tra nhanh tiếng Anh hoặc nghĩa tiếng Việt..."
                            aria-label="Tìm kiếm từ vựng"
                            className="h-11 w-full rounded-[var(--radius-element)] border-2 border-border bg-surface pl-10 pr-14 text-[14.5px] font-medium text-text-primary outline-none transition-colors duration-150 ease-[var(--ease-out)] placeholder:text-text-muted focus:border-primary"
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    searchInputRef.current?.focus();
                                }}
                                aria-label="Xóa từ khóa tìm kiếm"
                                className="absolute right-2.5 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
                            >
                                <X size={15} aria-hidden="true" />
                            </button>
                        ) : (
                            <kbd
                                aria-hidden="true"
                                className="pointer-events-none absolute right-3 hidden rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-semibold text-text-muted sm:inline-block"
                            >
                                /
                            </kbd>
                        )}
                    </div>

                    {/* Quick CEFR Pills */}
                    <div
                        role="group"
                        aria-label="Lọc theo cấp độ CEFR"
                        className="flex h-11 items-center gap-1 overflow-x-auto no-scrollbar rounded-[var(--radius-element)] border-2 border-border bg-surface p-1"
                    >
                        {(['ALL', ...CEFR_LEVELS] as const).map((level) => {
                            const active = selectedCefr === level;
                            return (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setSelectedCefr(level)}
                                    aria-pressed={active}
                                    className={`h-full shrink-0 cursor-pointer rounded-[8px] px-2.5 text-xs font-semibold transition-colors duration-150 ease-[var(--ease-out)] ${
                                        active
                                            ? 'bg-primary-light text-primary'
                                            : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
                                    }`}
                                >
                                    {level === 'ALL' ? 'Mọi cấp' : level}
                                </button>
                            );
                        })}
                    </div>

                    {/* Topic Selector */}
                    <div className="w-full lg:w-[225px] lg:shrink-0">
                        <Selector
                            label="Chủ đề"
                            isLabelHidden
                            size="lg"
                            width="100%"
                            presentation="adaptive"
                            hasSearch
                            searchPlaceholder="Tìm chủ đề…"
                            value={selectedTopic}
                            onChange={handleTopicChange}
                            options={[
                                { value: 'ALL', label: 'Mọi chủ đề' },
                                ...topicOptions.map((topic) => ({
                                    value: String(topic.value),
                                    label: topic.label,
                                })),
                            ]}
                        />
                    </div>
                </div>
            </header>

            {errorMessage && (
                <div
                    className="shrink-0 rounded-[var(--radius-element)] border border-danger-color/25 bg-danger-color/10 px-4 py-3 text-sm text-danger-color"
                    role="alert"
                >
                    {errorMessage}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !errorMessage && items.length === 0 ? (
                <div className="vocab-empty flex-1">
                    <img
                        src="/mascot-lumo-reading.webp"
                        alt=""
                        aria-hidden="true"
                        width={76}
                        height={96}
                        className="h-auto w-[76px]"
                    />
                    <p className="font-semibold text-text-primary">Không tìm thấy từ vựng phù hợp.</p>
                    {(search || selectedCefr !== 'ALL' || selectedTopic !== 'ALL') && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                setSelectedCefr('ALL');
                                handleTopicChange('ALL');
                            }}
                        >
                            Xóa bộ lọc
                        </Button>
                    )}
                </div>
            ) : (
                /* Master-Detail Split-Pane Desk Dictionary */
                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                    {/* Left Index Rail */}
                    <section
                        aria-label="Danh sách từ vựng"
                        className={`glass-card flex min-h-0 flex-col overflow-hidden ${
                            isMobileDetailOpen ? 'hidden lg:flex' : 'flex'
                        }`}
                    >
                        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 text-xs text-text-muted">
                            <span>
                                <strong className="font-semibold tabular-nums text-text-primary">
                                    {items.length}
                                </strong>{' '}
                                / {totalCount} từ
                            </span>
                            <span className="hidden items-center gap-1 lg:inline-flex" aria-hidden="true">
                                <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                                    ↑
                                </kbd>
                                <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
                                    ↓
                                </kbd>
                                <span className="ml-0.5">lướt từ</span>
                            </span>
                        </div>

                        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                            {items.map((item) => {
                                const isSelected = selectedWord?.id === item.id;
                                const isLearned = learnedWordIdSet.has(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        ref={(el) => {
                                            rowRefs.current[item.id] = el;
                                        }}
                                        type="button"
                                        data-testid="vocab-card"
                                        data-vocab-id={item.id}
                                        aria-current={isSelected ? 'true' : undefined}
                                        onClick={() => selectWord(item, true)}
                                        className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-2.5 py-2 text-left transition-all duration-150 ease-[var(--ease-out)] ${
                                            isSelected
                                                ? 'border-primary/45 bg-primary-light shadow-xs'
                                                : 'border-transparent hover:bg-surface-hover'
                                        }`}
                                    >
                                        {item.imageUrl && (
                                            <img
                                                src={item.imageUrl}
                                                alt=""
                                                aria-hidden="true"
                                                width={44}
                                                height={44}
                                                loading="lazy"
                                                decoding="async"
                                                className={`h-11 w-11 shrink-0 rounded-lg object-cover bg-bg-secondary ${
                                                    isSelected ? 'ring-2 ring-primary/50' : ''
                                                }`}
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span
                                                    className={`truncate text-[15px] font-bold tracking-[-0.01em] ${
                                                        isSelected
                                                            ? 'text-primary'
                                                            : 'text-text-primary group-hover:text-primary'
                                                    }`}
                                                >
                                                    {item.word}
                                                </span>
                                                {item.transcription && (
                                                    <span className="font-ipa shrink-0 truncate text-xs text-text-muted">
                                                        {item.transcription}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                                                {item.meaning}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5">
                                            {isLearned && (
                                                <span
                                                    title="Đã học"
                                                    aria-label="Đã học"
                                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-color/15 text-success-color"
                                                >
                                                    <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                                                </span>
                                            )}
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                    isSelected
                                                        ? 'bg-surface text-primary'
                                                        : 'bg-bg-secondary text-text-secondary'
                                                }`}
                                            >
                                                {item.cefr}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {!isLoading && totalPages > 1 && (
                            <div className="flex shrink-0 justify-center border-t border-border bg-surface px-2 py-2.5">
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    onChange={handlePageChange}
                                    label="Phân trang từ vựng"
                                />
                            </div>
                        )}
                    </section>

                    {/* Right Editorial Dictionary Sheet (flat typographic hierarchy — zero nested cards) */}
                    <article
                        aria-label="Chi tiết từ vựng"
                        className={`glass-card flex min-h-0 flex-col overflow-hidden ${
                            isMobileDetailOpen ? 'flex' : 'hidden lg:flex'
                        }`}
                    >
                        {!selectedWord ? (
                            <div className="m-auto flex flex-col items-center gap-3 p-10 text-center text-sm text-text-muted">
                                <img
                                    src="/mascot-lumo-reading.webp"
                                    alt=""
                                    aria-hidden="true"
                                    width={64}
                                    height={80}
                                    className="h-auto w-[64px]"
                                />
                                <p>Chọn một từ bên trái để xem phát âm, nghĩa và ví dụ.</p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile back bar */}
                                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 lg:hidden">
                                    <button
                                        type="button"
                                        onClick={() => setIsMobileDetailOpen(false)}
                                        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary"
                                    >
                                        <ArrowLeft size={16} aria-hidden="true" /> Danh sách từ
                                    </button>
                                    <Badge variant="purple">{selectedWord.cefr}</Badge>
                                </div>

                                {/* Scrollable Cinema Dictionary Sheet Body */}
                                <div className="min-h-0 flex-1 overflow-y-auto">
                                    {/* Full-Bleed Cinema Photo Stage */}
                                    <div className="relative h-56 w-full overflow-hidden bg-[#171429] sm:h-[280px]">
                                        {selectedWord.imageUrl && (
                                            <img
                                                key={selectedWord.id}
                                                src={selectedWord.imageUrl}
                                                alt={`Minh họa từ ${selectedWord.word}`}
                                                decoding="async"
                                                className="cinema-img-reveal h-full w-full object-cover"
                                            />
                                        )}
                                        <div
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0"
                                            style={{
                                                background:
                                                    'linear-gradient(to top, rgba(13, 12, 20, 0.94) 0%, rgba(13, 12, 20, 0.52) 48%, rgba(13, 12, 20, 0.16) 100%)',
                                            }}
                                        />

                                        {/* Top badges over photo */}
                                        <div className="absolute left-5 top-4 right-5 flex flex-wrap items-center justify-between gap-2 sm:left-7 sm:right-7">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-full bg-[#171429]/85 px-3 py-1 text-xs font-extrabold text-white">
                                                    {selectedWord.cefr}
                                                </span>
                                                {selectedWord.topicName && (
                                                    <span className="inline-flex items-center rounded-full bg-[#171429]/75 px-3 py-1 text-xs font-semibold text-white">
                                                        {selectedWord.topicName}
                                                    </span>
                                                )}
                                                {isSelectedLearned && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981] px-2.5 py-1 text-xs font-bold text-white">
                                                        <Check size={12} strokeWidth={2.5} aria-hidden="true" /> Đã thuộc
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom headword + 3D Duolingo audio controls */}
                                        <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-end justify-between gap-4 sm:inset-x-7 sm:bottom-6">
                                            <div className="min-w-0">
                                                <h2 className="break-words text-3xl font-extrabold leading-[1.06] tracking-[-0.03em] text-white sm:text-[2.65rem]">
                                                    {selectedWord.word}
                                                </h2>
                                                {selectedWord.transcription && (
                                                    <p className="font-ipa mt-1.5 text-sm font-medium text-[#E5E7EB] sm:text-base">
                                                        {selectedWord.transcription}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        playPronunciationAudio(
                                                            selectedWord.audioUrl,
                                                            selectedWord.word,
                                                            undefined,
                                                            playbackRate,
                                                        )
                                                    }
                                                    className="duo-btn duo-btn-amber duo-btn-sm px-4"
                                                    aria-label={`Nghe phát âm ${selectedWord.word}`}
                                                >
                                                    <Volume2 size={15} aria-hidden="true" />
                                                    Nghe phát âm
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSlowPlayback((prev) => !prev)}
                                                    aria-pressed={slowPlayback}
                                                    title="Chuyển tốc độ phát âm chuẩn (1.0×) hoặc chậm (0.75×)"
                                                    className="duo-btn duo-btn-glass duo-btn-sm font-mono tabular-nums"
                                                >
                                                    {slowPlayback ? '0.75×' : '1.0×'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editorial Detail Content */}
                                    <div key={`detail-${selectedWord.id}`} className="cinema-content-in px-5 py-6 sm:px-7 sm:py-7">
                                        {/* Vietnamese Gloss + Quick Study CTA */}
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold uppercase tracking-[0.06em] text-text-secondary">
                                                    Nghĩa tiếng Việt
                                                </p>
                                                <p className="mt-1 text-2xl font-extrabold leading-snug text-text-primary">
                                                    {selectedWord.meaning}
                                                </p>
                                            </div>
                                            {selectedWord.topicId && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(`${PATHS.learningStudy}?topicId=${selectedWord.topicId}`)
                                                    }
                                                    className="duo-btn duo-btn-purple duo-btn-sm shrink-0 px-4"
                                                >
                                                    <Play size={13} fill="currentColor" aria-hidden="true" />
                                                    Học chủ đề này
                                                </button>
                                            )}
                                        </div>

                                    {/* Bilingual Examples */}
                                    <section className="mt-6 border-t border-border/80 pt-5">
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-text-secondary">
                                                Ví dụ trong câu{activeExamples.length > 0 ? ` (${activeExamples.length})` : ''}
                                            </h3>
                                            {isDetailLoading && (
                                                <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                                                    <Spinner size="sm" /> Đang tải ví dụ…
                                                </span>
                                            )}
                                        </div>

                                        {activeExamples.length > 0 ? (
                                            <ul className="space-y-3">
                                                {activeExamples.map((ex, idx) => (
                                                    <li
                                                        key={ex.id || idx}
                                                        className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-light p-4"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[15.5px] font-medium leading-relaxed text-text-primary">
                                                                {renderHighlightedExample(ex.exampleEn, selectedWord.word)}
                                                            </p>
                                                            {ex.exampleVi && (
                                                                <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                                                                    {ex.exampleVi}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <AudioWaveButton
                                                            text={ex.exampleEn}
                                                            audioUrl={ex.audioUrl}
                                                            playbackRate={playbackRate}
                                                            variant="compact"
                                                            size="sm"
                                                            label={`Nghe câu ví dụ ${idx + 1}`}
                                                            className="shrink-0"
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : !isDetailLoading ? (
                                            <p className="text-sm text-text-muted">Chưa có câu ví dụ cho từ này.</p>
                                        ) : (
                                            <div className="h-16 animate-pulse rounded-[var(--radius-inner)] bg-bg-secondary" />
                                        )}
                                    </section>

                                    {/* Collapsible AI Explanation Section (flat hairline divider — no nested card) */}
                                    <section className="mt-6 border-t border-border/80 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleToggleAi}
                                            aria-expanded={isAiPanelOpen}
                                            className="flex w-full cursor-pointer items-center justify-between gap-3 py-1 text-left transition-colors duration-150 ease-[var(--ease-out)] hover:text-primary"
                                        >
                                            <span className="flex items-center gap-2.5 text-sm font-semibold text-text-primary">
                                                <Sparkles size={16} className="shrink-0 text-primary" aria-hidden="true" />
                                                <span>Giải thích sắc thái &amp; cụm từ hay gặp</span>
                                                <Badge variant="cyan" className="normal-case">
                                                    Beta
                                                </Badge>
                                            </span>
                                            <ChevronDown
                                                size={16}
                                                className={`shrink-0 text-text-muted transition-transform duration-200 ease-[var(--ease-out)] ${
                                                    isAiPanelOpen ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </button>

                                        {isAiPanelOpen && (
                                            <AiAssistantBody
                                                response={aiResponse}
                                                error={aiError}
                                                isLoading={isLoadingAi}
                                                openSection={openAiSection}
                                                onToggleSection={toggleAiSection}
                                                onRetry={handleRetryAi}
                                            />
                                        )}
                                    </section>
                                    </div>
                                </div>
                            </>
                        )}
                    </article>
                </div>
            )}

            {/* Login Prompt Modal (Guests clicking AI Explain) */}
            {showLoginModal && (
                <div
                    className={`fixed inset-0 z-[800] flex items-end justify-center p-0 backdrop-blur-[6px] transition-opacity duration-200 sm:items-center sm:p-4 md:p-6 ${
                        loginModalActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ background: 'color-mix(in srgb, #0b0a12 36%, transparent)' }}
                    onClick={() => setShowLoginModal(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="vocab-login-title"
                        className={`relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-page)] border-2 border-border-emphasized bg-surface p-5 pt-7 text-center shadow-[var(--shadow-high)] transition-all duration-200 ease-[var(--ease-out)] sm:rounded-card sm:p-7 ${
                            loginModalActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <AstryxButton
                            className="!absolute right-4 top-4"
                            variant="ghost"
                            size="md"
                            isIconOnly
                            icon={<X size={18} aria-hidden="true" />}
                            label="Đóng"
                            onClick={() => setShowLoginModal(false)}
                        />
                        <span
                            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary"
                            aria-hidden="true"
                        >
                            <Lock size={22} />
                        </span>
                        <h2 id="vocab-login-title" className="mb-2 font-display text-xl font-bold text-text-primary">
                            Tính năng cần đăng nhập
                        </h2>
                        <p className="mb-6 text-sm leading-relaxed text-text-muted">
                            Đăng nhập để xem giải thích sắc thái, cụm từ hay gặp và lỗi thường tránh của từ này.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={() => navigate(PATHS.login, { state: { from: location } })}
                            >
                                Đăng nhập
                            </Button>
                            <Button variant="ghost" className="flex-1" onClick={() => setShowLoginModal(false)}>
                                Tiếp tục xem
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vocabulary;
