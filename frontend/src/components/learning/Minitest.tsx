import { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import { Button } from "../ui";
import { buildMinitestFillQuestions } from "../../utils/minitestQuestions";
import { buildTranslationQuestions, type TranslationQuestion } from "../../utils/translationQuestions";

type MinitestProps = {
  topicId: number;
  learnedWords: any[];
  topicWords: any[];
  onFinish: (score: number, total: number, detail?: any) => void;
  hideProgressCard?: boolean;
  onProgressChange?: (answered: number, total: number) => void;
};

// Sentence-arrangement comparison: trim, lowercase, drop simple punctuation,
// collapse repeated spaces. Direction: English prompt -> arrange Vietnamese.
const normalizeSentence = (value: string): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'’“”…()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const Minitest = ({ topicId: _topicId, learnedWords, topicWords, onFinish, hideProgressCard = false, onProgressChange }: MinitestProps) => {
  const [activeSection, setActiveSection] = useState<1 | 2>(1);
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  // Per question id -> ordered list of word-bank slot indices the user picked.
  const [arranged, setArranged] = useState<Record<number, number[]>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 10 questions total: Bài 1 = first 5 words, Bài 2 = up to 5 (prefer the other
  // words so vocab isn't repeated; fall back to Bài-1 words only if needed).
  const fillWords = useMemo(
    () => (Array.isArray(learnedWords) ? learnedWords : []).slice(0, 5),
    [learnedWords],
  );
  const arrangementWords = useMemo(() => {
    const all = Array.isArray(learnedWords) ? learnedWords : [];
    const fillIds = new Set(fillWords.map((w: any) => w.id));
    const eligible = all.filter((w: any) => w && w.example && w.translation);
    const preferred = eligible.filter((w: any) => !fillIds.has(w.id));
    const fallback = eligible.filter((w: any) => fillIds.has(w.id));
    return [...preferred, ...fallback].slice(0, 5);
  }, [learnedWords, fillWords]);

  const fillQuestions = useMemo(
    () => buildMinitestFillQuestions(fillWords, Array.isArray(topicWords) ? topicWords : [], 5),
    [fillWords, topicWords],
  );

  const translationQuestions = useMemo(
    () => buildTranslationQuestions(arrangementWords, [], 5),
    [arrangementWords],
  );

  // Word bank per question: split the target answer into word tokens and shuffle
  // once (stable until the question set changes). Slot index = identity, so
  // duplicate words are still individually removable.
  const tokenBanks = useMemo(() => {
    const map: Record<number, string[]> = {};
    translationQuestions.forEach((q) => {
      map[q.id] = shuffle(q.answer.split(/\s+/).filter(Boolean));
    });
    return map;
  }, [translationQuestions]);

  useEffect(() => {
    setFillAnswers(new Array(fillQuestions.length).fill(""));
    setArranged({});
    setIsSubmitted(false);
    setActiveSection(1);
  }, [fillQuestions, translationQuestions]);

  const arrangedText = (q: TranslationQuestion) =>
    (arranged[q.id] ?? []).map((slot) => tokenBanks[q.id]?.[slot] ?? "").join(" ");
  const isArrangementCorrect = (q: TranslationQuestion) =>
    normalizeSentence(arrangedText(q)) === normalizeSentence(q.answer);

  const answeredCount =
    fillAnswers.filter((a) => a !== "").length +
    translationQuestions.filter((q) => (arranged[q.id] ?? []).length > 0).length;
  const totalQuestions = fillQuestions.length + translationQuestions.length;

  // Report live progress so the fullscreen top bar can show it.
  useEffect(() => {
    onProgressChange?.(answeredCount, totalQuestions);
  }, [answeredCount, totalQuestions, onProgressChange]);

  const setArr = (qid: number, fn: (prev: number[]) => number[]) =>
    setArranged((prev) => ({ ...prev, [qid]: fn(prev[qid] ?? []) }));
  const addToken = (qid: number, slot: number) => setArr(qid, (a) => [...a, slot]);
  const removeAt = (qid: number, pos: number) => setArr(qid, (a) => a.filter((_, i) => i !== pos));
  const undo = (qid: number) => setArr(qid, (a) => a.slice(0, -1));
  const clearAnswer = (qid: number) => setArr(qid, () => []);

  const handleSubmit = () => {
    setIsSubmitted(true);

    let sFill = 0;
    fillAnswers.forEach((ans, i) => {
      if (ans.trim().toLowerCase() === fillQuestions[i].a.toLowerCase()) sFill++;
    });

    let sTranslation = 0;
    translationQuestions.forEach((q) => {
      if (isArrangementCorrect(q)) sTranslation++;
    });

    const bonus = sTranslation === translationQuestions.length && translationQuestions.length > 0 ? 50 : 0;
    if (bonus > 0) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }

    const review = translationQuestions.map((q) => ({
      englishSentence: q.prompt,
      correctTranslation: q.answer,
      userAnswer: arrangedText(q),
      isCorrect: isArrangementCorrect(q),
    }));

    onFinish(sFill + sTranslation, totalQuestions, {
      fill: sFill,
      translation: sTranslation,
      bonus,
      review,
    });
  };

  const stepPill = (n: 1 | 2, label: string, done: boolean) => {
    const active = activeSection === n;
    return (
      <div
        className={`flex-1 rounded-xl border px-3 py-2 text-center text-xs font-bold sm:text-sm ${
          active
            ? "border-primary bg-primary/10 text-primary"
            : done
              ? "border-success-color/40 bg-success-color/10 text-success-color"
              : "border-border bg-surface text-text-muted"
        }`}
      >
        {done && !active ? "✓ " : ""}
        {label}
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-primary/15 bg-surface/95 p-5 shadow-[0_18px_50px_var(--shadow-color)] backdrop-blur-sm sm:p-7">
      {/* Step indicator */}
      <div className="mb-6 flex gap-2">
        {stepPill(1, "Bài 1: Chọn từ đúng", activeSection > 1)}
        {stepPill(2, "Bài 2: Sắp xếp câu", isSubmitted)}
      </div>

      {/* ── Bài 1: choose the correct word ── */}
      {activeSection === 1 && (
        <div className="space-y-5">
          {fillQuestions.length === 0 ? (
            <div className="rounded-2xl border border-primary/10 bg-surface p-6 text-center text-sm text-text-secondary">
              Bạn chưa có từ nào đã học trong chủ đề này để làm bài 1.
            </div>
          ) : (
            fillQuestions.map((q: any, i: number) => (
              <div key={q.id} className="rounded-2xl border border-primary/10 bg-surface p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-primary">Chọn từ đúng</span>
                </div>
                <div className="mb-4 text-base font-medium italic leading-relaxed text-text-primary">
                  {q.promptType === "example" ? q.q : `Nghĩa: ${q.q}`}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((option: string, oi: number) => {
                    const isSelected = fillAnswers[i] === option;
                    return (
                      <label
                        key={`${q.id}-${oi}`}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                          isSubmitted ? "cursor-default" : "cursor-pointer"
                        } ${isSelected ? "border-primary bg-primary/5" : "border-primary/10 bg-surface hover:border-primary/30"}`}
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
                          className="h-4 w-4 shrink-0 accent-primary"
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div className="flex justify-end pt-1">
            <Button variant="primary" onClick={() => setActiveSection(2)}>
              Sang bài 2 →
            </Button>
          </div>
        </div>
      )}

      {/* ── Bài 2: arrange the sentence (word bank) ── */}
      {activeSection === 2 && (
        <div className="space-y-5">
          {translationQuestions.length === 0 ? (
            <div className="rounded-2xl border border-primary/10 bg-surface p-6 text-center text-sm text-text-secondary">
              Không có câu nào có bản dịch để sắp xếp.
            </div>
          ) : (
            translationQuestions.map((q, qi) => {
              const picked = arranged[q.id] ?? [];
              const bank = tokenBanks[q.id] ?? [];
              const promptLabel = q.direction === "en-to-vi" ? "Câu tiếng Anh" : "Câu tiếng Việt";
              const arrangeLabel = q.direction === "en-to-vi" ? "Sắp xếp câu tiếng Việt" : "Sắp xếp câu tiếng Anh";
              const targetHint = q.direction === "en-to-vi" ? "đáp án là tiếng Việt" : "đáp án là tiếng Anh";
              return (
                <div key={q.id} className="rounded-2xl border border-primary/10 bg-surface p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                      {qi + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide text-accent">Sắp xếp câu</span>
                  </div>
                  <div className="mb-4">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">{promptLabel}</p>
                    <p className="text-lg font-medium italic leading-relaxed text-text-primary">{q.prompt}</p>
                  </div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent">
                    {arrangeLabel}{" "}
                    <span className="font-normal normal-case text-text-muted">({targetHint})</span>
                  </p>

                  {/* Answer area — click a chip to send it back to the bank */}
                  <div className="mb-3 flex min-h-[52px] flex-wrap gap-2 rounded-xl border-2 border-dashed border-primary/20 bg-bg-secondary/40 p-3">
                    {picked.length === 0 && (
                      <span className="self-center text-sm text-text-muted">Chạm các từ bên dưới để xếp câu…</span>
                    )}
                    {picked.map((slot, pos) => (
                      <button
                        key={`${q.id}-picked-${pos}`}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => removeAt(q.id, pos)}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-default"
                      >
                        {bank[slot]}
                      </button>
                    ))}
                  </div>

                  {/* Word bank — unused tokens */}
                  <div className="flex flex-wrap gap-2">
                    {bank.map((tok, slot) =>
                      picked.includes(slot) ? null : (
                        <button
                          key={`${q.id}-bank-${slot}`}
                          type="button"
                          disabled={isSubmitted}
                          onClick={() => addToken(q.id, slot)}
                          className="rounded-lg border border-primary/15 bg-surface px-3 py-1.5 text-sm font-semibold text-text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-default"
                        >
                          {tok}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Controls */}
                  <div className="mt-3 flex gap-3 text-xs font-bold">
                    <button
                      type="button"
                      disabled={isSubmitted || picked.length === 0}
                      onClick={() => undo(q.id)}
                      className="text-text-muted transition-colors hover:text-primary disabled:opacity-40"
                    >
                      ↶ Hoàn tác
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitted || picked.length === 0}
                      onClick={() => clearAnswer(q.id)}
                      className="text-text-muted transition-colors hover:text-danger-color disabled:opacity-40"
                    >
                      ✕ Xóa đáp án
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => setActiveSection(1)}>
              ← Quay lại
            </Button>
            <Button variant="primary" disabled={isSubmitted} onClick={handleSubmit}>
              Nộp bài ngay 🚀
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
