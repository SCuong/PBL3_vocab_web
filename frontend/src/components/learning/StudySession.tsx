import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Search, X, Layers, BookOpen, ClipboardCheck, Check, RotateCw, Sparkles, MessageSquare, Volume2 } from "lucide-react";
import { Button as AstryxButton } from "@astryxdesign/core/Button";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { AnimatePresence, motion } from "framer-motion";
import { AudioWaveButton, AppDialog, Badge, Button, NoteIcon } from "../ui";
import { playLumoVoice, playSfx } from "../../utils/sound";
import { playPronunciationAudio, stopPronunciationAudio } from "../../utils/audio";
import { getAutoPlayPronunciation } from "../../utils/learningPreferences";
import { getTopicIllustration, getVocabIllustration } from "../../utils/vocabIllustrations";
import { DialoguePractice } from "./DialoguePractice";
import { MatchingGame } from "./MatchingGame";
import { Minitest } from "./Minitest";
import { SM2ReviewButtons } from "./SM2ReviewButtons";
import { useStickyNotes } from "../layout";
import { useAppContext } from "../../context/AppContext";
import { learningProgressApi, type ReviewOptionItem } from "../../services/learningProgressApi";
import { vocabularyApi } from "../../services/vocabularyApi";
import { mapLearningVocabularyToUiModel } from "../../utils/vocabularyMapper";
import { getGuestTrialTopicId } from "../../utils/learningTopicGroups";
import { PATHS } from "../../routes/paths";
import { useTheme } from "../../hooks/useTheme";

