import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Gamepad2, Play, RotateCcw, Star, Volume2 } from 'lucide-react';
import { GRADE1_ALL_WORDS, GRADE1_UNITS, type Grade1Word } from '../data/grade1Curriculum';
import { playPronunciationAudio, stopPronunciationAudio } from '../utils/audio';
import { RiveMascot } from '../components/ui/RiveMascot';

type GameMode = 'hub' | 'listenTap' | 'phonicsPop' | 'speedMatch';
type Scope = 'all' | 'hk1' | 'hk2';

const GUIDE_CORRECT = '/audio/g1/guide-correct.mp3';
const GUIDE_TRY_AGAIN = '/audio/g1/guide-try-again.mp3';
const GUIDE_VICTORY = '/audio/g1/guide-victory.mp3';

function pickRandom<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export default function Games() {
  const [mode, setMode] = useState<GameMode>('hub');
  const [scope, setScope] = useState<Scope>('all');
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);

  // Listen & Tap Arcade state
  const [roundWords, setRoundWords] = useState<Grade1Word[]>([]);
  const [targetWord, setTargetWord] = useState<Grade1Word | null>(null);
  const [pickedSlug, setPickedSlug] = useState<string | null>(null);

  // Phonics Pop state
  const [popUnitIndex, setPopUnitIndex] = useState(0);
  const [popOptions, setPopOptions] = useState<Array<{ word: Grade1Word; isMatch: boolean }>>([]);
  const [poppedSlugs, setPoppedSlugs] = useState<string[]>([]);

  // Speed Match state
  const [matchPairs, setMatchPairs] = useState<Grade1Word[]>([]);
  const [matchSel, setMatchSel] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);

  const pool = useMemo(() => {
    if (scope === 'hk1') return GRADE1_ALL_WORDS.filter((w) => w.unit <= 8);
    if (scope === 'hk2') return GRADE1_ALL_WORDS.filter((w) => w.unit >= 9);
    return GRADE1_ALL_WORDS;
  }, [scope]);

  const unitPool = useMemo(() => {
    if (scope === 'hk1') return GRADE1_UNITS.filter((u) => u.semester === 1);
    if (scope === 'hk2') return GRADE1_UNITS.filter((u) => u.semester === 2);
    return GRADE1_UNITS;
  }, [scope]);

  useEffect(() => {
    return () => stopPronunciationAudio();
  }, []);

  const setupListenRound = useCallback((wordsPool: Grade1Word[]) => {
    const choices = pickRandom(wordsPool, 4);
    const target = choices[Math.floor(Math.random() * choices.length)];
    setRoundWords(choices);
    setTargetWord(target);
    setPickedSlug(null);
    if (target) {
      window.setTimeout(() => playPronunciationAudio(target.audioUrl), 180);
    }
  }, []);

  const setupPhonicsRound = useCallback(
    (uIdx: number) => {
      const u = unitPool[uIdx % unitPool.length];
      const others = pickRandom(
        GRADE1_ALL_WORDS.filter((w) => w.unit !== u.unit),
        4,
      );
      const mixed = pickRandom(
        [
          ...u.words.slice(0, 3).map((w) => ({ word: w, isMatch: true })),
          ...others.slice(0, 3).map((w) => ({ word: w, isMatch: false })),
        ],
        6,
      );
      setPopUnitIndex(uIdx % unitPool.length);
      setPopOptions(mixed);
      setPoppedSlugs([]);
      window.setTimeout(() => playPronunciationAudio(u.phonicsAudioUrl), 200);
    },
    [unitPool],
  );

  const startListenTap = () => {
    setMode('listenTap');
    setScore(0);
    setRound(1);
    setDone(false);
    setupListenRound(pool);
  };

  const startPhonicsPop = () => {
    setMode('phonicsPop');
    setScore(0);
    setRound(1);
    setDone(false);
    setupPhonicsRound(Math.floor(Math.random() * unitPool.length));
  };

  const startSpeedMatch = () => {
    setMode('speedMatch');
    setScore(0);
    setDone(false);
    setMatchPairs(pickRandom(pool, 4));
    setMatchSel([]);
    setMatched([]);
  };

  const speedMatchCards = useMemo(() => {
    const cards = matchPairs.flatMap((w) => [
      { id: `i-${w.slug}`, slug: w.slug, kind: 'image' as const, word: w },
      { id: `w-${w.slug}`, slug: w.slug, kind: 'audio' as const, word: w },
    ]);
    return pickRandom(cards, cards.length);
  }, [matchPairs]);

  // =========================================================================
  // BABILALA STORYBOOK GAME PARK HUB
  // =========================================================================
  if (mode === 'hub') {
    const gameCards = [
      {
        title: 'Nghe & Chạm tranh',
        sub: '8 lượt nghe vui nhộn',
        image: '/illustrations/game-listen-tap.webp',
        onPlay: startListenTap,
      },
      {
        title: 'Bong bóng Phonics',
        sub: 'Nhận diện âm Bb – Ww',
        image: '/illustrations/game-phonics-pop.webp',
        onPlay: startPhonicsPop,
      },
      {
        title: 'Ghép Loa & Hình',
        sub: 'Luyện tai nghe cực nhạy',
        image: '/illustrations/game-audio-match.webp',
        onPlay: startSpeedMatch,
      },
    ];

    return (
      <div className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 top-14 z-0">
          <img src="/illustrations/map-hk2-bg.webp" alt="" className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-[#f5f7fb]/75" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1060px] px-4 pt-6 pb-20 sm:px-6 lg:px-8">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-white/85 bg-white/92 p-4 shadow-sm backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-[0_4px_0_#B45309]">
                <Gamepad2 size={26} aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-text-primary">
                  Khu trò chơi cùng Lumo
                </h1>
                <p className="text-xs font-bold text-text-secondary">
                  Chọn 1 trò chơi bên dưới để săn sao vàng!
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-2xl border border-border bg-bg-secondary p-1">
              {[
                { id: 'all' as const, label: 'Cả năm' },
                { id: 'hk1' as const, label: 'Học kỳ 1' },
                { id: 'hk2' as const, label: 'Học kỳ 2' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setScope(item.id)}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
                    scope === item.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </header>

          {/* Full-Bleed Illustrated Babilala Game Posters */}
          <div className="grid gap-6 md:grid-cols-3">
            {gameCards.map((g) => (
              <button
                key={g.title}
                type="button"
                onClick={g.onPlay}
                className="group relative flex h-[340px] cursor-pointer flex-col justify-end overflow-hidden rounded-[32px] border-[3px] border-white text-left shadow-[0_18px_36px_-16px_rgba(17,16,25,0.35)] transition-transform duration-200 hover:-translate-y-1.5"
              >
                <img
                  src={g.image}
                  alt={g.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(17,16,25,0.05) 30%, rgba(17,16,25,0.86) 100%)',
                  }}
                />
                <div className="relative z-10 p-6">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#FCD34D]">
                    {g.sub}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">{g.title}</h2>
                  <span className="duo-btn duo-btn-amber duo-btn-sm mt-4 inline-flex">
                    <Play size={15} fill="currentColor" /> Chơi ngay
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VICTORY SCREEN
  // =========================================================================
  if (done) {
    return (
      <div className="mx-auto max-w-[600px] px-4 pt-10 pb-16 text-center">
        <div className="rounded-[32px] border-[3px] border-[#F59E0B] bg-white p-8 shadow-md">
          <div className="flex justify-center">
            <RiveMascot src="/animations/lumo-rive.riv" size={96} />
          </div>
          <div className="mt-4 flex justify-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <Star key={s} size={38} className="fill-[#F59E0B] text-[#F59E0B]" />
            ))}
          </div>
          <h2 className="mt-3 text-3xl font-black text-text-primary">Hoan hô bé giỏi quá!</h2>
          <p className="mt-1 text-base font-bold text-primary">{score} điểm sao vàng</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => setMode('hub')} className="duo-btn duo-btn-surface">
              <ArrowLeft size={16} /> Trò khác
            </button>
            <button
              type="button"
              onClick={() => {
                if (mode === 'listenTap') startListenTap();
                else if (mode === 'phonicsPop') startPhonicsPop();
                else startSpeedMatch();
              }}
              className="duo-btn duo-btn-amber"
            >
              <RotateCcw size={16} /> Chơi lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GAME 1: LISTEN & TAP (BIG PICTURES, VOICE PRAISE)
  // =========================================================================
  if (mode === 'listenTap' && targetWord) {
    return (
      <div className="mx-auto max-w-[820px] px-4 pt-6 pb-16">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setMode('hub')} className="duo-btn duo-btn-surface duo-btn-sm">
            <ArrowLeft size={15} /> Thoát
          </button>
          <span className="text-base font-black text-text-primary">
            {round} / 8 · ⭐ {score}
          </span>
          <button
            type="button"
            onClick={() => playPronunciationAudio(targetWord.audioUrl)}
            className="duo-btn duo-btn-amber duo-btn-sm"
          >
            <Volume2 size={18} /> Nghe
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {roundWords.map((w) => {
            const isCorrect = pickedSlug === w.slug && w.slug === targetWord.slug;
            const isWrong = pickedSlug === w.slug && w.slug !== targetWord.slug;
            return (
              <button
                key={w.slug}
                type="button"
                onClick={() => {
                  if (pickedSlug === targetWord.slug) return;
                  setPickedSlug(w.slug);
                  if (w.slug === targetWord.slug) {
                    setScore((s) => s + 10);
                    playPronunciationAudio(GUIDE_CORRECT);
                    window.setTimeout(() => {
                      if (round >= 8) {
                        setDone(true);
                        playPronunciationAudio(GUIDE_VICTORY);
                      } else {
                        setRound((r) => r + 1);
                        setupListenRound(pool);
                      }
                    }, 850);
                  } else {
                    playPronunciationAudio(GUIDE_TRY_AGAIN, undefined, () =>
                      playPronunciationAudio(targetWord.audioUrl),
                    );
                  }
                }}
                className={`relative cursor-pointer overflow-hidden rounded-3xl border-4 bg-white transition-transform active:scale-[0.97] ${
                  isCorrect
                    ? 'border-[#10B981] ring-4 ring-[#10B981]/30'
                    : isWrong
                      ? 'border-[#EF4444] opacity-70'
                      : 'border-border hover:border-primary'
                }`}
              >
                <img src={w.imageUrl} alt={w.meaningVi} className="aspect-[4/3] w-full object-cover" />
                {isCorrect && (
                  <span className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981] text-white shadow-md">
                    <Check size={22} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // GAME 2: PHONICS BUBBLE POP
  // =========================================================================
  if (mode === 'phonicsPop') {
    const activeUnit = unitPool[popUnitIndex];
    const targetCount = popOptions.filter((o) => o.isMatch).length;
    const poppedMatches = popOptions.filter((o) => o.isMatch && poppedSlugs.includes(o.word.slug)).length;

    return (
      <div className="mx-auto max-w-[820px] px-4 pt-6 pb-16">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setMode('hub')} className="duo-btn duo-btn-surface duo-btn-sm">
            <ArrowLeft size={15} /> Thoát
          </button>
          <span className="text-base font-black text-text-primary">
            Vòng {round} / 4 · ⭐ {score}
          </span>
          <button
            type="button"
            onClick={() => playPronunciationAudio(activeUnit.phonicsAudioUrl)}
            className="duo-btn duo-btn-amber duo-btn-sm"
          >
            <Volume2 size={18} /> Âm {activeUnit.phonicsLetter}
          </button>
        </div>

        <div className="mb-6 rounded-3xl border-2 border-border bg-white p-5 text-center shadow-xs">
          <button
            type="button"
            onClick={() => playPronunciationAudio(activeUnit.phonicsAudioUrl)}
            style={{ backgroundColor: activeUnit.color }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl px-6 py-2.5 text-4xl font-black text-white shadow-sm"
          >
            {activeUnit.phonicsLetter} <Volume2 size={24} />
          </button>
          <p className="mt-2 text-base font-black text-text-primary">
            Tìm {targetCount} hình âm {activeUnit.phonicsLetter} ({poppedMatches}/{targetCount})
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {popOptions.map(({ word, isMatch }) => {
            const isPopped = poppedSlugs.includes(word.slug);
            return (
              <button
                key={word.slug}
                type="button"
                disabled={isPopped}
                onClick={() => {
                  if (isMatch) {
                    const next = [...poppedSlugs, word.slug];
                    setPoppedSlugs(next);
                    setScore((s) => s + 10);
                    playPronunciationAudio(word.audioUrl);
                    const matchedNow = popOptions.filter((o) => o.isMatch && next.includes(o.word.slug)).length;
                    if (matchedNow >= targetCount) {
                      window.setTimeout(() => {
                        if (round >= 4) {
                          setDone(true);
                          playPronunciationAudio(GUIDE_VICTORY);
                        } else {
                          setRound((r) => r + 1);
                          setupPhonicsRound(popUnitIndex + 1);
                        }
                      }, 850);
                    }
                  } else {
                    playPronunciationAudio(GUIDE_TRY_AGAIN);
                  }
                }}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-4 p-3.5 transition-all ${
                  isPopped
                    ? 'scale-95 border-[#10B981] bg-[#10B981]/15 opacity-55'
                    : 'border-border bg-white shadow-[0_6px_0_var(--border)] hover:-translate-y-0.5 hover:border-primary'
                }`}
              >
                <img src={word.imageUrl} alt={word.word} className="h-24 w-32 rounded-xl object-cover" />
                <span className="text-lg font-black text-text-primary">{word.word}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // GAME 3: AUDIO & PICTURE MATCH (4 PAIRS — KID FRIENDLY!)
  // =========================================================================
  return (
    <div className="mx-auto max-w-[840px] px-4 pt-6 pb-16">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setMode('hub')} className="duo-btn duo-btn-surface duo-btn-sm">
          <ArrowLeft size={15} /> Thoát
        </button>
        <span className="text-base font-black text-text-primary">
          Ghép {matched.length} / {matchPairs.length} cặp · ⭐ {score}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {speedMatchCards.map((c) => {
          const isMatched = matched.includes(c.slug);
          const isSelected = matchSel.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={isMatched}
              onClick={() => {
                if (isSelected) return;
                if (c.kind === 'audio') playPronunciationAudio(c.word.audioUrl);
                const nextSel = [...matchSel, c.id];
                setMatchSel(nextSel);
                if (nextSel.length === 2) {
                  const first = speedMatchCards.find((x) => x.id === nextSel[0]);
                  const second = speedMatchCards.find((x) => x.id === nextSel[1]);
                  if (first && second && first.slug === second.slug && first.kind !== second.kind) {
                    const nextMatched = [...matched, first.slug];
                    setMatched(nextMatched);
                    setMatchSel([]);
                    setScore((s) => s + 15);
                    playPronunciationAudio(GUIDE_CORRECT);
                    if (nextMatched.length >= matchPairs.length) {
                      window.setTimeout(() => {
                        setDone(true);
                        playPronunciationAudio(GUIDE_VICTORY);
                      }, 850);
                    }
                  } else {
                    playPronunciationAudio(GUIDE_TRY_AGAIN);
                    window.setTimeout(() => setMatchSel([]), 650);
                  }
                }
              }}
              className={`flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 transition-all ${
                isMatched
                  ? 'border-[#10B981] bg-[#10B981]/12 opacity-55'
                  : isSelected
                    ? 'border-[#F59E0B] bg-[#F59E0B]/15 ring-4 ring-[#F59E0B]/25'
                    : 'border-border bg-white hover:border-primary'
              }`}
            >
              {c.kind === 'image' ? (
                <img src={c.word.imageUrl} alt={c.word.word} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 px-2 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
                    <Volume2 size={22} />
                  </span>
                  <span className="text-base font-black text-text-primary">{c.word.word}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
