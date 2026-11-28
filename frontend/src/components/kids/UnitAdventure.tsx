import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  Mic,
  Music,
  PenTool,
  RotateCcw,
  Star,
  Trophy,
  Volume2,
} from 'lucide-react';
import type { Grade1Unit, Grade1Word } from '../../data/grade1Curriculum';
import { playPronunciationAudio, stopPronunciationAudio } from '../../utils/audio';
import { markSm2Introduced, recordSm2Review } from '../../utils/sm2';
import { LookAndTraceCanvas } from './LookAndTraceCanvas';
import { ListenAndChant } from './ListenAndChant';

type Stage =
  | 'lookTrace'
  | 'repeat1'
  | 'listenTick'
  | 'repeat2'
  | 'listenChant'
  | 'letsTalk'
  | 'bossQuiz'
  | 'victory';

interface UnitAdventureProps {
  unit: Grade1Unit;
  onExit: () => void;
  onComplete: (stars: number) => void;
  onNextUnit?: () => void;
}

type BossQuestion = {
  kind: 'tick' | 'sentence';
  target: Grade1Word;
};

const GUIDE_AUDIO = {
  trace: '/audio/g1/guide-trace.mp3',
  word: '/audio/g1/guide-word.mp3',
  tick: '/audio/g1/guide-tick.mp3',
  chant: '/audio/g1/guide-chant.mp3',
  sentence: '/audio/g1/guide-sentence.mp3',
  correct: '/audio/g1/guide-correct.mp3',
  tryAgain: '/audio/g1/guide-try-again.mp3',
  victory: '/audio/g1/guide-victory.mp3',
} as const;

const STAGE_STEPS: { id: Stage; label: string }[] = [
  { id: 'lookTrace', label: 'Tô chữ' },
  { id: 'repeat1', label: 'Đọc 1–2' },
  { id: 'listenTick', label: 'Nghe & Tích' },
  { id: 'repeat2', label: 'Đọc 3–4' },
  { id: 'listenChant', label: 'Đọc vè' },
  { id: 'letsTalk', label: 'Nói câu' },
  { id: 'bossQuiz', label: 'Thử thách' },
];

