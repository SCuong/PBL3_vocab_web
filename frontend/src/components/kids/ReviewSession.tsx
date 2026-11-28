import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Heart, RotateCcw, Star, Trophy, Volume2 } from 'lucide-react';
import { GRADE1_ALL_WORDS, type Grade1Word } from '../../data/grade1Curriculum';
import { playPronunciationAudio, stopPronunciationAudio } from '../../utils/audio';
import { recordSm2Review } from '../../utils/sm2';

interface ReviewSessionProps {
  title: string;
  subtitle: string;
  words: Grade1Word[];
  backdropUrl: string;
  onExit: () => void;
  onComplete: (stars: number) => void;
}

type QuestionKind = 'listen' | 'sentence';

type ReviewQuestion = {
  kind: QuestionKind;
  target: Grade1Word;
  choices: Grade1Word[];
};

const GUIDE_AUDIO = {
  listenTap: '/audio/g1/guide-listen-tap.mp3',
  sentence: '/audio/g1/guide-sentence.mp3',
  correct: '/audio/g1/guide-correct.mp3',
  tryAgain: '/audio/g1/guide-try-again.mp3',
  victory: '/audio/g1/guide-victory.mp3',
} as const;

function pickChoices(target: Grade1Word, pool: Grade1Word[], count: number): Grade1Word[] {
  const source = pool.length >= count ? pool : GRADE1_ALL_WORDS;
  const others = source
    .filter((w) => w.slug !== target.slug)
    .sort(() => Math.random() - 0.5)
    .slice(0, count - 1);
  return [target, ...others].sort(() => Math.random() - 0.5);
}

