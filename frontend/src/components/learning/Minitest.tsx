import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Badge, Button } from "../ui";
import { buildMinitestFillQuestions } from "../../utils/minitestQuestions";
import { buildTranslationQuestions, type TranslationQuestion } from "../../utils/translationQuestions";

type MinitestProps = {
  topicId: number;
  learnedWords: any[];
  topicWords: any[];
  onFinish: (score: number, total: number, detail?: any) => void;
};

export const Minitest = ({ topicId: _topicId, learnedWords, topicWords, onFinish }: MinitestProps) => {
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [translationAnswers, setTranslationAnswers] = useState<(number | string | null)[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showingPart2, setShowingPart2] = useState(false);

  const fillQuestions = useMemo(() => {
    return buildMinitestFillQuestions(
      Array.isArray(learnedWords) ? learnedWords : [],
      Array.isArray(topicWords) ? topicWords : [],
      5,
    );
  }, [learnedWords, topicWords]);

  const translationQuestions = useMemo(() => {
    const wordsWithTranslation = (Array.isArray(learnedWords) ? learnedWords : [])
      .filter((w) => w && w.example && w.translation);
    return buildTranslationQuestions(wordsWithTranslation, wordsWithTranslation, 4);
  }, [learnedWords]);

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
      if (translationQuestions[i].questionType === "multiple-choice") {
        if (ans === translationQuestions[i].correctTranslation) {
          sTranslation++;
        }
      } else {
        if (
          typeof ans === "string" &&
          ans.trim().toLowerCase() === translationQuestions[i].correctTranslation.toLowerCase()
        ) {
          sTranslation++;
        }
      }
    });

    const bonus = sTranslation === translationQuestions.length && translationQuestions.length > 0 ? 50 : 0;

    if (bonus > 0) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    const translationReview = translationQuestions.map((q: TranslationQuestion, index: number) => {
      const answer = translationAnswers[index];
      const isCorrect =
        q.questionType === "multiple-choice"
          ? answer === q.correctTranslation
          : typeof answer === "string" &&
            answer.trim().toLowerCase() === q.correctTranslation.toLowerCase();

      return {
        englishSentence: q.englishSentence,
        correctTranslation: q.correctTranslation,
        userAnswer: typeof answer === "string" ? answer : "",
        isCorrect,
      };
    });

    onFinish(sFill + sTranslation, totalQuestions, {
      fill: sFill,
      translation: sTranslation,
      bonus,
      review: translationReview,
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
                    {q.promptType === "example" ? q.q : `Nghĩa: ${q.q}`}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {q.options.map((option: string, optionIndex: number) => {
                        const isSelected = fillAnswers[i] === option;
                        const isCorrectOption =
                          isSubmitted && option.toLowerCase() === q.a.toLowerCase();
                        const isWrongSelected =
                          isSubmitted && isSelected && option.toLowerCase() !== q.a.toLowerCase();

                        return (
                          <label
                            key={`${q.id}-${optionIndex}`}
                            className={`flex items-center gap-4 p-5 border-2 rounded-2xl cursor-pointer transition-all ${
                              isSubmitted
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
                              className="w-5 h-5 accent-primary shrink-0"
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
          {!isSubmitted && !showingPart2 && (
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
                const isCorrect =
                  isSubmitted &&
                  (q.questionType === "multiple-choice"
                    ? userAnswer === q.correctTranslation
                    : typeof userAnswer === "string" &&
                      userAnswer.trim().toLowerCase() === q.correctTranslation.toLowerCase());

                return (
                  <div
                    key={q.id}
                    className={`glass-card p-10 border-2 transition-all ${
                      isSubmitted
                        ? isCorrect
                          ? "border-green-500 bg-green-50"
                          : "border-red-500 bg-red-50"
                        : "border-transparent bg-white shadow-xl"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <span className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center font-bold text-accent">
                        {qi + 1}
                      </span>
                      <span className="text-sm font-bold text-accent uppercase tracking-wider">
                        {q.questionType === "multiple-choice" ? "Trắc nghiệm" : "Điền từ"}
                      </span>
                    </div>
                    <div className="text-2xl font-medium mb-8 leading-relaxed italic text-text-primary">
                      {q.englishSentence}
                    </div>
                    {q.questionType === "multiple-choice" && q.options && (
                      <div className="grid sm:grid-cols-2 gap-6">
                        {q.options.map((opt: string, oi: number) => {
                          const isSelected = userAnswer === opt;
                          const isCorrectOption = isSubmitted && opt === q.correctTranslation;
                          const isWrongSelected =
                            isSubmitted && isSelected && opt !== q.correctTranslation;

                          return (
                            <label
                              key={oi}
                              className={`flex items-center gap-6 p-6 border-2 rounded-3xl cursor-pointer transition-all ${
                                isSubmitted
                                  ? isCorrectOption
                                    ? "border-green-500 bg-green-100 text-green-900 font-bold scale-[1.02]"
                                    : isWrongSelected
                                    ? "border-red-500 bg-red-100 text-red-900"
                                    : "border-primary/5 bg-white"
                                  : isSelected
                                  ? "border-primary bg-primary/5 shadow-inner"
                                  : "border-primary/5 hover:border-primary/20 bg-white"
                              }`}
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
                                className="w-6 h-6 accent-primary shrink-0"
                              />
                              <span className="text-xl">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {q.questionType === "fill-in" && (
                      <div className="mt-4">
                        <input
                          type="text"
                          value={typeof userAnswer === "string" ? userAnswer : ""}
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
                      <div
                        className={`mt-8 pt-6 border-t border-primary/10 font-display font-bold text-xl ${
                          isCorrect ? "text-green-600" : "text-red-600"
                        }`}
                      >
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
        {!isSubmitted ? (
          <Button
            variant="primary"
            className="px-24 py-6 text-3xl shadow-2xl"
            onClick={handleSubmit}
          >
            Nộp bài ngay 🚀
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <Badge variant="green" className="py-4 px-12 text-2xl animate-bounce">
              KẾT QUẢ ĐÃ GHI NHẬN! 🏆
            </Badge>
            <Button
              variant="primary"
              className="px-12 py-5 text-xl"
              onClick={() =>
                onFinish(
                  fillAnswers.filter((a, i) => a.trim().toLowerCase() === fillQuestions[i]?.a.toLowerCase()).length +
                    translationAnswers.filter((ans, i) =>
                      translationQuestions[i]?.questionType === "multiple-choice"
                        ? ans === translationQuestions[i]?.correctTranslation
                        : typeof ans === "string" &&
                          ans.trim().toLowerCase() === translationQuestions[i]?.correctTranslation.toLowerCase()
                    ).length,
                  totalQuestions
                )
              }
            >
              Hoàn thành chủ đề
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
};
