import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  KeyRound,
  Lightbulb,
  MessageSquare,
  PenLine,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import {
  getTopicSkillsPack,
  type KeyWordItem,
  type SkillQuestion,
} from '../../data/topicSkillsData';
import { getSkillsAudioUrl } from '../../data/skillsAudioMap';
import { playPronunciationAudio, stopPronunciationAudio } from '../../utils/audio';
import { getTopicIllustration } from '../../utils/vocabIllustrations';
import { LumoLiveMascot } from '../ui/LumoLiveMascot';

export type SkillTab = 'grammar' | 'listening' | 'reading';
type LessonStep = 1 | 2 | 3;

interface SkillsPracticeProps {
  topicTitle: string;
  focusedSkill?: SkillTab;
  lessonNumber?: number;
  nextLessonLabel?: string;
  onCompleteLesson?: () => void;
}

const STEP_META: Record<SkillTab, Array<{ step: LessonStep; label: string; icon: typeof BookOpen }>> = {
  grammar: [
    { step: 1, label: 'Khám phá', icon: MessageSquare },
    { step: 2, label: 'Công thức', icon: BookOpen },
    { step: 3, label: 'Thực hành', icon: PenLine },
  ],
  listening: [
    { step: 1, label: 'Từ khóa', icon: KeyRound },
    { step: 2, label: 'Nghe & Làm bài', icon: Headphones },
    { step: 3, label: 'Phụ đề', icon: FileText },
  ],
  reading: [
    { step: 1, label: 'Từ khóa', icon: KeyRound },
    { step: 2, label: 'Đọc bài', icon: BookOpen },
    { step: 3, label: 'Trả lời', icon: ClipboardCheck },
  ],
};

function renderHighlightedLine(line: string, highlight: string) {
  if (!highlight) return line;
  const idx = line.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return line;
  const before = line.slice(0, idx);
  const match = line.slice(idx, idx + highlight.length);
  const after = line.slice(idx + highlight.length);
  return (
    <>
      {before}
      <mark className="rounded-md bg-[#F59E0B]/25 px-1.5 py-0.5 font-extrabold text-[#B45309] dark:text-[#FCD34D]">
        {match}
      </mark>
      {after}
    </>
  );
}

