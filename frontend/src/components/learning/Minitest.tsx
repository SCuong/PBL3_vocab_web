import { useState, useEffect, useMemo, useCallback } from "react";
import confetti from "canvas-confetti";
import { Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "../ui";
import { buildMinitestFillQuestions } from "../../utils/minitestQuestions";
import { buildTranslationQuestions, type TranslationQuestion } from "../../utils/translationQuestions";
import { playLumoVoice, playSfx } from "../../utils/sound";

type MinitestProps = {
  topicId: number;
  learnedWords: any[];
  topicWords: any[];
  onFinish: (score: number, total: number, detail?: any) => void;
  hideProgressCard?: boolean;
  onProgressChange?: (answered: number, total: number) => void;
};

type UnifiedItem =
  | { kind: "fill"; key: string; index: number; q: any; isRetry?: boolean }
  | { kind: "arrange"; key: string; index: number; q: TranslationQuestion; isRetry?: boolean };

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

export const Minitest = ({
  topicId: _topicId,
  learnedWords,
  topicWords,
  onFinish,
  hideProgressCard = false,
  onProgressChange,
}: MinitestProps) => {
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

  const tokenBanks = useMemo(() => {
    const cleanToken = (raw: string) => {
      const stripped = raw.replace(/^[.,!?;:"'’“”…()]+|[.,!?;:"'’“”…()]+$/g, "");
      if (!stripped) return "";
      if (/^I($|['’](m|ve|ll|d)$)/.test(stripped)) return stripped;
      return stripped.toLowerCase();
    };
    const map: Record<number, string[]> = {};
    translationQuestions.forEach((q) => {
      const tokens = q.answer.split(/\s+/).map(cleanToken).filter(Boolean);
      map[q.id] = shuffle(tokens);
    });
    return map;
  }, [translationQuestions]);

  const initialQueue = useMemo<UnifiedItem[]>(() => {
    const fills: UnifiedItem[] = fillQuestions.map((q: any, idx: number) => ({
      kind: "fill",
      key: `fill-${idx}`,
      index: idx,
      q,
    }));
    const arranges: UnifiedItem[] = translationQuestions.map((q, idx) => ({
      kind: "arrange",
      key: `arr-${idx}`,
      index: idx,
      q,
    }));
    return [...fills, ...arranges];
  }, [fillQuestions, translationQuestions]);

  const [queue, setQueue] = useState<UnifiedItem[]>(initialQueue);
  const [cursor, setCursor] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [selectedFill, setSelectedFill] = useState("");
  const [pickedSlots, setPickedSlots] = useState<number[]>([]);
  const [hintShown, setHintShown] = useState(false);
  const [combo, setCombo] = useState(0);
  const [firstTryFill, setFirstTryFill] = useState<Record<number, { userAnswer: string; ok: boolean }>>({});
  const [firstTryArrange, setFirstTryArrange] = useState<Record<number, { userAnswer: string; ok: boolean }>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setQueue(initialQueue);
    setCursor(0);
    setAnswered(false);
    setIsCorrect(false);
    setSelectedFill("");
    setPickedSlots([]);
    setHintShown(false);
    setCombo(0);
    setFirstTryFill({});
    setFirstTryArrange({});
    setSubmitted(false);
  }, [initialQueue]);

  const baseTotal = fillQuestions.length + translationQuestions.length;
  const completedUnique = Object.keys(firstTryFill).length + Object.keys(firstTryArrange).length;

  useEffect(() => {
    onProgressChange?.(completedUnique, baseTotal);
  }, [completedUnique, baseTotal, onProgressChange]);

  const current = queue[cursor];

  const handleChooseFill = useCallback(
    (option: string) => {
      if (!current || current.kind !== "fill" || answered) return;
      const ok = option.trim().toLowerCase() === String(current.q.a).toLowerCase();
      setSelectedFill(option);
      setAnswered(true);
      setIsCorrect(ok);
      if (!current.isRetry && firstTryFill[current.index] === undefined) {
        setFirstTryFill((prev) => ({ ...prev, [current.index]: { userAnswer: option, ok } }));
      }
      if (ok) {
        setCombo((c) => c + 1);
        playSfx("correct");
      } else {
        setCombo(0);
        playSfx("wrong");
        // Duolingo/Quizlet pattern: re-queue missed question at end of session
        setQueue((prev) => [...prev, { ...current, key: `${current.key}-retry-${prev.length}`, isRetry: true }]);
      }
    },
    [current, answered, firstTryFill],
  );

  const handleCheckArrange = useCallback(() => {
    if (!current || current.kind !== "arrange" || answered) return;
    const bank = tokenBanks[current.q.id] ?? [];
    const userText = pickedSlots.map((slot) => bank[slot] ?? "").join(" ");
    const ok = normalizeSentence(userText) === normalizeSentence(current.q.answer);
    setAnswered(true);
    setIsCorrect(ok);
    if (!current.isRetry && firstTryArrange[current.index] === undefined) {
      setFirstTryArrange((prev) => ({ ...prev, [current.index]: { userAnswer: userText, ok } }));
    }
    if (ok) {
      setCombo((c) => c + 1);
      playSfx("correct");
    } else {
      setCombo(0);
      playSfx("wrong");
      setQueue((prev) => [...prev, { ...current, key: `${current.key}-retry-${prev.length}`, isRetry: true }]);
    }
  }, [current, answered, tokenBanks, pickedSlots, firstTryArrange]);

  const finalizeMinitest = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);

    let sFill = 0;
    const fillReview = fillQuestions.map((q: any, i: number) => {
      const rec = firstTryFill[i];
      const ok = Boolean(rec?.ok);
      if (ok) sFill += 1;
      return {
        prompt: q.promptType === "example" ? q.q : `Nghĩa: ${q.q}`,
        correctAnswer: q.a,
        userAnswer: rec?.userAnswer ?? "",
        isCorrect: ok,
      };
    });

    let sTranslation = 0;
    const review = translationQuestions.map((q, i) => {
      const rec = firstTryArrange[i];
      const ok = Boolean(rec?.ok);
      if (ok) sTranslation += 1;
      return {
        englishSentence: q.prompt,
        correctTranslation: q.answer,
        userAnswer: rec?.userAnswer ?? "",
        isCorrect: ok,
      };
    });

    const bonus = sTranslation === translationQuestions.length && translationQuestions.length > 0 ? 50 : 0;
    if (bonus > 0) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
    const xpEarned = sFill * 5 + sTranslation * 10 + bonus;

    onFinish(sFill + sTranslation, baseTotal, {
      fill: sFill,
      fillTotal: fillQuestions.length,
      translation: sTranslation,
      translationTotal: translationQuestions.length,
      bonus,
      xpEarned,
      fillReview,
      review,
    });
  }, [submitted, fillQuestions, translationQuestions, firstTryFill, firstTryArrange, onFinish, baseTotal]);

  const handleNext = useCallback(() => {
    if (cursor + 1 >= queue.length) {
      finalizeMinitest();
      return;
    }
    setCursor((c) => c + 1);
    setAnswered(false);
    setIsCorrect(false);
    setSelectedFill("");
    setPickedSlots([]);
    setHintShown(false);
  }, [cursor, queue.length, finalizeMinitest]);

  // Keyboard support: 1–4 for options, Enter to advance
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const onInteractive = activeTag === "BUTTON" || activeTag === "INPUT" || activeTag === "TEXTAREA";
      if (!current) return;
      if (!answered && current.kind === "fill" && ["1", "2", "3", "4"].includes(e.key)) {
        const opt = current.q.options?.[Number(e.key) - 1];
        if (opt) handleChooseFill(opt);
      } else if (answered && e.key === "Enter" && !onInteractive) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, answered, handleChooseFill, handleNext]);

  if (!current) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-container)] border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Chưa đủ câu hỏi cho bài kiểm tra này.
      </div>
    );
  }

  const progressRatio = queue.length > 0 ? (cursor + (answered ? 1 : 0)) / queue.length : 0;
  const lumoImg = !answered
    ? "/mascot-lumo-thinking.webp"
    : isCorrect
      ? "/mascot-lumo-happy.webp"
      : "/mascot-lumo-oops.webp";
  const lumoSpeech = !answered
    ? hintShown
      ? current.kind === "fill"
        ? `Gợi ý: Từ bắt đầu bằng "${String(current.q.a)[0]?.toUpperCase() ?? ""}..."`
        : `Gợi ý: Bắt đầu bằng "${current.q.answer.split(" ")[0]}"`
      : "Bình tĩnh làm từng câu nha — cần thì bấm Gợi ý!"
    : isCorrect
      ? combo >= 2
        ? `Tuyệt vời! ${combo} câu đúng liên tiếp!`
        : "Chính xác! Bạn nhớ vững lắm rồi."
      : "Không sao, câu này sẽ quay lại ở cuối bài để bạn chinh phục lại!";

  const bank = current.kind === "arrange" ? (tokenBanks[current.q.id] ?? []) : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-1">
      {!hideProgressCard && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-text-muted tabular-nums">
            Câu {cursor + 1} / {queue.length}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-300"
              style={{ transform: `scaleX(${Math.min(1, progressRatio)})` }}
            />
          </div>
          {current.isRetry ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-color/15 px-2.5 py-0.5 text-xs font-bold text-warning-color">
              <RotateCcw size={12} aria-hidden /> Làm lại
            </span>
          ) : combo >= 2 ? (
            <span className="rounded-full bg-[#F59E0B] px-2.5 py-0.5 text-xs font-extrabold text-[#171026]">
              Combo ×{combo}
            </span>
          ) : null}
        </div>
      )}

      <div className="relative">
        <article className="rounded-[var(--radius-container)] border border-border bg-surface p-5 sm:p-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {current.kind === "fill" ? "Chọn từ điền vào câu" : "Ghép câu tiếng Anh"}
            </span>
            {!answered && !hintShown && (
              <button
                type="button"
                onClick={() => {
                  setHintShown(true);
                  playLumoVoice("greet");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary-light px-3 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/15 cursor-pointer"
              >
                <Lightbulb size={13} aria-hidden /> Gợi ý
              </button>
            )}
          </div>

          {current.kind === "fill" ? (
            <>
              <p className="text-lg font-bold leading-snug text-text-primary sm:text-xl">
                {current.q.promptType === "example" ? current.q.q : `Từ tiếng Anh nào có nghĩa là: "${current.q.q}"?`}
              </p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {(current.q.options ?? []).map((opt: string, idx: number) => {
                  const isRightOpt = opt.trim().toLowerCase() === String(current.q.a).toLowerCase();
                  const isPicked = selectedFill === opt;
                  let cls =
                    "flex min-h-[52px] items-center gap-3 rounded-[var(--radius-element)] border px-4 py-3 text-left text-[15px] font-semibold transition-colors cursor-pointer ";
                  if (!answered) {
                    cls += "border-border-emphasized bg-surface text-text-primary hover:border-primary hover:bg-primary-light/50";
                  } else if (isRightOpt) {
                    cls += "border-success-color bg-success-color/10 text-success-color";
                  } else if (isPicked) {
                    cls += "border-danger-color bg-danger-color/10 text-danger-color";
                  } else {
                    cls += "border-border bg-bg-secondary/40 text-text-muted opacity-65";
                  }
                  return (
                    <button
                      key={`${opt}-${idx}`}
                      type="button"
                      data-no-tap-sfx="true"
                      disabled={answered}
                      onClick={() => handleChooseFill(opt)}
                      className={cls}
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bg-secondary font-mono text-xs font-bold text-text-muted">
                        {idx + 1}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-bold leading-snug text-text-primary sm:text-xl">
                “{current.q.prompt}”
              </p>
              <div className="mt-4 flex min-h-[58px] flex-wrap items-center gap-2 rounded-[var(--radius-element)] border border-dashed border-border-emphasized bg-bg-light p-3">
                {pickedSlots.length === 0 ? (
                  <span className="text-sm text-text-muted">Chạm các từ bên dưới theo đúng thứ tự tiếng Anh…</span>
                ) : (
                  pickedSlots.map((slot, pos) => (
                    <button
                      key={`${slot}-${pos}`}
                      type="button"
                      disabled={answered}
                      onClick={() => setPickedSlots((prev) => prev.filter((_, i) => i !== pos))}
                      className="rounded-lg border border-primary/30 bg-primary-light px-3 py-1.5 text-sm font-bold text-primary cursor-pointer"
                    >
                      {bank[slot]}
                    </button>
                  ))
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {bank.map((token, slot) => {
                  const used = pickedSlots.includes(slot);
                  return (
                    <button
                      key={`${token}-${slot}`}
                      type="button"
                      disabled={answered || used}
                      onClick={() => setPickedSlots((prev) => [...prev, slot])}
                      className={`rounded-lg border border-border-emphasized bg-surface px-3 py-1.5 text-sm font-semibold text-text-primary transition-opacity cursor-pointer ${
                        used ? "opacity-30" : "hover:border-primary"
                      }`}
                    >
                      {token}
                    </button>
                  );
                })}
              </div>

              {!answered && (
                <div className="mt-5 flex justify-end gap-2">
                  {pickedSlots.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setPickedSlots([])}>
                      Xóa hết
                    </Button>
                  )}
                  <Button
                    data-no-tap-sfx="true"
                    disabled={pickedSlots.length < bank.length}
                    onClick={handleCheckArrange}
                  >
                    Kiểm tra đáp án
                  </Button>
                </div>
              )}
            </>
          )}

          {answered && (
            <div
              className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-element)] p-4 ${
                isCorrect ? "bg-success-color/10 text-success-color" : "bg-danger-color/10 text-danger-color"
              }`}
            >
              <div>
                <p className="text-sm font-extrabold">
                  {isCorrect ? "Chính xác!" : "Chưa đúng"}
                </p>
                <p className="mt-0.5 text-sm text-text-primary">
                  Đáp án: <strong>{current.kind === "fill" ? current.q.a : current.q.answer}</strong>
                </p>
              </div>
              <Button size="sm" onClick={handleNext}>
                {cursor + 1 >= queue.length ? "Xem kết quả →" : "Tiếp tục →"}
              </Button>
            </div>
          )}
        </article>

        {/* Lumo Sidekick on Right (Desktop) */}
        <aside className="mt-4 flex items-center gap-3 rounded-[var(--radius-element)] border border-primary/20 bg-primary-light/60 p-3 xl:absolute xl:left-[calc(100%+20px)] xl:top-1/2 xl:mt-0 xl:w-52 xl:-translate-y-1/2 xl:flex-col xl:border-0 xl:bg-transparent xl:p-0 xl:text-center">
          <div className="text-sm font-semibold text-text-primary xl:rounded-2xl xl:border xl:border-border-emphasized xl:bg-surface xl:p-3">
            {lumoSpeech}
          </div>
          <img
            src={lumoImg}
            alt="Lumo"
            width={92}
            height={104}
            onClick={() => playLumoVoice(isCorrect ? "celebrate" : "greet")}
            className="h-auto w-12 shrink-0 cursor-pointer transition-transform hover:scale-105 xl:w-24"
          />
        </aside>
      </div>
    </div>
  );
};