const FLASHCARD_DECK_VARIANTS = {
  enter: (dir: number) => ({
    x: dir * 78,
    rotate: dir * 3.5,
    scale: 0.94,
    opacity: 0,
  }),
  center: {
    x: 0,
    rotate: 0,
    scale: 1,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir * -110,
    rotate: dir * -5,
    scale: 0.93,
    opacity: 0,
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

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

const MINITEST_REQUIRED_WORDS = 10;

// Fisher-Yates. Used once when a test starts so the question set is random
// (not always the first learned words) yet stable for the test's duration.
const shuffleArray = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    currentUser,
    learningTopicGroups: topicGroups,
    learningProgressState,
    addXP,
    triggerStreakCheck,
    addToast: onAddToast,
    applyLearningProgress,
    refreshLearnerAnalytics,
    handleRecordStudyHistory: onRecordStudyHistory,
  } = useAppContext();

  const isGuest = !currentUser;
  const locationState = location.state as {
    topicId?: number;
    words?: any[];
    mode?: string | null;
    isGuestTrial?: boolean;
  } | null;

  const urlTopicId = Number(searchParams.get("topicId"));
  const topicId =
    locationState?.topicId ??
    (Number.isFinite(urlTopicId) && urlTopicId > 0 ? urlTopicId : undefined);
  const urlMode = searchParams.get("mode");
  const urlTab = searchParams.get("tab");
  const isReviewMode = !isGuest && (locationState?.mode === 'review' || urlMode === 'review');
  const guestTrialTopicId = useMemo(
    () => (isGuest ? getGuestTrialTopicId(topicGroups) : null),
    [isGuest, topicGroups],
  );

  const [fetchedWords, setFetchedWords] = useState<any[] | null>(
    locationState?.words && locationState.words.length > 0 ? locationState.words : null,
  );
  const [loadingTopicWords, setLoadingTopicWords] = useState(
    !locationState?.words && Boolean(topicId),
  );

  useEffect(() => {
    if (locationState?.words && locationState.words.length > 0) {
      setFetchedWords(locationState.words);
      setLoadingTopicWords(false);
      return;
    }
    if (!topicId) {
      setLoadingTopicWords(false);
      return;
    }
    let cancelled = false;
    setLoadingTopicWords(true);
    vocabularyApi
      .getLearningByTopic(topicId)
      .then((items) => {
        if (!cancelled) {
          setFetchedWords(items.map(mapLearningVocabularyToUiModel));
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedWords([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTopicWords(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topicId, locationState?.words]);

  const studyWords = fetchedWords;

  const onFinish = useCallback((score?: number, total?: number, detail?: any) => {
    if (score !== undefined && total !== undefined) {
      if (!isGuest) {
        const xpEarned = typeof detail?.xpEarned === 'number' ? detail.xpEarned : 0;
        if (xpEarned > 0) {
          addXP(xpEarned);
        }
        triggerStreakCheck();
        onRecordStudyHistory({
          topicId: topicId ?? 0,
          topicTitle: currentTopicTitleRef.current,
          xp: xpEarned,
          words: minitestWordsRef.current.map((w: any) => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
          })),
        });
        void refreshLearnerAnalytics();
      }
      navigate(PATHS.learningResult, { state: { score, total, detail } });
    } else {
      navigate(PATHS.learning);
    }
  }, [navigate, isGuest, addXP, triggerStreakCheck, onRecordStudyHistory, topicId, refreshLearnerAnalytics]);

  const initialTab: "flashcard" | "learn" | "dialogue" | "minitest" =
    urlTab === "dialogue"
      ? "dialogue"
      : isReviewMode || urlTab === "learn"
        ? "learn"
        : "flashcard";
  const [tab, setTab] = useState<"flashcard" | "learn" | "dialogue" | "minitest">(initialTab);
  const currentTopicTitleRef = useRef("Học từ vựng");
  const minitestWordsRef = useRef<any[]>([]);
  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const filmstripItemRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  // Keep topicId + tab mirrored in the URL so F5 preserves topic & mode cleanly.
  useEffect(() => {
    if (!topicId) return;
    const next = new URLSearchParams(searchParams);
    let changed = false;
    if (next.get("topicId") !== String(topicId)) {
      next.set("topicId", String(topicId));
      changed = true;
    }
    const desiredTab = tab === "minitest" ? "flashcard" : tab;
    if (next.get("tab") !== desiredTab) {
      next.set("tab", desiredTab);
      changed = true;
    }
    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [topicId, tab, searchParams, setSearchParams]);
  const [learnStep, setLearnStep] = useState<1 | 2 | 3>(1);
  const [learnMode, setLearnMode] = useState<"smart" | "custom">("smart");
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [reviewPage, setReviewPage] = useState(0);
  const [smartPage, setSmartPage] = useState(0);
  const [customNewPage, setCustomNewPage] = useState(0);
  const hasAutoSelectedReview = useRef(false);
  const [matchType, setMatchType] = useState<"word" | "ipa" | null>(null);
  const [showMinitestConfirm, setShowMinitestConfirm] = useState(false);
  const [showMinitestInsufficient, setShowMinitestInsufficient] = useState(false);
  const [isMinitestActive, setIsMinitestActive] = useState(false);
  const [minitestWords, setMinitestWords] = useState<any[]>([]);
  const [minitestProgress, setMinitestProgress] = useState({ answered: 0, total: 0 });
  const [ipaFallbackNotice, setIpaFallbackNotice] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
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
  const [guestLearnedWordIds, setGuestLearnedWordIds] = useState<Set<number>>(() => new Set());
  const [guestCompletionSummary, setGuestCompletionSummary] = useState<{ count: number } | null>(null);

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
    if (isGuest) {
      return guestLearnedWordIds;
    }
    if (!topicId || !learningProgressState?.topics) {
      return new Set<number>();
    }

    return new Set<number>(topicProgress?.learnedWordIds ?? []);
  }, [isGuest, guestLearnedWordIds, learningProgressState?.topics, topicId, topicProgress]);

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
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const twoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    if (isGuest) {
      return [0, 3, 5].map((quality) => ({
        quality,
        days: quality === 0 ? 0 : quality === 3 ? (isActiveWordPhaseB ? 1 : 0) : (isActiveWordPhaseB ? 2 : 1),
        nextReviewDate: quality === 5 && isActiveWordPhaseB ? twoDays : tomorrow,
      }));
    }

    const options = activeWordId ? (reviewOptionsMap[activeWordId] ?? []) : [];
    if (!isActiveWordPhaseB) {
      return options;
    }

    return [0, 3, 5].map((quality) => {
      const existing = options.find(option => option.quality === quality);
      if (quality === 0) {
        return {
          quality,
          days: 0,
          nextReviewDate: existing?.nextReviewDate ?? tomorrow,
        };
      }
      if (quality === 3) {
        return {
          quality,
          days: Math.max(1, existing?.days ?? 1),
          nextReviewDate: existing?.nextReviewDate ?? tomorrow,
        };
      }
      return {
        quality,
        days: Math.max(2, existing?.days ?? 2),
        nextReviewDate: existing?.nextReviewDate ?? twoDays,
      };
    });
  }, [isGuest, activeWordId, isActiveWordPhaseB, reviewOptionsMap]);

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
    if (isGuest) {
      if (guestLearnedWordIds.size >= MINITEST_REQUIRED_WORDS) {
        return words.filter((w) => guestLearnedWordIds.has(w.id));
      }
      return words;
    }

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
  }, [isGuest, guestLearnedWordIds, learningProgressState, topicId, words]);

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
          setSlideDirection(-1);
          setCurrentIndex((i) => Math.max(0, i - 1));
          setIsFlipped(false);
        } else if (e.code === "ArrowRight") {
          setSlideDirection(1);
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
    const activeThumb = filmstripItemRefs.current[currentIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentIndex, tab]);

  // Automatically pronounce the active vocabulary word when navigating in Flashcard or Learn modes.
  const activeAutoSpeakWord = useMemo(() => {
    if (tab === 'flashcard') return words[currentIndex] ?? null;
    if (tab === 'learn' && learnStep === 2) return activeSessionWords[currentIndex] ?? null;
    return null;
  }, [tab, learnStep, words, activeSessionWords, currentIndex]);

  useEffect(() => {
    if (!activeAutoSpeakWord?.word || !getAutoPlayPronunciation()) return;
    const timer = window.setTimeout(() => {
      playPronunciationAudio(activeAutoSpeakWord.audioUrl, activeAutoSpeakWord.word);
    }, 140);
    return () => {
      window.clearTimeout(timer);
      stopPronunciationAudio();
    };
  }, [activeAutoSpeakWord?.id, activeAutoSpeakWord?.word, activeAutoSpeakWord?.audioUrl, tab, learnStep, currentIndex]);

  // Preload adjacent flashcard photos so flipping & switching stays 120fps with 0ms decode lag.
  useEffect(() => {
    if (tab !== 'flashcard' || words.length === 0) return;
    for (const offset of [0, 1, 2, -1]) {
      const target = words[currentIndex + offset];
      if (target?.imageUrl) {
        const img = new Image();
        img.decoding = 'async';
        img.src = target.imageUrl;
      }
    }
  }, [tab, currentIndex, words]);

  // Auto-select a 5-word starter pack when opening Learn Step 1 in smart mode so the CTA is immediately actionable.
  useEffect(() => {
    if (tab === 'learn' && learnStep === 1 && !isReviewMode && learnMode === 'smart' && selectedWordIds.length === 0 && newWords.length > 0) {
      setSelectedWordIds(newWords.slice(0, Math.min(5, newWords.length)).map((w: any) => w.id));
    }
  }, [tab, learnStep, isReviewMode, learnMode, newWords, selectedWordIds.length]);

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
    if (isGuest) return;
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
  }, [isGuest, tab, learnStep, selectedWords, sessionSubmittedIds]);

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

    if (isGuest) {
      const updatedSubmittedIds = new Set([...sessionSubmittedIds, normalizedWordId]);
      setSessionSubmittedIds(updatedSubmittedIds);

      let newQueue = queue;
      if (shouldReinsert) {
        newQueue = [...queue, queue[index]];
        setSessionQueue(newQueue);
      }

      if (index < newQueue.length - 1) {
        setCurrentIndex(index + 1);
        setIsFlipped(false);
      } else {
        onLast();
      }
      return;
    }

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
    isGuest,
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

  const startGuidedLesson = useCallback(async (lessonWords: any[]) => {
    if (lessonWords.length === 0 || sessionEnsuring || !topicId) return;
    const lessonIds = lessonWords.map((w: any) => w.id).filter((id: any) => Number.isFinite(Number(id)));
    setSelectedWordIds(lessonIds);

    if (isGuest) {
      setSessionId(-1);
      setLearnStep(2);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionQueue([...lessonWords]);
      setSessionSubmittedIds(new Set());
      return;
    }

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
        vocabIds: Array.from(new Set(lessonIds)),
      });

      setSessionId(session.sessionId);
      setLearnStep(2);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionQueue([...lessonWords]);
      setSessionSubmittedIds(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể bắt đầu phiên học.';
      onAddToast(message, 'error');
    } finally {
      setSessionEnsuring(false);
    }
  }, [sessionEnsuring, topicId, isGuest, isReviewMode, onAddToast]);

  const curriculumLessons = useMemo(() => {
    const LESSON_SIZE = 5;
    const STAGE_LABELS = ['Nền tảng', 'Mở rộng', 'Giao tiếp', 'Chinh phục'];
    const chunks: Array<{
      index: number;
      title: string;
      stageLabel: string;
      cefrRange: string;
      words: any[];
      learnedCount: number;
      isCompleted: boolean;
    }> = [];

    for (let i = 0; i < words.length; i += LESSON_SIZE) {
      const slice = words.slice(i, i + LESSON_SIZE);
      const lessonIdx = Math.floor(i / LESSON_SIZE);
      const levels = Array.from(new Set(slice.map((w: any) => (w.cefr || '').toUpperCase()).filter(Boolean)));
      const cefrRange = levels.length <= 1 ? (levels[0] || 'A1') : `${levels[0]}–${levels[levels.length - 1]}`;
      const learnedCount = slice.filter((w: any) =>
        isGuest ? guestLearnedWordIds.has(w.id) : learnedWordIdSet.has(w.id),
      ).length;
      chunks.push({
        index: lessonIdx,
        title: `Bài ${lessonIdx + 1}`,
        stageLabel: STAGE_LABELS[lessonIdx] ?? `Chặng ${lessonIdx + 1}`,
        cefrRange,
        words: slice,
        learnedCount,
        isCompleted: slice.length > 0 && learnedCount >= slice.length,
      });
    }
    return chunks;
  }, [words, isGuest, guestLearnedWordIds, learnedWordIdSet]);

  const activeCurriculumLesson = useMemo(() => {
    return curriculumLessons.find((l) => !l.isCompleted) ?? curriculumLessons[0] ?? null;
  }, [curriculumLessons]);

  const startSelectedStudyQueue = useCallback(async () => {
    if (selectedWords.length === 0 || sessionEnsuring) return;

    if (!topicId) return;

    if (isGuest) {
      setSessionId(-1);
      setLearnStep(2);
      setCurrentIndex(0);
      setIsFlipped(false);
      setSessionQueue([...selectedWords]);
      setSessionSubmittedIds(new Set());
      return;
    }

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
  }, [selectedWords, sessionEnsuring, isGuest, isReviewMode, topicId, selectedWordIds, onAddToast]);

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

  // Stable so Minitest's progress-report effect doesn't loop.
  const handleMinitestProgress = useCallback(
    (answered: number, total: number) => setMinitestProgress({ answered, total }),
    [],
  );

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

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const performExit = useCallback(async () => {
    setShowExitConfirm(false);
    const hasActiveDraft = tab === 'learn' && learnStep >= 2 && sessionId != null;
    if (hasActiveDraft && !isGuest) {
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
  }, [tab, learnStep, sessionId, isGuest, clearLocalDraft, onFinish]);

  const handleExit = useCallback(async () => {
    if (sessionAbandoning || matchingCompleting) return;

    const hasActiveDraft = tab === 'learn' && learnStep >= 2 && sessionId != null;
    if (hasActiveDraft) {
      playLumoVoice('curious');
      setShowExitConfirm(true);
      return;
    }

    await performExit();
  }, [sessionAbandoning, matchingCompleting, tab, learnStep, sessionId, performExit]);

  const handleFinishMatching = useCallback(async (
    correct: number,
    total: number,
    time: number,
  ) => {
    if (matchingCompleting) return;

    if (isGuest) {
      const completedCount = selectedWordIds.length || total;
      setGuestLearnedWordIds((prev) => {
        const next = new Set(prev);
        selectedWordIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedWordIds([]);
      setSessionQueue([]);
      setSessionSubmittedIds(new Set());
      setSessionId(null);
      setMatchType(null);
      setIpaFallbackNotice(false);
      setPendingMatchingResult(null);
      setLearnStep(1);
      setGuestCompletionSummary({ count: completedCount });
      return;
    }

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
            ? `Hoàn thành! +${xpGained} XP · Chuỗi ${streak} ngày`
            : `Hoàn thành! +${xpGained} XP`
          : "Đã hoàn tất phiên học",
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
    isGuest,
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

  const requiredMinitestWords = useMemo(
    () => Math.min(MINITEST_REQUIRED_WORDS, Math.max(3, words.length)),
    [words.length],
  );

  currentTopicTitleRef.current = topicTitle;
  minitestWordsRef.current = minitestWords;

  if (!topicId) return <Navigate to={PATHS.learning} replace />;

  if (isGuest && guestTrialTopicId != null && topicId !== guestTrialTopicId) {
    return <Navigate to={PATHS.learning} replace />;
  }

  if (loadingTopicWords) {
    return (
      <div className="max-w-md mx-auto p-12 text-center text-sm text-text-muted">
        Đang tải danh sách từ vựng...
      </div>
    );
  }

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
    <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
      {!isActiveFullscreenSession && !isMatchingFullscreen && !isMinitestFullscreen && (
        <>
      <nav className="flex items-center gap-2 overflow-hidden text-sm text-text-muted mb-5 sm:mb-6">
        <button
          onClick={handleExit}
          className="shrink-0 whitespace-nowrap hover:text-primary transition-colors cursor-pointer active:scale-95"
        >
          Học tập
        </button>
        <ChevronRight size={14} className="shrink-0" />
        <button
          onClick={handleExit}
          className="min-w-0 truncate hover:text-primary transition-colors cursor-pointer active:scale-95"
        >
          {breadcrumbCategoryTitle}
        </button>
        <ChevronRight size={14} className="shrink-0" />
        <span className="min-w-0 truncate text-primary font-bold">{breadcrumbTopicTitle}</span>
      </nav>

      {isGuest && (
        <div className="mb-6 flex flex-col gap-3 rounded-[var(--radius-container)] border border-primary/20 bg-primary-light px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-text-primary">
            <Sparkles size={16} className="shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-semibold">Chế độ học thử.</span> Tiến trình không được lưu sau khi thoát — đăng ký miễn phí để lưu kết quả.
            </span>
          </p>
          <Button variant="primary" className="shrink-0" onClick={() => navigate(PATHS.register)}>
            Đăng ký lưu tiến độ
          </Button>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 sm:mb-6">
        <div className="flex items-center gap-4">
          <AstryxButton
            variant="ghost"
            size="lg"
            isIconOnly
            icon={<ArrowLeft size={20} aria-hidden />}
            label="Thoát phiên học"
            onClick={handleExit}
          />
          <div>
            <h1 className="mb-2 text-[1.625rem] font-bold leading-tight tracking-[-0.02em] text-text-primary sm:text-[2rem]">
              {topicTitle}
            </h1>{" "}
            <div className="flex gap-2 flex-wrap">
              {isGuest ? (
                <>
                  <Badge variant="purple">Học thử · {words.length} từ</Badge>
                  {guestLearnedWordIds.size > 0 && (
                    <Badge variant="green">Đã học thử {guestLearnedWordIds.size} từ</Badge>
                  )}
                </>
              ) : isReviewMode ? (
                <Badge variant="purple">Ôn tập · {reviewWords.length} từ</Badge>
              ) : (
                <>
                  <Badge variant="cyan">{newWords.length} mới</Badge>
                  <Badge variant="purple">{reviewWords.length} cần ôn</Badge>
                </>
              )}
              {!isGuest && <Badge variant="green">{learnedWordIdSet.size} đã thuộc</Badge>}
            </div>
          </div>
        </div>
        <SegmentedControl
          label="Chế độ học"
          size="lg"
          value={tab}
          onChange={(value) => {
            const t = value as typeof tab;
            if (t === "minitest") {
              const hasEnoughForMinitest = isGuest
                ? learnedWordsForMinitest.length > 0
                : learnedWordsForMinitest.length >= requiredMinitestWords;
              if (!hasEnoughForMinitest) {
                setShowMinitestInsufficient(true);
              } else {
                setShowMinitestConfirm(true);
              }
              return;
            }
            setTab(t);
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
        >
          <SegmentedControlItem value="flashcard" label="Thẻ từ" icon={<Layers size={16} aria-hidden />} />
          <SegmentedControlItem value="learn" label="Học" icon={<BookOpen size={16} aria-hidden />} />
          <SegmentedControlItem value="dialogue" label="Hội thoại" icon={<MessageSquare size={16} aria-hidden />} />
          <SegmentedControlItem value="minitest" label="Kiểm tra" icon={<ClipboardCheck size={16} aria-hidden />} />
        </SegmentedControl>
      </header>
        </>
      )}

      <div>
        {tab === "flashcard" && (
          <div key="flashcard-tab"
            className="w-full"
          >
            <div className="w-full">

              {/* ── Flashcard carousel ────────────────────────────── */}
              <div className="mb-4 flex items-center justify-center gap-6 max-w-4xl mx-auto sm:mb-5">
                {/* Left arrow */}
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setSlideDirection(-1);
                    setCurrentIndex((i) => Math.max(0, i - 1));
                    setIsFlipped(false);
                  }}
                  aria-label="Từ trước"
                  className="duo-btn duo-btn-surface hidden h-12 w-12 flex-shrink-0 !rounded-full !p-0 sm:inline-flex"
                >
                  <ArrowLeft size={20} />
                </button>

                {/* CARD with search + flashcard */}
                <div className="relative min-w-0 flex-1">

                  {/* Search bar + Duolingo glossy progress bar */}
                  <div className="mb-4 flex flex-col items-center gap-3 sm:mb-5">
                    <div className="flex w-full items-center gap-3">
                      <div className="duo-progress-track flex-1">
                        <div
                          className="duo-progress-fill"
                          style={{ width: `${words.length > 0 ? Math.round(((currentIndex + 1) / words.length) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-extrabold tabular-nums text-text-secondary">
                        {currentIndex + 1} / {words.length}
                      </span>
                    </div>
                    <div className="relative w-full max-w-[260px] md:max-w-[320px]">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Tìm từ vựng trong chủ đề..."
                        value={flashcardSearch}
                        onChange={(e) => setFlashcardSearch(e.target.value)}
                        onFocus={() => setShowWordList(true)}
                        className="vocab-input pl-10"
                      />
                    </div>
                  </div>

                {/* 120fps Physical 3D Flashcard Deck with Stacked Depth, Directional Spring Slide & Swipe */}
                <div className="relative mb-5 h-[min(56dvh,395px)] min-h-[330px] [perspective:1400px] sm:h-[min(50dvh,395px)]">
                  {/* Stacked Deck Under-cards */}
                  {currentIndex < words.length - 2 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 translate-y-4 scale-[0.92] rounded-2xl border border-border/70 bg-surface/65 transition-transform duration-300 ease-[var(--ease-out)]"
                    />
                  )}
                  {currentIndex < words.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 translate-y-2 scale-[0.96] rounded-2xl border border-border bg-surface/90 shadow-xs transition-transform duration-300 ease-[var(--ease-out)]"
                    />
                  )}

                  <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
                    <motion.div
                      key={`flashcard-${currentIndex}`}
                      custom={slideDirection}
                      variants={FLASHCARD_DECK_VARIANTS}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                        mass: 0.8,
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.22}
                      onDragEnd={(_, info) => {
                        if ((info.offset.x < -70 || info.velocity.x < -420) && currentIndex < words.length - 1) {
                          setSlideDirection(1);
                          setCurrentIndex((i) => Math.min(words.length - 1, i + 1));
                          setIsFlipped(false);
                        } else if ((info.offset.x > 70 || info.velocity.x > 420) && currentIndex > 0) {
                          setSlideDirection(-1);
                          setCurrentIndex((i) => Math.max(0, i - 1));
                          setIsFlipped(false);
                        }
                      }}
                      className="absolute inset-0 touch-pan-y"
                    >
                      <motion.div
                        onClick={(e) => {
                          if ((e.target as HTMLElement)?.closest('[data-no-flip="true"]')) return;
                          setIsFlipped((f) => !f);
                        }}
                        animate={{
                          rotateY: isFlipped ? 180 : 0,
                          scale: isFlipped ? [1, 1.035, 1] : [1, 1.035, 1],
                        }}
                        whileHover={{ y: -3 }}
                        transition={{
                          rotateY: { type: "spring", stiffness: 250, damping: 22, mass: 0.85 },
                          scale: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
                          y: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                        }}
                        className="relative h-full w-full cursor-pointer preserve-3d will-change-transform"
                      >
                      {/* ── FRONT: Full-Bleed Cinema Photo Flashcard ── */}
                      <div className="absolute inset-0 backface-hidden overflow-hidden rounded-2xl bg-[#111019] shadow-[0_24px_48px_-24px_rgba(17,16,25,0.5)]">
                        <img
                          src={getVocabIllustration(words[currentIndex].word, currentTopicTitleRef.current, words[currentIndex].imageUrl)}
                          alt={`Minh họa ${words[currentIndex].word}`}
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(to top, rgba(13, 12, 20, 0.94) 0%, rgba(13, 12, 20, 0.52) 48%, rgba(13, 12, 20, 0.14) 100%)",
                          }}
                        />

                        {/* Top bar over photo */}
                        <div className="absolute inset-x-5 top-4 flex items-center justify-between gap-2 sm:inset-x-6 sm:top-5">
                          <div className="flex items-center gap-2">
                            {words[currentIndex].cefr && (
                              <span className="inline-flex items-center rounded-full bg-[#171429]/85 px-3 py-1 text-xs font-extrabold text-white">
                                {words[currentIndex].cefr}
                              </span>
                            )}
                            <span className="hidden items-center rounded-full bg-[#171429]/70 px-3 py-1 text-xs font-semibold text-[#E5E7EB] sm:inline-flex">
                              Chạm thẻ hoặc Space để lật
                            </span>
                          </div>
                          <img
                            src="/mascot-lumo.webp"
                            alt=""
                            aria-hidden="true"
                            width={38}
                            height={42}
                            className="pointer-events-none hidden h-auto w-[36px] drop-shadow-md sm:block"
                          />
                        </div>

                        {/* Bottom Cinema Headword + 3D Duolingo Controls */}
                        <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-end justify-between gap-4 sm:inset-x-7 sm:bottom-6">
                          <div className="min-w-0 text-left">
                            <div className="break-words text-[clamp(2.25rem,8vw,3.5rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-white">
                              {words[currentIndex].word}
                            </div>
                            {words[currentIndex].transcription && (
                              <p className="font-ipa mt-1.5 text-base font-medium text-[#E5E7EB] sm:text-xl">
                                {words[currentIndex].transcription}
                              </p>
                            )}
                          </div>
                          <div
                            data-no-flip="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            className="flex flex-wrap items-center gap-2.5"
                          >
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                playPronunciationAudio(words[currentIndex].audioUrl, words[currentIndex].word);
                              }}
                              aria-label={`Phát âm ${words[currentIndex].word}`}
                              className="duo-btn duo-btn-amber duo-btn-sm px-4"
                            >
                              <Volume2 size={15} aria-hidden /> Nghe
                            </button>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsFlipped(true);
                              }}
                              className="duo-btn duo-btn-glass duo-btn-sm px-4"
                            >
                              <RotateCw size={14} aria-hidden /> Xem nghĩa
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── BACK: Obsidian Cinema Studio Meaning & Example ── */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 grid h-full grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-[#171429] text-white shadow-[0_24px_48px_-24px_rgba(17,16,25,0.55)] sm:grid-cols-[0.82fr_1.18fr]">
                        <div className="relative h-32 bg-[#0f0d1b] sm:h-full">
                          <img
                            src={getVocabIllustration(words[currentIndex].word, currentTopicTitleRef.current, words[currentIndex].imageUrl)}
                            alt={`Minh họa ${words[currentIndex].word}`}
                            decoding="async"
                            className="h-full w-full object-cover opacity-90"
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background: "linear-gradient(to top, rgba(15, 13, 27, 0.92) 0%, transparent 65%)",
                            }}
                          />
                          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-lg font-extrabold text-white">{words[currentIndex].word}</p>
                              {words[currentIndex].transcription && (
                                <p className="font-ipa text-xs text-[#D1D5DB]">{words[currentIndex].transcription}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center p-5 text-left sm:p-7">
                          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#F59E0B]">Nghĩa tiếng Việt</p>
                          <div className="mt-1 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-[2rem]">
                            {words[currentIndex].meaning}
                          </div>
                          <div className="mt-4 w-full rounded-xl border border-white/12 bg-white/6 p-3.5 text-left sm:p-4">
                            <div className="flex items-start gap-2.5">
                              <p className="flex-1 text-sm font-medium leading-relaxed text-white sm:text-[15px]">
                                {words[currentIndex].example}
                              </p>
                              <button
                                type="button"
                                data-no-flip="true"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playPronunciationAudio(words[currentIndex].exampleAudioUrl, words[currentIndex].example);
                                }}
                                aria-label="Nghe câu ví dụ"
                                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/14 text-white transition-colors hover:bg-[#F59E0B] hover:text-[#171429]"
                              >
                                <Volume2 size={14} aria-hidden />
                              </button>
                            </div>
                            {words[currentIndex].translation && (
                              <p className="mt-2 text-xs text-[#D1D5DB] sm:text-sm">“{words[currentIndex].translation}”</p>
                            )}
                          </div>
                          <div
                            data-no-flip="true"
                            onPointerDown={(e) => e.stopPropagation()}
                            className="mt-4 flex flex-wrap items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsFlipped(false);
                              }}
                              className="duo-btn duo-btn-glass duo-btn-sm"
                            >
                              <RotateCw size={13} aria-hidden /> Lật lại
                            </button>
                            {currentIndex < words.length - 1 && (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSlideDirection(1);
                                  setCurrentIndex((i) => Math.min(words.length - 1, i + 1));
                                  setIsFlipped(false);
                                }}
                                className="duo-btn duo-btn-amber duo-btn-sm px-4"
                              >
                                Từ tiếp theo <ArrowRight size={14} aria-hidden />
                              </button>
                            )}
                          </div>
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
                  onClick={() => {
                    setSlideDirection(1);
                    setCurrentIndex((i) => Math.min(words.length - 1, i + 1));
                    setIsFlipped(false);
                  }}
                  aria-label="Từ tiếp theo"
                  className="duo-btn duo-btn-surface hidden h-12 w-12 flex-shrink-0 !rounded-full !p-0 sm:inline-flex"
                >
                  <ArrowRight size={20} />
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

              {/* ── Cinema Filmstrip Thumbnail Rail (auto-centers active word + wheel & arrow scroll) ── */}
              <div className="mx-auto flex max-w-3xl items-center gap-2">
                <button
                  type="button"
                  aria-label="Cuộn dải ảnh sang trái"
                  onClick={() => filmstripRef.current?.scrollBy({ left: -240, behavior: "smooth" })}
                  className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <div
                  ref={filmstripRef}
                  onWheel={(e) => {
                    if (!filmstripRef.current || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
                    e.preventDefault();
                    filmstripRef.current.scrollLeft += e.deltaY;
                  }}
                  className="flex flex-1 items-center gap-2 overflow-x-auto scroll-smooth px-2 py-2 no-scrollbar"
                >
                  {words.map((w: any, i: number) => {
                    const isActive = i === currentIndex;
                    return (
                      <button
                        key={w.id ?? i}
                        ref={(el) => {
                          filmstripItemRefs.current[i] = el;
                        }}
                        type="button"
                        title={w.word}
                        aria-label={`Chuyển tới từ ${w.word}`}
                        aria-current={isActive ? "true" : undefined}
                        onClick={() => {
                          setSlideDirection(i >= currentIndex ? 1 : -1);
                          setCurrentIndex(i);
                          setIsFlipped(false);
                        }}
                        className={`relative h-11 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg transition-all duration-200 ease-[var(--ease-out)] ${
                          isActive
                            ? "scale-105 ring-2 ring-[#F59E0B] ring-offset-2 ring-offset-bg-light"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={getVocabIllustration(w.word, currentTopicTitleRef.current, w.imageUrl)}
                          alt=""
                          aria-hidden="true"
                          width={64}
                          height={44}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-label="Cuộn dải ảnh sang phải"
                  onClick={() => filmstripRef.current?.scrollBy({ left: 240, behavior: "smooth" })}
                  className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>

              {/* ── Word list modal ──────────────────────────────── */}
              {showWordList && (
                <div className="fixed inset-0 z-50 flex items-end justify-center px-0 pt-8 sm:items-center sm:px-4 sm:py-8">
                  <div
                    className="absolute inset-0 bg-[color-mix(in_srgb,#0b0a12_55%,transparent)]"
                    onClick={() => { setShowWordList(false); setFlashcardSearch(''); }}
                  />
                  <div className="relative w-full max-w-lg max-h-[88dvh] bg-surface rounded-t-3xl border border-border overflow-hidden sm:rounded-[var(--radius-container)]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <div className="font-bold text-text-primary">Danh sách từ vựng</div>
                      <button
                        type="button"
                        onClick={() => { setShowWordList(false); setFlashcardSearch(''); }}
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
                          <p className="text-xs font-bold text-text-muted mb-2">Gần đây</p>
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
                        <p className="text-xs font-bold text-text-muted mb-2">
                          Tất cả từ vựng ({flashcardSearch.trim() ? filteredFlashcardWords.length : words.length})
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
          </div>
        )}

        {tab === "learn" && (
          <div key="learn-tab">
            {learnStep === 1 && (
              <div className="mx-auto max-w-4xl pb-12">
                {isReviewMode ? (
                  /* ── Guided Review Spotlight (SM-2 due words) ── */
                  <div className="relative overflow-hidden rounded-2xl bg-[#171429] p-6 text-white shadow-[0_24px_48px_-24px_rgba(17,16,25,0.5)] sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#F59E0B]">
                          Ôn tập định kỳ · SM-2
                        </p>
                        <h3 className="mt-1.5 text-2xl font-extrabold tracking-[-0.025em] text-white sm:text-3xl">
                          {reviewWords.length > 0
                            ? `${reviewWords.length} từ đến hạn ôn tập`
                            : "Bạn đã hoàn thành toàn bộ lượt ôn hôm nay!"}
                        </h3>
                        <p className="mt-2 max-w-[46ch] text-sm text-[#D1D5DB]">
                          {reviewWords.length > 0
                            ? "Hệ thống tự động chọn đúng các từ sắp quên để bạn củng cố trí nhớ dài hạn."
                            : "Quay lại giáo trình bên dưới hoặc làm bài kiểm tra nhanh để tăng điểm XP."}
                        </p>
                        {reviewWords.length > 0 && (
                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              disabled={sessionEnsuring}
                              onClick={() => void startGuidedLesson(reviewWords.slice(0, Math.min(10, reviewWords.length)))}
                              className="duo-btn duo-btn-amber px-6"
                            >
                              {sessionEnsuring ? "Đang khởi tạo..." : `Bắt đầu ôn ngay (${Math.min(10, reviewWords.length)} từ)`}
                            </button>
                          </div>
                        )}
                      </div>
                      <img
                        src="/mascot-lumo-happy.webp"
                        alt="Lumo"
                        width={96}
                        height={108}
                        className="hidden h-auto w-24 shrink-0 sm:block"
                      />
                    </div>
                  </div>
                ) : activeCurriculumLesson ? (
                  <div className="space-y-6">
                    {/* ── Cinema Active Curriculum Lesson Spotlight ── */}
                    <section className="group relative overflow-hidden rounded-2xl bg-[#111019] text-white shadow-[0_24px_48px_-24px_rgba(17,16,25,0.48)]">
                      <img
                        src={getTopicIllustration(currentTopicTitleRef.current, 0)}
                        alt={currentTopicTitleRef.current}
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(95deg, rgba(15, 13, 27, 0.96) 0%, rgba(15, 13, 27, 0.84) 55%, rgba(15, 13, 27, 0.35) 100%)",
                        }}
                      />

                      <div className="relative z-10 p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="inline-flex items-center rounded-full bg-white/14 px-3 py-1 text-xs font-extrabold text-[#F59E0B]">
                            {activeCurriculumLesson.title} / {curriculumLessons.length} · {activeCurriculumLesson.stageLabel} ({activeCurriculumLesson.cefrRange})
                          </span>
                          <span className="text-xs font-bold tabular-nums text-[#E5E7EB]">
                            {activeCurriculumLesson.learnedCount} / {activeCurriculumLesson.words.length} từ đã thuộc
                          </span>
                        </div>

                        <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.025em] text-white sm:text-3xl">
                          {activeCurriculumLesson.isCompleted
                            ? `Bạn đã hoàn thành toàn bộ giáo trình ${currentTopicTitleRef.current}!`
                            : `Chinh phục 5 từ tiếp theo theo lộ trình`}
                        </h3>

                        {/* 5 Visual Word Chips Preview */}
                        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                          {activeCurriculumLesson.words.map((w: any) => (
                            <div
                              key={w.id}
                              className="flex flex-col overflow-hidden rounded-xl border border-white/15 bg-white/10"
                            >
                              <img
                                src={getVocabIllustration(w.word, currentTopicTitleRef.current, w.imageUrl)}
                                alt={w.word}
                                width={160}
                                height={96}
                                loading="lazy"
                                decoding="async"
                                className="h-20 w-full object-cover"
                              />
                              <div className="px-2.5 py-2">
                                <p className="truncate text-xs font-extrabold text-white">{w.word}</p>
                                <p className="truncate text-[11px] text-[#D1D5DB]">{w.meaning}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={sessionEnsuring}
                            onClick={() => void startGuidedLesson(activeCurriculumLesson.words)}
                            className="duo-btn duo-btn-amber px-7"
                          >
                            {sessionEnsuring
                              ? "Đang khởi tạo..."
                              : activeCurriculumLesson.isCompleted
                                ? `Ôn lại ${activeCurriculumLesson.title}`
                                : `Bắt đầu ${activeCurriculumLesson.title} ngay`}
                          </button>
                          <span className="text-xs font-medium text-[#D1D5DB]">
                            Gồm 2 bước: Ghi nhớ nhanh → Ghép từ &amp; luyện phản xạ (~2 phút)
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* ── 4-Lesson Guided Curriculum Roadmap ── */}
                    <div>
                      <div className="mb-3.5 flex items-center justify-between">
                        <h4 className="text-lg font-extrabold tracking-[-0.02em] text-text-primary">
                          Lộ trình {curriculumLessons.length} bài học · {currentTopicTitleRef.current}
                        </h4>
                        <span className="text-xs font-bold text-text-secondary">
                          Tăng dần từ A1 → B1
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {curriculumLessons.map((lesson) => {
                          const isCurrent = activeCurriculumLesson.index === lesson.index && !lesson.isCompleted;
                          const pct = lesson.words.length > 0 ? Math.round((lesson.learnedCount / lesson.words.length) * 100) : 0;

                          return (
                            <article
                              key={lesson.index}
                              className={`duo-card flex flex-col p-5 ${
                                isCurrent ? "!border-primary ring-1 ring-primary/20" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                                        lesson.isCompleted
                                          ? "bg-[#10B981] text-white"
                                          : isCurrent
                                            ? "bg-primary text-white"
                                            : "bg-bg-secondary text-text-secondary"
                                      }`}
                                    >
                                      {lesson.isCompleted ? <Check size={14} strokeWidth={2.5} aria-hidden /> : lesson.index + 1}
                                    </span>
                                    <h5 className="text-base font-extrabold text-text-primary">
                                      {lesson.title} · {lesson.stageLabel}
                                    </h5>
                                  </div>
                                  <p className="mt-1.5 line-clamp-1 text-xs font-medium text-text-secondary">
                                    {lesson.words.map((w: any) => w.word).join(" · ")}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-bg-secondary px-2.5 py-0.5 text-[11px] font-extrabold text-text-secondary">
                                  {lesson.cefrRange}
                                </span>
                              </div>

                              {/* Overlapping 5-photo preview strip */}
                              <div className="mt-4 flex items-center justify-between gap-3">
                                <div className="flex -space-x-2">
                                  {lesson.words.map((w: any) => (
                                    <img
                                      key={w.id}
                                      src={getVocabIllustration(w.word, currentTopicTitleRef.current, w.imageUrl)}
                                      alt=""
                                      aria-hidden="true"
                                      width={34}
                                      height={34}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-8 w-8 rounded-full border-2 border-surface object-cover bg-bg-secondary"
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-bold tabular-nums text-text-secondary">
                                  {lesson.learnedCount}/{lesson.words.length} từ
                                </span>
                              </div>

                              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                                <div
                                  className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="mt-4">
                                <button
                                  type="button"
                                  disabled={sessionEnsuring}
                                  onClick={() => void startGuidedLesson(lesson.words)}
                                  className={`duo-btn duo-btn-sm w-full ${
                                    isCurrent
                                      ? "duo-btn-purple"
                                      : lesson.isCompleted
                                        ? "duo-btn-surface"
                                        : "duo-btn-surface"
                                  }`}
                                >
                                  {lesson.isCompleted
                                    ? "Ôn lại bài này"
                                    : isCurrent
                                      ? `Học ${lesson.title} ngay`
                                      : `Mở ${lesson.title}`}
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="duo-card p-8 text-center text-sm text-text-secondary">
                    Chủ đề này chưa có từ vựng để tạo giáo trình.
                  </div>
                )}
              </div>
            )}

            {learnStep === 2 && (
              <div
                className={`fixed inset-0 z-[460] flex h-dvh flex-col overflow-hidden ${
                  isDarkFocusedSession
                    ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                }`}
                style={{
                  backgroundColor: isDarkFocusedSession ? "var(--bg-secondary)" : "var(--bg-secondary)",
                }}
              >

                <header className={`relative z-10 shrink-0 border-b ${
                  isDarkFocusedSession
                    ? "border-[var(--border-color)] bg-[var(--surface)]/95"
                    : "border-[var(--border-color)] bg-[var(--surface)]/95"
                }`}>
                  <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:grid-cols-[1fr_minmax(240px,480px)_1fr] sm:gap-6">
                      <button
                        type="button"
                        onClick={handleExit}
                        disabled={sessionAbandoning}
                        className={`flex h-10 shrink-0 items-center justify-self-start rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                          isDarkFocusedSession
                            ? "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent-color)] hover:text-[var(--border-color)]"
                            : "border-[var(--border-color)] bg-surface text-[var(--text-primary)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)]"
                        }`}
                        aria-label="Thoát phiên học"
                      >
                        <X size={20} />
                        <span className="ml-2 hidden sm:inline">Thoát</span>
                      </button>
                      <div className="min-w-0 text-center">
                        <div className={`flex items-baseline justify-center gap-1 text-sm font-bold tabular-nums sm:text-base ${
                          isDarkFocusedSession ? "text-[var(--accent-color)]" : "text-[var(--accent-color)]"
                        }`}>
                          <span>{currentIndex + 1}</span>
                          <span className={isDarkFocusedSession ? "text-[var(--text-muted)]" : "text-[var(--border-color)]"}>/ {activeSessionWords.length}</span>
                        </div>
                        <div className={`mt-2 h-2 overflow-hidden rounded-full ${
                          isDarkFocusedSession ? "bg-[var(--accent-soft)]" : "bg-[var(--accent-soft)]"
                        }`}>
                          <div
                            className={`h-full rounded-full transition-[width] duration-300 ${
                              isDarkFocusedSession ? "bg-[var(--accent-color)]" : "bg-[var(--accent-color)]"
                            }`}
                            style={{ width: `${((currentIndex + 1) / activeSessionWords.length) * 100}%` }}
                          />
                        </div>
                        <div className={`mt-1 hidden truncate text-[11px] sm:block ${
                          isDarkFocusedSession ? "text-[var(--text-muted)]" : "text-[var(--border-color)]"
                        }`}>
                          {topicTitle} · {isReviewMode ? "Ôn tập" : "Học từ vựng"}
                        </div>
                      </div>
                      {!isGuest ? (
                        <button
                          type="button"
                          onClick={openStickyNotes}
                          className={`inline-flex h-10 shrink-0 items-center justify-self-end gap-2 rounded-2xl px-3 text-sm font-semibold transition active:scale-[0.98] sm:px-4 ${
                            isDarkFocusedSession
                              ? `text-[var(--accent-color)] hover:bg-[var(--accent-soft)] ${isStickyNotesOpen ? "bg-[var(--accent-soft)]" : ""}`
                              : `text-[var(--accent-color)] hover:bg-[var(--accent-soft)] ${isStickyNotesOpen ? "bg-[var(--accent-soft)]" : ""}`
                          }`}
                          aria-expanded={isStickyNotesOpen}
                        >
                          <NoteIcon className="h-7 w-7" />
                          <span className="hidden sm:inline">Ghi chú</span>
                        </button>
                      ) : (
                        <span className="h-10 w-10 justify-self-end" aria-hidden />
                      )}
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
                          transition={{ type: "spring", stiffness: 250, damping: 24 }}
                          className="relative h-full w-full cursor-pointer preserve-3d"
                        >
                          <div className="learning-card absolute inset-0 backface-hidden flex h-full flex-col items-center justify-center rounded-[24px] p-6 text-center sm:p-10">
                            <img
                              src="/mascot-lumo.webp"
                              alt=""
                              aria-hidden="true"
                              width={50}
                              height={56}
                              className="pointer-events-none absolute right-5 top-4 hidden h-auto w-[46px] opacity-90 sm:block"
                            />
                            <Badge variant="purple" className="mb-6 sm:mb-8">
                              Thẻ từ vựng
                            </Badge>
                            <div className="mb-3 max-w-full break-words text-[clamp(2.5rem,14vw,4rem)] font-display font-extrabold leading-[1.05] text-primary sm:text-[4rem]">
                              {activeSessionWords[currentIndex].word}
                            </div>
                            <div className="mb-6 max-w-full break-words rounded-xl bg-bg-secondary px-3 py-2 font-ipa text-base text-text-muted sm:mb-8 sm:px-5 sm:text-2xl">
                              {activeSessionWords[currentIndex].transcription}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              <AudioWaveButton
                                text={activeSessionWords[currentIndex].word}
                                audioUrl={activeSessionWords[currentIndex].audioUrl}
                                label={`Phát âm ${activeSessionWords[currentIndex].word}`}
                              />
                              <Button variant="secondary" className="px-6 py-3 sm:px-8">
                                Xem nghĩa
                              </Button>
                            </div>
                          </div>
                          <div className="learning-card absolute inset-0 backface-hidden rotate-y-180 flex h-full flex-col items-center justify-center rounded-[24px] p-6 text-center sm:p-10">
                            <img
                              src="/mascot-lumo-thinking.webp"
                              alt=""
                              aria-hidden="true"
                              width={50}
                              height={56}
                              className="pointer-events-none absolute right-5 top-4 hidden h-auto w-[46px] opacity-90 sm:block"
                            />
                            <Badge variant="pink" className="mb-5 sm:mb-7">
                              Nghĩa
                            </Badge>
                            <div className="mb-5 text-2xl font-bold leading-tight text-text-primary sm:text-[2.25rem]">
                              {activeSessionWords[currentIndex].meaning}
                            </div>
                            <div className="mb-4">
                              <AudioWaveButton
                                text={activeSessionWords[currentIndex].example}
                                audioUrl={activeSessionWords[currentIndex].exampleAudioUrl}
                                variant="compact"
                                size="sm"
                                caption="Nghe ví dụ"
                                label="Nghe câu ví dụ"
                              />
                            </div>
                            <div className="w-full rounded-2xl border-2 border-border bg-bg-secondary/60 p-4 text-text-primary sm:p-6">
                              <p className="text-base leading-relaxed sm:text-lg">{activeSessionWords[currentIndex].example}</p>
                              {activeSessionWords[currentIndex].translation && (
                                <p className="mt-3 text-sm text-text-muted">"{activeSessionWords[currentIndex].translation}"</p>
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
                  isMatchingDark ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
                }`}
                style={{
                  backgroundColor: isMatchingDark ? "var(--bg-secondary)" : "var(--bg-secondary)",
                }}
              >
                <header
                  className={`relative z-10 shrink-0 border-b ${
                    isMatchingDark
                      ? "border-[var(--border-color)] bg-[var(--surface)]/95"
                      : "border-[var(--border-color)] bg-[var(--surface)]/95"
                  }`}
                >
                  <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <button
                      type="button"
                      onClick={handleExit}
                      disabled={sessionAbandoning || matchingCompleting}
                      className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                        isMatchingDark
                          ? "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                          : "border-[var(--border-color)] bg-surface text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                      }`}
                      aria-label="Thoát phiên học"
                    >
                      <X size={20} />
                      <span className="ml-2 hidden sm:inline">Thoát</span>
                    </button>
                    <span
                      className={`font-display text-base font-bold ${
                        isMatchingDark ? "text-[var(--accent-color)]" : "text-[var(--accent-color)]"
                      }`}
                    >
                      Nối từ
                    </span>
                    {!isGuest ? (
                      <button
                        type="button"
                        onClick={openStickyNotes}
                        className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                          isMatchingDark
                            ? "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                            : "border-[var(--border-color)] bg-surface text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                        }`}
                        aria-label="Ghi chú"
                      >
                        <NoteIcon className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Ghi chú</span>
                      </button>
                    ) : (
                      <span className="h-10 w-10 shrink-0" aria-hidden />
                    )}
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
          </div>
        )}

        {tab === "dialogue" && (
          <div key="dialogue-tab" className="py-2">
            <DialoguePractice
              topicTitle={currentTopicTitleRef.current}
              words={words}
              onComplete={(xp) => {
                if (!isGuest) {
                  addXP(xp);
                  triggerStreakCheck();
                  void refreshLearnerAnalytics();
                }
                onAddToast(`Hoàn thành hội thoại! +${xp} XP`, "success");
              }}
            />
          </div>
        )}

        {tab === "minitest" && isMinitestActive && (
          <div
            className={`fixed inset-0 z-[460] flex h-dvh flex-col overflow-hidden ${
              isMinitestDark ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
            }`}
            style={{
              backgroundColor: isMinitestDark ? "var(--bg-secondary)" : "var(--bg-secondary)",
            }}
          >
            <header
              className={`relative z-10 shrink-0 border-b ${
                isMinitestDark
                  ? "border-[var(--border-color)] bg-[var(--surface)]/95"
                  : "border-[var(--border-color)] bg-[var(--surface)]/95"
              }`}
            >
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                <button
                  type="button"
                  onClick={handleExit}
                  disabled={sessionAbandoning}
                  className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                    isMinitestDark
                      ? "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                      : "border-[var(--border-color)] bg-surface text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                  }`}
                  aria-label="Thoát bài kiểm tra"
                >
                  <X size={20} />
                  <span className="ml-2 hidden sm:inline">Thoát</span>
                </button>
                <div className="min-w-0 flex-1 px-2 text-center">
                  <div
                    className={`flex items-baseline justify-center gap-1.5 text-sm font-bold tabular-nums ${
                      isMinitestDark ? "text-[var(--accent-color)]" : "text-[var(--accent-color)]"
                    }`}
                  >
                    <span className="hidden sm:inline">Kiểm tra ·</span>
                    <span>
                      {minitestProgress.answered} / {minitestProgress.total} câu
                    </span>
                  </div>
                  <div
                    className={`mx-auto mt-1.5 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full ${
                      isMinitestDark ? "bg-[var(--accent-soft)]" : "bg-[var(--accent-soft)]"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isMinitestDark ? "bg-[var(--accent-color)]" : "bg-[var(--accent-color)]"
                      }`}
                      style={{
                        width: `${minitestProgress.total > 0 ? (minitestProgress.answered / minitestProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                {!isGuest ? (
                  <button
                    type="button"
                    onClick={openStickyNotes}
                    className={`flex h-10 shrink-0 items-center rounded-full border px-3 text-sm font-bold transition-colors active:scale-95 sm:px-4 ${
                      isMinitestDark
                        ? "border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                        : "border-[var(--border-color)] bg-surface text-[var(--text-primary)] hover:border-[var(--accent-color)]"
                    }`}
                    aria-label="Ghi chú"
                  >
                    <NoteIcon className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Ghi chú</span>
                  </button>
                ) : (
                  <span className="h-10 w-10 shrink-0" aria-hidden />
                )}
              </div>
            </header>

            <div data-minitest-scroll className="relative z-10 flex-1 overflow-y-auto px-3 py-6 sm:px-6 sm:py-8">
              <Minitest
                topicId={topicId}
                learnedWords={minitestWords}
                topicWords={words}
                onFinish={onFinish}
                hideProgressCard
                onProgressChange={handleMinitestProgress}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirm before starting the test. Only shown on the Kiểm tra tab click,
          never while the test is already active. */}
      {showMinitestConfirm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,#0b0a12_55%,transparent)]"
            onClick={() => setShowMinitestConfirm(false)}
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-[var(--radius-container)] border border-border bg-surface p-6 text-center shadow-[var(--shadow-high)]">
            <h3 className="text-lg font-bold text-text-primary">
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
                  // Randomize the test set once, capped at the required count.
                  setMinitestWords(shuffleArray(learnedWordsForMinitest).slice(0, requiredMinitestWords));
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

      {/* Not enough learned words to take the test. */}
      {showMinitestInsufficient && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,#0b0a12_55%,transparent)]"
            onClick={() => setShowMinitestInsufficient(false)}
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-[var(--radius-container)] border border-border bg-surface p-6 text-center shadow-[var(--shadow-high)]">
            <h3 className="text-lg font-bold text-text-primary">
              Chưa đủ từ để kiểm tra
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-text-muted">
              Bạn cần học ít nhất {requiredMinitestWords} từ trong chủ đề này trước khi làm kiểm tra.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <Button variant="ghost" onClick={() => setShowMinitestInsufficient(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowMinitestInsufficient(false);
                  setTab("learn");
                  setCurrentIndex(0);
                  setIsFlipped(false);
                }}
              >
                Tiếp tục học
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Guest trial session completion modal */}
      {guestCompletionSummary && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_srgb,#0b0a12_55%,transparent)]"
            onClick={() => setGuestCompletionSummary(null)}
          />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-[var(--radius-container)] border border-border bg-surface p-6 text-center shadow-[var(--shadow-high)] sm:p-7">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
              <Sparkles size={22} aria-hidden />
            </div>
            <h3 className="text-xl font-bold text-text-primary">
              Hoàn thành phiên học thử {guestCompletionSummary.count} từ!
            </h3>
            <p className="mx-auto mt-2 text-sm leading-relaxed text-text-muted">
              Bạn vừa đi qua đủ nhịp Flashcard → Tự đánh giá SM-2 → Ghép từ. Đăng ký miễn phí để lưu tiến độ, nhận lịch ôn tự động và mở toàn bộ chủ đề.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button fullWidth variant="primary" onClick={() => navigate(PATHS.register)}>
                Tạo tài khoản miễn phí
              </Button>
              {learnedWordsForMinitest.length > 0 && (
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    setGuestCompletionSummary(null);
                    setMinitestWords(shuffleArray(learnedWordsForMinitest).slice(0, MINITEST_REQUIRED_WORDS));
                    setTab("minitest");
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    setIsMinitestActive(true);
                  }}
                >
                  Thử bài Kiểm tra (Minitest)
                </Button>
              )}
              <Button fullWidth variant="ghost" onClick={() => setGuestCompletionSummary(null)}>
                Học thêm từ trong chủ đề này
              </Button>
            </div>
          </div>
        </div>
      )}
      <AppDialog
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Tạm dừng phiên học này?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowExitConfirm(false)}>
              Ở lại học tiếp
            </Button>
            <Button variant="danger" onClick={() => void performExit()}>
              Thoát phiên
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <img src="/mascot-lumo-thinking.webp" alt="Lumo" width={64} height={72} className="h-auto w-16" />
          <p className="text-sm text-text-muted">
            Tiến trình chưa hoàn tất trong phiên này sẽ không được lưu vào lịch ôn.
          </p>
        </div>
      </AppDialog>
    </div>
  );
};

export { StudySession };