function deterministicShuffle(items: string[], seedStr: string): string[] {
  const arr = [...items];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) % 9973;
  }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    seed = (seed * 17 + 13) % 9973;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function QuizBlock({
  questions,
  answers,
  onSelect,
  title,
}: {
  questions: SkillQuestion[];
  answers: Record<string, number>;
  onSelect: (id: string, idx: number) => void;
  title?: string;
}) {
  return (
    <div className="space-y-4">
      {title && (
        <h4 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          {title}
        </h4>
      )}
      {questions.map((q, qIdx) => {
        const picked = answers[q.id];
        const isAnswered = picked !== undefined;
        const isCorrect = picked === q.correctIndex;
        return (
          <div
            key={q.id}
            className="rounded-2xl border border-border bg-surface p-5 shadow-xs"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  Câu hỏi {qIdx + 1} / {questions.length}
                </span>
                <p className="mt-1 text-base font-bold leading-snug text-text-primary">
                  {q.question}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const mp3 = getSkillsAudioUrl(q.question);
                  if (mp3) void playPronunciationAudio(mp3);
                }}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-bg-secondary text-text-secondary transition-colors hover:bg-primary-light hover:text-primary"
                aria-label="Nghe câu hỏi"
              >
                <Volume2 size={15} />
              </button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {q.options.map((opt, idx) => {
                const isThisPicked = picked === idx;
                const isThisCorrect = idx === q.correctIndex;
                let stateClass =
                  'border-border bg-bg-secondary/60 text-text-primary hover:border-primary/50 hover:bg-primary-light/40';
                if (isAnswered) {
                  if (isThisCorrect) {
                    stateClass =
                      'border-[#10B981] bg-[#10B981]/12 text-[#065F46] dark:text-[#6EE7B7] font-bold';
                  } else if (isThisPicked) {
                    stateClass =
                      'border-[#EF4444] bg-[#EF4444]/10 text-[#991B1B] dark:text-[#FCA5A5]';
                  } else {
                    stateClass = 'border-border/60 bg-bg-secondary/30 text-text-muted opacity-65';
                  }
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => onSelect(q.id, idx)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all disabled:cursor-default ${stateClass}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && isThisCorrect && <Check size={16} className="shrink-0 text-[#10B981]" />}
                    {isAnswered && isThisPicked && !isThisCorrect && <X size={16} className="shrink-0 text-[#EF4444]" />}
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <div
                className={`mt-3.5 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  isCorrect
                    ? 'bg-[#10B981]/10 text-[#065F46] dark:text-[#A7F3D0]'
                    : 'bg-[#F59E0B]/12 text-[#92400E] dark:text-[#FDE68A]'
                }`}
              >
                <span className="font-extrabold">
                  {isCorrect ? 'Chính xác! ' : 'Giải thích: '}
                </span>
                {q.explanationVi}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SkillsPractice({
  topicTitle,
  focusedSkill,
  lessonNumber,
  nextLessonLabel,
  onCompleteLesson,
}: SkillsPracticeProps) {
  const pack = useMemo(() => getTopicSkillsPack(topicTitle), [topicTitle]);
  const coverImage = useMemo(() => getTopicIllustration(topicTitle), [topicTitle]);

  const [activeSkill, setActiveSkill] = useState<SkillTab>(focusedSkill ?? 'grammar');
  const [steps, setSteps] = useState<Record<SkillTab, LessonStep>>({
    grammar: 1,
    listening: 1,
    reading: 1,
  });

  useEffect(() => {
    if (focusedSkill) {
      setActiveSkill(focusedSkill);
    }
  }, [focusedSkill]);

  // Shared MCQ answers
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Grammar Error Spotting state
  const [errorPick, setErrorPick] = useState<number | null>(null);
  // Grammar Sentence Builder state
  const [selectedTokenIndices, setSelectedTokenIndices] = useState<number[]>([]);
  const [builderChecked, setBuilderChecked] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Listening state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<1 | 0.75>(1);
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({});

  // Reading state
  const [showTranslation, setShowTranslation] = useState(false);
  const [activeGlossaryWord, setActiveGlossaryWord] = useState<KeyWordItem | null>(null);
  const [tfAnswers, setTfAnswers] = useState<Record<string, boolean>>({});

  const builderPool = useMemo(
    () =>
      deterministicShuffle(
        [...pack.grammar.sentenceBuilder.answerTokens, ...pack.grammar.sentenceBuilder.distractorTokens],
        pack.grammar.sentenceBuilder.id,
      ),
    [pack],
  );

  // Reset per-topic interactive state when topic changes
  useEffect(() => {
    stopPronunciationAudio();
    setIsSpeaking(false);
    setAnswers({});
    setErrorPick(null);
    setSelectedTokenIndices([]);
    setBuilderChecked('idle');
    setGapAnswers({});
    setShowTranslation(false);
    setActiveGlossaryWord(null);
    setTfAnswers({});
    setSteps({ grammar: 1, listening: 1, reading: 1 });
  }, [topicTitle]);

  useEffect(() => {
    return () => {
      stopPronunciationAudio();
    };
  }, []);

  const currentStep = steps[activeSkill];
  const setCurrentStep = (s: LessonStep) => {
    stopPronunciationAudio();
    setIsSpeaking(false);
    setSteps((prev) => ({ ...prev, [activeSkill]: s }));
  };

  const handleSelectAnswer = (id: string, idx: number) => {
    setAnswers((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: idx }));
  };

  const speakText = (text: string, rate: number = speechRate) => {
    stopPronunciationAudio();
    const mp3Url = getSkillsAudioUrl(text);
    if (!mp3Url) {
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    playPronunciationAudio(
      mp3Url,
      undefined,
      () => setIsSpeaking(false),
      rate,
    );
  };

  const stopSpeech = () => {
    stopPronunciationAudio();
    setIsSpeaking(false);
  };

  const fullListeningScript = useMemo(
    () => pack.listening.dialogue.map((d) => d.en).join(' '),
    [pack],
  );

  // Sentence Builder actions
  const togglePoolToken = (poolIdx: number) => {
    if (builderChecked === 'correct') return;
    setBuilderChecked('idle');
    setSelectedTokenIndices((prev) =>
      prev.includes(poolIdx) ? prev.filter((i) => i !== poolIdx) : [...prev, poolIdx],
    );
  };

  const checkSentenceBuilder = () => {
    const built = selectedTokenIndices.map((i) => builderPool[i]).join(' ');
    const expected = pack.grammar.sentenceBuilder.answerTokens.join(' ');
    if (built === expected) {
      setBuilderChecked('correct');
      speakText(expected, 1);
    } else {
      setBuilderChecked('wrong');
    }
  };

  // Reading interactive tap-to-define tokens
  const glossaryMap = useMemo(() => {
    const map = new Map<string, KeyWordItem>();
    for (const item of pack.reading.glossary) {
      map.set(item.word.toLowerCase(), item);
    }
    return map;
  }, [pack]);

  const readingTokens = useMemo(
    () => pack.reading.passageEn.split(/(\s+)/),
    [pack],
  );

  // Progress counts
  const grammarTotal = pack.grammar.questions.length + 2; // + errorDrill + sentenceBuilder
  const grammarDone =
    pack.grammar.questions.filter((q) => answers[q.id] !== undefined).length +
    (errorPick !== null ? 1 : 0) +
    (builderChecked === 'correct' ? 1 : 0);

  const listeningTotal = pack.listening.gaps.length + pack.listening.questions.length;
  const listeningDone =
    pack.listening.gaps.filter((g) => gapAnswers[g.id] !== undefined).length +
    pack.listening.questions.filter((q) => answers[q.id] !== undefined).length;

  const readingTotal = pack.reading.trueFalse.length + pack.reading.questions.length;
  const readingDone =
    pack.reading.trueFalse.filter((tf) => tfAnswers[tf.id] !== undefined).length +
    pack.reading.questions.filter((q) => answers[q.id] !== undefined).length;

  const skillCards: Array<{
    id: SkillTab;
    label: string;
    sub: string;
    icon: typeof Lightbulb;
    done: number;
    total: number;
  }> = [
    {
      id: 'grammar',
      label: 'Ngữ pháp',
      sub: pack.grammar.cefr,
      icon: Lightbulb,
      done: grammarDone,
      total: grammarTotal,
    },
    {
      id: 'listening',
      label: 'Luyện nghe',
      sub: pack.listening.cefr,
      icon: Headphones,
      done: listeningDone,
      total: listeningTotal,
    },
    {
      id: 'reading',
      label: 'Đọc hiểu',
      sub: pack.reading.cefr,
      icon: BookOpenCheck,
      done: readingDone,
      total: readingTotal,
    },
  ];

  const activeSteps = STEP_META[activeSkill];
  const currentDone =
    activeSkill === 'grammar'
      ? grammarDone
      : activeSkill === 'listening'
        ? listeningDone
        : readingDone;
  const currentTotal =
    activeSkill === 'grammar'
      ? grammarTotal
      : activeSkill === 'listening'
        ? listeningTotal
        : readingTotal;

  return (
    <div className="w-full pb-8">
      {/* 3-Skill Selector Strip (hidden when inside a focused single-lesson classroom) */}
      {!focusedSkill && (
      <div className="mb-5 grid grid-cols-3 gap-3" role="tablist" aria-label="Chọn kỹ năng">
        {skillCards.map((skill) => {
          const Icon = skill.icon;
          const isActive = activeSkill === skill.id;
          const isCompleted = skill.done === skill.total && skill.total > 0;
          return (
            <button
              key={skill.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                stopSpeech();
                setActiveSkill(skill.id);
              }}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-colors duration-150 ${
                isActive
                  ? 'border-primary bg-primary-light shadow-xs'
                  : 'border-border bg-surface hover:border-primary/40'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isCompleted
                      ? 'bg-[#10B981] text-white'
                      : isActive
                        ? 'bg-primary text-white'
                        : 'bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {isCompleted ? <Check size={18} strokeWidth={2.5} aria-hidden /> : <Icon size={18} aria-hidden />}
                </span>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-extrabold sm:text-base ${isActive ? 'text-primary' : 'text-text-primary'}`}>
                    {skill.label}
                  </p>
                  <p className="truncate text-xs text-text-secondary">{skill.sub}</p>
                </div>
              </div>
              <span className="hidden shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-xs font-extrabold tabular-nums text-text-secondary sm:inline-flex">
                {skill.done}/{skill.total}
              </span>
            </button>
          );
        })}
      </div>
      )}

      {/* Clickable 3-Tab Segmented Bar */}
      <div
        role="tablist"
        aria-label="Chọn phần học trong bài"
        className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-bg-secondary p-1.5"
      >
        {activeSteps.map((item) => {
          const isCurrent = currentStep === item.step;
          const TabIcon = item.icon;
          return (
            <button
              key={item.step}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setCurrentStep(item.step)}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center transition-all duration-150 ${
                isCurrent
                  ? 'bg-primary text-white shadow-xs'
                  : 'border border-border/60 bg-surface/80 text-text-secondary hover:border-primary/40 hover:bg-surface hover:text-primary'
              }`}
            >
              <TabIcon size={15} className="shrink-0" aria-hidden />
              <span className="truncate text-xs font-extrabold sm:text-sm">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============================================================
          1. GRAMMAR STUDIO (3-STEP PPP / GUIDED DISCOVERY)
         ============================================================ */}
      {activeSkill === 'grammar' && (
        <div key={`grammar-step-${currentStep}`} className="cinema-content-in space-y-5">
          {/* STEP 1: CONTEXTUAL DISCOVERY */}
          {currentStep === 1 && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <p className="text-sm font-semibold text-text-secondary">{pack.grammar.discoveryContextVi}</p>

              <div className="mt-4 space-y-3">
                {pack.grammar.discoveryDialogue.map((turn, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-bg-secondary/60 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-primary/12 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                        {turn.speaker}
                      </span>
                      <p className="mt-2 text-base font-bold leading-relaxed text-text-primary">
                        {renderHighlightedLine(turn.lineEn, turn.highlight)}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">{turn.lineVi}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(turn.lineEn, 0.95)}
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-primary shadow-xs transition-colors hover:bg-primary hover:text-white"
                      aria-label={`Nghe câu của ${turn.speaker}`}
                    >
                      <Volume2 size={17} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-light/60 p-4 text-sm leading-relaxed text-text-primary">
                <LumoLiveMascot mood="thinking" size={46} trackCursor interactive />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-primary">Ghi nhớ cùng Lumo</p>
                  <p className="mt-0.5">{pack.grammar.discoveryTakeawayVi}</p>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="duo-btn duo-btn-amber"
                >
                  Tiếp tục
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* STEP 2: STRUCTURED LESSON & COMMON VIETNAMESE MISTAKES */}
          {currentStep === 2 && (
            <>
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <p className="text-sm font-semibold text-text-secondary">
                  {pack.grammar.summaryVi}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {pack.grammar.formulas.map((f) => (
                    <div
                      key={f.label}
                      className="flex flex-col justify-between rounded-xl border border-border bg-bg-secondary/60 p-4"
                    >
                      <div>
                        <p className="text-xs font-extrabold text-primary">{f.label}</p>
                        <p className="mt-1 font-mono text-sm font-bold text-text-primary">{f.pattern}</p>
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-2 border-t border-border/80 pt-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold leading-relaxed text-text-primary">{f.exampleEn}</p>
                          <p className="mt-0.5 text-xs text-text-secondary">{f.exampleVi}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakText(f.exampleEn, 0.95)}
                          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-primary shadow-xs transition-colors hover:bg-primary hover:text-white"
                          aria-label="Nghe câu ví dụ"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-light/60 px-4 py-3 text-xs font-semibold leading-relaxed text-text-primary">
                  <LumoLiveMascot mood="thinking" size={38} trackCursor interactive />
                  <span>{pack.grammar.tipVi}</span>
                </div>
              </section>

              {/* Common Vietnamese Learner Mistakes */}
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <div className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
                  <AlertTriangle size={16} className="text-[#EF4444]" aria-hidden />
                  Lỗi hay gặp
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {pack.grammar.commonMistakes.map((m, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-bg-secondary/50 p-4">
                      <p className="flex items-start gap-2 text-sm font-semibold text-[#DC2626] dark:text-[#FCA5A5]">
                        <X size={16} className="mt-0.5 shrink-0" />
                        <span className="line-through decoration-2">{m.wrong}</span>
                      </p>
                      <p className="mt-2 flex items-start gap-2 text-sm font-bold text-[#059669] dark:text-[#6EE7B7]">
                        <Check size={16} className="mt-0.5 shrink-0" />
                        <span>{m.right}</span>
                      </p>
                      <p className="mt-2 border-t border-border/70 pt-2 text-xs leading-relaxed text-text-secondary">
                        {m.whyVi}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="duo-btn duo-btn-surface duo-btn-sm"
                  >
                    <ArrowLeft size={15} aria-hidden />
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="duo-btn duo-btn-amber"
                  >
                    Thực hành
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </div>
              </section>
            </>
          )}

          {/* STEP 3: SCAFFOLDED PRACTICE (MCQ + ERROR SPOTTING + SENTENCE BUILDER) */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Drill 1: Contextual MCQ */}
              <QuizBlock
                title="Dạng 1 · Chọn đáp án đúng theo ngữ cảnh"
                questions={pack.grammar.questions}
                answers={answers}
                onSelect={handleSelectAnswer}
              />

              {/* Drill 2: Interactive Error Spotting */}
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  Dạng 2 · Tìm &amp; Sửa lỗi sai (Error Spotting)
                </span>
                <p className="mt-1 text-base font-bold text-text-primary">
                  {pack.grammar.errorDrill.promptVi}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-bg-secondary/70 p-4">
                  {pack.grammar.errorDrill.segments.map((seg, idx) => {
                    const isAnswered = errorPick !== null;
                    const isWrongSegment = idx === pack.grammar.errorDrill.wrongIndex;
                    const isPicked = errorPick === idx;
                    let cls =
                      'border-border bg-surface text-text-primary hover:border-primary hover:bg-primary-light/50';
                    if (isAnswered) {
                      if (isWrongSegment) {
                        cls = 'border-[#10B981] bg-[#10B981]/14 text-[#065F46] dark:text-[#6EE7B7] font-extrabold';
                      } else if (isPicked) {
                        cls = 'border-[#EF4444] bg-[#EF4444]/12 text-[#991B1B] dark:text-[#FCA5A5]';
                      } else {
                        cls = 'border-border/50 bg-surface/60 text-text-muted opacity-70';
                      }
                    }
                    return (
                      <button
                        key={seg}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => setErrorPick(idx)}
                        className={`cursor-pointer rounded-xl border-2 px-3.5 py-2 text-sm font-bold underline decoration-dashed underline-offset-4 transition-all disabled:cursor-default ${cls}`}
                      >
                        {seg}
                      </button>
                    );
                  })}
                </div>

                {errorPick !== null && (
                  <div
                    className={`mt-3.5 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      errorPick === pack.grammar.errorDrill.wrongIndex
                        ? 'bg-[#10B981]/10 text-[#065F46] dark:text-[#A7F3D0]'
                        : 'bg-[#F59E0B]/12 text-[#92400E] dark:text-[#FDE68A]'
                    }`}
                  >
                    <p className="font-extrabold">
                      {errorPick === pack.grammar.errorDrill.wrongIndex
                        ? 'Bắt lỗi chuẩn xác! '
                        : 'Chỗ cần sửa là: '}
                      <span className="line-through opacity-75">
                        {pack.grammar.errorDrill.segments[pack.grammar.errorDrill.wrongIndex]}
                      </span>{' '}
                      → <span className="underline">{pack.grammar.errorDrill.correction}</span>
                    </p>
                    <p className="mt-1">{pack.grammar.errorDrill.explanationVi}</p>
                  </div>
                )}
              </section>

              {/* Drill 3: Duolingo/Busuu-style Sentence Builder */}
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                      Dạng 3 · Ghép câu hoàn chỉnh (Sentence Builder)
                    </span>
                    <p className="mt-1 text-base font-bold text-text-primary">
                      {pack.grammar.sentenceBuilder.promptVi}
                    </p>
                  </div>
                  {selectedTokenIndices.length > 0 && builderChecked !== 'correct' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTokenIndices([]);
                        setBuilderChecked('idle');
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-text-secondary hover:text-primary"
                    >
                      <RotateCcw size={13} /> Xóa làm lại
                    </button>
                  )}
                </div>

                {/* Assembly Line */}
                <div className="mt-4 flex min-h-[60px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-bg-secondary/50 p-3">
                  {selectedTokenIndices.length === 0 ? (
                    <span className="text-xs font-medium text-text-muted">
                      Chạm các thẻ từ bên dưới theo đúng thứ tự để ghép câu...
                    </span>
                  ) : (
                    selectedTokenIndices.map((poolIdx) => (
                      <button
                        key={`placed-${poolIdx}`}
                        type="button"
                        onClick={() => togglePoolToken(poolIdx)}
                        className="duo-btn duo-btn-surface duo-btn-sm !py-1.5 !text-sm"
                      >
                        {builderPool[poolIdx]}
                      </button>
                    ))
                  )}
                </div>

                {/* Word Pool (includes distractors) */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {builderPool.map((token, poolIdx) => {
                    const isUsed = selectedTokenIndices.includes(poolIdx);
                    return (
                      <button
                        key={`pool-${poolIdx}`}
                        type="button"
                        disabled={isUsed || builderChecked === 'correct'}
                        onClick={() => togglePoolToken(poolIdx)}
                        className={`rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition-all ${
                          isUsed
                            ? 'cursor-default border-border/50 bg-bg-secondary/40 text-transparent'
                            : 'cursor-pointer border-border bg-surface text-text-primary shadow-[0_3px_0_var(--border)] hover:border-primary/50 active:translate-y-[2px]'
                        }`}
                      >
                        {token}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="duo-btn duo-btn-surface duo-btn-sm"
                  >
                    <ArrowLeft size={15} aria-hidden />
                    Xem lại bài giảng
                  </button>
                  <button
                    type="button"
                    disabled={selectedTokenIndices.length === 0 || builderChecked === 'correct'}
                    onClick={checkSentenceBuilder}
                    className="duo-btn duo-btn-amber duo-btn-sm disabled:opacity-50"
                  >
                    Kiểm tra câu
                  </button>
                </div>

                {builderChecked !== 'idle' && (
                  <div
                    className={`mt-3.5 rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      builderChecked === 'correct'
                        ? 'bg-[#10B981]/10 text-[#065F46] dark:text-[#A7F3D0]'
                        : 'bg-[#EF4444]/10 text-[#991B1B] dark:text-[#FCA5A5]'
                    }`}
                  >
                    {builderChecked === 'correct' ? (
                      <>
                        <span className="font-extrabold">Xuất sắc! </span>
                        {pack.grammar.sentenceBuilder.explanationVi}
                      </>
                    ) : (
                      <>
                        <span className="font-extrabold">Chưa đúng thứ tự hoặc có từ gây nhiễu. </span>
                        Gợi ý đáp án đúng:{' '}
                        <span className="font-bold">
                          {pack.grammar.sentenceBuilder.answerTokens.join(' ')}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          2. LISTENING STUDIO (PRE -> WHILE -> POST)
         ============================================================ */}
      {activeSkill === 'listening' && (
        <div key={`listening-step-${currentStep}`} className="cinema-content-in space-y-5">
          {/* STEP 1: PRE-LISTENING PREPARATION */}
          {currentStep === 1 && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <p className="text-sm font-semibold text-text-secondary">{pack.listening.contextVi}</p>

              {/* Guiding Question */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-light/60 px-4 py-3 text-sm text-text-primary">
                <LumoLiveMascot mood="headphones" size={44} trackCursor interactive />
                <p className="min-w-0 flex-1">
                  <span className="font-extrabold text-primary">Lưu ý khi nghe: </span>
                  {pack.listening.guidingQuestionVi}
                </p>
              </div>

              {/* Pre-teach 4 Key Words */}
              <div className="mt-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-text-secondary">
                  Từ khóa
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {pack.listening.preWords.map((kw) => (
                    <button
                      key={kw.word}
                      type="button"
                      onClick={() => speakText(kw.word, 0.95)}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary/60 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-primary-light/40"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-text-primary">{kw.word}</span>
                          <span className="rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            {kw.pos}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted">{kw.ipa}</p>
                        <p className="mt-0.5 text-xs font-semibold text-text-secondary">{kw.meaningVi}</p>
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-xs">
                        <Volume2 size={15} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="duo-btn duo-btn-amber"
                >
                  Tiếp tục
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* STEP 2: WHILE-LISTENING (AUDIO STUDIO + GAP FILL + COMPREHENSION) */}
          {currentStep === 2 && (
            <>
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <img
                    src={coverImage}
                    alt={topicTitle}
                    className="h-24 w-36 shrink-0 rounded-xl object-cover border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-extrabold text-primary">
                      Bước 2 · Nghe hội thoại giọng chuẩn &amp; Trả lời
                    </span>
                    <h3 className="mt-1.5 text-xl font-extrabold tracking-[-0.02em] text-text-primary sm:text-2xl">
                      {pack.listening.title}
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary">{pack.listening.guidingQuestionVi}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => (isSpeaking ? stopSpeech() : speakText(fullListeningScript, speechRate))}
                    className="duo-btn duo-btn-purple"
                  >
                    {isSpeaking ? <Square size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                    {isSpeaking ? 'Dừng phát' : 'Nghe đoạn hội thoại'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = speechRate === 1 ? 0.75 : 1;
                      setSpeechRate(next);
                      if (isSpeaking) speakText(fullListeningScript, next);
                    }}
                    className="duo-btn duo-btn-surface duo-btn-sm"
                  >
                    Tốc độ: {speechRate === 1 ? '1.0× Chuẩn' : '0.75× Chậm rõ'}
                  </button>
                </div>
              </section>

              {/* Listening Gap-Fill */}
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  Bài tập 1 · Nghe &amp; Điền từ còn thiếu (Listening Cloze)
                </span>
                <div className="mt-3 space-y-4">
                  {pack.listening.gaps.map((gap, idx) => {
                    const picked = gapAnswers[gap.id];
                    const isAnswered = picked !== undefined;
                    const isCorrect = picked === gap.answer;
                    return (
                      <div key={gap.id} className="rounded-xl border border-border bg-bg-secondary/50 p-4">
                        <p className="text-sm font-bold leading-relaxed text-text-primary">
                          {idx + 1}. &ldquo;{gap.before}{' '}
                          <span
                            className={`inline-block min-w-[78px] rounded-lg px-2.5 py-0.5 text-center font-extrabold ${
                              !isAnswered
                                ? 'bg-primary-light text-primary'
                                : isCorrect
                                  ? 'bg-[#10B981]/18 text-[#065F46] dark:text-[#6EE7B7]'
                                  : 'bg-[#EF4444]/18 text-[#991B1B] dark:text-[#FCA5A5]'
                            }`}
                          >
                            {picked ?? '_____'}
                          </span>{' '}
                          {gap.after}&rdquo;
                        </p>
                        <p className="mt-1 text-xs text-text-muted">Gợi ý: {gap.hintVi}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {gap.options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={isAnswered}
                              onClick={() =>
                                setGapAnswers((prev) => ({ ...prev, [gap.id]: opt }))
                              }
                              className={`cursor-pointer rounded-xl border-2 px-3.5 py-1.5 text-xs font-bold transition-colors disabled:cursor-default ${
                                isAnswered && opt === gap.answer
                                  ? 'border-[#10B981] bg-[#10B981]/15 text-[#065F46] dark:text-[#6EE7B7]'
                                  : isAnswered && opt === picked
                                    ? 'border-[#EF4444] bg-[#EF4444]/12 text-[#991B1B]'
                                    : 'border-border bg-surface text-text-primary hover:border-primary'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Listening Comprehension MCQ */}
              <QuizBlock
                title="Bài tập 2 · Kiểm tra nghe hiểu chi tiết"
                questions={pack.listening.questions}
                answers={answers}
                onSelect={handleSelectAnswer}
              />

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="duo-btn duo-btn-surface duo-btn-sm"
                >
                  <ArrowLeft size={15} aria-hidden />
                  Từ khóa bước 1
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="duo-btn duo-btn-amber"
                >
                  Sang Bước 3: Phụ đề &amp; Nhại giọng
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </>
          )}

          {/* STEP 3: POST-LISTENING (LINE-BY-LINE SHADOWING + GOLDEN PHRASES) */}
          {currentStep === 3 && (
            <>
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-primary-light px-3 py-1 text-xs font-extrabold text-primary">
                      Bước 3 · Phân tích từng câu &amp; Luyện nhại giọng (Shadowing)
                    </span>
                    <p className="mt-2 text-sm text-text-secondary">
                      Bấm nút loa ở từng câu để nghe và lặp lại theo ngữ điệu bản xứ.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpeechRate((r) => (r === 1 ? 0.75 : 1))}
                    className="duo-btn duo-btn-surface duo-btn-sm"
                  >
                    Tốc độ đọc: {speechRate === 1 ? '1.0×' : '0.75×'}
                  </button>
                </div>

                <div className="mt-4 space-y-2.5">
                  {pack.listening.dialogue.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-xl border border-border bg-bg-secondary/50 p-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                          {line.speaker}
                        </span>
                        <p className="mt-0.5 text-sm font-bold leading-relaxed text-text-primary">
                          {line.en}
                        </p>
                        <p className="mt-0.5 text-xs text-text-secondary">{line.vi}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakText(line.en, speechRate)}
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-primary shadow-xs transition-colors hover:bg-primary hover:text-white"
                        aria-label={`Nghe câu ${idx + 1}`}
                      >
                        <Volume2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">
                  3 Cụm từ ăn điểm trong bài nghe
                </h4>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {pack.listening.goldenPhrases.map((gp) => (
                    <div key={gp.phrase} className="rounded-xl border border-border bg-bg-secondary/60 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-extrabold text-text-primary">{gp.phrase}</p>
                        <button
                          type="button"
                          onClick={() => speakText(gp.phrase, 0.95)}
                          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-primary shadow-xs hover:bg-primary hover:text-white"
                          aria-label={`Nghe cụm ${gp.phrase}`}
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                      <p className="mt-1 text-xs font-bold text-primary">{gp.meaningVi}</p>
                      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{gp.usageVi}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex justify-start">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="duo-btn duo-btn-surface duo-btn-sm"
                  >
                    <ArrowLeft size={15} aria-hidden />
                    Quay lại bài tập nghe
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ============================================================
          3. READING STUDIO (PRE-READING -> ACTIVE GLOSSARY -> EVIDENCE)
         ============================================================ */}
      {activeSkill === 'reading' && (
        <div key={`reading-step-${currentStep}`} className="cinema-content-in space-y-5">
          {/* STEP 1: PRE-READING KEY GLOSSARY */}
          {currentStep === 1 && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
              <p className="text-sm font-semibold text-text-secondary">{pack.reading.warmUpVi}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pack.reading.glossary.map((kw) => (
                  <button
                    key={kw.word}
                    type="button"
                    onClick={() => speakText(kw.word, 0.95)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary/60 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-primary-light/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-text-primary">{kw.word}</span>
                        <span className="rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {kw.pos}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted">{kw.ipa}</p>
                      <p className="mt-0.5 text-xs font-semibold text-text-secondary">{kw.meaningVi}</p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-xs">
                      <Volume2 size={14} />
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="duo-btn duo-btn-amber"
                >
                  Đọc bài
                  <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* STEP 2: ACTIVE READING WITH INLINE TAP-TO-DEFINE POPOVER */}
          {currentStep === 2 && (
            <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
              <div className="relative h-36 w-full overflow-hidden">
                <img src={coverImage} alt={topicTitle} className="h-full w-full object-cover" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(17,16,25,0.18) 0%, rgba(17,16,25,0.88) 100%)',
                  }}
                />
                <div className="absolute inset-x-6 bottom-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-extrabold text-[#F59E0B]">
                      {pack.reading.genreLabel} · {pack.reading.cefr}
                    </span>
                    <h3 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                      {pack.reading.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        isSpeaking ? stopSpeech() : speakText(pack.reading.passageEn, speechRate)
                      }
                      className="duo-btn duo-btn-amber duo-btn-sm"
                    >
                      {isSpeaking ? <Square size={13} fill="currentColor" /> : <Volume2 size={14} />}
                      {isSpeaking ? 'Dừng đọc' : 'Nghe bài đọc'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTranslation((v) => !v)}
                      className="duo-btn duo-btn-glass duo-btn-sm"
                    >
                      {showTranslation ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showTranslation ? 'Ẩn dịch' : 'Dịch tiếng Việt'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="mb-3 text-xs font-semibold text-text-secondary">
                  Chạm vào bất kỳ <span className="font-extrabold text-primary">từ tô tím</span> nào trong đoạn văn để mở thẻ từ điển + nghe phát âm ngay lập tức.
                </p>

                <p className="text-[16px] leading-[1.9] text-text-primary">
                  {readingTokens.map((token, idx) => {
                    const clean = token.toLowerCase().replace(/[^a-z]/g, '');
                    const entry = clean ? glossaryMap.get(clean) : undefined;
                    if (entry) {
                      const isSelected = activeGlossaryWord?.word === entry.word;
                      return (
                        <button
                          key={`${token}-${idx}`}
                          type="button"
                          onClick={() => {
                            setActiveGlossaryWord(entry);
                            speakText(entry.word, 0.95);
                          }}
                          className={`mx-0.5 inline cursor-pointer rounded-md px-1.5 py-0.5 font-bold transition-colors ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-primary-light text-primary hover:bg-primary hover:text-white'
                          }`}
                        >
                          {token}
                        </button>
                      );
                    }
                    return <span key={idx}>{token}</span>;
                  })}
                </p>

                {/* Inline Tap-to-Define Dictionary Card */}
                {activeGlossaryWord && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-primary/35 bg-primary-light/60 px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="text-base font-extrabold text-primary">
                        {activeGlossaryWord.word}
                      </span>
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                        {activeGlossaryWord.pos}
                      </span>
                      <span className="text-xs text-text-secondary">{activeGlossaryWord.ipa}</span>
                      <span className="text-sm font-bold text-text-primary">
                        — {activeGlossaryWord.meaningVi}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakText(activeGlossaryWord.word, 0.95)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white"
                    >
                      <Volume2 size={13} /> Nghe lại
                    </button>
                  </div>
                )}

                {showTranslation && (
                  <div className="mt-4 rounded-xl border border-border bg-bg-secondary/70 p-4 text-sm leading-relaxed text-text-secondary">
                    <span className="font-extrabold text-text-primary">Bản dịch tiếng Việt: </span>
                    {pack.reading.passageVi}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="duo-btn duo-btn-surface duo-btn-sm"
                  >
                    <ArrowLeft size={15} aria-hidden />
                    Xem lại từ vựng
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="duo-btn duo-btn-amber"
                  >
                    Sang Bước 3: Kiểm tra đọc hiểu
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* STEP 3: CAMBRIDGE TRUE/FALSE WITH EVIDENCE + MCQ */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  Bài tập 1 · Đúng hay Sai kèm dẫn chứng trong bài (True / False)
                </span>
                <div className="mt-3 space-y-3.5">
                  {pack.reading.trueFalse.map((tf, idx) => {
                    const picked = tfAnswers[tf.id];
                    const isAnswered = picked !== undefined;
                    const isCorrect = picked === tf.isTrue;
                    return (
                      <div key={tf.id} className="rounded-xl border border-border bg-bg-secondary/50 p-4">
                        <p className="text-sm font-bold text-text-primary">
                          {idx + 1}. {tf.statement}
                        </p>
                        <div className="mt-3 flex gap-2.5">
                          {[
                            { val: true, label: 'Đúng (True)' },
                            { val: false, label: 'Sai (False)' },
                          ].map((choice) => {
                            const isThisPicked = picked === choice.val;
                            const isThisCorrect = tf.isTrue === choice.val;
                            let cls = 'border-border bg-surface text-text-primary hover:border-primary';
                            if (isAnswered) {
                              if (isThisCorrect) {
                                cls = 'border-[#10B981] bg-[#10B981]/15 text-[#065F46] dark:text-[#6EE7B7]';
                              } else if (isThisPicked) {
                                cls = 'border-[#EF4444] bg-[#EF4444]/12 text-[#991B1B]';
                              } else {
                                cls = 'border-border/50 bg-surface/50 text-text-muted opacity-65';
                              }
                            }
                            return (
                              <button
                                key={String(choice.val)}
                                type="button"
                                disabled={isAnswered}
                                onClick={() =>
                                  setTfAnswers((prev) => ({ ...prev, [tf.id]: choice.val }))
                                }
                                className={`flex cursor-pointer items-center gap-1.5 rounded-xl border-2 px-4 py-2 text-xs font-extrabold transition-colors disabled:cursor-default ${cls}`}
                              >
                                {isAnswered && isThisCorrect && <CheckCircle2 size={14} />}
                                {choice.label}
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && (
                          <div
                            className={`mt-3 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                              isCorrect
                                ? 'bg-[#10B981]/10 text-[#065F46] dark:text-[#A7F3D0]'
                                : 'bg-[#F59E0B]/12 text-[#92400E] dark:text-[#FDE68A]'
                            }`}
                          >
                            <p className="font-extrabold">
                              Dẫn chứng trong bài: &ldquo;{tf.evidenceEn}&rdquo;
                            </p>
                            <p className="mt-1">{tf.explanationVi}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <QuizBlock
                title="Bài tập 2 · Câu hỏi đọc hiểu chi tiết"
                questions={pack.reading.questions}
                answers={answers}
                onSelect={handleSelectAnswer}
              />

              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="duo-btn duo-btn-surface duo-btn-sm"
                >
                  <ArrowLeft size={15} aria-hidden />
                  Quay lại đoạn văn
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Focused Lesson Completion Banner on Step 3 */}
      {focusedSkill && currentStep === 3 && onCompleteLesson && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#10B981]/30 bg-[#10B981]/8 p-5">
          <div className="flex items-center gap-3.5">
            <LumoLiveMascot mood="happy" size={52} trackCursor interactive />
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#059669] dark:text-[#6EE7B7]">
                Tiến độ · {currentDone}/{currentTotal} câu
              </p>
              <p className="mt-0.5 text-base font-extrabold text-text-primary">
                {currentDone >= currentTotal
                  ? `Tuyệt vời! Xong Bài ${lessonNumber ?? ''} rồi!`
                  : `Làm xong các câu trên rồi sang bài tiếp theo nhé.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCompleteLesson}
            className="duo-btn duo-btn-amber shrink-0"
          >
            <CheckCircle2 size={16} aria-hidden />
            {nextLessonLabel ? `Hoàn thành & Sang ${nextLessonLabel}` : 'Hoàn thành bài học'}
            <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
