import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Navigate, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { ChevronRight, Volume2, ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, NoteIcon } from "../ui";
import { playPronunciationAudio } from "../../utils/audio";
import { MatchingGame } from "./MatchingGame";
import { Minitest } from "./Minitest";
import { SM2ReviewButtons } from "./SM2ReviewButtons";
import { useStickyNotes } from "../layout";
import { useAppContext } from "../../context/AppContext";
import { learningProgressApi, type ReviewOptionItem } from "../../services/learningProgressApi";
import { PATHS } from "../../routes/paths";
import studySessionBg from "../../assets/study-session-bg.svg";
import { useTheme } from "../../hooks/useTheme";

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

const normalizeWordId = (id: unknown) => {
  const value = Number(id);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const hasEarlierQueueOccurrence = (queue: any[], wordId: number | undefined, index: number) =>
  Boolean(wordId && queue.slice(0, index).some((word: any) => normalizeWordId(word.id) === wordId));

const getWordIds = (words: any[]) =>
  words.map((word: any) => normalizeWordId(word.id)).filter((id): id is number => Boolean(id));

const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest('[contenteditable="true"]') !== null ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
};

const StudySession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const {
    isOpen: isStickyNotesOpen,
    openStickyNotes,
    setStickyNotesLauncherHidden,
  } = useStickyNotes();
  const {
    learningTopicGroups: topicGroups,
    learningProgressState,
    addToast: onAddToast,
    applyLearningProgress,
    refreshLearnerAnalytics,
    handleRecordStudyHistory: onRecordStudyHistory,
  } = useAppContext();

  const locationState = location.state as { topicId?: number; words?: any[]; mode?: string | null } | null;

  // In-progress learning state is intentionally memory-only. Only a fresh client
  // navigation (PUSH) enters study; reload / back / direct URL (POP / REPLACE)
  // returns to selection.
  const navigationType = useNavigationType();
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
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [smartPage, setSmartPage] = useState(0);
  const [customNewPage, setCustomNewPage] = useState(0);
  const hasAutoSelectedReview = useRef(false);
  const [matchType, setMatchType] = useState<"word" | "ipa" | null>(null);
  const [showMinitestConfirm, setShowMinitestConfirm] = useState(false);
  const [isMinitestActive, setIsMinitestActive] = useState(false);
  const [ipaFallbackNotice, setIpaFallbackNotice] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardSearch, setFlashcardSearch] = useState('');
  const [showWordList, setShowWordList] = useState(false);
  const [recentIndices, setRecentIndices] = useState<number[]>([]);
  const [reviewOptionsMap, setReviewOptionsMap] = useState<Record<number, ReviewOptionItem[]>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<any[]>([]);
  const [sessionSubmittedIds, setSessionSubmittedIds] = useState<Set<number>>(new Set());
  const reviewOptionsRequestIdRef = useRef(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionEnsuring, setSessionEnsuring] = useState(false);
  const [sessionAbandoning, setSessionAbandoning] = useState(false);
  const [matchingCompleting, setMatchingCompleting] = useState(false);
  const [matchingCompletionError, setMatchingCompletionError] = useState<string | null>(null);
  const [pendingMatchingResult, setPendingMatchingResult] = useState<{
    correct: number;
    total: number;
    time: number;
  } | null>(null);

  useEffect(() => {
    sessionStorage.removeItem('ss_study_v1');
  }, []);

  // Study words come only from route/session state (real backend vocabulary).
  // No mock fallback — an empty list yields the empty/error state below.
  const words = useMemo(
    () => (studyWords && studyWords.length > 0 ? studyWords : []),
    [studyWords],
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
  const breadcrumbCategoryTitle = currentTopicGroup?.title ?? "Chủ đề";
  const breadcrumbTopicTitle = currentTopic?.title ?? "Bài học";
  const topicTitle = currentTopic?.title ?? "Học từ vựng";
  const topicStats = currentTopic?.stats;

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

  // In learnStep 2: session queue grows when words are reinserted (Phase A forgot/unsure).
  // Falls back to selectedWords before queue is initialized (e.g. on F5 restore).
  const activeSessionWords = sessionQueue.length > 0 ? sessionQueue : selectedWords;
  const activeWordId = normalizeWordId(activeSessionWords[currentIndex]?.id);
  const isActiveWordPhaseB = !isReviewMode
    && Boolean(activeWordId)
    && (
      sessionSubmittedIds.has(activeWordId)
      || hasEarlierQueueOccurrence(activeSessionWords, activeWordId, currentIndex)
    );
  const activeReviewOptions = useMemo<ReviewOptionItem[]>(() => {
    const options = activeWordId ? (reviewOptionsMap[activeWordId] ?? []) : [];
    if (!isActiveWordPhaseB) {
      return options;
    }

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return [0, 3, 5].map((quality) => {
      const existing = options.find(option => option.quality === quality);
      return {
        quality,
        days: 1,
        nextReviewDate: existing?.nextReviewDate ?? tomorrow,
      };
    });
  }, [activeWordId, isActiveWordPhaseB, reviewOptionsMap]);

  const ipaValidWords = useMemo(
    () => selectedWords.filter((w: any) => w.transcription && w.transcription.trim() !== ""),
    [selectedWords],
  );

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
      if (e.defaultPrevented || e.isComposing || isEditableKeyboardTarget(e.target)) {
        return;
      }

      if (tab === "flashcard") {
        if (e.code === "Space") {
          e.preventDefault();
          setIsFlipped((f) => !f);
        } else if (e.code === "ArrowLeft") {
          setCurrentIndex((i) => Math.max(0, i - 1));
          setIsFlipped(false);
        } else if (e.code === "ArrowRight") {
          setCurrentIndex((i) => Math.min(words.length - 1, i + 1));
          setIsFlipped(false);
        }
      } else if (tab === "learn" && learnStep === 2) {
        if (e.code === "Space") {
          e.preventDefault();
          setIsFlipped((f) => !f);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [tab, learnStep, words.length]);

  useEffect(() => {
    if (tab !== 'flashcard') return;
    setRecentIndices(prev => [currentIndex, ...prev.filter(i => i !== currentIndex)].slice(0, 6));
  }, [currentIndex, tab]);

  // Keep the server session through practice so MatchingGame can finalize it.
  useEffect(() => {
    if (learnStep === 1) {
      setSessionId(null);
    }
  }, [learnStep]);

  // Initialize session queue when entering learnStep 2 (also handles F5 restore).
  useEffect(() => {
    if (learnStep === 2 && sessionQueue.length === 0 && selectedWords.length > 0) {
      setSessionQueue([...selectedWords]);
    }
    if (learnStep !== 2) {
      setSessionQueue([]);
      setSessionSubmittedIds(new Set());
    }
    // selectedWords intentionally omitted — only re-run when learnStep changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnStep]);

  useEffect(() => {
    if (tab === 'learn' && learnStep === 2 && selectedWords.length > 0) {
      const requestId = ++reviewOptionsRequestIdRef.current;
      learningProgressApi.getBatchReviewOptions(
        getWordIds(selectedWords),
        Array.from(sessionSubmittedIds),
      )
        .then(map => {
          if (requestId === reviewOptionsRequestIdRef.current) {
            setReviewOptionsMap(map);
          }
        })
        .catch(() => {});
    }
  }, [tab, learnStep, selectedWords, sessionSubmittedIds]);

  const handleReviewQuality = useCallback(async (
    quality: number,
    wordId: number,
    queue: any[],
    index: number,
    onLast: () => void,
  ) => {
    if (reviewSubmitting || !topicId) return;

    // Phase B = word already submitted once this session
    const normalizedWordId = normalizeWordId(wordId);
    if (!normalizedWordId) return;

    const isDueReviewWord = reviewWordIdSet.has(normalizedWordId);
    const isPhaseB = !isReviewMode
      && (
        sessionSubmittedIds.has(normalizedWordId)
        || hasEarlierQueueOccurrence(queue, normalizedWordId, index)
      );
    // Phase C (review mode) uses backend scheduling only, never current queue reinsertion.
    const shouldReinsert = !isReviewMode && !isDueReviewWord && !isPhaseB && (quality === 0 || quality === 3);

    // Every mode requires a server-side draft. Never fall back to per-word progress writes.
    if (sessionId == null) {
      onAddToast("Đang khởi tạo phiên học. Vui lòng thử lại sau giây lát.", "error");
      return;
    }

    setReviewSubmitting(true);
    try {
      // Phase B repeat: same vocabId — backend updates the same LearningSessionItem row.
      await learningProgressApi.saveLearningSessionAnswer(sessionId, normalizedWordId, quality);

      const updatedSubmittedIds = new Set([...sessionSubmittedIds, normalizedWordId]);
      setSessionSubmittedIds(updatedSubmittedIds);

      let newQueue = queue;
      if (shouldReinsert) {
        newQueue = [...queue, queue[index]];
        setSessionQueue(newQueue);
      }

      // Refresh options with updated repeated-IDs so Phase B previews display correctly
      const requestId = ++reviewOptionsRequestIdRef.current;
      learningProgressApi.getBatchReviewOptions(
        getWordIds(newQueue),
        Array.from(updatedSubmittedIds),
      )
        .then(map => {
          if (requestId === reviewOptionsRequestIdRef.current) {
            setReviewOptionsMap(map);
          }
        })
        .catch(() => {});

      if (index < newQueue.length - 1) {
        setCurrentIndex(index + 1);
        setIsFlipped(false);
      } else {
        // Flashcards are draft study work. Final progress/XP commits after practice.
        onLast();
      }
    } catch {
      onAddToast("Không thể lưu tiến trình. Vui lòng thử lại.", "error");
    } finally {
      setReviewSubmitting(false);
    }
  }, [
    reviewSubmitting,
    topicId,
    onAddToast,
    sessionSubmittedIds,
    isReviewMode,
    reviewWordIdSet,
    sessionId,
  ]);

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

  const startSelectedStudyQueue = useCallback(async () => {
    if (selectedWords.length === 0 || sessionEnsuring) return;

    if (!topicId) return;

    setSessionEnsuring(true);
    try {
      const mode = isReviewMode ? 'REVIEW' : 'STUDY';
      try {
        const stale = await learningProgressApi.getActiveLearningSession(mode, topicId);
        if (stale) {
          try { await learningProgressApi.abandonLearningSession(stale.sessionId); } catch {}
        }
      } catch {}

      const session = await learningProgressApi.startLearningSession({
        mode,
        topicId,
        vocabIds: Array.from(new Set(selectedWordIds)),
      });

      setSessionId(session.sessionId);
      setLearnStep(2);
      setCurrentIndex(0);
      setSessionQueue([...selectedWords]);
      setSessionSubmittedIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể bắt đầu phiên học.';
      onAddToast(message, 'error');
    } finally {
      setSessionEnsuring(false);
    }
  }, [selectedWords, sessionEnsuring, isReviewMode, topicId, selectedWordIds, onAddToast]);

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
  const isActiveFullscreenSession = tab === "learn" && learnStep === 2;
  const isDarkFocusedSession = isActiveFullscreenSession && theme === "dark";
  // Actual matching exercise (after the practice type is chosen) gets its own
  // focused fullscreen, reusing the study-mode SVG background.
  const isMatchingFullscreen = tab === "learn" && learnStep === 3 && matchType !== null;
  const isMatchingDark = isMatchingFullscreen && theme === "dark";
  // Active minitest gets the same focused fullscreen (entered via a confirm modal).
  const isMinitestFullscreen = tab === "minitest" && isMinitestActive;
  const isMinitestDark = isMinitestFullscreen && theme === "dark";

  // Leaving the minitest tab clears the active flag so the confirm shows again next time.
  useEffect(() => {
    if (tab !== "minitest") setIsMinitestActive(false);
  }, [tab]);

  useEffect(() => {
    setStickyNotesLauncherHidden(isActiveFullscreenSession || isMatchingFullscreen || isMinitestFullscreen);
    return () => setStickyNotesLauncherHidden(false);
  }, [isActiveFullscreenSession, isMatchingFullscreen, isMinitestFullscreen, setStickyNotesLauncherHidden]);

  const clearLocalDraft = useCallback(() => {
    setSelectedWordIds([]);
    setSessionQueue([]);
    setSessionSubmittedIds(new Set());
    setSessionId(null);
    setCurrentIndex(0);
    setMatchType(null);
    setIpaFallbackNotice(false);
    setPendingMatchingResult(null);
    setMatchingCompletionError(null);
  }, []);

  const handleExit = useCallback(async () => {
    if (sessionAbandoning || matchingCompleting) return;

    const hasActiveDraft = tab === 'learn' && learnStep >= 2 && sessionId != null;
    if (hasActiveDraft && !window.confirm('Thoát phiên học? Tiến trình chưa hoàn tất sẽ không được lưu.')) {
      return;
    }

    if (hasActiveDraft) {
      setSessionAbandoning(true);
      try {
        await learningProgressApi.abandonLearningSession(sessionId);
      } catch {
        // The draft remains harmless and is abandoned before the next session starts.
      } finally {
        setSessionAbandoning(false);
      }
    }

    clearLocalDraft();
    onFinish();
  }, [
    sessionAbandoning,
    matchingCompleting,
    tab,
    learnStep,
    sessionId,
    clearLocalDraft,
    onFinish,
  ]);

  const handleFinishMatching = useCallback(async (
    correct: number,
    total: number,
    time: number,
  ) => {
    if (matchingCompleting) return;

    const result = { correct, total, time };
    setPendingMatchingResult(result);
    setMatchingCompletionError(null);
    setMatchingCompleting(true);

    try {
      if (sessionId == null) {
        throw new Error("Không tìm thấy phiên học để hoàn tất.");
      }

      const completion = await learningProgressApi.completeLearningSession(sessionId);
      applyLearningProgress(completion.progress);
      const analytics = await refreshLearnerAnalytics();

      if (topicId && selectedWordIds.length > 0) {
        onRecordStudyHistory?.({
          topicId,
          topicTitle,
          xp: 0,
          words: selectedWords.map((word: any) => ({
            id: word.id,
            word: word.word,
            meaning: word.meaning,
          })),
          timeSpentSeconds: time,
        });
      }

      setSelectedWordIds([]);
      setSessionQueue([]);
      setSessionSubmittedIds(new Set());
      setSessionId(null);
      setMatchType(null);
      setIpaFallbackNotice(false);
      setPendingMatchingResult(null);
      const xpGained = completion.xpGained;
      const streak = analytics?.streak;
      onAddToast(
        typeof xpGained === "number" && xpGained > 0
          ? typeof streak === "number" && streak > 0
            ? `Hoàn thành! +${xpGained} XP · Chuỗi ${streak} ngày 🔥`
            : `Hoàn thành! +${xpGained} XP 🎉`
          : "Đã hoàn tất phiên học 🎉",
        "success",
      );
      onFinish();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể hoàn tất phiên học. Vui lòng thử lại.";
      setMatchingCompletionError(message);
      onAddToast(message, "error");
    } finally {
      setMatchingCompleting(false);
    }
  }, [
    matchingCompleting,
    sessionId,
    applyLearningProgress,
    refreshLearnerAnalytics,
    topicId,
    selectedWordIds,
    onRecordStudyHistory,
    topicTitle,
    selectedWords,
    onAddToast,
    onFinish,
  ]);

  if (navigationType !== "PUSH" || !topicId || !studyWords) return <Navigate to={PATHS.learning} replace />;

  if (words.length === 0)
    return (
      <div className="max-w-md mx-auto p-12 text-center">
        <p className="text-text-muted mb-6">Không tìm thấy từ vựng cho chủ đề này.</p>
        <Button variant="primary" onClick={() => navigate(PATHS.learning)}>
          Quay lại danh sách chủ đề
        </Button>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-12">
      {!isActiveFullscreenSession && !isMatchingFullscreen && !isMinitestFullscreen && (
        <>
      <nav className="flex items-center gap-2 overflow-hidden text-sm text-text-muted mb-5 sm:mb-6">
        <button
          onClick={handleExit}
          className="hover:text-primary transition-colors cursor-pointer active:scale-95"
        >
          Học tập
        </button>
        <ChevronRight size={14} />
        <button
          onClick={handleExit}
          className="hover:text-primary transition-colors cursor-pointer active:scale-95"
        >
          {breadcrumbCategoryTitle}
        </button>
        <ChevronRight size={14} />
        <span className="truncate text-primary font-bold">{breadcrumbTopicTitle}</span>
      </nav>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 sm:mb-12">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleExit}
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
        <div className="-mx-4 flex gap-1 overflow-x-auto bg-surface px-4 py-1 border-y-2 border-primary/10 sm:mx-0 sm:gap-2 sm:overflow-visible sm:rounded-pill sm:border-2 sm:px-1">
          {(["flashcard", "learn", "minitest"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "minitest") {
                  setShowMinitestConfirm(true);
                  return;
                }
                setTab(t);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`h-10 px-4 rounded-pill text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 whitespace-nowrap sm:h-12 sm:px-6 sm:text-base ${tab === t ? "bg-primary text-text-on-accent shadow-xl" : "text-text-muted hover:text-primary"}`}
            >
              {t === "flashcard" && "📇 Flashcard"}
              {t === "learn" && "📖 Học"}
              {t === "minitest" && "🧪 Kiểm tra"}
            </button>
          ))}
        </div>
      </header>
        </>
      )}

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

              {/* ── Flashcard carousel ────────────────────────────── */}
              <div className="mb-6 flex items-center justify-center gap-6 max-w-4xl mx-auto sm:mb-8">
                {/* Left arrow */}
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => { setCurrentIndex((i) => i - 1); setIsFlipped(false); }}
                  className="hidden flex-shrink-0 p-3 rounded-full border-2 border-primary/15 bg-surface hover:bg-surface hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer sm:flex"
                >
                  <ArrowLeft size={24} />
                </button>

                {/* CARD with search + flashcard */}
                <div className="relative min-w-0 rounded-3xl border-2 border-primary/10 bg-surface p-3 pb-4 flex-1 sm:p-5 sm:pb-6">

                  {/* Search bar row — top of card */}
                  <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
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
                <div className="relative h-[min(62dvh,430px)] min-h-[340px] perspective-1000 sm:h-[480px]">
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
                        <div className="absolute inset-0 backface-hidden learning-card flex flex-col items-center justify-center p-5 text-center h-full border-4 border-primary/20 bg-surface sm:p-12">
                          <Badge variant="purple" className="mb-6 sm:mb-12 sm:scale-125">
                            Thẻ từ vựng
                          </Badge>
                          <div className="max-w-full break-words text-[clamp(2.25rem,13vw,4rem)] font-display font-extrabold mb-4 text-primary leading-[1.05] sm:text-[4.5rem]">
                            {words[currentIndex].word}
                          </div>
                          <div className="max-w-full break-words text-base text-text-muted font-ipa bg-purple/5 px-3 py-2 rounded-xl mb-6 sm:px-6 sm:text-2xl sm:mb-12">
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
                              className="whitespace-nowrap px-5 py-3 text-sm sm:px-10 sm:py-4 sm:text-lg"
                            >
                              Xem nghĩa ▼
                            </Button>
                          </div>
                        </div>
                        <div className="absolute inset-0 backface-hidden rotate-y-180 learning-card bg-linear-to-br from-purple/10 via-pink/5 to-transparent border-4 border-purple/40 flex flex-col items-center justify-center p-5 text-center h-full sm:p-12">
                          <Badge variant="pink" className="mb-6 sm:mb-12 sm:scale-125">
                            Nghĩa
                          </Badge>
                          <div className="text-2xl sm:text-[2.5rem] font-bold mb-6 sm:mb-10 text-text-primary leading-tight">
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
                          <div className="bg-surface/70 p-4 sm:p-8 rounded-3xl border-2 border-purple/20 w-full shadow-inner">
                            <p className="italic font-serif text-base leading-relaxed sm:text-xl sm:leading-loose">"{words[currentIndex].example}"</p>
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

                {/* Right arrow */}
                <button
                  type="button"
                  disabled={currentIndex === words.length - 1}
                  onClick={() => { setCurrentIndex((i) => i + 1); setIsFlipped(false); }}
                  className="hidden flex-shrink-0 p-3 rounded-full border-2 border-primary/15 bg-surface hover:bg-surface hover:border-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer sm:flex"
                >
                  <ArrowRight size={24} />
                </button>
              </div>

              <div className="mb-5 flex items-center justify-between gap-3 sm:hidden">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => { setCurrentIndex((i) => i - 1); setIsFlipped(false); }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-primary/20 bg-surface px-4 text-sm font-bold text-text-secondary disabled:opacity-30"
                >
                  <ArrowLeft size={18} /> Trước
                </button>
                <button
                  type="button"
                  disabled={currentIndex === words.length - 1}
                  onClick={() => { setCurrentIndex((i) => i + 1); setIsFlipped(false); }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-primary/20 bg-surface px-4 text-sm font-bold text-text-secondary disabled:opacity-30"
                >
                  Tiếp <ArrowRight size={18} />
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
                <div className="fixed inset-0 z-50 flex items-end justify-center px-0 pt-8 sm:items-center sm:px-4 sm:py-8">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setShowWordList(false)}
                  />
                  <div className="relative w-full max-w-lg max-h-[88dvh] bg-surface rounded-t-3xl shadow-2xl border border-border overflow-hidden sm:rounded-3xl">
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
                    <div className="max-h-[calc(88dvh-8.5rem)] overflow-y-auto px-4 pb-4 sm:max-h-[60vh]">
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
            {learnStep !== 2 && !isMatchingFullscreen && <div className="max-w-3xl mx-auto mb-16">
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
            </div>}

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
                  <div className="mb-16 max-w-3xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {selectedWordIds.length === 0
                            ? "Chọn từ vựng để học"
                            : `${selectedWordIds.length} từ mới đã chọn`}
                        </h3>
                        <p className="text-sm text-text-muted mt-1">Nhấp vào từ để chọn / bỏ chọn</p>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          disabled={selectedWordIds.length === 0 || sessionEnsuring}
                          onClick={startSelectedStudyQueue}
                        >
                          {sessionEnsuring ? "Đang khởi tạo..." : "Bắt đầu học →"}
                        </Button>
                        <Button variant="ghost" onClick={() => setSelectedWordIds([])}>
                          Bỏ chọn tất cả
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-primary/10 bg-surface/60 p-5 sm:p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                        <div>
                          <h4 className="font-bold text-lg text-text-primary">🆕 Từ mới</h4>
                          <p className="text-xs text-text-muted mt-1">Chọn thủ công các từ mới muốn học trong phiên này.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-text-muted">
                            {selectedWordIds.length > 0
                              ? `${selectedWordIds.length} / ${customNewWords.length} từ`
                              : `${customNewWords.length} từ`}
                          </span>
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
                                  <div className="text-xs text-text-muted font-ipa">{w.transcription}</div>
                                </div>
                              );
                            })}
                          </div>
                          {customNewTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-6">
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
                                      <div className="text-xs text-text-muted font-ipa mt-1">
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
                                    <div className="text-xs text-text-muted font-ipa mt-1">
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
                            : `${selectedWordIds.length} từ đã chọn`}
                      </div>

                      <Button
                        variant="primary"
                        className="w-full"
                        disabled={selectedWordIds.length === 0 || sessionEnsuring}
                        onClick={startSelectedStudyQueue}
                      >
                        {sessionEnsuring
                          ? "Đang khởi tạo..."
                          : isReviewMode
                            ? "Bắt đầu ôn tập"
                            : "Bắt đầu học"}
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
              <div
                className={`fixed inset-0 z-[460] flex h-dvh flex-col overflow-hidden ${
                  isDarkFocusedSession
                    ? "bg-[#282138] text-[#f5f0ff]"
                    : "bg-[#f3ecff] text-[#2b2140]"
                }`}
                style={{
                  backgroundImage: `url(${studySessionBg})`,
                  backgroundColor: isDarkFocusedSession ? "#332942" : "#f3ecff",
                  backgroundBlendMode: isDarkFocusedSession ? "multiply" : "normal",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
              >

                <header className={`relative z-10 shrink-0 border-b backdrop-blur-sm ${
                  isDarkFocusedSession
                    ? "border-[#584a70] bg-[#302742]/95"
                    : "border-[#d8c7f7] bg-[#fbf8ff]/95"
                }`}>
                  <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:grid-cols-[1fr_minmax(240px,480px)_1fr] sm:gap-6">
                      <button
                        type="button"
                        onClick={handleExit}
                        disabled={sessionAbandoning}
                        className={`flex h-10 shrink-0 items-center justify-self-start rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                          isDarkFocusedSession
                            ? "border-[#66557f] bg-[#3a304d] text-[#f5f0ff] hover:border-[#9f82c5] hover:text-[#dac5f7]"
                            : "border-[#d8c7f7] bg-white text-[#2b2140] hover:border-[#9b72d0] hover:text-[#7440a8]"
                        }`}
                        aria-label="Thoát phiên học"
                      >
                        <X size={20} />
                        <span className="ml-2 hidden sm:inline">Thoát</span>
                      </button>
                      <div className="min-w-0 text-center">
                        <div className={`flex items-baseline justify-center gap-1 text-sm font-bold tabular-nums sm:text-base ${
                          isDarkFocusedSession ? "text-[#d2b6f4]" : "text-[#7440a8]"
                        }`}>
                          <span>{currentIndex + 1}</span>
                          <span className={isDarkFocusedSession ? "text-[#b9a8d2]" : "text-[#76688e]"}>/ {activeSessionWords.length}</span>
                        </div>
                        <div className={`mt-2 h-2 overflow-hidden rounded-full ${
                          isDarkFocusedSession ? "bg-[#4a3c60]" : "bg-[#e5d8f7]"
                        }`}>
                          <div
                            className={`h-full rounded-full transition-[width] duration-300 ${
                              isDarkFocusedSession ? "bg-[#b78ce9]" : "bg-[#8b5fc7]"
                            }`}
                            style={{ width: `${((currentIndex + 1) / activeSessionWords.length) * 100}%` }}
                          />
                        </div>
                        <div className={`mt-1 hidden truncate text-[11px] sm:block ${
                          isDarkFocusedSession ? "text-[#b9a8d2]" : "text-[#76688e]"
                        }`}>
                          {topicTitle} · {isReviewMode ? "Ôn tập" : "Học từ vựng"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={openStickyNotes}
                        className={`inline-flex h-10 shrink-0 items-center justify-self-end gap-2 rounded-2xl px-3 text-sm font-semibold transition active:scale-[0.98] sm:px-4 ${
                          isDarkFocusedSession
                            ? `text-[#d2b6f4] hover:bg-[#403451] ${isStickyNotesOpen ? "bg-[#463858]" : ""}`
                            : `text-[#7440a8] hover:bg-[#eee4fa] ${isStickyNotesOpen ? "bg-[#e8daf8]" : ""}`
                        }`}
                        aria-expanded={isStickyNotesOpen}
                      >
                        <NoteIcon className="h-7 w-7" />
                        <span className="hidden sm:inline">Ghi chú</span>
                      </button>
                    </div>
                  </div>
                </header>

                <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
                  <div className="mx-auto flex min-h-full w-full max-w-5xl items-center justify-center">
                    <div className="w-full max-w-2xl">
                      <div className="relative mb-4 h-[clamp(300px,50dvh,430px)] perspective-1000">
                        <motion.div
                          onClick={() => setIsFlipped(!isFlipped)}
                          key={`step2-${currentIndex}`}
                          initial={{ scale: 0.96 }}
                          animate={{ rotateY: isFlipped ? 180 : 0, scale: 1 }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                          className="relative h-full w-full cursor-pointer preserve-3d"
                        >
                          <div className={`absolute inset-0 backface-hidden flex h-full flex-col items-center justify-center rounded-[24px] border-2 p-6 text-center sm:p-10 ${
                            isDarkFocusedSession
                              ? "border-[#66557f] bg-[#3a304d]/95 text-[#f5f0ff] shadow-[0_16px_40px_rgba(20,14,31,0.28)]"
                              : "border-[#d8c7f7] bg-white/95 text-[#2b2140] shadow-[0_16px_40px_rgba(88,65,125,0.16)]"
                          }`}>
                            <Badge variant="purple" className={`mb-6 sm:mb-8 ${
                              isDarkFocusedSession
                                ? "!border-[#735d91] !bg-[#493a60] !text-[#dcc5f7]"
                                : "!border-[#cdb4f6] !bg-[#eee4fa] !text-[#7440a8]"
                            }`}>
                              Thẻ từ vựng
                            </Badge>
                            <div className={`mb-3 max-w-full break-words text-[clamp(2.5rem,14vw,4rem)] font-display font-extrabold leading-[1.05] sm:text-[4rem] ${
                              isDarkFocusedSession ? "text-[#d2b6f4]" : "text-[#7440a8]"
                            }`}>
                              {activeSessionWords[currentIndex].word}
                            </div>
                            <div className={`mb-6 max-w-full break-words rounded-xl px-3 py-2 font-ipa text-base sm:mb-8 sm:px-5 sm:text-2xl ${
                              isDarkFocusedSession ? "bg-[#302742] text-[#cbbce2]" : "bg-[#f3ecff] text-[#6f6185]"
                            }`}>
                              {activeSessionWords[currentIndex].transcription}
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                className={`min-h-0 rounded-full p-2 !backdrop-blur-none ${
                                  isDarkFocusedSession
                                    ? "!border-[#66557f] !bg-[#302742] !text-[#d2b6f4] hover:!bg-[#493a60] hover:!text-[#eadcff]"
                                    : "!border-[#d8c7f7] !bg-white !text-[#7440a8] hover:!bg-[#eee4fa] hover:!text-[#7440a8]"
                                }`}
                                onClick={(e: any) => {
                                  e.stopPropagation();
                                  playPronunciationAudio(
                                    activeSessionWords[currentIndex].audioUrl,
                                    activeSessionWords[currentIndex].word,
                                  );
                                }}
                              >
                                <Volume2 size={18} />
                              </Button>
                              <Button variant="secondary" className={`px-6 py-3 sm:px-8 ${
                                isDarkFocusedSession
                                  ? "!border-[#735d91] !bg-[#302742] !text-[#d2b6f4] hover:!border-[#9f82c5] hover:!bg-[#493a60] hover:!text-[#eadcff]"
                                  : "!border-[#cdb4f6] !bg-white !text-[#7440a8] hover:!border-[#9b72d0] hover:!bg-[#eee4fa] hover:!text-[#7440a8]"
                              }`}>
                                Xem nghĩa ▼
                              </Button>
                            </div>
                          </div>
                          <div className={`absolute inset-0 backface-hidden rotate-y-180 flex h-full flex-col items-center justify-center rounded-[24px] border-2 p-6 text-center sm:p-10 ${
                            isDarkFocusedSession
                              ? "border-[#66557f] bg-[#3a304d]/95 text-[#f5f0ff] shadow-[0_16px_40px_rgba(20,14,31,0.28)]"
                              : "border-[#d8c7f7] bg-white/95 text-[#2b2140] shadow-[0_16px_40px_rgba(88,65,125,0.16)]"
                          }`}>
                            <Badge variant="pink" className={`mb-5 sm:mb-7 ${
                              isDarkFocusedSession
                                ? "!border-[#735d91] !bg-[#493a60] !text-[#dcc5f7]"
                                : "!border-[#cdb4f6] !bg-[#eee4fa] !text-[#7440a8]"
                            }`}>
                              Nghĩa
                            </Badge>
                            <div className={`mb-5 text-2xl font-bold leading-tight sm:text-[2.25rem] ${
                              isDarkFocusedSession ? "text-[#f5f0ff]" : "text-[#2b2140]"
                            }`}>
                              {activeSessionWords[currentIndex].meaning}
                            </div>
                            <Button
                              variant="ghost"
                              className={`mb-3 min-h-0 rounded-full p-2 !backdrop-blur-none ${
                                isDarkFocusedSession
                                  ? "!border-[#66557f] !bg-[#302742] !text-[#d2b6f4] hover:!bg-[#493a60] hover:!text-[#eadcff]"
                                  : "!border-[#d8c7f7] !bg-white !text-[#7440a8] hover:!bg-[#eee4fa] hover:!text-[#7440a8]"
                              }`}
                              onClick={(e: any) => {
                                e.stopPropagation();
                                playPronunciationAudio(
                                  activeSessionWords[currentIndex].exampleAudioUrl,
                                  activeSessionWords[currentIndex].example,
                                );
                              }}
                            >
                              <Volume2 size={18} />
                            </Button>
                            <div className={`w-full rounded-2xl border p-4 sm:p-6 ${
                              isDarkFocusedSession
                                ? "border-[#584a70] bg-[#302742] text-[#f5f0ff]"
                                : "border-[#d8c7f7] bg-[#f8f3ff] text-[#2b2140]"
                            }`}>
                              <p className="font-serif text-base italic leading-relaxed sm:text-lg">"{activeSessionWords[currentIndex].example}"</p>
                              {activeSessionWords[currentIndex].translation && (
                                <p className={`mt-3 text-sm ${
                                  isDarkFocusedSession ? "text-[#cbbce2]" : "text-[#76688e]"
                                }`}>"{activeSessionWords[currentIndex].translation}"</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                      <SM2ReviewButtons
                        options={activeReviewOptions}
                        appearance={isDarkFocusedSession ? "focusedDark" : "focusedLight"}
                        onSelect={(quality) =>
                          handleReviewQuality(
                            quality,
                            activeSessionWords[currentIndex].id,
                            activeSessionWords,
                            currentIndex,
                            () => {
                              setLearnStep(3);
                              setMatchType(null);
                              setIpaFallbackNotice(false);
                            },
                          )
                        }
                        isSubmitting={reviewSubmitting || sessionId == null}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Practice-type chooser stays in the normal topic detail layout. */}
            {learnStep === 3 && !matchType && (
              <div className="max-w-4xl mx-auto text-center">
                <div className="py-12">
                  <h3 className="text-3xl font-bold mb-8">
                    Chọn kiểu luyện tập
                  </h3>
                  <div className="flex justify-center gap-6">
                    <Button
                      variant="primary"
                      className="px-10 py-5 text-lg"
                      disabled={sessionId == null}
                      onClick={() => setMatchType("word")}
                    >
                      Từ ↔ Nghĩa
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-10 py-5 text-lg"
                      disabled={sessionId == null}
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
              </div>
            )}

            {/* Actual matching exercise: focused fullscreen on the study SVG bg. */}
            {learnStep === 3 && matchType && (
              <div
                className={`fixed inset-0 z-[460] flex h-dvh flex-col overflow-hidden ${
                  isMatchingDark ? "text-[#f5f0ff]" : "text-[#2b2140]"
                }`}
                style={{
                  backgroundImage: `url(${studySessionBg})`,
                  backgroundColor: isMatchingDark ? "#332942" : "#f3ecff",
                  backgroundBlendMode: isMatchingDark ? "multiply" : "normal",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
              >
                <header
                  className={`relative z-10 shrink-0 border-b backdrop-blur-sm ${
                    isMatchingDark
                      ? "border-[#584a70] bg-[#302742]/95"
                      : "border-[#d8c7f7] bg-[#fbf8ff]/95"
                  }`}
                >
                  <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={handleExit}
                      disabled={sessionAbandoning || matchingCompleting}
                      className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                        isMatchingDark
                          ? "border-[#66557f] bg-[#3a304d] text-[#f5f0ff] hover:border-[#9f82c5]"
                          : "border-[#d8c7f7] bg-white text-[#2b2140] hover:border-[#9b72d0]"
                      }`}
                      aria-label="Thoát phiên học"
                    >
                      <X size={20} />
                      <span className="ml-2 hidden sm:inline">Thoát</span>
                    </button>
                    <span
                      className={`font-display text-base font-bold ${
                        isMatchingDark ? "text-[#d2b6f4]" : "text-[#7440a8]"
                      }`}
                    >
                      Nối từ
                    </span>
                    <button
                      type="button"
                      onClick={openStickyNotes}
                      className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                        isMatchingDark
                          ? "border-[#66557f] bg-[#3a304d] text-[#f5f0ff] hover:border-[#9f82c5]"
                          : "border-[#d8c7f7] bg-white text-[#2b2140] hover:border-[#9b72d0]"
                      }`}
                      aria-label="Ghi chú"
                    >
                      <NoteIcon className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Ghi chú</span>
                    </button>
                  </div>
                </header>

                <div className="relative z-10 flex-1 overflow-y-auto px-3 py-6 sm:px-6 sm:py-8">
                  {ipaFallbackNotice && (
                    <p className="mx-auto mb-4 max-w-3xl text-center text-sm text-text-secondary">
                      Đã chuyển sang chế độ từ vựng vì chưa đủ dữ liệu IPA.
                    </p>
                  )}
                  <MatchingGame
                    words={matchType === "ipa" ? ipaValidWords : selectedWords}
                    type={matchType}
                    onFinish={handleFinishMatching}
                  />
                  {matchingCompleting && (
                    <p className="mt-4 text-center text-sm font-semibold text-text-secondary">
                      Đang hoàn tất phiên học...
                    </p>
                  )}
                  {matchingCompletionError && pendingMatchingResult && (
                    <div className="mx-auto mt-4 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-300/60 bg-red-50/80 p-4 text-sm text-red-700">
                      <p>{matchingCompletionError}</p>
                      <Button
                        variant="secondary"
                        disabled={matchingCompleting}
                        onClick={() =>
                          handleFinishMatching(
                            pendingMatchingResult.correct,
                            pendingMatchingResult.total,
                            pendingMatchingResult.time,
                          )
                        }
                      >
                        Thử hoàn tất lại
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "minitest" && isMinitestActive && (
          <div
            className={`fixed inset-0 z-[460] flex h-dvh flex-col overflow-hidden ${
              isMinitestDark ? "text-[#f5f0ff]" : "text-[#2b2140]"
            }`}
            style={{
              backgroundImage: `url(${studySessionBg})`,
              backgroundColor: isMinitestDark ? "#332942" : "#f3ecff",
              backgroundBlendMode: isMinitestDark ? "multiply" : "normal",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
          >
            <header
              className={`relative z-10 shrink-0 border-b backdrop-blur-sm ${
                isMinitestDark
                  ? "border-[#584a70] bg-[#302742]/95"
                  : "border-[#d8c7f7] bg-[#fbf8ff]/95"
              }`}
            >
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                <button
                  type="button"
                  onClick={handleExit}
                  disabled={sessionAbandoning}
                  className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                    isMinitestDark
                      ? "border-[#66557f] bg-[#3a304d] text-[#f5f0ff] hover:border-[#9f82c5]"
                      : "border-[#d8c7f7] bg-white text-[#2b2140] hover:border-[#9b72d0]"
                  }`}
                  aria-label="Thoát bài kiểm tra"
                >
                  <X size={20} />
                  <span className="ml-2 hidden sm:inline">Thoát</span>
                </button>
                <span
                  className={`font-display text-base font-bold ${
                    isMinitestDark ? "text-[#d2b6f4]" : "text-[#7440a8]"
                  }`}
                >
                  Kiểm tra
                </span>
                <button
                  type="button"
                  onClick={openStickyNotes}
                  className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                    isMinitestDark
                      ? "border-[#66557f] bg-[#3a304d] text-[#f5f0ff] hover:border-[#9f82c5]"
                      : "border-[#d8c7f7] bg-white text-[#2b2140] hover:border-[#9b72d0]"
                  }`}
                  aria-label="Ghi chú"
                >
                  <NoteIcon className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">Ghi chú</span>
                </button>
              </div>
            </header>

            <div className="relative z-10 flex-1 overflow-y-auto px-3 py-6 sm:px-6 sm:py-8">
              <Minitest
                topicId={topicId}
                learnedWords={learnedWordsForMinitest}
                topicWords={words}
                onFinish={onFinish}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm before starting the test. Only shown on the Kiểm tra tab click,
          never while the test is already active. */}
      {showMinitestConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMinitestConfirm(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl border border-primary/15 bg-surface p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
              🧪
            </div>
            <h3 className="font-display text-xl font-bold text-text-primary">
              Bạn có muốn bắt đầu bài kiểm tra không?
            </h3>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button variant="ghost" onClick={() => setShowMinitestConfirm(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowMinitestConfirm(false);
                  setTab("minitest");
                  setCurrentIndex(0);
                  setIsFlipped(false);
                  setIsMinitestActive(true);
                }}
              >
                Bắt đầu kiểm tra
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { StudySession };