export function ReviewSession({
  title,
  subtitle,
  words,
  backdropUrl,
  onExit,
  onComplete,
}: ReviewSessionProps) {
  const questions = useMemo<ReviewQuestion[]>(() => {
    const selected = words.slice(0, 6);
    return selected.map((w, idx) => ({
      kind: idx % 3 === 2 ? 'sentence' : 'listen',
      target: w,
      choices: pickChoices(w, words, 4),
    }));
  }, [words]);

  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [mistakes, setMistakes] = useState(0);
  const [hadWrongOnCurrent, setHadWrongOnCurrent] = useState(false);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [wrongSlug, setWrongSlug] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [done, setDone] = useState(false);

  const current = questions[index];

  const playClip = useCallback((url: string, onEnd?: () => void) => {
    stopPronunciationAudio();
    setIsSpeaking(true);
    playPronunciationAudio(url, undefined, () => {
      setIsSpeaking(false);
      onEnd?.();
    });
  }, []);

  useEffect(() => {
    if (done) {
      const t = window.setTimeout(() => playClip(GUIDE_AUDIO.victory), 200);
      return () => window.clearTimeout(t);
    }
    if (!current) return;
    const clip = current.kind === 'sentence' ? current.target.exampleAudioUrl : current.target.audioUrl;
    const t = window.setTimeout(() => {
      if (index === 0) {
        playClip(GUIDE_AUDIO.listenTap, () => playClip(clip));
      } else {
        playClip(clip);
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [index, current, done, playClip]);

  useEffect(() => {
    return () => stopPronunciationAudio();
  }, []);

  const handlePick = (picked: Grade1Word) => {
    if (!current || feedback === 'correct') return;
    if (picked.slug === current.target.slug) {
      setFeedback('correct');
      setWrongSlug(null);
      // Update SM-2 spaced repetition schedule!
      recordSm2Review(current.target.slug, hadWrongOnCurrent ? 3 : 5);
      playClip(GUIDE_AUDIO.correct);
      window.setTimeout(() => {
        setFeedback('idle');
        setHadWrongOnCurrent(false);
        if (index + 1 < questions.length) {
          setIndex((i) => i + 1);
        } else {
          const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
          setDone(true);
          onComplete(stars);
        }
      }, 900);
    } else {
      setFeedback('wrong');
      setWrongSlug(picked.slug);
      setHadWrongOnCurrent(true);
      setMistakes((m) => m + 1);
      setHearts((h) => Math.max(1, h - 1));
      recordSm2Review(current.target.slug, 1);
      const retryClip =
        current.kind === 'sentence' ? current.target.exampleAudioUrl : current.target.audioUrl;
      playClip(GUIDE_AUDIO.tryAgain, () => playClip(retryClip));
      window.setTimeout(() => {
        setFeedback('idle');
        setWrongSlug(null);
      }, 750);
    }
  };

  const earnedStars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  const progressPercent = done ? 100 : Math.round(((index + 1) / Math.max(1, questions.length)) * 100);

  return (
    <div className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 top-14 z-0">
        <img src={backdropUrl} alt="" className="h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/35 to-[#f5f7fb]/75" />
      </div>

      <div className="relative z-10 mx-auto max-w-[820px] px-4 pt-5 pb-20 sm:px-6">
        <header className="mb-5 flex items-center gap-3 sm:gap-4">
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

        {done ? (
          <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-8 text-center shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FEF3C7] text-[#D97706]">
              <Trophy size={42} />
            </div>
            <h2 className="mt-4 text-3xl font-black text-text-primary">Xuất sắc quá bé ơi!</h2>
            <p className="mt-1 text-sm font-bold text-text-secondary">{title}</p>

            <div className="mt-5 flex justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={40}
                  className={s <= earnedStars ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-border'}
                />
              ))}
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3 border-t border-border/60 pt-6">
              <button
                type="button"
                onClick={() => {
                  setIndex(0);
                  setHearts(3);
                  setMistakes(0);
                  setHadWrongOnCurrent(false);
                  setDone(false);
                }}
                className="duo-btn duo-btn-surface"
              >
                <RotateCcw size={18} />
                Ôn lại
              </button>
              <button type="button" onClick={onExit} className="duo-btn duo-btn-amber !px-8">
                Về bản đồ
              </button>
            </div>
          </section>
        ) : current ? (
          <section className="cinema-content-in rounded-[32px] border-[3px] border-white bg-white/95 p-6 shadow-[0_20px_44px_-18px_rgba(17,16,25,0.2)] sm:p-8">
            <div className="mb-5 text-center">
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {title} · Câu {index + 1}/{questions.length}
              </p>
              <h2 className="mt-1 text-xl font-black text-text-primary sm:text-2xl">
                {current.kind === 'sentence'
                  ? current.target.exampleEn.replace(
                      new RegExp(`\\b${current.target.word}\\b`, 'i'),
                      '____',
                    )
                  : subtitle}
              </h2>
              {current.kind === 'sentence' && (
                <p className="mt-1 text-sm font-bold text-text-secondary">
                  {current.target.exampleVi}
                </p>
              )}
            </div>

            {/* Clean Picture Grid — zero overlaid buttons on photos */}
            <div className="grid grid-cols-2 gap-4">
              {current.choices.map((w) => {
                const isCorrect = feedback === 'correct' && w.slug === current.target.slug;
                const isWrong = wrongSlug === w.slug;
                return (
                  <button
                    key={w.slug}
                    type="button"
                    onClick={() => handlePick(w)}
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
                        {current.kind === 'sentence' ? w.word : w.meaningVi}
                      </span>
                      {isCorrect && <Check size={20} strokeWidth={3} className="text-[#10B981]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dedicated Bottom Control Area — separated from pictures */}
            <div className="mt-6 flex justify-center border-t border-border/60 pt-5">
              <button
                type="button"
                onClick={() =>
                  playClip(
                    current.kind === 'sentence'
                      ? current.target.exampleAudioUrl
                      : current.target.audioUrl,
                  )
                }
                className={`duo-btn duo-btn-amber !px-7 !py-3.5 ${
                  isSpeaking ? 'ring-4 ring-[#F59E0B]/40' : ''
                }`}
              >
                <Volume2 size={22} aria-hidden />
                Nghe lại
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
