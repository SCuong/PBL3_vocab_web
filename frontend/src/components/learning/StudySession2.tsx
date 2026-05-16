import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Volume2, ArrowLeft, ArrowRight, Search, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button } from "../ui";
import { playPronunciationAudio } from "../../utils/audio";
import { mockData } from "../../mocks/mockData";
import { MatchingGame } from "./MatchingGame";
import { Minitest } from "./Minitest";
import { useAppContext } from "../../context/AppContext";
import { PATHS } from "../../routes/paths";

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];
const REVIEW_PAGE_SIZE = 10;

const getCefrRank = (cefr?: string) => {
  const normalized = (cefr || "").toUpperCase();
  const rank = CEFR_ORDER.indexOf(normalized);
  return rank === -1 ? CEFR_ORDER.length : rank;
};

const sortByCefrThenWord = (a: any, b: any) => {
  const cefrDiff = getCefrRank(a.cefr) - getCefrRank(b.cefr);
  if (cefrDiff !== 0) {
    return cefrDiff;
  }

  return (a.word || "").localeCompare(b.word || "");
};

const StudySession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    learningTopicGroups: topicGroups,
    learningProgressState,
    addXP: onAddXP,
    triggerStreakCheck: onStreakCheck,
    addToast: onAddToast,
    handleWordsLearned: onWordsLearned,
    handleRecordStudyHistory: onRecordStudyHistory,
  } = useAppContext();

  const locationState = location.state as { topicId?: number; words?: any[]; mode?: string | null } | null;
  const topicId = locationState?.topicId;
  const studyWords = locationState?.words;
  const isReviewMode = locationState?.mode === 'review';

  const onFinish = useCallback((score?: number, total?: number, detail?: any) => {
    if (score !== undefined && total !== undefined) {
      navigate(PATHS.learningResult, { state: { score, total, detail } });
    } else {
      navigate(PATHS.learning);
    }
  }, [navigate]);

  const [tab, setTab] = useState<"flashcard" | "learn" | "minitest">(
    isReviewMode ? "learn" : "flashcard",
  );
  const [learnStep, setLearnStep] = useState<1 | 2 | 3>(1);
  const [learnMode, setLearnMode] = useState<"smart" | "custom">("smart");
  const [customTab, setCustomTab] = useState<"new" | "review">("new");
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [smartPage, setSmartPage] = useState(0);
  const [customNewPage, setCustomNewPage] = useState(0);
  const [customReviewPage, setCustomReviewPage] = useState(0);
  const hasAutoSelectedReview = useRef(false);
  const [matchType, setMatchType] = useState<"word" | "ipa" | null>(null);
  const [ipaFallbackNotice, setIpaFallbackNotice] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSearch, setFlashcardSearch] = useState('');
  const [showWordList, setShowWordList] = useState(false);
  const [recentIndices, setRecentIndices] = useState<number[]>([]);

  const words = useMemo(
    () =>
      studyWords && studyWords.length > 0
        ? studyWords
        : mockData.vocabulary.filter((v) => v.topicId === topicId),
    [studyWords, topicId],
  );
  const currentTopicGroup = useMemo(
    () =>
      topicGroups?.find((group: any) =>
        group.topics?.some((topic: any) => topic.id === topicId),
      ),
    [topicGroups, topicId],
  );
  const currentTopic = useMemo(
    () => currentTopicGroup?.topics?.find((topic: any) => topic.id === topicId),
    [currentTopicGroup, topicId],
  );
  const topic = mockData.topics.find((t) => t.id === topicId);
  const category = mockData.categories.find((c) => c.id === topic?.catId);
  const breadcrumbCategoryTitle =
    currentTopicGroup?.title ?? category?.title ?? "Chủ đề";
  const breadcrumbTopicTitle = currentTopic?.title ?? topic?.title ?? "Bài học";
  const topicTitle = currentTopic?.title ?? topic?.title ?? "Học từ vựng";
  const topicStats = currentTopic?.stats ?? topic?.stats;

  const topicProgress = useMemo(
    () => learningProgressState?.topics?.find((t: any) => t.topicId === topicId),
    [learningProgressState?.topics, topicId],
  );

  const learnedWordIdSet = useMemo(() => {
    if (!topicId || !learningProgressState?.topics) {
      return new Set<number>();
    }

    return new Set<number>(topicProgress?.learnedWordIds ?? []);
  }, [learningProgressState?.topics, topicId, topicProgress]);

  const reviewWordIdSet = useMemo(
    () => new Set<number>(topicProgress?.reviewWordIds ?? []),
    [topicProgress],
  );

  const newWords = useMemo(
    () =>
      words
        .filter((w: any) => !learnedWordIdSet.has(w.id)),
    [words, learnedWordIdSet],
  );

  const reviewWords = useMemo(
    () => words.filter((w: any) => reviewWordIdSet.has(w.id)),
    [words, reviewWordIdSet],
  );

  useEffect(() => {
    if (isReviewMode && !hasAutoSelectedReview.current && reviewWords.length > 0) {
      hasAutoSelectedReview.current = true;
      setSelectedWordIds(reviewWords.map((w: any) => w.id));
    }
  }, [isReviewMode, reviewWords]);

  const wordMapById = useMemo(
    () => new Map(words.map((w: any) => [w.id, w])),
    [words],
  );

  const selectedWords = useMemo(
    () =>
      selectedWordIds
        .map((id) => wordMapById.get(id))
        .filter((w): w is any => Boolean(w)),
    [selectedWordIds, wordMapById],
  );

  const ipaValidWords = useMemo(
    () => selectedWords.filter((w: any) => w.transcription && w.transcription.trim() !== ""),
    [selectedWords],
  );
  const selectedReviewCount = useMemo(
    () => selectedWords.filter((w: any) => learnedWordIdSet.has(w.id)).length,
    [selectedWords, learnedWordIdSet],
  );
  const selectedNewCount = selectedWords.length - selectedReviewCount;

  const segment2Fill =
    learnStep >= 3
      ? 100
      : learnStep === 2 && selectedWords.length > 0
        ? Math.min(100, Math.round((currentIndex / selectedWords.length) * 100))
        : 0;
  const customNewWords = useMemo(
    () =>
      words
        .filter((w: any) => !learnedWordIdSet.has(w.id)),
    [words, learnedWordIdSet],
  );
  const customReviewWords = useMemo(
    () =>
      words
        .filter((w: any) => learnedWordIdSet.has(w.id)),
    [words, learnedWordIdSet],
  );
  const customSelectableWords = useMemo(
    () => (customTab === "new" ? customNewWords : customReviewWords),
    [customTab, customNewWords, customReviewWords],
  );
  const learnedWordsForMinitest = useMemo(() => {
    if (!topicId || !learningProgressState?.topics) {
      return [];
    }

    const topicProgress = learningProgressState.topics.find(
      (t: any) => t.topicId === topicId,
    );
    if (!topicProgress?.learnedWordIds?.length) {
      return [];
    }

    const learnedWordIdSet = new Set(topicProgress.learnedWordIds);
    return words.filter((w) => learnedWordIdSet.has(w.id));
  }, [learningProgressState, topicId, words]);

  const filteredFlashcardWords = useMemo(() => {
    if (!flashcardSearch.trim()) return words;
    const q = flashcardSearch.toLowerCase();
    return words.filter((w: any) =>
      (w.word || '').toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q)
    );
  }, [words, flashcardSearch]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (tab === "flashcard" || (tab === "learn" && learnStep === 2)) {
        if (e.code === "Space") {
          e.preventDefault();
          setIsFlipped((f) => !f);
        }
        if (e.code === "ArrowRight") {
          setCurrentIndex((prev) => {
            const max =
              (tab === "flashcard" ? words : selectedWords).length - 1;
            return prev < max ? prev + 1 : prev;
          });
          setIsFlipped(false);
        }
        if (e.code === "ArrowLeft") {
          setCurrentIndex((prev) => Math.max(0, prev - 1));
          setIsFlipped(false);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tab, learnStep, words.length, selectedWords.length]);

  useEffect(() => {
    if (tab !== 'flashcard') return;
    setRecentIndices(prev => [currentIndex, ...prev.filter(i => i !== currentIndex)].slice(0, 6));
  }, [currentIndex, tab]);


  const addMoreNewWords = useCallback((count: number) => {
    setSelectedWordIds((prev) => {
      const remainingNewIds = newWords
        .map((w: any) => w.id)
        .filter((id: number) => !prev.includes(id));

      return [...prev, ...remainingNewIds.slice(0, count)];
    });
  }, [newWords]);

  const applySmartPreset = useCallback((newWordCount: number) => {
    setSelectedWordIds(newWords.slice(0, newWordCount).map((w: any) => w.id));
    setSmartPage(0);
  }, [newWords]);

  const applyReviewPreset = useCallback((count: number) => {
    setSelectedWordIds(reviewWords.slice(0, count).map((w: any) => w.id));
    setReviewPage(0);
  }, [reviewWords]);

  const pagedReviewWords = useMemo(
    () => reviewWords.slice(reviewPage * REVIEW_PAGE_SIZE, (reviewPage + 1) * REVIEW_PAGE_SIZE),
    [reviewWords, reviewPage],
  );

  const reviewTotalPages = useMemo(
    () => Math.ceil(reviewWords.length / REVIEW_PAGE_SIZE),
    [reviewWords.length],
  );

  const pagedSmartWords = useMemo(
    () => selectedWords.slice(smartPage * REVIEW_PAGE_SIZE, (smartPage + 1) * REVIEW_PAGE_SIZE),
    [selectedWords, smartPage],
  );

  const smartTotalPages = useMemo(
    () => Math.ceil(selectedWords.length / REVIEW_PAGE_SIZE),
    [selectedWords.length],
  );

  const pagedCustomNewWords = useMemo(
    () => customNewWords.slice(customNewPage * REVIEW_PAGE_SIZE, (customNewPage + 1) * REVIEW_PAGE_SIZE),
    [customNewWords, customNewPage],
  );

  const customNewTotalPages = useMemo(
    () => Math.ceil(customNewWords.length / REVIEW_PAGE_SIZE),
    [customNewWords.length],
  );

  const pagedCustomReviewWords = useMemo(
    () => customReviewWords.slice(customReviewPage * REVIEW_PAGE_SIZE, (customReviewPage + 1) * REVIEW_PAGE_SIZE),
    [customReviewWords, customReviewPage],
  );

  const customReviewTotalPages = useMemo(
    () => Math.ceil(customReviewWords.length / REVIEW_PAGE_SIZE),
    [customReviewWords.length],
  );

  const handleFinishMatching = async (
    correct: number,
    total: number,
    time: number,
  ) => {
    const gainedXp = correct * 5;

    if (topicId && selectedWordIds.length > 0) {
      await onWordsLearned(topicId, selectedWordIds);

      onRecordStudyHistory?.({
        topicId,
        topicTitle,
        xp: gainedXp,
        words: selectedWords.map((word: any) => ({
          id: word.id,
          word: word.word,
          meaning: word.meaning,
        })),
        timeSpentSeconds: time,
      });
    }

    onAddXP(gainedXp);
    onStreakCheck();
    onAddToast(
      `Hoàn thành Matching trong ${time}s! +${gainedXp} XP`,
      "success",
    );
    setMatchType(null);
    setIpaFallbackNotice(false);
    setLearnStep(1);
  };

  if (!topicId || !studyWords) return <Navigate to={PATHS.learning} replace />;

  if (words.length === 0)
    return (
      <div className="p-12 text-center text-text-muted">
        Không tìm thấy từ vựng cho chủ đề này.
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button
          onClick={() => onFinish()}
          className="hover:text-primary transition-colors cursor-pointer active:scale-95"
        >
          Học tập
        </button>
        <ChevronRight size={14} />
        <button
          onClick={() => onFinish()}
          className="hover:text-primary transition-colors cursor-pointer active:scale-95"
        >
          {breadcrumbCategoryTitle}
        </button>
        <ChevronRight size={14} />
        <span className="text-primary font-bold">{breadcrumbTopicTitle}</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onFinish()}
            className="p-2 rounded-full min-h-0"
          >
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-[1.875rem] sm:text-[2rem] mb-2 font-display font-bold text-text-primary leading-tight tracking-normal">
              {topicTitle}
            </h1>{" "}
            <div className="flex gap-2 flex-wrap">
              {isReviewMode ? (
                <Badge variant="purple" className="text-xs font-bold">
                  🔔 Chế độ ôn tập — {reviewWords.length} từ
                </Badge>
              ) : (
                <>
                  <Badge variant="cyan" className="text-xs">
                    🆕 {topicStats?.new ?? 0}
                  </Badge>
                  <Badge variant="purple" className="text-xs">
                    🔔 {topicStats?.review ?? 0}
                  </Badge>
                </>
              )}
              <Badge variant="green" className="text-xs font-bold">
                ✅ {topicStats?.learned ?? 0}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-1 bg-surface rounded-pill border-2 border-primary/10">
          {(["flashcard", "learn", "minitest"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`h-12 px-6 rounded-pill font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap ${tab === t ? "bg-primary text-text-on-accent shadow-xl" : "text-text-muted hover:text-primary"}`}
            >
              {t === "flashcard" && "📇 Flashcard"}
              {t === "learn" && "📖 Học"}
              {t === "minitest" && "🧪 Kiểm tra"}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {tab === "flashcard" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            key="flashcard-tab"
            className="w-full"
          >
            <div className="w-full">

              {/* ── Flashcard carousel with side arrows ───────────── */}
              <div className="flex items-center justify-center gap-6 mb-8 max-w-4xl mx-auto">
                {/* LEFT ARROW */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((p) => Math.max(0, p - 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentIndex === 0}
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={24} />
                </button>

                {/* CARD with search + flashcard */}
                <div className="relative rounded-3xl border-2 border-primary/10 bg-surface p-5 pb-6 flex-1">

                  {/* Search bar row — top of card */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="relative w-full max-w-[260px] md:max-w-[320px]">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Tìm từ vựng"
                        value={flashcardSearch}
                        onChange={(e) => setFlashcardSearch(e.target.value)}
                        onFocus={() => setShowWordList(true)}
                        className="w-full pl-10 pr-4 py-3 text-sm bg-surface border-2 border-primary/15 rounded-full outline-none focus:border-primary/40 transition-all"
                      />
                    </div>
                  </div>

                {/* Flashcard */}
                <div className="relative h-[480px] perspective-1000">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`flashcard-${currentIndex}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      <motion.div
                        onClick={() => setIsFlipped(!isFlipped)}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="w-full h-full relative preserve-3d cursor-pointer"
                      >
                        <div className="absolute inset-0 backface-hidden learning-card flex flex-col items-center justify-center p-12 text-center h-full border-4 border-primary/20 bg-surface">
                          <Badge variant="purple" className="mb-12 scale-125">
                            Thẻ từ vựng
                          </Badge>
                          <div className="text-[4.5rem] font-display font-extrabold mb-4 text-primary leading-none">
                            {words[currentIndex].word}
                          </div>
                          <div className="text-2xl text-text-muted font-mono bg-purple/5 px-6 py-2 rounded-xl mb-12">
                            {words[currentIndex].transcription}
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              className="p-2 min-h-0 rounded-full"
                              onClick={(e: any) => {
                                e.stopPropagation();
                                playPronunciationAudio(
                                  words[currentIndex].audioUrl,
                                  words[currentIndex].word,
                                );
                              }}
                            >
                              <Volume2 size={18} />
                            </Button>
                            <Button
                              variant="secondary"
                              className="px-10 py-4 text-lg"
                            >
                              Xem nghĩa ▼
                            </Button>
                          </div>
                        </div>
                        <div className="absolute inset-0 backface-hidden rotate-y-180 learning-card bg-linear-to-br from-purple/10 via-pink/5 to-transparent border-4 border-purple/40 flex flex-col items-center justify-center p-12 text-center h-full">
                          <Badge variant="pink" className="mb-12 scale-125">
                            Nghĩa
                          </Badge>
                          <div className="text-[2rem] sm:text-[2.5rem] font-bold mb-10 text-text-primary leading-tight">
                            {words[currentIndex].meaning}
                          </div>
                          <Button
                            variant="ghost"
                            className="p-2 min-h-0 rounded-full mb-4"
                            onClick={(e: any) => {
                              e.stopPropagation();
                              playPronunciationAudio(
                                words[currentIndex].exampleAudioUrl,
                                words[currentIndex].example,
                              );
                            }}
                          >
                            <Volume2 size={18} />
                          </Button>
                          <div className="bg-surface/70 p-8 rounded-3xl border-2 border-purple/20 w-full shadow-inner">
                            <p className="italic font-serif text-xl leading-loose">"{words[currentIndex].example}"</p>
                            {words[currentIndex].translation && (
                              <p className="text-sm text-text-muted mt-3">"{words[currentIndex].translation}"</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </div>
                </div>

                {/* RIGHT ARROW */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIndex((p) => Math.min(words.length - 1, p + 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentIndex === words.length - 1}
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/20 text-primary hover:bg-primary/5 transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight size={24} />
                </button>
              </div>

              {/* ── Dot progress ────────────────────────────────── */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center gap-1.5">
                  {words.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-6 bg-primary" : "w-2.5 bg-primary/10"}`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-primary bg-primary/10 px-4 py-1 rounded-full">
                  {currentIndex + 1} / {words.length}
                </span>
              </div>

              {/* ── Word list modal ──────────────────────────────── */}
              {showWordList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setShowWordList(false)}
                  />
                  <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-2xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <div className="font-bold text-text-primary">Danh sách từ vựng</div>
                      <button
                        type="button"
                        onClick={() => setShowWordList(false)}
                        className="text-sm font-semibold text-text-muted hover:text-primary transition-colors"
                      >
                        Đóng
                      </button>
                    </div>
                    <div className="p-4 border-b border-border">
                      <div className="relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Nhập từ khóa..."
                          value={flashcardSearch}
                          onChange={(e) => setFlashcardSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-bg-secondary border border-border rounded-2xl outline-none focus:border-primary/40 focus:bg-surface transition-all"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
                      {!flashcardSearch.trim() && recentIndices.filter(i => i !== currentIndex).length > 0 && (
                        <div className="pt-4 pb-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted mb-2">🕐 Gần đây</p>
                          {recentIndices.filter(i => i !== currentIndex).slice(0, 4).map(i => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => { setCurrentIndex(i); setIsFlipped(false); setShowWordList(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                            >
                              {words[i]?.word}
                            </button>
                          ))}
                          <div className="border-t border-border mt-3" />
                        </div>
                      )}
                      <div className="pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted mb-2">
                          ☰ Tất cả từ vựng ({flashcardSearch.trim() ? filteredFlashcardWords.length : words.length})
                        </p>
                        {filteredFlashcardWords.length === 0 ? (
                          <p className="text-sm text-text-muted text-center py-4">Không tìm thấy từ.</p>
                        ) : (
                          filteredFlashcardWords.map((w: any) => {
                            const idx = words.indexOf(w);
                            const isCurrent = idx === currentIndex;
                            return (
                              <button
                                key={w.id ?? idx}
                                type="button"
                                onClick={() => { setCurrentIndex(idx); setIsFlipped(false); setShowWordList(false); setFlashcardSearch(''); }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${isCurrent ? 'bg-primary/5' : 'hover:bg-primary/5'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-primary' : 'bg-transparent'}`} />
                                <span className={`text-sm truncate ${isCurrent ? 'text-primary font-semibold' : 'text-text-secondary'}`}>{w.word}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}

        {tab === "learn" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="learn-tab"
          >
            <div className="max-w-3xl mx-auto mb-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-500 ${learnStep >= 1 ? "bg-primary border-primary text-text-on-accent" : "bg-surface border-primary/10 text-text-muted"}`}>
                    {learnStep > 1 ? "✓" : "1"}
                  </div>
                </div>
                <div className="flex-1 mx-2 h-1 relative bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-cyan to-primary rounded-full transition-all duration-500"
                    style={{ width: learnStep >= 2 ? "100%" : "0%" }}
                  />
                </div>
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-500 ${learnStep >= 2 ? "bg-primary border-primary text-text-on-accent" : "bg-surface border-primary/10 text-text-muted"}`}>
                    {learnStep > 2 ? "✓" : "2"}
                  </div>
                </div>
                <div className="flex-1 mx-2 h-1 relative bg-primary/10 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-linear-to-r from-cyan to-primary rounded-full transition-all duration-500"
                    style={{ width: `${segment2Fill}%` }}
                  />
                </div>
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-500 ${learnStep >= 3 ? "bg-primary border-primary text-text-on-accent" : "bg-surface border-primary/10 text-text-muted"}`}>
                    3
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-3">
                {(["Chọn từ", "Xem qua", "Luyện tập"] as const).map((label, i) => (
                  <span key={label} className={`text-xs font-bold uppercase w-12 text-center ${learnStep >= i + 1 ? "text-primary" : "text-text-muted"}`}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {learnStep === 1 && (
              <div className="max-w-4xl mx-auto">
                {!isReviewMode && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setLearnMode("smart")}
                      className={`text-left learning-card p-5 border-2 transition-all cursor-pointer active:scale-[0.98] ${learnMode === "smart" ? "border-primary bg-primary/5" : "border-primary/10 hover:border-primary/30"}`}
                    >
                      <div className="font-bold text-lg mb-1">⚡ Smart</div>
                      <p className="text-sm text-text-muted">
                        Học từ mới theo gói 5/10/15 từ. Không trộn từ ôn tập.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLearnMode("custom")}
                      className={`text-left learning-card p-5 border-2 transition-all cursor-pointer active:scale-[0.98] ${learnMode === "custom" ? "border-primary bg-primary/5" : "border-primary/10 hover:border-primary/30"}`}
                    >
                      <div className="font-bold text-lg mb-1">🛠️ Tùy chỉnh</div>
                      <p className="text-sm text-text-muted">
                        Tự chọn từng từ vựng để học theo nhu cầu của bạn.
                      </p>
                    </button>
                  </div>
                )}

                {learnMode === "custom" ? (
                  <div className="mb-16">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {selectedWordIds.length === 0
                            ? "Chọn từ vựng để học"
                            : selectedNewCount > 0 && selectedReviewCount > 0
                              ? `${selectedNewCount} từ mới + ${selectedReviewCount} từ ôn`
                              : selectedNewCount > 0
                                ? `${selectedNewCount} từ mới đã chọn`
                                : `${selectedReviewCount} từ ôn đã chọn`}
                        </h3>
                        <p className="text-sm text-text-muted mt-1">Nhấp vào từ để chọn / bỏ chọn</p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          disabled={selectedWordIds.length === 0}
                          onClick={() => {
                            setLearnStep(2);
                            setCurrentIndex(0);
                          }}
                        >
                          Bắt đầu học →
                        </Button>
                        <Button variant="ghost" onClick={() => setSelectedWordIds([])}>
                          Bỏ chọn tất cả
                        </Button>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* New words section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg">🆕 Từ mới</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-text-muted">{customNewWords.length} từ</span>
                            {customNewWords.length > 0 && (
                              <button
                                className="text-xs font-bold text-primary hover:underline cursor-pointer active:opacity-70 transition-opacity"
                                onClick={() => setSelectedWordIds((prev) => Array.from(new Set([...prev, ...customNewWords.map((w: any) => w.id)])))}
                              >
                                Chọn tất cả
                              </button>
                            )}
                          </div>
                        </div>
                        {customNewWords.length === 0 ? (
                          <div className="learning-card p-6 text-sm text-text-muted text-center">
                            Không còn từ mới trong chủ đề này.
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pagedCustomNewWords.map((w: any) => {
                                const isSel = selectedWordIds.includes(w.id);
                                return (
                                  <div
                                    key={w.id}
                                    onClick={() => setSelectedWordIds((p) => isSel ? p.filter((id) => id !== w.id) : [...p, w.id])}
                                    className={`learning-card p-4 cursor-pointer border-4 transition-all ${isSel ? "border-success-color bg-success-color/10 scale-105" : "border-transparent hover:border-primary/20"}`}
                                  >
                                    <div className="text-lg font-bold mb-0.5">{w.word}</div>
                                    <div className="text-xs text-text-muted font-mono">{w.transcription}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {customNewTotalPages > 1 && (
                              <div className="flex items-center justify-center gap-2 mt-3">
                                <button onClick={() => setCustomNewPage((p) => Math.max(0, p - 1))} disabled={customNewPage === 0} className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors cursor-pointer active:scale-95">← Trước</button>
                                {Array.from({ length: customNewTotalPages }, (_, i) => (
                                  <button key={i} onClick={() => setCustomNewPage(i)} className={`w-8 h-8 rounded-full text-sm font-bold transition-colors cursor-pointer active:scale-95 ${customNewPage === i ? "bg-primary text-text-on-accent" : "hover:bg-primary/10 text-text-muted"}`}>{i + 1}</button>
                                ))}
                                <button onClick={() => setCustomNewPage((p) => Math.min(customNewTotalPages - 1, p + 1))} disabled={customNewPage === customNewTotalPages - 1} className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors cursor-pointer active:scale-95">Tiếp →</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Review words section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg">🔔 Ôn tập</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-text-muted">{customReviewWords.length} từ</span>
                            {customReviewWords.length > 0 && (
                              <button
                                className="text-xs font-bold text-primary hover:underline cursor-pointer active:opacity-70 transition-opacity"
                                onClick={() => setSelectedWordIds((prev) => Array.from(new Set([...prev, ...customReviewWords.map((w: any) => w.id)])))}
                              >
                                Chọn tất cả
                              </button>
                            )}
                          </div>
                        </div>
                        {customReviewWords.length === 0 ? (
                          <div className="learning-card p-6 text-sm text-text-muted text-center">
                            Chưa có từ đến hạn ôn tập.
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pagedCustomReviewWords.map((w: any) => {
                                const isSel = selectedWordIds.includes(w.id);
                                return (
                                  <div
                                    key={w.id}
                                    onClick={() => setSelectedWordIds((p) => isSel ? p.filter((id) => id !== w.id) : [...p, w.id])}
                                    className={`learning-card p-4 cursor-pointer border-4 transition-all ${isSel ? "border-primary bg-primary/10 scale-105" : "border-transparent hover:border-primary/20"}`}
                                  >
                                    <div className="text-lg font-bold mb-0.5">{w.word}</div>
                                    <div className="text-xs text-text-muted font-mono">{w.transcription}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {customReviewTotalPages > 1 && (
                              <div className="flex items-center justify-center gap-2 mt-3">
                                <button onClick={() => setCustomReviewPage((p) => Math.max(0, p - 1))} disabled={customReviewPage === 0} className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors cursor-pointer active:scale-95">← Trước</button>
                                {Array.from({ length: customReviewTotalPages }, (_, i) => (
                                  <button key={i} onClick={() => setCustomReviewPage(i)} className={`w-8 h-8 rounded-full text-sm font-bold transition-colors cursor-pointer active:scale-95 ${customReviewPage === i ? "bg-primary text-text-on-accent" : "hover:bg-primary/10 text-text-muted"}`}>{i + 1}</button>
                                ))}
                                <button onClick={() => setCustomReviewPage((p) => Math.min(customReviewTotalPages - 1, p + 1))} disabled={customReviewPage === customReviewTotalPages - 1} className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/10 transition-colors cursor-pointer active:scale-95">Tiếp →</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-[1fr_320px] gap-6 mb-16 items-start">
                    <div className="space-y-6">
                      {isReviewMode ? (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg">🔔 Ôn tập</h4>
                            <span className="text-sm text-text-muted">
                              {reviewWords.length} từ
                            </span>
                          </div>
                          {reviewWords.length > 0 ? (
                            <>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {pagedReviewWords.map((w: any) => {
                                  const isSel = selectedWordIds.includes(w.id);

                                  return (
                                    <div
                                      key={w.id}
                                      className={`learning-card p-5 transition-all border-4 cursor-not-allowed ${isSel ? "border-primary bg-primary/10" : "border-transparent opacity-40"}`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-xl font-bold">{w.word}</div>
                                        <Badge variant="purple" className="text-[10px]">
                                          {w.cefr || "-"}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-text-muted font-mono mt-1">
                                        {w.transcription}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {reviewTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-4">
                                  <button
                                    onClick={() => setReviewPage(p => Math.max(0, p - 1))}
                                    disabled={reviewPage === 0}
                                    className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 hover:bg-primary/10 transition-colors"
                                  >
                                    ← Trước
                                  </button>
                                  {Array.from({ length: reviewTotalPages }, (_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setReviewPage(i)}
                                      className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${reviewPage === i ? "bg-primary text-text-on-accent" : "hover:bg-primary/10 text-text-muted"}`}
                                    >
                                      {i + 1}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setReviewPage(p => Math.min(reviewTotalPages - 1, p + 1))}
                                    disabled={reviewPage === reviewTotalPages - 1}
                                    className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 hover:bg-primary/10 transition-colors"
                                  >
                                    Tiếp →
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="learning-card p-6 text-sm text-text-muted text-center">
                              Hiện chưa có từ đến hạn ôn.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg">🆕 Từ mới</h4>
                            <span className="text-sm text-text-muted">
                              {selectedWordIds.length > 0
                                ? `${selectedWordIds.length} / ${newWords.length} từ`
                                : `${newWords.length} từ`}
                            </span>
                          </div>
                          {newWords.length === 0 ? (
                            <div className="learning-card p-6 text-sm text-text-muted text-center">
                              Không còn từ mới trong chủ đề này.
                            </div>
                          ) : selectedWordIds.length === 0 ? (
                            <div className="learning-card p-6 text-sm text-text-muted text-center">
                              Chọn gói học bên phải để bắt đầu.
                            </div>
                          ) : (
                            <>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {pagedSmartWords.map((w: any) => (
                                  <div
                                    key={w.id}
                                    className="learning-card p-5 transition-all border-4 cursor-not-allowed border-success-color bg-success-color/10 opacity-70"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-xl font-bold">{w.word}</div>
                                      <Badge variant="cyan" className="text-[10px]">
                                        {w.cefr || "-"}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-text-muted font-mono mt-1">
                                      {w.transcription}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {smartTotalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 mt-4">
                                  <button
                                    onClick={() => setSmartPage(p => Math.max(0, p - 1))}
                                    disabled={smartPage === 0}
                                    className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 hover:bg-primary/10 transition-colors"
                                  >
                                    ← Trước
                                  </button>
                                  {Array.from({ length: smartTotalPages }, (_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setSmartPage(i)}
                                      className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${smartPage === i ? "bg-primary text-text-on-accent" : "hover:bg-primary/10 text-text-muted"}`}
                                    >
                                      {i + 1}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => setSmartPage(p => Math.min(smartTotalPages - 1, p + 1))}
                                    disabled={smartPage === smartTotalPages - 1}
                                    className="px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-30 hover:bg-primary/10 transition-colors"
                                  >
                                    Tiếp →
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <aside className="learning-card p-5 sticky top-[96px] space-y-4">
                      <div className="text-sm text-text-muted">
                        {isReviewMode ? "Ôn tập" : learnMode === "smart" ? "Học từ mới" : "Tùy chỉnh"}
                      </div>
                      <div className="font-bold text-lg">
                        {isReviewMode
                          ? `${selectedWordIds.length} từ cần ôn`
                          : learnMode === "smart"
                            ? `${selectedWordIds.length} từ mới`
                            : selectedNewCount > 0 && selectedReviewCount > 0
                              ? `${selectedNewCount} từ mới + ${selectedReviewCount} từ ôn`
                              : `${selectedWordIds.length} từ đã chọn`}
                      </div>

                      <Button
                        variant="primary"
                        className="w-full"
                        disabled={selectedWordIds.length === 0}
                        onClick={() => {
                          setLearnStep(2);
                          setCurrentIndex(0);
                        }}
                      >
                        {isReviewMode ? "Bắt đầu ôn tập" : "Bắt đầu học"}
                      </Button>

                      {isReviewMode && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wide">Chọn gói ôn</div>
                          {[
                            { label: "⚡ Nhanh 5 phút", count: 5 },
                            { label: "📘 Tiêu chuẩn", count: 10 },
                            { label: "🚀 Tăng tốc", count: 15 },
                            { label: "🔥 Tổng ôn", count: reviewWords.length },
                          ]
                            .filter(p => p.count <= reviewWords.length)
                            .filter((p, i, arr) => i === 0 || p.count !== arr[i - 1].count)
                            .map(({ label, count }) => (
                              <Button
                                key={count}
                                variant="ghost"
                                className={`w-full text-sm ${selectedWordIds.length === count ? "border-2 border-primary text-primary bg-primary/10" : ""}`}
                                onClick={() => applyReviewPreset(count)}
                              >
                                {label} ({count} từ)
                              </Button>
                            ))}
                        </div>
                      )}

                      {!isReviewMode && learnMode === "smart" && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wide">Chọn gói học</div>
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => applySmartPreset(5)}
                            disabled={newWords.length === 0}
                          >
                            ⚡ Nhanh 5 phút (5 từ)
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => applySmartPreset(10)}
                            disabled={newWords.length === 0}
                          >
                            📘 Tiêu chuẩn (10 từ)
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => applySmartPreset(15)}
                            disabled={newWords.length === 0}
                          >
                            🚀 Tăng tốc (15 từ)
                          </Button>
                        </div>
                      )}

                      {!isReviewMode && learnMode === "smart" && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => setSelectedWordIds([])}
                        >
                          Bỏ chọn tất cả
                        </Button>
                      )}
                    </aside>
                  </div>
                )}
              </div>
            )}

            {learnStep === 2 && (
              <div className="max-w-2xl mx-auto">
                <div className="relative h-[480px] perspective-1000 mb-12">
                  <motion.div
                    onClick={() => setIsFlipped(!isFlipped)}
                    key={`step2-${currentIndex}`}
                    initial={{ scale: 0.9 }}
                    animate={{ rotateY: isFlipped ? 180 : 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full h-full relative preserve-3d cursor-pointer"
                  >
                    <div className="absolute inset-0 backface-hidden learning-card flex flex-col items-center justify-center p-12 text-center h-full border-4 border-primary/20 bg-surface">
                      <Badge variant="purple" className="mb-12 scale-125">
                        Thẻ từ vựng
                      </Badge>
                      <div className="text-[4.5rem] font-display font-extrabold mb-4 text-primary leading-none">
                        {selectedWords[currentIndex].word}
                      </div>
                      <div className="text-2xl text-text-muted font-mono bg-purple/5 px-6 py-2 rounded-xl mb-12">
                        {selectedWords[currentIndex].transcription}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          className="p-2 min-h-0 rounded-full"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            playPronunciationAudio(
                              selectedWords[currentIndex].audioUrl,
                              selectedWords[currentIndex].word,
                            );
                          }}
                        >
                          <Volume2 size={18} />
                        </Button>
                        <Button
                          variant="secondary"
                          className="px-10 py-4 text-lg"
                        >
                          Xem nghĩa ▼
                        </Button>
                      </div>
                    </div>
                    <div className="absolute inset-0 backface-hidden rotate-y-180 learning-card bg-linear-to-br from-purple/10 via-pink/5 to-transparent border-4 border-purple/40 flex flex-col items-center justify-center p-12 text-center h-full">
                      <Badge variant="pink" className="mb-12 scale-125">
                        Nghĩa
                      </Badge>
                      <div className="text-[2rem] sm:text-[2.5rem] font-bold mb-10 text-text-primary leading-tight">
                        {selectedWords[currentIndex].meaning}
                      </div>
                      <Button
                        variant="ghost"
                        className="p-2 min-h-0 rounded-full mb-4"
                        onClick={(e: any) => {
                          e.stopPropagation();
                          playPronunciationAudio(
                            selectedWords[currentIndex].exampleAudioUrl,
                            selectedWords[currentIndex].example,
                          );
                        }}
                      >
                        <Volume2 size={18} />
                      </Button>
                      <div className="bg-surface/70 p-8 rounded-3xl border-2 border-purple/20 w-full shadow-inner">
                        <p className="italic font-serif text-xl leading-loose">"{selectedWords[currentIndex].example}"</p>
                        {selectedWords[currentIndex].translation && (
                          <p className="text-sm text-text-muted mt-3">"{selectedWords[currentIndex].translation}"</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
                <div className="flex items-center justify-between mb-8">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentIndex((p) => Math.max(0, p - 1));
                      setIsFlipped(false);
                    }}
                    disabled={currentIndex === 0}
                  >
                    ← Trước
                  </Button>
                  <span className="font-bold">
                    {currentIndex + 1} / {selectedWords.length}
                  </span>
                  {currentIndex < selectedWords.length - 1 ? (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setCurrentIndex((p) => p + 1);
                        setIsFlipped(false);
                      }}
                    >
                      Tiếp theo →
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      onClick={() => {
                        setLearnStep(3);
                        setMatchType(null);
                        setIpaFallbackNotice(false);
                      }}
                    >
                      Vào luyện tập →
                    </Button>
                  )}
                </div>
              </div>
            )}

            {learnStep === 3 && (
              <div className="max-w-4xl mx-auto text-center">
                {!matchType ? (
                  <div className="py-12">
                    <h3 className="text-3xl font-bold mb-8">
                      Chọn kiểu luyện tập
                    </h3>
                    <div className="flex justify-center gap-6">
                      <Button
                        variant="primary"
                        className="px-10 py-5 text-lg"
                        onClick={() => setMatchType("word")}
                      >
                        Từ ↔ Nghĩa
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-10 py-5 text-lg"
                        onClick={() => {
                          if (ipaValidWords.length < 3) {
                            setMatchType("word");
                            setIpaFallbackNotice(true);
                          } else {
                            setMatchType("ipa");
                            setIpaFallbackNotice(false);
                          }
                        }}
                      >
                        IPA ↔ Nghĩa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {ipaFallbackNotice && (
                      <p className="mb-4 text-sm text-text-secondary text-center">
                        Đã chuyển sang chế độ từ vựng vì chưa đủ dữ liệu IPA.
                      </p>
                    )}
                    <MatchingGame
                      words={matchType === "ipa" ? ipaValidWords : selectedWords}
                      type={matchType}
                      onFinish={handleFinishMatching}
                    />
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {tab === "minitest" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="minitest-tab"
          >
            <Minitest
              topicId={topicId}
              learnedWords={learnedWordsForMinitest}
              topicWords={words}
              onFinish={onFinish}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { StudySession };
