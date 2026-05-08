import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Logo } from "./assets/Logo";
import {
  ChevronRight,
  Volume2,
  ArrowLeft,
  Shield,
  ChevronLeft,
  Sparkles,
  Check,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { authApi, type AuthenticatedUser } from "./services/authApi";
import {
  learningProgressApi,
  type LearningProgressState,
} from "./services/learningProgressApi";
import { EMPTY_CURRENT_USER_GAME_DATA } from "./constants/appConstants";
import { mockData } from "./mocks/mockData";
import {
  loadCurrentUserGameData,
  saveCurrentUserGameData,
} from "./utils/gameDataStorage";
import { buildLearningTopicGroups } from "./utils/learningTopicGroups";
import { playPronunciationAudio } from "./utils/audio";
import { useToasts } from "./hooks/useToasts";
import { useGameProgress } from "./hooks/useGameProgress";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { Badge, Button, Toast } from "./components/ui";
import { Footer, Navbar, AuthNavbar } from "./components/layout";
import { StreakModal } from "./components/learning/streak";
import { AppRoutes } from "./AppRoutes";
import { buildMinitestFillQuestions } from "./utils/minitestQuestions";
import { buildTranslationQuestions, type TranslationQuestion } from "./utils/translationQuestions";
import {
  appendStudyDate,
  appendStudySessionDetail,
  getTodayStudyDate,
  type StudySessionRecordInput,
} from "./utils/studyHistory";

// --- COMPONENTS ---

const LearningTopics = ({
  onStartStudy,
  currentUser,
  gameData,
  onNavigate,
  topicGroups,
}: any) => {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [hasInitializedAccordion, setHasInitializedAccordion] = useState(false);
  const isGuest = !currentUser;

  useEffect(() => {
    if (!hasInitializedAccordion && !expandedCat && topicGroups.length > 0) {
      setExpandedCat(topicGroups[0].id);
      setHasInitializedAccordion(true);
    }
  }, [expandedCat, hasInitializedAccordion, topicGroups]);

  const streakDays = Number.isFinite(gameData?.streak)
    ? gameData.streak
    : Number.isFinite(currentUser?.streak)
      ? currentUser.streak
      : 0;

  const totalReviewCount = isGuest ? 0 : topicGroups.reduce(
    (sum: number, cat: any) => sum + cat.topics.reduce((s: number, t: any) => s + (t.stats?.review || 0), 0), 0
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 relative">
      {/* Guest Banner */}
      {isGuest && (
        <div className="mb-12 p-4 bg-linear-to-r from-cyan/80 via-purple/80 to-pink/80 rounded-2xl flex items-center justify-between backdrop-blur-md border border-white/20 shadow-xl animate-fade-in">
          <div className="flex items-center gap-4 text-white">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
              ✨
            </div>
            <p className="font-bold">
              Bạn đang xem chế độ khách. Đăng ký để mở khóa toàn bộ 44 chủ đề!
            </p>
          </div>
          <Button
            variant="ghost"
            className="bg-white/20 border-white/40 text-white"
            onClick={() => onNavigate("register")}
          >
            Đăng ký miễn phí →
          </Button>
        </div>
      )}

      {/* Greeting Header */}
      {!isGuest && (
        <header className="flex items-center justify-between mb-16 animate-slide-down">
          <div>
            <h1 className="text-5xl mb-2 font-display font-bold">
              Chào {currentUser.username}! 👋
            </h1>
            <p className="text-text-secondary text-lg">
              Hôm nay bạn muốn học gì nào?
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="glass-card px-6 py-3 border-orange-500/20 bg-orange-500/5 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <span className="font-bold text-orange-600">
                {streakDays} ngày liên tiếp
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Main Header for Guest */}
      {isGuest && (
        <header className="text-center mb-16">
          <h1 className="text-5xl mb-4 font-display font-bold">
            Khám phá chủ đề học
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Khám phá kho tàng kiến thức với 7 danh mục lớn và 44 chủ đề từ vựng
            đa dạng từ cơ bản đến nâng cao.
          </p>
        </header>
      )}

      {!isGuest && totalReviewCount > 0 && (
        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-4 border animate-fade-in ${
          totalReviewCount > 10
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-purple/10 border-purple/30 text-[#4B1F8A]'
        }`}>
          <div className="text-3xl flex-shrink-0">🔔</div>
          <div>
            <p className="font-bold text-lg">
              Hôm nay bạn có <span className="underline">{totalReviewCount} từ</span> cần ôn tập!
            </p>
            <p className="text-sm opacity-80">Ôn tập đúng hạn giúp ghi nhớ lâu hơn theo phương pháp Spaced Repetition.</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {topicGroups.map((cat: any, catIndex: number) => {
          const isOpen = expandedCat === cat.id;
          const isCategoryLocked = isGuest && catIndex > 0;

          return (
            <div
              key={cat.id}
              className={`glass-card overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-primary/5 ${isCategoryLocked ? "opacity-50" : ""}`}
            >
              {/* Accordion Header */}
              <button
                onClick={() =>
                  !isCategoryLocked && setExpandedCat(isOpen ? null : cat.id)
                }
                className={`w-full p-6 flex items-center justify-between group transition-colors ${isOpen ? "bg-primary/5" : "hover:bg-primary/5"} ${isCategoryLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                disabled={isCategoryLocked}
              >
                <div className="flex items-center gap-6">
                  <div className="text-4xl group-hover:scale-110 transition-transform">
                    {cat.icon ?? "📚"}
                  </div>
                  <div className="text-left">
                    <h3
                      className={`text-2xl font-bold flex items-center gap-2 ${isOpen ? "text-primary" : "text-text-primary"}`}
                    >
                      {cat.title}
                      {isCategoryLocked && (
                        <Shield size={20} className="text-text-muted" />
                      )}
                    </h3>
                    <p className="text-text-muted text-sm">
                      {cat.topics.length} chủ đề từ vựng
                    </p>
                  </div>
                </div>
                <div
                  className={`p-2 rounded-full transform transition-transform duration-300 ${isOpen ? "rotate-180 bg-primary/20 text-primary" : "rotate-0 bg-bg-light text-text-muted"}`}
                >
                  <ChevronLeft className="-rotate-90" />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-white/30"
                  >
                    <div className="p-8 grid md:grid-cols-2 gap-6">
                      {cat.topics.map((topic: any, idx: number) => {
                        const isTopicLocked = isGuest && idx >= 3;
                        const isLearnedOut =
                          !isGuest &&
                          topic.stats.new === 0 &&
                          topic.stats.review === 0;
                        const progressPercent =
                          topic.stats.total > 0
                            ? Math.round(
                                (topic.stats.learned / topic.stats.total) * 100,
                              )
                            : 0;

                        return (
                          <div
                            key={topic.id}
                            className={`glass-card p-6 border group transition-all relative ${isTopicLocked ? "blur-[2px] opacity-70 pointer-events-none" : "hover:border-primary/40 hover:-translate-y-1"}`}
                          >
                            {/* Locking Overlay */}
                            {isTopicLocked && (
                              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/10 backdrop-blur-[1px] rounded-card">
                                <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-lg border-2 border-primary/20 text-text-muted">
                                  🔒
                                </div>
                              </div>
                            )}

                            <div className="flex items-start justify-between mb-4">
                              <div className="text-4xl">{topic.icon}</div>
                              {isGuest && idx < 3 && (
                                <Badge
                                  variant="green"
                                  className="animate-pulse"
                                >
                                  Preview ✓
                                </Badge>
                              )}
                              {!isGuest && (
                                <div className="flex gap-2">
                                  <Badge
                                    variant="cyan"
                                    className="text-[10px] px-1.5"
                                  >
                                    🆕 {topic.stats.new}
                                  </Badge>
                                  <Badge
                                    variant="purple"
                                    className="text-[10px] px-1.5"
                                  >
                                    🔔 {topic.stats.review}
                                  </Badge>
                                  <Badge
                                    variant="green"
                                    className="text-[10px] px-1.5 font-bold"
                                  >
                                    ✅ {topic.stats.learned}
                                  </Badge>
                                </div>
                              )}
                            </div>

                            <h4 className="text-xl font-bold mb-2">
                              {topic.title}
                            </h4>
                            <p className="text-sm text-text-secondary line-clamp-2 mb-6">
                              {topic.description}
                            </p>

                            {!isGuest && (
                              <div className="mb-6">
                                <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden mb-1">
                                  <div
                                    className="h-full bg-linear-to-r from-primary to-accent transition-all duration-1000"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-text-muted text-right font-medium">
                                  Tiến độ: {progressPercent}%
                                </div>
                              </div>
                            )}

                            {isLearnedOut ? (
                              <Button
                                variant="ghost"
                                className="w-full cursor-not-allowed opacity-40"
                                disabled
                                title="Bạn đã học hết chủ đề này! Chờ ngày ôn tiếp theo."
                              >
                                Đã hoàn thành
                              </Button>
                            ) : (
                              <div className="space-y-2">
                                {topic.stats.new > 0 && (
                                  <Button
                                    variant="primary"
                                    className="w-full group/btn"
                                    onClick={() => onStartStudy(topic.id)}
                                    disabled={isTopicLocked}
                                  >
                                    {topic.stats.review > 0 ? "🆕 Học từ mới" : "Bắt đầu →"}
                                  </Button>
                                )}
                                {topic.stats.review > 0 && (
                                  <Button
                                    variant="ghost"
                                    className="w-full border border-purple/50 text-purple hover:bg-purple/10"
                                    onClick={() => onStartStudy(topic.id, 'review')}
                                    disabled={isTopicLocked}
                                  >
                                    🔔 Ôn tập ngay ({topic.stats.review})
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Sticky Guest CTA */}
      {isGuest && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-6 flex justify-center pointer-events-none">
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="pointer-events-auto bg-white/90 backdrop-blur-xl border-2 border-primary/40 p-6 rounded-card shadow-2xl flex flex-col sm:flex-row items-center gap-8 max-w-4xl w-full"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-purple flex items-center justify-center text-white text-3xl shadow-lg ring-4 ring-primary/10">
                🎯
              </div>
              <div>
                <h4 className="font-bold text-xl mb-1 text-text-primary">
                  Mở khóa 44 chủ đề đặc sắc
                </h4>
                <p className="text-text-secondary">
                  Theo dõi tiến trình học tập và nhận ngay 100 XP thưởng! 🔥
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              className="px-10 py-4 text-lg ml-auto"
              onClick={() => onNavigate("register")}
            >
              Đăng ký miễn phí →
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const MATCH_PAIRS_PER_ROUND = 8;

type MatchCard = { uid: string; id: number; kind: 'word' | 'meaning'; content: string };

const buildMatchBoard = (roundWords: any[], type: string): MatchCard[] => {
  const validWords = type === 'ipa'
    ? roundWords.filter((w: any) => w.transcription?.trim())
    : roundWords;
  const wordCards: MatchCard[] = validWords.map((w: any) => ({
    uid: `${w.id}-word`,
    id: w.id,
    kind: 'word',
    content: type === 'word' ? w.word : w.transcription,
  }));
  const meaningCards: MatchCard[] = validWords.map((w: any) => ({
    uid: `${w.id}-meaning`,
    id: w.id,
    kind: 'meaning',
    content: w.meaning,
  }));
  return [...wordCards, ...meaningCards].sort(() => Math.random() - 0.5);
};

const MatchingGame = ({ words, type, onFinish }: any) => {
  const totalRounds = Math.ceil(words.length / MATCH_PAIRS_PER_ROUND);
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState<MatchCard[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [roundDone, setRoundDone] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [startTime] = useState(Date.now());

  const roundWords = useMemo(
    () => words.slice(round * MATCH_PAIRS_PER_ROUND, (round + 1) * MATCH_PAIRS_PER_ROUND),
    [words, round],
  );

  useEffect(() => {
    setBoard(buildMatchBoard(roundWords, type));
    setSelected(null);
    setMatched(new Set());
    setWrong(new Set());
    setRoundDone(false);
  }, [roundWords, type]);

  const handleCardClick = (uid: string) => {
    if (matched.has(uid) || wrong.size > 0) return;

    if (!selected) {
      setSelected(uid);
      return;
    }
    if (selected === uid) {
      setSelected(null);
      return;
    }

    const selCard = board.find((c) => c.uid === selected)!;
    const clickCard = board.find((c) => c.uid === uid)!;

    if (selCard.id === clickCard.id && selCard.kind !== clickCard.kind) {
      const newMatched = new Set(matched);
      newMatched.add(selCard.uid);
      newMatched.add(clickCard.uid);
      setMatched(newMatched);
      setSelected(null);

      const newTotal = totalCorrect + 1;
      setTotalCorrect(newTotal);

      if (newMatched.size === roundWords.length * 2) {
        const allDone = round + 1 >= totalRounds;
        if (allDone) {
          setTimeout(
            () => onFinish(words.length, words.length, Math.round((Date.now() - startTime) / 1000)),
            600,
          );
        } else {
          setTimeout(() => setRoundDone(true), 400);
        }
      }
    } else {
      const newWrong = new Set([selCard.uid, clickCard.uid]);
      setWrong(newWrong);
      setTimeout(() => {
        setWrong(new Set());
        setSelected(null);
      }, 800);
    }
  };

  const totalMatchedPairs = round * MATCH_PAIRS_PER_ROUND + matched.size / 2;

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm font-medium text-text-muted">
          {totalRounds > 1 && (
            <span className="mr-3 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              Vòng {round + 1}/{totalRounds}
            </span>
          )}
          <span className="text-text-primary font-bold">
            {Math.round(totalMatchedPairs)}/{words.length} cặp
          </span>
        </div>
        <div className="h-2 w-40 bg-primary/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(totalMatchedPairs / words.length) * 100}%` }}
          />
        </div>
      </div>

      {roundDone ? (
        <div className="glass-card p-12 text-center space-y-6 animate-fade-in">
          <div className="text-5xl">🎉</div>
          <h3 className="text-2xl font-bold">Vòng {round + 1} hoàn thành!</h3>
          <p className="text-text-muted">
            Còn {words.length - (round + 1) * MATCH_PAIRS_PER_ROUND} từ trong vòng tiếp theo.
          </p>
          <Button variant="primary" className="px-10 py-4 text-lg" onClick={() => setRound((r) => r + 1)}>
            Vòng tiếp theo →
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {board.map((card) => {
            const isMatched = matched.has(card.uid);
            const isSelected = selected === card.uid;
            const isWrong = wrong.has(card.uid);
            const isWord = card.kind === 'word';
            return (
              <button
                key={card.uid}
                disabled={isMatched || wrong.size > 0}
                onClick={() => handleCardClick(card.uid)}
                className={`min-h-[80px] p-4 rounded-2xl border-2 font-semibold text-base
                  flex items-center justify-center text-center transition-all duration-200 disabled:cursor-not-allowed
                  ${isMatched
                    ? 'bg-green-50 border-green-400 text-green-700 opacity-60 cursor-default'
                    : isWrong
                      ? 'bg-red-50 border-red-400 text-red-700 animate-shake'
                      : isSelected
                        ? isWord
                          ? 'bg-primary/10 border-primary shadow-lg scale-105'
                          : 'bg-purple/10 border-purple shadow-lg scale-105'
                        : isWord
                          ? 'bg-white border-primary/15 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                          : 'bg-white border-purple/20 hover:border-purple/50 hover:bg-purple/5 cursor-pointer'
                  }`}
              >
                {card.content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Minitest = ({ topicId, sessionWords, topicWords, onFinish }: any) => {
  const isLocked = !Array.isArray(sessionWords) || sessionWords.length < 5;
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [translationAnswers, setTranslationAnswers] = useState<(number | string | null)[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showingPart2, setShowingPart2] = useState(false);

  const fillQuestions = useMemo(() => {
    return buildMinitestFillQuestions(
      Array.isArray(sessionWords) ? sessionWords : [],
      Array.isArray(topicWords) ? topicWords : [],
      5,
    );
  }, [sessionWords, topicWords]);

  const translationQuestions = useMemo(() => {
    const wordsWithTranslation = (Array.isArray(sessionWords) ? sessionWords : [])
      .filter(w => w && w.example && w.translation);
    return buildTranslationQuestions(wordsWithTranslation, wordsWithTranslation, 4);
  }, [sessionWords]);

  useEffect(() => {
    setFillAnswers(new Array(fillQuestions.length).fill(""));
    setTranslationAnswers(new Array(translationQuestions.length).fill(null));
    setIsSubmitted(false);
    setShowingPart2(false);
  }, [fillQuestions, translationQuestions]);

  const answeredCount =
    fillAnswers.filter((a) => a !== "").length +
    translationAnswers.filter((a) => a !== null && a !== "").length;
  const totalQuestions = fillQuestions.length + translationQuestions.length;

  const handleSubmit = () => {
    setIsSubmitted(true);
    let sFill = 0;
    let sTranslation = 0;

    fillAnswers.forEach((ans, i) => {
      if (ans.trim().toLowerCase() === fillQuestions[i].a.toLowerCase()) {
        sFill++;
      }
    });

    translationAnswers.forEach((ans, i) => {
      if (translationQuestions[i].questionType === 'multiple-choice') {
        if (ans === translationQuestions[i].correctTranslation) {
          sTranslation++;
        }
      } else {
        if (typeof ans === 'string' && ans.trim().toLowerCase() === translationQuestions[i].correctTranslation.toLowerCase()) {
          sTranslation++;
        }
      }
    });

    const bonus = sTranslation === translationQuestions.length ? 50 : 0;

    if (bonus > 0) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    const translationReview = translationQuestions.map((q: TranslationQuestion, index: number) => {
      const answer = translationAnswers[index];
      const normalizedAnswer = typeof answer === 'string' ? answer.trim() : '';
      const isCorrect = q.questionType === 'multiple-choice'
        ? answer === q.correctTranslation
        : normalizedAnswer.toLowerCase() === q.correctTranslation.toLowerCase();

      return {
        englishSentence: q.englishSentence,
        correctTranslation: q.correctTranslation,
        userAnswer: typeof answer === 'string' ? answer : '',
        isCorrect
      };
    });

    onFinish(sFill + sTranslation, totalQuestions, {
      fill: sFill,
      translation: sTranslation,
      bonus,
      review: translationReview
    });
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 relative">
      <div className="sticky top-[80px] z-40 bg-white/90 backdrop-blur-md p-6 rounded-3xl border-2 border-primary/20 shadow-2xl flex items-center justify-between gap-12 mb-16">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-text-muted mb-2 uppercase tracking-[0.2em]">
            <span>Tiến độ bài làm</span>
            <span>
              {answeredCount} / {totalQuestions} câu
            </span>
          </div>
          <div className="h-4 bg-purple/10 rounded-full overflow-hidden border border-primary/5">
            <motion.div
              animate={{
                width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%`,
              }}
              className="h-full bg-linear-to-r from-cyan to-primary"
            />
          </div>
        </div>
      </div>

      <div className="space-y-24">
        <section id="part1">
          <header className="flex items-center gap-6 mb-12">
            <Badge variant="purple" className="py-3 px-6 text-base font-bold">
              Bài 1: Chọn từ đúng
            </Badge>
            <div className="flex-1 h-px bg-purple/10" />
          </header>
          <div className="grid gap-10">
            {fillQuestions.length === 0 && (
              <div className="glass-card p-8 text-center text-text-secondary">
                Bạn chưa có từ nào đã học trong chủ đề này để làm bài 1. Hãy học
                và hoàn thành phần luyện tập trước.
              </div>
            )}
            {fillQuestions.map((q: any, i: number) => {
              const isCorrect =
                isSubmitted &&
                fillAnswers[i].trim().toLowerCase() === q.a.toLowerCase();

              return (
                <div
                  key={q.id}
                  className={`glass-card p-10 relative overflow-hidden transition-all duration-500 ${isSubmitted ? (isCorrect ? "border-green-500 bg-green-50/50" : "border-red-500 bg-red-50/50") : "bg-white"}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary">
                      {i + 1}
                    </span>
                  </div>
                  <div className="text-2xl font-medium mb-8 leading-relaxed italic text-text-primary">
                    {q.promptType === "example"
                      ? q.q
                      : `Nghĩa: ${q.q}`}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {q.options.map((option: string, optionIndex: number) => {
                        const isSelected = fillAnswers[i] === option;
                        const isCorrectOption =
                          isSubmitted &&
                          option.toLowerCase() === q.a.toLowerCase();
                        const isWrongSelected =
                          isSubmitted &&
                          isSelected &&
                          option.toLowerCase() !== q.a.toLowerCase();

                        return (
                          <label
                            key={`${q.id}-${optionIndex}`}
                            className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${isSubmitted
                              ? isCorrectOption
                                ? "border-green-500 bg-green-100 text-green-900"
                                : isWrongSelected
                                  ? "border-red-500 bg-red-100 text-red-900"
                                  : "border-primary/10 bg-white"
                              : isSelected
                                ? "border-primary bg-primary/5"
                                : "border-primary/10 hover:border-primary/30 bg-white"
                              }`}
                          >
                            <input
                              type="radio"
                              name={`fill-question-${i}`}
                              checked={isSelected}
                              disabled={isSubmitted}
                              onChange={() => {
                                const next = [...fillAnswers];
                                next[i] = option;
                                setFillAnswers(next);
                              }}
                              className="w-5 h-5 accent-primary"
                            />
                            <span className="text-lg font-semibold">{option}</span>
                          </label>
                        );
                      })}
                    </div>

                    {isSubmitted && !fillAnswers[i] && (
                      <div className="text-red-600 font-semibold">
                        Vui lòng chọn đáp án cho câu này.
                      </div>
                    )}

                    {isSubmitted && (
                      <div
                        className={`mt-2 font-display font-bold text-xl ${isCorrect ? "text-green-600" : "text-red-600"}`}
                      >
                        {isCorrect ? "✓ Chính xác!" : `Đáp án: ${q.a}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!isLocked && !isSubmitted && !showingPart2 && (
            <div className="mt-12 flex justify-center">
              <Button
                variant="accent"
                className="px-16 py-5 text-xl"
                onClick={() => setShowingPart2(true)}
              >
                Sang bài 2 →
              </Button>
            </div>
          )}
        </section>

        {(showingPart2 || isSubmitted) && (
          <section id="part2">
            <header className="flex items-center gap-6 mb-12">
              <Badge variant="accent" className="py-3 px-6 text-base font-bold">
                Bài 2: Dịch câu
              </Badge>
              <div className="flex-1 h-px bg-accent/20" />
            </header>
            {translationQuestions.length === 0 && (
              <div className="glass-card p-8 text-center text-text-secondary">
                Không có câu nào có bản dịch để làm bài tập này.
              </div>
            )}
            <div className="grid gap-12">
              {translationQuestions.map((q: TranslationQuestion, qi: number) => {
                const userAnswer = translationAnswers[qi];
                const isCorrect = isSubmitted && (
                  q.questionType === 'multiple-choice'
                    ? userAnswer === q.correctTranslation
                    : typeof userAnswer === 'string' && userAnswer.trim().toLowerCase() === q.correctTranslation.toLowerCase()
                );

                return (
                  <div
                    key={q.id}
                    className={`glass-card p-10 border-2 transition-all ${isSubmitted ? (isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-transparent bg-white shadow-xl"}`}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent">
                        {qi + 1}
                      </span>
                      <span className="text-sm font-bold text-accent uppercase tracking-wider">
                        {q.questionType === 'multiple-choice' ? 'Trắc nghiệm' : 'Điền từ'}
                      </span>
                    </div>
                    <div className="text-2xl font-medium mb-8 leading-relaxed italic text-text-primary">
                      {q.englishSentence}
                    </div>
                    {q.questionType === 'multiple-choice' && q.options && (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {q.options.map((opt: string, oi: number) => {
                          const isSelected = userAnswer === opt;
                          const isCorrectOption = isSubmitted && opt === q.correctTranslation;
                          const isWrongSelected = isSubmitted && isSelected && opt !== q.correctTranslation;

                          return (
                            <label
                              key={oi}
                              className={`flex items-center gap-6 p-6 border-2 rounded-3xl cursor-pointer transition-all ${isSubmitted ? (isCorrectOption ? "border-green-500 bg-green-100 text-green-900 font-bold scale-[1.02]" : isWrongSelected ? "border-red-500 bg-red-100 text-red-900" : "border-primary/5 bg-white") : isSelected ? "border-primary bg-primary/5 shadow-inner" : "border-primary/5 hover:border-primary/20 bg-white"}`}
                            >
                              <input
                                type="radio"
                                checked={isSelected}
                                disabled={isSubmitted}
                                onChange={() => {
                                  const next = [...translationAnswers];
                                  next[qi] = opt;
                                  setTranslationAnswers(next);
                                }}
                                className="w-6 h-6 accent-primary"
                              />
                              <span className="text-xl">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {q.questionType === 'fill-in' && (
                      <div className="mt-4">
                        <input
                          type="text"
                          value={typeof userAnswer === 'string' ? userAnswer : ''}
                          disabled={isSubmitted}
                          onChange={(e) => {
                            const next = [...translationAnswers];
                            next[qi] = e.target.value;
                            setTranslationAnswers(next);
                          }}
                          placeholder="Nhập bản dịch tiếng Việt..."
                          className="w-full p-4 text-xl border-2 border-primary/20 rounded-2xl focus:border-primary focus:outline-none transition-all disabled:bg-gray-50"
                        />
                      </div>
                    )}
                    {isSubmitted && (
                      <div className={`mt-8 pt-6 border-t border-primary/10 font-display font-bold text-xl ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                        {isCorrect ? "✓ Chính xác!" : `Đáp án đúng: ${q.correctTranslation}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <footer className="mt-24 pt-24 border-t border-primary/10 text-center">
        {isLocked ? (
          <div className="glass-card p-8 text-center text-text-secondary">
            Bạn cần học ít nhất 5 từ trong chủ đề này để làm bài kiểm tra.
          </div>
        ) : !isSubmitted ? (
          <Button
            variant="primary"
            className="px-24 py-6 text-3xl shadow-2xl"
            onClick={handleSubmit}
          >
            Nộp bài ngay 🚀
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <Badge
              variant="green"
              className="py-4 px-12 text-2xl animate-bounce"
            >
              KẾT QUẢ ĐÃ GHI NHẬN! 🏆
            </Badge>
            <Button
              variant="primary"
              className="px-12 py-5 text-xl"
              onClick={() => onFinish(0, 0)}
            >
              Hoàn thành chủ đề
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
};

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

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

const StudySession = ({
  topicId,
  studyWords,
  topicGroups,
  learningProgressState,
  onFinish,
  onAddXP,
  onStreakCheck,
  onAddToast,
  onWordsLearned,
  onRecordStudyHistory,
  initialMode,
}: any) => {
  const [tab, setTab] = useState<"flashcard" | "learn" | "minitest">(
    "flashcard",
  );
  const [learnStep, setLearnStep] = useState<1 | 2 | 3>(1);
  const [learnMode, setLearnMode] = useState<"smart" | "custom">("smart");
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [matchType, setMatchType] = useState<"word" | "ipa" | null>(null);
  const [ipaFallback, setIpaFallback] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewPage, setReviewPage] = useState(0);
  const [customNewPage, setCustomNewPage] = useState(0);
  const [customReviewPage, setCustomReviewPage] = useState(0);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [jumpSearch, setJumpSearch] = useState('');
  const [recentWordIds, setRecentWordIds] = useState<number[]>([]);
  const [showJumpList, setShowJumpList] = useState(false);

  const [aiResponses, setAiResponses] = useState<Record<number, string>>({});
  const [loadingAiIds, setLoadingAiIds] = useState<Set<number>>(new Set());

  const handleAskAi = async (word: any, e: any) => {
    e.stopPropagation();
    if (!word || loadingAiIds.has(word.id)) return;
    
    setLoadingAiIds(prev => new Set(prev).add(word.id));
    
    try {
        const formData = new FormData();
        formData.append('word', word.word);
        formData.append('context', word.meaning);

        const response = await fetch('/api/AI/Explain', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const htmlContent = await response.text();
            setAiResponses(prev => ({ ...prev, [word.id]: htmlContent }));
        } else {
            setAiResponses(prev => ({ ...prev, [word.id]: "<div class='text-red-500'>Có lỗi xảy ra khi gọi AI. Vui lòng thử lại.</div>" }));
        }
    } catch (error: any) {
        setAiResponses(prev => ({ ...prev, [word.id]: `<div class='text-red-500'>Lỗi kết nối mạng: ${error.message}</div>` }));
    } finally {
        setLoadingAiIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(word.id);
            return newSet;
        });
    }
  };

  const words = useMemo(
    () =>
      studyWords && studyWords.length > 0
        ? studyWords
        : mockData.vocabulary.filter((v: any) => v.topicId === topicId),
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

  const didApplyInitialMode = useRef(false);
  const jumpListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!didApplyInitialMode.current && initialMode === 'review' && reviewWords.length > 0) {
      didApplyInitialMode.current = true;
      setTab('learn');
      setSelectedWordIds(reviewWords.map((w: any) => w.id));
    }
  }, [initialMode, reviewWords]);

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
    () => selectedWords.filter((w: any) => w.transcription?.trim()),
    [selectedWords],
  );
  const selectedReviewCount = useMemo(
    () => selectedWords.filter((w: any) => learnedWordIdSet.has(w.id)).length,
    [selectedWords, learnedWordIdSet],
  );
  const selectedNewCount = selectedWords.length - selectedReviewCount;
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
  const CUSTOM_PAGE_SIZE = 10;
  const customNewTotalPages = Math.ceil(customNewWords.length / CUSTOM_PAGE_SIZE);
  const pagedCustomNewWords = customNewWords.slice(customNewPage * CUSTOM_PAGE_SIZE, (customNewPage + 1) * CUSTOM_PAGE_SIZE);
  const customReviewTotalPages = Math.ceil(customReviewWords.length / CUSTOM_PAGE_SIZE);
  const pagedCustomReviewWords = customReviewWords.slice(customReviewPage * CUSTOM_PAGE_SIZE, (customReviewPage + 1) * CUSTOM_PAGE_SIZE);
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

  // Avoid out-of-bounds when selection changes (prevents blank/crash).
  useEffect(() => {
    const max =
      (tab === "flashcard" ? words.length : selectedWords.length) - 1;
    if (max < 0) {
      if (currentIndex !== 0) setCurrentIndex(0);
      return;
    }
    if (currentIndex > max) {
      setCurrentIndex(max);
      setIsFlipped(false);
    }
  }, [tab, words.length, selectedWords.length, currentIndex]);

  // Track recently viewed flashcards for jump panel
  useEffect(() => {
    if (tab === 'flashcard' && words[currentIndex]) {
      const id = words[currentIndex].id;
      setRecentWordIds(prev => {
        const filtered = prev.filter(i => i !== id);
        return [id, ...filtered].slice(0, 6);
      });
    }
  }, [currentIndex, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close jump list on click outside
  useEffect(() => {
    if (!showJumpList) return;
    const handler = (e: MouseEvent) => {
      if (jumpListRef.current && !jumpListRef.current.contains(e.target as Node)) {
        setShowJumpList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showJumpList]);

  const addMoreNewWords = useCallback((count: number) => {
    setSelectedWordIds((prev) => {
      const remainingNewIds = newWords
        .map((w: any) => w.id)
        .filter((id: number) => !prev.includes(id));

      return [...prev, ...remainingNewIds.slice(0, count)];
    });
  }, [newWords]);

  const applySmartPreset = useCallback((count: number) => {
    const presetIds = initialMode === 'review'
      ? reviewWords.slice(0, count).map((w: any) => w.id)
      : newWords.slice(0, count).map((w: any) => w.id);
    setSelectedWordIds(presetIds);
  }, [reviewWords, newWords, initialMode]);

  const handleFinishMatching = async (
    correct: number,
    total: number,
    time: number,
  ) => {
    const gainedXp = correct * 5;

    if (topicId && selectedWordIds.length > 0) {
      await onWordsLearned(topicId, selectedWordIds);

      onRecordStudyHistory && onRecordStudyHistory(
        {
          topicId,
          topicTitle,
          xp: gainedXp,
          words: selectedWords.map((word: any) => ({
            id: word.id,
            word: word.word,
            meaning: word.meaning,
          })),
          timeSpentSeconds: time,
        }
      );
    }

    onAddXP(gainedXp);
    onStreakCheck();
    onAddToast(
      `Hoàn thành Matching trong ${time}s! +${gainedXp} XP`,
      "success",
    );
    setMatchType(null);
    setLearnStep(1);
  };

  if (words.length === 0)
    return (
      <div className="p-12 text-center text-text-muted">
        Không tìm thấy từ vựng cho chủ đề này.
      </div>
    );

  const SMART_PAGE_SIZE = 10;
  const smartDisplayWords = initialMode === 'review' ? reviewWords : newWords;
  const smartTotalPages = Math.ceil(smartDisplayWords.length / SMART_PAGE_SIZE);
  const pagedSmartWords = smartDisplayWords.slice(
    reviewPage * SMART_PAGE_SIZE,
    (reviewPage + 1) * SMART_PAGE_SIZE,
  );

  const filteredJumpWords = useMemo(() => {
    if (!jumpSearch.trim()) return words;
    const q = jumpSearch.toLowerCase();
    return words.filter((w: any) =>
      w.word?.toLowerCase().includes(q) || w.meaning?.toLowerCase().includes(q)
    );
  }, [jumpSearch, words]);

  const recentJumpWords = useMemo(() =>
    recentWordIds
      .map(id => { const idx = words.findIndex((w: any) => w.id === id); return idx >= 0 ? { idx, word: words[idx] } : null; })
      .filter((x): x is { idx: number; word: any } => x !== null)
  , [recentWordIds, words]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
        <button
          onClick={() => onFinish()}
          className="hover:text-primary transition-colors"
        >
          Learning
        </button>
        <ChevronRight size={14} />
        <button
          onClick={() => onFinish()}
          className="hover:text-primary transition-colors"
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
            <h1 className="text-5xl mb-2 font-display font-extrabold text-text-primary">
              {topicTitle}
            </h1>{" "}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="cyan" className="text-xs">
                🆕 {topicStats?.new ?? 0}
              </Badge>
              <Badge variant="purple" className="text-xs">
                🔔 {topicStats?.review ?? 0}
              </Badge>
              <Badge variant="green" className="text-xs font-bold">
                ✅ {topicStats?.learned ?? 0}
              </Badge>
              {initialMode === 'review' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple/20 border border-purple/50 text-[#4B1F8A] text-xs font-bold">
                  🔔 Chế độ ôn tập
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/50 backdrop-blur-md rounded-pill border-2 border-primary/10">
          {(["flashcard", "learn", "minitest"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className={`h-10 px-5 rounded-pill font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap flex-shrink-0 ${tab === t ? "bg-primary text-white shadow-md" : "text-text-muted hover:text-primary"}`}
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
            <div className="max-w-3xl mx-auto w-full">
            {/* ── Flex row: left arrow + bordered container + right arrow ── */}
            <div className="flex items-center gap-4 w-full">
              {/* Left arrow — outside border */}
              <button
                onClick={() => { setCurrentIndex((p) => Math.max(0, p - 1)); setIsFlipped(false); }}
                disabled={currentIndex === 0}
                className="w-11 h-11 rounded-full border-2 border-primary/20 bg-white/80 flex items-center justify-center hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0 font-bold text-lg shadow-sm"
              >
                ←
              </button>
            {/* ── Outer bordered container ─────────────────────────────── */}
            <div className="flex-1 border-2 border-primary/10 rounded-3xl overflow-visible bg-white/30">

            {/* Search + jump row */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-primary/10 bg-white/40 rounded-t-3xl">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Tìm từ vựng..."
                  value={jumpSearch}
                  onChange={e => { setJumpSearch(e.target.value); setShowJumpList(true); }}
                  onFocus={() => setShowJumpList(true)}
                  className="w-full pl-4 pr-9 py-2 text-sm rounded-xl border border-primary/20 bg-white/80 focus:border-primary/40 outline-none transition-all placeholder:text-text-muted cursor-text"
                />
                <ChevronLeft
                  size={15}
                  className="-rotate-90 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
              <div className="relative" ref={jumpListRef}>
                <button
                  onClick={() => setShowJumpList(p => !p)}
                  className="p-2 rounded-xl border border-primary/20 bg-white/80 hover:bg-primary/10 transition-colors cursor-pointer"
                  title="Danh sách từ"
                >
                  <List size={16} className="text-text-muted" />
                </button>
                {showJumpList && (
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white/95 backdrop-blur-xl border border-primary/15 shadow-2xl z-50 rounded-2xl overflow-hidden">
                    <div className="max-h-[320px] overflow-y-auto p-2 space-y-0.5">
                      {!jumpSearch && recentJumpWords.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-2 py-1.5">Gần đây</p>
                          {recentJumpWords.map(({ idx, word }) => (
                            <button key={`r-${word.id}`}
                              onClick={() => { setCurrentIndex(idx); setIsFlipped(false); setShowJumpList(false); }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${idx === currentIndex ? 'bg-primary/15 text-primary font-semibold' : 'hover:bg-primary/10 text-text-primary'}`}>
                              <div className="font-medium">{word.word}</div>
                              <div className="text-[11px] text-text-muted">{word.meaning}</div>
                            </button>
                          ))}
                          <div className="border-t border-primary/10 my-1" />
                        </>
                      )}
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-2 py-1.5">
                        {jumpSearch ? `Kết quả (${filteredJumpWords.length})` : 'Tất cả từ'}
                      </p>
                      {filteredJumpWords.map((w: any) => {
                        const idx = words.findIndex((x: any) => x.id === w.id);
                        return (
                          <button key={w.id}
                            onClick={() => { setCurrentIndex(idx); setIsFlipped(false); setShowJumpList(false); setJumpSearch(''); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${idx === currentIndex ? 'bg-primary/15 text-primary font-semibold' : 'hover:bg-primary/10 text-text-primary'}`}>
                            <div className="font-medium">{w.word}</div>
                            <div className="text-[11px] text-text-muted">{w.meaning}</div>
                          </button>
                        );
                      })}
                      {filteredJumpWords.length === 0 && (
                        <p className="text-sm text-text-muted text-center py-4">Không tìm thấy từ</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flashcard — full width inside border */}
            <div className="relative h-[480px] perspective-1000 mx-5 mb-5 mt-2">
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
                    <div className="absolute inset-0 backface-hidden glass-card flex flex-col items-center justify-center p-12 text-center h-full border-4 border-primary/20 bg-white">
                      <Badge variant="purple" className="mb-12 scale-125">
                        Thẻ từ vựng
                      </Badge>
                      <div className="text-7xl font-display font-extrabold mb-4 text-primary">
                        {words[currentIndex]?.word}
                      </div>
                      <div className="text-2xl text-text-muted font-mono bg-purple/5 px-6 py-2 rounded-xl mb-12">
                        {words[currentIndex]?.transcription}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          className="p-2 min-h-0 rounded-full"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            playPronunciationAudio(
                              words[currentIndex]?.audioUrl,
                              words[currentIndex]?.word,
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
                    <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-linear-to-br from-purple/10 via-pink/5 to-transparent border-4 border-purple/40 flex flex-col items-center justify-center p-8 text-center h-full overflow-y-auto">
                      <Badge variant="pink" className="mb-6 scale-125 flex-shrink-0">
                        Nghĩa
                      </Badge>
                      <div className="text-4xl font-bold mb-6 text-text-primary flex-shrink-0">
                        {words[currentIndex]?.meaning}
                      </div>
                      <div className="flex gap-2 mb-4 flex-shrink-0">
                        <Button
                          variant="ghost"
                          className="p-2 min-h-0 rounded-full"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            playPronunciationAudio(
                              words[currentIndex]?.exampleAudioUrl,
                              words[currentIndex]?.example,
                            );
                          }}
                        >
                          <Volume2 size={18} />
                        </Button>
                        <Button
                          variant="accent"
                          className="px-4 py-2 text-sm flex items-center gap-2"
                          onClick={(e: any) => handleAskAi(words[currentIndex], e)}
                          disabled={loadingAiIds.has(words[currentIndex]?.id)}
                        >
                          {loadingAiIds.has(words[currentIndex]?.id) ? (
                              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                              <Sparkles size={16} />
                          )}
                          Hỏi AI ✨
                        </Button>
                      </div>
                      <div className="bg-white/70 p-6 rounded-2xl border-2 border-purple/20 w-full shadow-inner flex-shrink-0">
                        <p className="italic font-serif text-lg leading-loose">"{words[currentIndex]?.example}"</p>
                        {words[currentIndex]?.translation && (
                          <p className="text-sm text-text-muted mt-3 italic">"{words[currentIndex].translation}"</p>
                        )}
                      </div>
                      {(loadingAiIds.has(words[currentIndex]?.id) || aiResponses[words[currentIndex]?.id]) && (
                          <div className="mt-4 p-4 bg-white/90 rounded-2xl border-2 border-cyan-500/30 w-full text-left overflow-y-auto" onClick={e => e.stopPropagation()}>
                              <h4 className="text-cyan-600 font-bold mb-2 flex items-center gap-2 text-sm"><Sparkles size={16}/> Giải thích từ AI</h4>
                              {loadingAiIds.has(words[currentIndex]?.id) ? (
                                  <div className="text-center text-cyan-500 py-4"><div className="inline-block w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"/></div>
                              ) : (
                                  <div className="text-sm prose prose-cyan max-w-none" dangerouslySetInnerHTML={{ __html: aiResponses[words[currentIndex]?.id] }} />
                              )}
                          </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>{/* end flashcard */}
            </div>{/* end outer bordered container */}
              {/* Right arrow — outside border */}
              <button
                onClick={() => { setCurrentIndex((p) => Math.min(words.length - 1, p + 1)); setIsFlipped(false); }}
                disabled={currentIndex === words.length - 1}
                className="w-11 h-11 rounded-full border-2 border-primary/20 bg-white/80 flex items-center justify-center hover:bg-primary/10 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0 font-bold text-lg shadow-sm"
              >
                →
              </button>
            </div>{/* end flex row */}

            {/* ── Dot progress ──────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-2 mt-4">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wide">
                {currentIndex + 1} / {words.length}
              </span>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {words.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => { setCurrentIndex(i); setIsFlipped(false); }}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${i === currentIndex ? "w-7 bg-primary" : "w-2.5 bg-primary/15 hover:bg-primary/30"}`}
                  />
                ))}
              </div>
            </div>

            </div>{/* end max-w-3xl */}
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
              <div className="flex items-start">
                {/* Step 1 */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${learnStep >= 1 ? "bg-primary border-primary text-white" : "bg-white border-primary/10 text-text-muted"}`}>
                    {learnStep > 1 ? <Check size={18} /> : 1}
                  </div>
                  <span className={`text-xs font-bold uppercase mt-3 ${learnStep >= 1 ? "text-primary" : "text-text-muted"}`}>Chọn từ</span>
                </div>

                {/* Segment 1: filled when step ≥ 2 */}
                <div className="flex-1 h-1 bg-primary/10 mx-3 mt-6 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: learnStep >= 2 ? '100%' : '0%' }}
                  />
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${learnStep >= 2 ? "bg-primary border-primary text-white" : "bg-white border-primary/10 text-text-muted"}`}>
                    {learnStep > 2 ? <Check size={18} /> : 2}
                  </div>
                  <span className={`text-xs font-bold uppercase mt-3 ${learnStep >= 2 ? "text-primary" : "text-text-muted"}`}>Xem qua</span>
                </div>

                {/* Segment 2: dynamic fill based on flashcard progress */}
                <div className="flex-1 h-1 bg-primary/10 mx-3 mt-6 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: learnStep >= 3
                        ? '100%'
                        : learnStep === 2
                          ? `${Math.round(((currentIndex + 1) / Math.max(selectedWords.length, 1)) * 100)}%`
                          : '0%',
                    }}
                  />
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 ${learnStep >= 3 ? "bg-primary border-primary text-white" : "bg-white border-primary/10 text-text-muted"}`}>
                    3
                  </div>
                  <span className={`text-xs font-bold uppercase mt-3 ${learnStep >= 3 ? "text-primary" : "text-text-muted"}`}>Luyện tập</span>
                </div>
              </div>
            </div>

            {learnStep === 1 && (
              <div className="max-w-4xl mx-auto">
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setLearnMode("smart")}
                    className={`text-left glass-card p-5 border-2 transition-all ${learnMode === "smart" ? "border-primary bg-primary/5" : "border-primary/10 hover:border-primary/30"}`}
                  >
                    <div className="font-bold text-lg mb-1">⚡ Smart</div>
                    <p className="text-sm text-text-muted">
                      Tự động chọn gói học nhanh 5/10/15 từ để bắt đầu ngay.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLearnMode("custom")}
                    className={`text-left glass-card p-5 border-2 transition-all ${learnMode === "custom" ? "border-primary bg-primary/5" : "border-primary/10 hover:border-primary/30"}`}
                  >
                    <div className="font-bold text-lg mb-1">🛠️ Tùy chỉnh</div>
                    <p className="text-sm text-text-muted">
                      Tự chọn từng từ vựng để học theo nhu cầu của học viên.
                    </p>
                  </button>
                </div>

                {learnMode === "custom" ? (
                  <div className="mb-16">
                    <div className="space-y-4">
                      {/* Action bar */}
                      <div className="border-t-2 border-primary/15 pt-5 mt-2">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">✦ Sẵn sàng học</span>
                        <div className="flex-1 h-px bg-primary/15" />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-bold">
                            Đã chọn: <span className="text-primary">{selectedNewCount} từ mới</span> + <span className="text-[#4B1F8A]">{selectedReviewCount} từ ôn</span>
                          </h3>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            disabled={selectedWordIds.length === 0}
                            onClick={() => { setLearnStep(2); setCurrentIndex(0); }}
                          >
                            Bắt đầu học →
                          </Button>
                          <Button variant="ghost" onClick={() => setSelectedWordIds([])}>
                            Bỏ chọn tất cả
                          </Button>
                        </div>
                      </div>
                      </div>

                      {/* Two sections side by side */}
                      <div className={`grid gap-8 ${initialMode !== 'review' ? 'lg:grid-cols-2' : ''}`}>
                        {/* New words section — hidden in review mode */}
                        {initialMode !== 'review' && (
                          <div className="space-y-3 lg:pr-4 lg:border-r lg:border-border">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold flex items-center gap-2">
                                🆕 Từ mới
                                <span className="text-sm font-normal text-text-muted">({customNewWords.length})</span>
                              </h4>
                              <button
                                className="text-xs text-primary hover:underline"
                                onClick={() => setSelectedWordIds((prev) => Array.from(new Set([...prev, ...customNewWords.map((w: any) => w.id)])))}
                              >
                                Chọn tất cả
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {pagedCustomNewWords.map((w: any) => {
                                const isSel = selectedWordIds.includes(w.id);
                                return (
                                  <div
                                    key={w.id}
                                    onClick={() => setSelectedWordIds((p) => isSel ? p.filter((id) => id !== w.id) : [...p, w.id])}
                                    className={`glass-card p-3 cursor-pointer border-2 transition-all overflow-hidden ${isSel ? "border-green-500 bg-green-50" : "border-transparent hover:border-green-300"}`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="text-lg font-bold">{w.word}</div>
                                      <Badge variant="green" className="text-[10px] flex-shrink-0">{w.cefr || "-"}</Badge>
                                    </div>
                                    <div className="text-xs text-text-muted font-mono mt-0.5">{w.transcription}</div>
                                  </div>
                                );
                              })}
                              {customNewWords.length === 0 && (
                                <div className="col-span-2 glass-card p-4 text-sm text-text-muted text-center">
                                  Không còn từ mới trong chủ đề này.
                                </div>
                              )}
                            </div>
                            {customNewTotalPages > 1 && (
                              <div className="flex items-center justify-center gap-2 pt-1">
                                <button
                                  onClick={() => setCustomNewPage((p) => Math.max(0, p - 1))}
                                  disabled={customNewPage === 0}
                                  className="px-3 py-1 rounded-lg border border-primary/20 text-sm disabled:opacity-30 hover:bg-primary/5 transition-colors"
                                >
                                  ← Trước
                                </button>
                                <span className="text-xs text-text-muted">{customNewPage + 1} / {customNewTotalPages}</span>
                                <button
                                  onClick={() => setCustomNewPage((p) => Math.min(customNewTotalPages - 1, p + 1))}
                                  disabled={customNewPage === customNewTotalPages - 1}
                                  className="px-3 py-1 rounded-lg border border-primary/20 text-sm disabled:opacity-30 hover:bg-primary/5 transition-colors"
                                >
                                  Tiếp →
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review words section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold flex items-center gap-2">
                              🔔 Ôn tập
                              <span className="text-sm font-normal text-text-muted">({customReviewWords.length})</span>
                            </h4>
                            <button
                              className="text-xs text-[#4B1F8A] hover:underline"
                              onClick={() => setSelectedWordIds((prev) => Array.from(new Set([...prev, ...customReviewWords.map((w: any) => w.id)])))}
                            >
                              Chọn tất cả
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {pagedCustomReviewWords.map((w: any) => {
                              const isSel = selectedWordIds.includes(w.id);
                              return (
                                <div
                                  key={w.id}
                                  onClick={() => setSelectedWordIds((p) => isSel ? p.filter((id) => id !== w.id) : [...p, w.id])}
                                  className={`glass-card p-3 cursor-pointer border-2 transition-all overflow-hidden ${isSel ? "border-purple/50 bg-purple/10" : "border-transparent hover:border-purple/20"}`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="text-lg font-bold">{w.word}</div>
                                    <Badge variant="purple" className="text-[10px] flex-shrink-0">{w.cefr || "-"}</Badge>
                                  </div>
                                  <div className="text-xs text-text-muted font-mono mt-0.5">{w.transcription}</div>
                                </div>
                              );
                            })}
                            {customReviewWords.length === 0 && (
                              <div className="col-span-2 glass-card p-4 text-sm text-text-muted text-center">
                                Chưa có từ đã học để ôn tập.
                              </div>
                            )}
                          </div>
                          {customReviewTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-1">
                              <button
                                onClick={() => setCustomReviewPage((p) => Math.max(0, p - 1))}
                                disabled={customReviewPage === 0}
                                className="px-3 py-1 rounded-lg border border-purple/30 text-sm disabled:opacity-30 hover:bg-purple/5 transition-colors"
                              >
                                ← Trước
                              </button>
                              <span className="text-xs text-text-muted">{customReviewPage + 1} / {customReviewTotalPages}</span>
                              <button
                                onClick={() => setCustomReviewPage((p) => Math.min(customReviewTotalPages - 1, p + 1))}
                                disabled={customReviewPage === customReviewTotalPages - 1}
                                className="px-3 py-1 rounded-lg border border-purple/30 text-sm disabled:opacity-30 hover:bg-purple/5 transition-colors"
                              >
                                Tiếp →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="grid lg:grid-cols-[1fr_320px] gap-6 mb-16 items-start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-lg">
                          {initialMode === 'review' ? '🔔 Từ cần ôn tập' : '🆕 Từ mới'}
                        </h4>
                        <span className="text-sm text-text-muted">
                          {smartDisplayWords.length} từ
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        {pagedSmartWords.map((w: any) => {
                          const isSel = selectedWordIds.includes(w.id);
                          const isReview = initialMode === 'review';
                          return (
                            <div
                              key={w.id}
                              className={`glass-card p-4 transition-all border-2 ${
                                isSel
                                  ? isReview
                                    ? "border-purple/50 bg-purple/10"
                                    : "border-green-400 bg-green-50"
                                  : "border-transparent opacity-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-lg font-bold">{w.word}</div>
                                <Badge
                                  variant={isReview ? "purple" : "cyan"}
                                  className="text-[10px] flex-shrink-0"
                                >
                                  {w.cefr || "-"}
                                </Badge>
                              </div>
                              <div className="text-xs text-text-muted font-mono mt-0.5">{w.transcription}</div>
                            </div>
                          );
                        })}
                        {smartDisplayWords.length === 0 && (
                          <div className="col-span-2 glass-card p-6 text-sm text-text-muted text-center">
                            {initialMode === 'review' ? 'Hiện chưa có từ đến hạn ôn.' : 'Không còn từ mới trong chủ đề này.'}
                          </div>
                        )}
                      </div>
                      {smartTotalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => setReviewPage((p) => Math.max(0, p - 1))}
                            disabled={reviewPage === 0}
                            className="px-3 py-1 rounded-lg border border-primary/30 text-sm disabled:opacity-30 hover:bg-primary/5 transition-colors"
                          >
                            ← Trước
                          </button>
                          <span className="text-xs text-text-muted">{reviewPage + 1} / {smartTotalPages}</span>
                          <button
                            onClick={() => setReviewPage((p) => Math.min(smartTotalPages - 1, p + 1))}
                            disabled={reviewPage === smartTotalPages - 1}
                            className="px-3 py-1 rounded-lg border border-primary/30 text-sm disabled:opacity-30 hover:bg-primary/5 transition-colors"
                          >
                            Tiếp →
                          </button>
                        </div>
                      )}

                    </div>

                    <aside className="sticky top-[96px] rounded-2xl border-2 border-primary/25 overflow-hidden shadow-lg">
                      <div className="bg-primary/8 px-5 py-3 border-b-2 border-primary/15 flex items-center gap-2">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">✦ Sẵn sàng học</span>
                      </div>
                      <div className="p-5 space-y-4">
                      <div className="font-bold text-xl text-primary">
                        {selectedWordIds.length} <span className="text-text-muted font-normal text-base">/ {smartDisplayWords.length} từ đã chọn</span>
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
                        Bắt đầu học →
                      </Button>

                      <div className="border-t border-primary/15" />

                      <div className="space-y-2">
                        {initialMode === 'review' ? (
                          <>
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === 5 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { applySmartPreset(5); setActivePreset(5); }} disabled={reviewWords.length === 0}>
                              ⚡ Nhanh 5 phút (5 từ)
                            </Button>
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === 10 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { applySmartPreset(10); setActivePreset(10); }} disabled={reviewWords.length === 0}>
                              📘 Tiêu chuẩn (10 từ)
                            </Button>
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === 15 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { applySmartPreset(15); setActivePreset(15); }} disabled={reviewWords.length === 0}>
                              🚀 Tăng tốc (15 từ)
                            </Button>
                            <div className="border-t border-primary/15" />
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === -1 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { setSelectedWordIds(reviewWords.map((w: any) => w.id)); setActivePreset(-1); }}>
                              🔥 Full Review ({reviewWords.length} từ)
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === 5 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { applySmartPreset(5); setActivePreset(5); }}>
                              ⚡ Nhanh 5 phút (5 từ)
                            </Button>
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === 10 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { applySmartPreset(10); setActivePreset(10); }}>
                              📘 Tiêu chuẩn (10 từ)
                            </Button>
                            <Button variant="ghost" className={`w-full justify-start ${activePreset === 15 ? "bg-primary/10 border border-primary/30 text-primary font-bold" : ""}`} onClick={() => { applySmartPreset(15); setActivePreset(15); }}>
                              🚀 Tăng tốc (15 từ)
                            </Button>
                            <div className="border-t border-primary/15" />
                          </>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => setSelectedWordIds([])}
                      >
                        Bỏ chọn tất cả
                      </Button>
                      </div>
                    </aside>
                  </div>
                )}
              </div>
            )}

            {learnStep === 2 && (
              <div className="max-w-2xl mx-auto">
                {selectedWords.length === 0 ? (
                  <div className="p-8 text-center text-text-muted">
                    Bạn chưa chọn từ nào. Hãy quay lại bước 1 để chọn từ.
                  </div>
                ) : (
                <>
                <div className="relative h-[480px] perspective-1000 mb-12">
                  <motion.div
                    onClick={() => setIsFlipped(!isFlipped)}
                    key={`step2-${currentIndex}`}
                    initial={{ scale: 0.9 }}
                    animate={{ rotateY: isFlipped ? 180 : 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-full h-full relative preserve-3d cursor-pointer"
                  >
                    <div className="absolute inset-0 backface-hidden glass-card flex flex-col items-center justify-center p-12 text-center h-full border-4 border-primary/20 bg-white">
                      <Badge variant="purple" className="mb-12 scale-125">
                        Thẻ từ vựng
                      </Badge>
                      <div className="text-7xl font-display font-extrabold mb-4 text-primary">
                        {selectedWords[currentIndex]?.word}
                      </div>
                      <div className="text-2xl text-text-muted font-mono bg-purple/5 px-6 py-2 rounded-xl mb-12">
                        {selectedWords[currentIndex]?.transcription}
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          className="p-2 min-h-0 rounded-full"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            playPronunciationAudio(
                              selectedWords[currentIndex]?.audioUrl,
                              selectedWords[currentIndex]?.word,
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
                    <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-linear-to-br from-purple/10 via-pink/5 to-transparent border-4 border-purple/40 flex flex-col items-center justify-center p-8 text-center h-full overflow-y-auto">
                      <Badge variant="pink" className="mb-6 scale-125 flex-shrink-0">
                        Nghĩa
                      </Badge>
                      <div className="text-4xl font-bold mb-6 text-text-primary flex-shrink-0">
                        {selectedWords[currentIndex]?.meaning}
                      </div>
                      <div className="flex gap-2 mb-4 flex-shrink-0">
                        <Button
                          variant="ghost"
                          className="p-2 min-h-0 rounded-full"
                          onClick={(e: any) => {
                            e.stopPropagation();
                            playPronunciationAudio(
                              selectedWords[currentIndex]?.exampleAudioUrl,
                              selectedWords[currentIndex]?.example,
                            );
                          }}
                        >
                          <Volume2 size={18} />
                        </Button>
                        <Button
                          variant="accent"
                          className="px-4 py-2 text-sm flex items-center gap-2"
                          onClick={(e: any) => handleAskAi(selectedWords[currentIndex], e)}
                          disabled={loadingAiIds.has(selectedWords[currentIndex]?.id)}
                        >
                          {loadingAiIds.has(selectedWords[currentIndex]?.id) ? (
                              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          ) : (
                              <Sparkles size={16} />
                          )}
                          Hỏi AI ✨
                        </Button>
                      </div>
                      <div className="bg-white/70 p-6 rounded-2xl border-2 border-purple/20 w-full shadow-inner flex-shrink-0">
                        <p className="italic font-serif text-lg leading-loose">"{selectedWords[currentIndex]?.example}"</p>
                        {selectedWords[currentIndex]?.translation && (
                          <p className="text-sm text-text-muted mt-3 italic">"{selectedWords[currentIndex].translation}"</p>
                        )}
                      </div>
                      {(loadingAiIds.has(selectedWords[currentIndex]?.id) || aiResponses[selectedWords[currentIndex]?.id]) && (
                          <div className="mt-4 p-4 bg-white/90 rounded-2xl border-2 border-cyan-500/30 w-full text-left overflow-y-auto" onClick={e => e.stopPropagation()}>
                              <h4 className="text-cyan-600 font-bold mb-2 flex items-center gap-2 text-sm"><Sparkles size={16}/> Giải thích từ AI</h4>
                              {loadingAiIds.has(selectedWords[currentIndex]?.id) ? (
                                  <div className="text-center text-cyan-500 py-4"><div className="inline-block w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"/></div>
                              ) : (
                                  <div className="text-sm prose prose-cyan max-w-none" dangerouslySetInnerHTML={{ __html: aiResponses[selectedWords[currentIndex]?.id] }} />
                              )}
                          </div>
                      )}
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
                      }}
                    >
                      Vào luyện tập →
                    </Button>
                  )}
                </div>
                </>
                )}
              </div>
            )}

            {learnStep === 3 && (
              <div className="max-w-4xl mx-auto text-center">
                {!matchType ? (
                  <div className="py-12">
                    <h3 className="text-3xl font-bold mb-8">
                      Chọn kiểu luyện tập
                    </h3>
                    {ipaFallback && (
                      <div className="mb-6 mx-auto max-w-md px-4 py-3 rounded-2xl bg-orange-50 border border-orange-200 text-orange-700 text-sm">
                        Chưa đủ dữ liệu IPA — đã chuyển sang chế độ Từ ↔ Nghĩa.
                      </div>
                    )}
                    <div className="flex justify-center gap-6">
                      <Button
                        variant="primary"
                        className="px-10 py-5 text-lg"
                        onClick={() => { setIpaFallback(false); setMatchType("word"); }}
                      >
                        Từ ↔ Nghĩa
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-10 py-5 text-lg"
                        onClick={() => {
                          if (ipaValidWords.length < 3) {
                            setIpaFallback(true);
                            setMatchType("word");
                          } else {
                            setIpaFallback(false);
                            setMatchType("ipa");
                          }
                        }}
                      >
                        IPA ↔ Nghĩa
                        {ipaValidWords.length < 3 && (
                          <span className="ml-2 text-xs opacity-60">({ipaValidWords.length} từ)</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MatchingGame
                    words={matchType === 'ipa' ? ipaValidWords : selectedWords}
                    type={matchType}
                    onFinish={handleFinishMatching}
                  />
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
            {learningProgressState === null ? (
              <div className="flex items-center justify-center py-24 text-text-muted text-lg">
                Đang tải tiến độ học...
              </div>
            ) : (
              <Minitest
                topicId={topicId}
                sessionWords={learnedWordsForMinitest}
                topicWords={words}
                onFinish={onFinish}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- APP ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [learningProgressState, setLearningProgressState] =
    useState<LearningProgressState | null>(null);
  const { toasts, addToast, removeToast } = useToasts();
  const { gameData, setGameData, xpFloats, addXP, triggerStreakCheck } =
    useGameProgress(addToast);

  const syncUserGameData = useCallback(
    (user: AuthenticatedUser | null) => {
      setCurrentUser(user);
      setGameData((prev) => ({
        ...prev,
        currentUser: user
          ? loadCurrentUserGameData(user.userId)
          : { ...EMPTY_CURRENT_USER_GAME_DATA },
      }));
    },
    [setGameData],
  );

    const {
        isLoading,
        currentPage,
        setCurrentPage,
        selectedWord,
        topicFilters,
        studyTopicId,
        studyMode,
        studyWords,
        testResult,
    handleStartStudy,
    handleSelectWord,
    handleCloseWordDetail,
    handleFinishStudy,
  } = useAppBootstrap({ addToast, syncUserGameData });

    const learningTopicGroups = useMemo(
        () =>
            buildLearningTopicGroups(
                topicFilters,
                learningProgressState,
            ),
        [topicFilters, learningProgressState],
    );

  const totalReviewCount = useMemo(() => {
    if (!currentUser) return 0;
    return learningTopicGroups.reduce(
      (sum: number, cat: any) => sum + cat.topics.reduce((s: number, t: any) => s + (t.stats?.review || 0), 0), 0
    );
  }, [learningTopicGroups, currentUser]);

    const learnedWordIds = useMemo(
        () => Array.isArray(learningProgressState?.topics)
            ? Array.from(
                new Set(
                    learningProgressState.topics
                        .flatMap((topic: any) => Array.isArray(topic.learnedWordIds) ? topic.learnedWordIds : [])
                        .filter((wordId: any) => Number.isFinite(wordId) && wordId > 0)
                )
            )
            : [],
        [learningProgressState?.topics]
    );

  const refreshLearningProgress = useCallback(async () => {
    if (!currentUser?.userId) {
      setLearningProgressState(null);
      return;
    }

    try {
      const nextState = await learningProgressApi.getState();
      setLearningProgressState(nextState);
    } catch {
      setLearningProgressState(null);
    }
  }, [currentUser?.userId]);

  const handleWordsLearned = useCallback(
    async (topicId: number, wordIds: number[]) => {
      if (!currentUser?.userId || topicId <= 0 || wordIds.length === 0) {
        return;
      }

      try {
        const nextState = await learningProgressApi.markWordsLearned(
          topicId,
          wordIds,
        );
        setLearningProgressState(nextState);
      } catch {
        addToast("Không thể cập nhật tiến độ học lúc này.", "info");
      }
    },
    [currentUser?.userId, addToast],
  );

  const handleRecordStudyHistory = useCallback(
    (sessionInput: StudySessionRecordInput) => {
      if (!sessionInput || !Array.isArray(sessionInput.words) || sessionInput.words.length === 0) {
        return;
      }

      const today = getTodayStudyDate();

      setGameData((prev) => ({
        ...prev,
        currentUser: {
          ...prev.currentUser,
          studyHistory: appendStudyDate(prev.currentUser.studyHistory, today),
          studyHistoryDetails: appendStudySessionDetail(
            prev.currentUser.studyHistoryDetails,
            today,
            sessionInput,
          ),
        },
      }));
    },
    [setGameData],
  );

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      syncUserGameData(null);
      setCurrentPage("home");
      addToast("Đã đăng xuất.");
    }
  };

  const handleUserUpdated = useCallback((updatedUser: AuthenticatedUser) => {
    setCurrentUser((prev) =>
      prev ? { ...prev, ...updatedUser } : updatedUser,
    );
  }, []);

  useEffect(() => {
    if (!currentUser?.userId) {
      return;
    }

    saveCurrentUserGameData(currentUser.userId, gameData.currentUser);
  }, [currentUser?.userId, gameData.currentUser]);

  useEffect(() => {
    void refreshLearningProgress();
  }, [refreshLearningProgress]);

  return (
    <div className="min-h-screen bg-bg-light text-text-primary">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-[#1A0A2E] flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.1 }}
              transition={{
                repeat: Infinity,
                duration: 1,
                repeatType: "reverse",
              }}
            >
              <Logo size={100} />
            </motion.div>
            <div className="font-display font-bold text-2xl text-cyan tracking-wider">
              VocabLearning
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {['auth', 'register'].includes(currentPage) ? (
        <AuthNavbar onNavigate={setCurrentPage} />
      ) : (
        <Navbar
          activePage={currentPage}
          onNavigate={setCurrentPage}
          currentUser={currentUser}
          gameData={gameData.currentUser}
          onLogout={handleLogout}
          onStreakClick={() => setShowStreakModal(true)}
          reviewCount={totalReviewCount}
        />
      )}

      <main className={['auth', 'register'].includes(currentPage) ? '' : 'pb-24'}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <AppRoutes
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              handleSelectWord={handleSelectWord}
              topicFilters={topicFilters}
              selectedWord={selectedWord}
              handleCloseWordDetail={handleCloseWordDetail}
              syncUserGameData={syncUserGameData}
              addToast={addToast}
              handleStartStudy={handleStartStudy}
              currentUser={currentUser}
              gameData={gameData}
              learningTopicGroups={learningTopicGroups}
              learningProgressState={learningProgressState}
              studyTopicId={studyTopicId}
              studyMode={studyMode}
              studyWords={studyWords}
              handleFinishStudy={handleFinishStudy}
              addXP={addXP}
              triggerStreakCheck={triggerStreakCheck}
              handleWordsLearned={handleWordsLearned}
              testResult={testResult}
              handleLogout={handleLogout}
              onOpenStreak={() => setShowStreakModal(true)}
              onUserUpdated={handleUserUpdated}
              learnedWordIds={learnedWordIds}
              LearningTopicsComponent={LearningTopics}
              StudySessionComponent={StudySession}
              onRecordStudyHistory={handleRecordStudyHistory}
            />
          </motion.div>
        </AnimatePresence>

        {!currentUser && currentPage === "home" && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl bg-white/80 backdrop-blur-xl border-2 border-primary/30 p-6 rounded-card shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl shadow-lg">
                🎁
              </div>
              <div>
                <h4 className="font-bold text-xl mb-1 text-text-primary">
                  Đăng ký để lưu tiến độ!
                </h4>
                <p className="text-sm text-text-muted">
                  Nhận ngay +100 XP thưởng và mở khóa Streak 🔥
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              className="px-8"
              onClick={() => setCurrentPage("auth")}
            >
              Tham gia Ngay <ChevronRight size={18} />
            </Button>
          </motion.div>
        )}
      </main>

      <div className="toast-container fixed top-24 right-6 z-[500] pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showStreakModal && (
          <StreakModal
            isOpen={showStreakModal}
            onClose={() => setShowStreakModal(false)}
            gameData={gameData}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {xpFloats.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -100 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 z-[600] pointer-events-none font-display font-extrabold text-primary text-2xl drop-shadow-md"
          >
            +{f.amount} XP
          </motion.div>
        ))}
      </AnimatePresence>

      {!['auth', 'register'].includes(currentPage) && <Footer />}
    </div>
  );
}