function shuffleArray<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (s * 9301 + 49297) % 233280;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function UnitAdventure({
  unit,
  onExit,
  onComplete,
  onNextUnit,
}: UnitAdventureProps) {
  const [stage, setStage] = useState<Stage>('lookTrace');
  const [subIndex, setSubIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [hadWrongOnCurrent, setHadWrongOnCurrent] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [micPraised, setMicPraised] = useState(false);
  const [traceDone, setTraceDone] = useState(false);
  const [showIdleHand, setShowIdleHand] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  // Feedback for Listen & Tick and Boss Quiz
  const [pickFeedback, setPickFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [wrongSlug, setWrongSlug] = useState<string | null>(null);

  const firstPair = useMemo(() => unit.words.slice(0, 2), [unit]);
  const secondPair = useMemo(() => unit.words.slice(2, 4), [unit]);

  const tickOrder = useMemo(
    () => shuffleArray(firstPair, unit.unit * 13 + 5),
    [firstPair, unit.unit],
  );

  // Final Unit Boss Check: 2 Listen & Tick across all 4 words + 1 Complete-the-Sentence
  const bossQuestions = useMemo<BossQuestion[]>(() => {
    const mixed = shuffleArray(unit.words, unit.unit * 41 + 7);
    return [
      { kind: 'tick', target: mixed[0] },
      { kind: 'tick', target: mixed[1] },
      { kind: 'sentence', target: mixed[2] ?? mixed[0] },
    ];
  }, [unit]);

  const playClip = useCallback((url: string, onEnd?: () => void) => {
    stopPronunciationAudio();
    setIsSpeaking(true);
    playPronunciationAudio(url, undefined, () => {
      setIsSpeaking(false);
      onEnd?.();
    });
  }, []);

  const resetIdleTimer = useCallback(() => {
    setShowIdleHand(false);
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => setShowIdleHand(true), 4500);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, [stage, subIndex, resetIdleTimer]);

  // Reset on unit change
  useEffect(() => {
    stopPronunciationAudio();
    setStage('lookTrace');
    setSubIndex(0);
    setHearts(3);
    setMistakes(0);
    setHadWrongOnCurrent(false);
    setPickFeedback('idle');
    setWrongSlug(null);
    setIsListeningMic(false);
    setMicPraised(false);
    setTraceDone(false);
  }, [unit.unit]);

  useEffect(() => {
    return () => stopPronunciationAudio();
  }, []);

  // Voice-First Auto-Guidance + silent SM-2 tracking
  useEffect(() => {
    setMicPraised(false);
    setIsListeningMic(false);

    if (stage === 'lookTrace') {
      const t = window.setTimeout(() => {
        playClip(GUIDE_AUDIO.trace, () => playClip(unit.phonicsAudioUrl));
      }, 200);
      return () => window.clearTimeout(t);
    }
    if (stage === 'repeat1') {
      const w = firstPair[subIndex];
      if (w) {
        markSm2Introduced(w.slug);
        const t = window.setTimeout(() => playClip(w.audioUrl), 180);
        return () => window.clearTimeout(t);
      }
    }
    if (stage === 'listenTick') {
      const w = tickOrder[subIndex];
      if (w) {
        const t = window.setTimeout(() => {
          if (subIndex === 0) {
            playClip(GUIDE_AUDIO.tick, () => playClip(w.audioUrl));
          } else {
            playClip(w.audioUrl);
          }
        }, 180);
        return () => window.clearTimeout(t);
      }
    }
    if (stage === 'repeat2') {
      const w = secondPair[subIndex];
      if (w) {
        markSm2Introduced(w.slug);
        const t = window.setTimeout(() => playClip(w.audioUrl), 180);
        return () => window.clearTimeout(t);
      }
    }
    if (stage === 'listenChant') {
      const t = window.setTimeout(() => playClip(GUIDE_AUDIO.chant), 180);
      return () => window.clearTimeout(t);
    }
    if (stage === 'letsTalk') {
      const w = unit.words[subIndex];
      if (w) {
        const t = window.setTimeout(() => {
          if (subIndex === 0) {
            playClip(GUIDE_AUDIO.sentence, () => playClip(w.exampleAudioUrl));
          } else {
            playClip(w.exampleAudioUrl);
          }
        }, 180);
        return () => window.clearTimeout(t);
      }
    }
    if (stage === 'bossQuiz') {
      const q = bossQuestions[subIndex];
      if (q) {
        const clip = q.kind === 'sentence' ? q.target.exampleAudioUrl : q.target.audioUrl;
        const t = window.setTimeout(() => playClip(clip), 180);
        return () => window.clearTimeout(t);
      }
    }
    if (stage === 'victory') {
      const t = window.setTimeout(() => playClip(GUIDE_AUDIO.victory), 200);
      return () => window.clearTimeout(t);
    }
  }, [stage, subIndex, unit, firstPair, secondPair, tickOrder, bossQuestions, playClip]);

  // Babilala-style kid-friendly Mic Speak & Repeat (uses Web Speech API when available, graceful cheer fallback)
  const handleMicRepeat = (targetText: string) => {
    resetIdleTimer();
    stopPronunciationAudio();
    setIsListeningMic(true);
    setMicPraised(false);

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (() => void) | null; onerror: (() => void) | null; onend: (() => void) | null } }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (() => void) | null; onerror: (() => void) | null; onend: (() => void) | null } }).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'en-US';
        rec.interimResults = false;
        let finished = false;
        const cheer = () => {
          if (finished) return;
          finished = true;
          setIsListeningMic(false);
          setMicPraised(true);
          playClip(GUIDE_AUDIO.correct);
        };
        rec.onresult = cheer;
        rec.onerror = cheer;
        rec.onend = cheer;
        rec.start();
        window.setTimeout(() => {
          try {
            rec.stop();
          } catch {
            // ignore
          }
          cheer();
        }, 2600);
        return;
      } catch {
        // fallback below
      }
    }

    // Graceful visual listening animation when microphone isn't available
    void targetText;
    window.setTimeout(() => {
      setIsListeningMic(false);
      setMicPraised(true);
      playClip(GUIDE_AUDIO.correct);
    }, 1800);
  };

  const activeStepIdx = STAGE_STEPS.findIndex((s) => s.id === stage);
  const progressPercent =
    stage === 'victory'
      ? 100
      : Math.max(10, Math.round(((activeStepIdx + 1) / STAGE_STEPS.length) * 95));

  const finishAdventure = useCallback(
    (finalMistakes: number) => {
      const earnedStars = finalMistakes === 0 ? 3 : finalMistakes <= 2 ? 2 : 1;
      setStage('victory');
      onComplete(earnedStars);
    },
    [onComplete],
  );

  // Listen & Tick handler (Official Global Success checkbox tick activity)
  const handleTickPick = (picked: Grade1Word) => {
    resetIdleTimer();
    if (pickFeedback === 'correct') return;
    const target = tickOrder[subIndex];
    if (picked.slug === target.slug) {
      setPickFeedback('correct');
      setWrongSlug(null);
      recordSm2Review(target.slug, hadWrongOnCurrent ? 3 : 5);
      playClip(GUIDE_AUDIO.correct);
      window.setTimeout(() => {
        setPickFeedback('idle');
        setHadWrongOnCurrent(false);
        if (subIndex + 1 < tickOrder.length) {
          setSubIndex((i) => i + 1);
        } else {
          setSubIndex(0);
          setStage('repeat2');
        }
      }, 900);
    } else {
      setPickFeedback('wrong');
      setWrongSlug(picked.slug);
      setHadWrongOnCurrent(true);
      setMistakes((m) => m + 1);
      setHearts((h) => Math.max(1, h - 1));
      recordSm2Review(target.slug, 1);
      playClip(GUIDE_AUDIO.tryAgain, () => playClip(target.audioUrl));
      window.setTimeout(() => {
        setPickFeedback('idle');
        setWrongSlug(null);
      }, 700);
    }
  };

  // Boss Quiz handler (Listen & Tick + Complete the Sentence)
  const handleBossPick = (picked: Grade1Word) => {
    resetIdleTimer();
    if (pickFeedback === 'correct') return;
    const q = bossQuestions[subIndex];
    if (picked.slug === q.target.slug) {
      setPickFeedback('correct');
      setWrongSlug(null);
      recordSm2Review(q.target.slug, hadWrongOnCurrent ? 3 : 5);
      playClip(GUIDE_AUDIO.correct, () => {
        if (q.kind === 'sentence') playClip(q.target.exampleAudioUrl);
      });
      window.setTimeout(() => {
        setPickFeedback('idle');
        setHadWrongOnCurrent(false);
        if (subIndex + 1 < bossQuestions.length) {
          setSubIndex((i) => i + 1);
        } else {
          finishAdventure(mistakes);
        }
      }, q.kind === 'sentence' ? 1200 : 850);
    } else {
      setPickFeedback('wrong');
      setWrongSlug(picked.slug);
      setHadWrongOnCurrent(true);
      setMistakes((m) => m + 1);
      setHearts((h) => Math.max(1, h - 1));
      recordSm2Review(q.target.slug, 1);
      const retryClip = q.kind === 'sentence' ? q.target.exampleAudioUrl : q.target.audioUrl;
      playClip(GUIDE_AUDIO.tryAgain, () => playClip(retryClip));
      window.setTimeout(() => {
        setPickFeedback('idle');
        setWrongSlug(null);
      }, 700);
    }
  };

  const earnedStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const stageBg =
    unit.semester === 1 ? '/illustrations/map-hk1-bg.webp' : '/illustrations/map-hk2-bg.webp';

  const renderRepeatStage = (pair: Grade1Word[], isFirstHalf: boolean) => {
    const w = pair[subIndex];
    if (!w) return null;
    const globalNumber = isFirstHalf ? subIndex + 1 : subIndex + 3;
    const isLastInPair = subIndex + 1 >= pair.length;

    return (
      <section
        key={`word-${w.slug}`}
        className="cinema-content-in overflow-hidden rounded-[32px] border-[3px] border-white bg-white/95 p-6 shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-primary-light px-3.5 py-1 text-xs font-black text-primary">
            Listen &amp; Repeat · Từ {globalNumber} / {unit.words.length}
          </span>
          <span className="text-xs font-bold text-text-secondary">
            Chạm tranh để nghe · Bấm micro để đọc theo
          </span>
        </div>

        {/* PURE PHOTO STAGE — zero overlaid buttons on the photo */}
        <div className="grid items-center gap-6 md:grid-cols-12">
          <button
            type="button"
            onClick={() => {
              resetIdleTimer();
              playClip(w.audioUrl);
            }}
            className={`cursor-pointer overflow-hidden rounded-3xl border-4 bg-bg-secondary transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] md:col-span-6 ${
              isSpeaking ? 'border-[#F59E0B] ring-4 ring-[#F59E0B]/30' : 'border-border/60'
            }`}
          >
            <img src={w.imageUrl} alt={w.word} className="aspect-[4/3] w-full object-cover" />
          </button>

          <div className="text-center md:col-span-6 md:text-left">
            <h2 className="text-4xl font-black tracking-tight text-text-primary sm:text-5xl">
              {w.word}
            </h2>
            <p className="mt-1 text-base font-bold text-text-secondary">{w.ipa}</p>
            <p className="mt-2 text-2xl font-extrabold text-primary">{w.meaningVi}</p>

            {/* Babilala-style Speak & Repeat pill cleanly in the text column */}
            <div className="mt-4 flex justify-center md:justify-start">
              <button
                type="button"
                onClick={() => handleMicRepeat(w.word)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition-all ${
                  isListeningMic
                    ? 'animate-pulse border-[#EF4444] bg-[#FEF2F2] text-[#DC2626]'
                    : micPraised
                      ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
                      : 'border-primary/30 bg-primary-light/60 text-primary hover:border-primary'
                }`}
              >
                <Mic size={18} />
                {isListeningMic
                  ? 'Đang nghe bé đọc...'
                  : micPraised
                    ? 'Giỏi quá! Đọc rất hay!'
                    : 'Đọc theo Lumo'}
              </button>
            </div>
          </div>
        </div>

        {/* DEDICATED BOTTOM CONTROL AREA — separated from the picture */}
        <div className="mt-7 flex items-center justify-center gap-4 border-t border-border/60 pt-5">
          <button
            type="button"
            onClick={() => {
              resetIdleTimer();
              playClip(w.audioUrl);
            }}
            aria-label="Nghe lại từ"
            className="duo-btn duo-btn-surface h-14 w-14 !rounded-full !p-0"
          >
            <Volume2 size={24} />
          </button>

            <button
              type="button"
              onClick={() => {
                resetIdleTimer();
                if (!isLastInPair) {
                  setSubIndex((i) => i + 1);
                } else {
                  setSubIndex(0);
                  setHadWrongOnCurrent(false);
                  setStage(isFirstHalf ? 'listenTick' : 'listenChant');
                }
              }}
              className={`duo-btn duo-btn-amber !px-8 !py-4 !text-lg ${
                showIdleHand ? 'ring-4 ring-[#F59E0B]/45' : ''
              }`}
            >
              {isLastInPair ? (isFirstHalf ? 'Nghe & Tích' : 'Đọc vè vui') : 'Tiếp theo'}
              <ArrowRight size={22} aria-hidden />
            </button>
        </div>
      </section>
    );
  };

  return (
    <div className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 top-14 z-0">
        <img src={stageBg} alt="" className="h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/35 to-[#f5f7fb]/75" />
      </div>

      <div className="relative z-10 mx-auto max-w-[840px] px-4 pt-5 pb-20 sm:px-6">
        <header className="mb-4 flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onExit}
            className="duo-btn duo-btn-surface duo-btn-sm shrink-0"
          >
            <ArrowLeft size={16} aria-hidden />
            Bản đồ
          </button>

          <div className="duo-progress-track flex-1 bg-white/90">
            <div className="duo-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 shadow-xs">
            {[1, 2, 3].map((n) => (
              <Heart
                key={n}
                size={16}
                className={n <= hearts ? 'fill-[#EF4444] text-[#EF4444]' : 'text-border'}
                aria-hidden
              />
            ))}
          </div>
        </header>

        {/* Global Success Activity Breadcrumb */}
        {stage !== 'victory' && (
          <div className="mb-4 flex items-center justify-center gap-1.5 overflow-x-auto py-1">
            {STAGE_STEPS.map((step, i) => {
              const isDone = i < activeStepIdx;
              const isCurrent = i === activeStepIdx;
              return (
                <span
                  key={step.id}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white shadow-xs'
                      : isDone
                        ? 'bg-[#D1FAE5] text-[#047857]'
                        : 'bg-white/80 text-text-secondary'
                  }`}
                >
                  {step.label}
                </span>
              );
            })}
          </div>
        )}

        {/* STAGE 1: LOOK & TRACE (Official Global Success Interactive Letter Tracing!) */}
        {stage === 'lookTrace' && (
          <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-6 text-center shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3.5 py-1 text-xs font-black text-primary">
                <PenTool size={14} />
                Look &amp; Trace · Unit {unit.unit}
              </span>
              <span className="rounded-full bg-[#FEF3C7] px-3.5 py-1 text-xs font-black text-[#B45309]">
                Âm {unit.phonicsLetter} · {unit.phonicsSound}
              </span>
            </div>

            <LookAndTraceCanvas
              letter={unit.phonicsLetter}
              color={unit.color}
              onComplete={() => {
                setTraceDone(true);
                playClip(GUIDE_AUDIO.correct);
              }}
              onReset={() => setTraceDone(false)}
            />

            <p className="mt-4 text-xl font-black text-text-primary">{unit.phonicsPrompt}</p>

            {/* Dedicated Bottom Control Area */}
            <div className="mt-6 flex items-center justify-center gap-4 border-t border-border/60 pt-5">
              <button
                type="button"
                onClick={() => {
                  resetIdleTimer();
                  playClip(unit.phonicsAudioUrl);
                }}
                aria-label="Nghe lại âm"
                className="duo-btn duo-btn-surface h-14 w-14 !rounded-full !p-0"
              >
                <Volume2 size={24} />
              </button>

              {traceDone && (
                <button
                  type="button"
                  onClick={() => {
                    resetIdleTimer();
                    setSubIndex(0);
                    setStage('repeat1');
                  }}
                  className={`cinema-content-in duo-btn duo-btn-amber !px-8 !py-4 !text-lg ${
                    showIdleHand ? 'ring-4 ring-[#F59E0B]/45' : ''
                  }`}
                >
                  Học từ mới
                </button>
              )}
            </div>
          </section>
        )}

        {/* STAGE 2: LISTEN & REPEAT (Words 1–2) */}
        {stage === 'repeat1' && renderRepeatStage(firstPair, true)}

        {/* STAGE 3: LISTEN & TICK (Official Global Success Checkbox Tick Activity!) */}
        {stage === 'listenTick' && (() => {
          const target = tickOrder[subIndex];
          if (!target) return null;
          return (
            <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-6 shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8">
              <div className="mb-5 text-center">
                <span className="rounded-full bg-[#FEF3C7] px-3.5 py-1 text-xs font-black text-[#B45309]">
                  Listen &amp; Tick ✓ · Câu {subIndex + 1} / {tickOrder.length}
                </span>
                <h2 className="mt-2 text-2xl font-black text-text-primary">
                  Nghe và tích ✓ vào tranh đúng nhé!
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {firstPair.map((w) => {
                  const isCorrect = pickFeedback === 'correct' && w.slug === target.slug;
                  const isWrong = wrongSlug === w.slug;
                  return (
                    <button
                      key={w.slug}
                      type="button"
                      onClick={() => handleTickPick(w)}
                      className={`cursor-pointer overflow-hidden rounded-3xl border-4 bg-white text-left transition-transform duration-150 hover:-translate-y-1 active:scale-[0.97] ${
                        isCorrect
                          ? 'border-[#10B981] ring-4 ring-[#10B981]/30'
                          : isWrong
                            ? 'border-[#EF4444] opacity-75'
                            : 'border-border hover:border-primary'
                      }`}
                    >
                      <img
                        src={w.imageUrl}
                        alt={w.meaningVi}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {/* Official Global Success Tick Box cleanly below the photo */}
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-base font-black text-text-primary">{w.meaningVi}</span>
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-colors ${
                            isCorrect
                              ? 'border-[#10B981] bg-[#10B981] text-white'
                              : 'border-border bg-bg-secondary/60 text-transparent'
                          }`}
                        >
                          <Check size={22} strokeWidth={3.5} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center border-t border-border/60 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    resetIdleTimer();
                    playClip(target.audioUrl);
                  }}
                  className={`duo-btn duo-btn-amber !px-7 !py-3.5 ${
                    isSpeaking ? 'ring-4 ring-[#F59E0B]/40' : ''
                  }`}
                >
                  <Volume2 size={22} aria-hidden />
                  Nghe lại
                </button>
              </div>
            </section>
          );
        })()}

        {/* STAGE 4: LISTEN & REPEAT (Words 3–4) */}
        {stage === 'repeat2' && renderRepeatStage(secondPair, false)}

        {/* STAGE 5: LISTEN & CHANT (Official Global Success Rhythmic Chant!) */}
        {stage === 'listenChant' && (
          <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-6 shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8">
            <div className="mb-5 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE9FE] px-3.5 py-1 text-xs font-black text-primary">
                <Music size={14} />
                Listen &amp; Chant · Vè nhịp điệu
              </span>
              <h2 className="mt-2 text-2xl font-black text-text-primary">
                Vỗ tay và đọc vè cùng Lumo nhé!
              </h2>
            </div>

            <ListenAndChant
              unit={unit}
              onChantPlayed={() => {
                resetIdleTimer();
              }}
            />

            <div className="mt-6 flex justify-center border-t border-border/60 pt-5">
              <button
                type="button"
                onClick={() => {
                  resetIdleTimer();
                  setSubIndex(0);
                  setStage('letsTalk');
                }}
                className={`duo-btn duo-btn-amber !px-8 !py-4 !text-lg ${
                  showIdleHand ? 'ring-4 ring-[#F59E0B]/45' : ''
                }`}
              >
                Học nói câu
                <ArrowRight size={22} aria-hidden />
              </button>
            </div>
          </section>
        )}

        {/* STAGE 6: LET'S TALK (Global Success Sentence Practice) */}
        {stage === 'letsTalk' && (() => {
          const w = unit.words[subIndex];
          if (!w) return null;
          const totalSentences = Math.min(2, unit.words.length);
          const isLastSentence = subIndex + 1 >= totalSentences;

          return (
            <section
              key={`sent-${w.slug}`}
              className="cinema-content-in overflow-hidden rounded-[32px] border-[3px] border-white bg-white/95 p-6 shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3.5 py-1 text-xs font-black text-primary">
                  <MessageCircle size={14} />
                  Let&apos;s Talk · Mẫu câu {subIndex + 1} / {totalSentences}
                </span>
                <span className="text-xs font-bold text-text-secondary">
                  {unit.patternTemplate}
                </span>
              </div>

              <div className="grid items-center gap-6 md:grid-cols-12">
                <button
                  type="button"
                  onClick={() => {
                    resetIdleTimer();
                    playClip(w.exampleAudioUrl);
                  }}
                  className={`cursor-pointer overflow-hidden rounded-3xl border-4 bg-bg-secondary transition-transform hover:scale-[1.01] md:col-span-5 ${
                    isSpeaking ? 'border-[#F59E0B] ring-4 ring-[#F59E0B]/30' : 'border-border/60'
                  }`}
                >
                  <img src={w.imageUrl} alt={w.word} className="aspect-[4/3] w-full object-cover" />
                </button>

                <div className="rounded-3xl border-2 border-primary/20 bg-primary-light/40 p-5 text-center md:col-span-7 md:text-left">
                  <p className="text-2xl font-black leading-snug text-text-primary sm:text-3xl">
                    “{w.exampleEn}”
                  </p>
                  <p className="mt-2 text-base font-bold text-text-secondary">{w.exampleVi}</p>
                  <div className="mt-4 flex justify-center md:justify-start">
                    <button
                      type="button"
                      onClick={() => handleMicRepeat(w.exampleEn)}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 px-4 py-2 text-sm font-black transition-all ${
                        isListeningMic
                          ? 'animate-pulse border-[#EF4444] bg-[#FEF2F2] text-[#DC2626]'
                          : micPraised
                            ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
                            : 'border-primary/30 bg-white text-primary hover:border-primary'
                      }`}
                    >
                      <Mic size={17} />
                      {isListeningMic
                        ? 'Đang nghe bé nói...'
                        : micPraised
                          ? 'Nói chuẩn quá bé ơi!'
                          : 'Nói câu này cùng Lumo'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex items-center justify-center gap-4 border-t border-border/60 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    resetIdleTimer();
                    playClip(w.exampleAudioUrl);
                  }}
                  aria-label="Nghe lại câu"
                  className="duo-btn duo-btn-surface h-14 w-14 !rounded-full !p-0"
                >
                  <Volume2 size={24} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetIdleTimer();
                    if (!isLastSentence) {
                      setSubIndex((i) => i + 1);
                    } else {
                      setSubIndex(0);
                      setHadWrongOnCurrent(false);
                      setStage('bossQuiz');
                    }
                  }}
                  className={`duo-btn duo-btn-amber !px-8 !py-4 !text-lg ${
                    showIdleHand ? 'ring-4 ring-[#F59E0B]/45' : ''
                  }`}
                >
                  {isLastSentence ? 'Thử thách cuối Unit' : 'Câu tiếp theo'}
                  <ArrowRight size={22} aria-hidden />
                </button>
              </div>
            </section>
          );
        })()}

        {/* STAGE 7: FINAL UNIT BOSS CHECK (Listen & Tick + Complete the Sentence) */}
        {stage === 'bossQuiz' && (() => {
          const q = bossQuestions[subIndex];
          if (!q) return null;
          const blankSentence = q.target.exampleEn.replace(
            new RegExp(`\\b${q.target.word}\\b`, 'i'),
            '____',
          );
          return (
            <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-6 shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8">
              <div className="mb-5 text-center">
                <span className="rounded-full bg-[#FEF3C7] px-3.5 py-1 text-xs font-black text-[#B45309]">
                  Thử thách cuối Unit · Câu {subIndex + 1} / {bossQuestions.length}
                </span>
                <h2 className="mt-2 text-2xl font-black text-text-primary">
                  {q.kind === 'sentence' ? blankSentence : 'Nghe và tích ✓ vào tranh đúng nhé!'}
                </h2>
                {q.kind === 'sentence' && (
                  <p className="mt-1 text-sm font-bold text-text-secondary">
                    {q.target.exampleVi}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {unit.words.map((w) => {
                  const isCorrect = pickFeedback === 'correct' && w.slug === q.target.slug;
                  const isWrong = wrongSlug === w.slug;
                  return (
                    <button
                      key={w.slug}
                      type="button"
                      onClick={() => handleBossPick(w)}
                      className={`cursor-pointer overflow-hidden rounded-3xl border-4 bg-white text-left transition-transform duration-150 hover:-translate-y-1 active:scale-[0.97] ${
                        isCorrect
                          ? 'border-[#10B981] ring-4 ring-[#10B981]/30'
                          : isWrong
                            ? 'border-[#EF4444] opacity-75'
                            : 'border-border hover:border-primary'
                      }`}
                    >
                      <img
                        src={w.imageUrl}
                        alt={w.meaningVi}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-base font-black text-text-primary">
                          {q.kind === 'sentence' ? w.word : w.meaningVi}
                        </span>
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 ${
                            isCorrect
                              ? 'border-[#10B981] bg-[#10B981] text-white'
                              : 'border-border bg-bg-secondary/60 text-transparent'
                          }`}
                        >
                          <Check size={18} strokeWidth={3.5} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center border-t border-border/60 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    resetIdleTimer();
                    playClip(
                      q.kind === 'sentence' ? q.target.exampleAudioUrl : q.target.audioUrl,
                    );
                  }}
                  className={`duo-btn duo-btn-amber !px-7 !py-3.5 ${
                    isSpeaking ? 'ring-4 ring-[#F59E0B]/40' : ''
                  }`}
                >
                  <Volume2 size={22} aria-hidden />
                  Nghe lại
                </button>
              </div>
            </section>
          );
        })()}

        {/* STAGE 8: VICTORY */}
        {stage === 'victory' && (
          <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-8 text-center shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FEF3C7] text-[#D97706]">
              <Trophy size={42} />
            </div>
            <h2 className="mt-4 text-3xl font-black text-text-primary">
              Hoàn thành Unit {unit.unit}!
            </h2>
            <p className="mt-1 text-sm font-bold text-text-secondary">
              Bé giỏi quá! Đã tô chữ, đọc vè và nói được câu mẫu rồi!
            </p>

            <div className="mt-5 flex justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={44}
                  className={s <= earnedStars ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-border'}
                />
              ))}
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3 border-t border-border/60 pt-6">
              <button
                type="button"
                onClick={() => {
                  setStage('lookTrace');
                  setSubIndex(0);
                  setHearts(3);
                  setMistakes(0);
                  setTraceDone(false);
                }}
                className="duo-btn duo-btn-surface"
              >
                <RotateCcw size={18} />
                Chơi lại
              </button>
              {onNextUnit ? (
                <button
                  type="button"
                  onClick={onNextUnit}
                  className="duo-btn duo-btn-amber !px-8"
                >
                  Unit tiếp theo
                  <ArrowRight size={20} />
                </button>
              ) : (
                <button type="button" onClick={onExit} className="duo-btn duo-btn-amber !px-8">
                  Về bản đồ
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
