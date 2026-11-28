import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Brain, RotateCw, Volume2 } from 'lucide-react';
import { GRADE1_ALL_WORDS, GRADE1_UNITS } from '../data/grade1Curriculum';
import { playPronunciationAudio, stopPronunciationAudio } from '../utils/audio';
import {
  getDueSm2Cards,
  loadSm2Store,
  recordSm2Review,
  type Sm2Quality,
} from '../utils/sm2';

export default function Flashcards() {
  // -1 = SM-2 Due cards, 0 = All 64 words, 1..16 = specific Unit
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sm2Tick, setSm2Tick] = useState(0);

  const dueSlugs = useMemo(() => {
    void sm2Tick;
    return new Set(getDueSm2Cards().map((c) => c.slug));
  }, [sm2Tick]);

  const sm2Store = useMemo(() => {
    void sm2Tick;
    return loadSm2Store();
  }, [sm2Tick]);

  const deck = useMemo(() => {
    if (selectedUnit === -1) {
      const dueList = GRADE1_ALL_WORDS.filter((w) => dueSlugs.has(w.slug));
      return dueList.length > 0 ? dueList : GRADE1_ALL_WORDS;
    }
    if (selectedUnit === 0) return GRADE1_ALL_WORDS;
    const u = GRADE1_UNITS.find((item) => item.unit === selectedUnit);
    return u
      ? u.words.map((w) => ({
          ...w,
          unit: u.unit,
          unitTitleVi: u.titleVi,
          phonicsLetter: u.phonicsLetter,
        }))
      : GRADE1_ALL_WORDS;
  }, [selectedUnit, dueSlugs]);

  const current = deck[index] ?? deck[0];

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [selectedUnit]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => playPronunciationAudio(current.audioUrl), 160);
    return () => {
      window.clearTimeout(t);
      stopPronunciationAudio();
    };
  }, [current]);

  if (!current) return null;

  const cardSm2 = sm2Store[current.slug];

  const handleRateSm2 = (quality: Sm2Quality) => {
    recordSm2Review(current.slug, quality);
    setSm2Tick((t) => t + 1);
    setFlipped(false);
    setIndex((i) => (i + 1 < deck.length ? i + 1 : 0));
  };

  return (
    <div className="mx-auto max-w-[920px] px-4 pt-6 pb-16 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary">
            Thẻ từ vui nhộn · Tiếng Anh 1
          </h1>
          <p className="text-xs font-semibold text-text-secondary">
            Chạm vào thẻ để nghe, rồi lật xem nghĩa và câu mẫu
          </p>
        </div>
        <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-extrabold tabular-nums text-primary">
          {index + 1} / {deck.length} từ
        </span>
      </header>

      {/* Horizontal Unit + SM-2 Due Picker */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedUnit(-1)}
          className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
            selectedUnit === -1
              ? 'bg-[#F59E0B] text-[#111019]'
              : 'border border-border bg-surface text-text-secondary hover:border-[#F59E0B]'
          }`}
        >
          <Brain size={14} />
          Ôn hôm nay ({dueSlugs.size})
        </button>
        <button
          type="button"
          onClick={() => setSelectedUnit(0)}
          className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
            selectedUnit === 0
              ? 'bg-primary text-white'
              : 'border border-border bg-surface text-text-secondary hover:border-primary/50'
          }`}
        >
          Tất cả (64)
        </button>
        {GRADE1_UNITS.map((u) => (
          <button
            key={u.unit}
            type="button"
            onClick={() => setSelectedUnit(u.unit)}
            className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
              selectedUnit === u.unit
                ? 'bg-primary text-white'
                : 'border border-border bg-surface text-text-secondary hover:border-primary/50'
            }`}
          >
            Unit {u.unit} ({u.phonicsLetter})
          </button>
        ))}
      </div>

      {/* Clean Flashcard: Photo Area cleanly separated from Control Area */}
      <div className="mx-auto max-w-[660px] overflow-hidden rounded-3xl border-2 border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between text-xs font-extrabold">
          <span className="rounded-full bg-primary-light px-3 py-1 text-primary">
            Unit {current.unit} · Âm {current.phonicsLetter}
          </span>
          <span className="text-text-secondary">
            {cardSm2 && cardSm2.intervalDays > 0
              ? `Gặp lại sau ${cardSm2.intervalDays} ngày`
              : 'Từ mới'}
          </span>
        </div>

        {!flipped ? (
          <div>
            {/* Pure Photo Stage — zero overlaid badges */}
            <button
              type="button"
              onClick={() => playPronunciationAudio(current.audioUrl)}
              className="block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-border/60 bg-bg-secondary"
            >
              <img
                src={current.imageUrl}
                alt={current.word}
                className="aspect-[16/10] w-full object-cover"
              />
            </button>

            <div className="mt-5 text-center">
              <h2 className="text-4xl font-black tracking-tight text-text-primary">
                {current.word}
              </h2>
              <p className="mt-0.5 text-sm font-bold text-primary">{current.ipa}</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-bg-secondary/40 p-6 text-center">
            <h2 className="text-4xl font-black text-text-primary">{current.meaningVi}</h2>
            <p className="mt-1 text-lg font-extrabold text-primary">
              {current.word} · {current.ipa}
            </p>
            <div className="mt-5 rounded-2xl border border-border bg-white px-5 py-3">
              <p className="text-base font-extrabold text-text-primary">{current.exampleEn}</p>
              <p className="mt-0.5 text-sm font-semibold text-text-secondary">
                {current.exampleVi}
              </p>
            </div>
          </div>
        )}

        {/* Dedicated Bottom Control Area */}
        <div className="mt-6 border-t border-border/60 pt-5">
          {!flipped ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                aria-label="Thẻ trước"
                className="duo-btn duo-btn-surface h-12 w-12 !rounded-full !p-0 disabled:opacity-40"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => playPronunciationAudio(current.audioUrl)}
                className="duo-btn duo-btn-surface"
              >
                <Volume2 size={18} /> Nghe
              </button>
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="duo-btn duo-btn-amber !px-7"
              >
                <RotateCw size={18} /> Lật thẻ
              </button>
              <button
                type="button"
                disabled={index + 1 >= deck.length}
                onClick={() => setIndex((i) => Math.min(deck.length - 1, i + 1))}
                aria-label="Thẻ sau"
                className="duo-btn duo-btn-surface h-12 w-12 !rounded-full !p-0 disabled:opacity-40"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => playPronunciationAudio(current.exampleAudioUrl)}
                aria-label="Nghe câu mẫu"
                className="duo-btn duo-btn-surface h-12 w-12 !rounded-full !p-0"
              >
                <Volume2 size={20} />
              </button>
              <button
                type="button"
                onClick={() => handleRateSm2(1)}
                className="duo-btn duo-btn-surface !border-[#FCA5A5] !text-[#B91C1C]"
              >
                Chưa nhớ
              </button>
              <button
                type="button"
                onClick={() => handleRateSm2(4)}
                className="duo-btn duo-btn-amber"
              >
                Nhớ rồi
              </button>
              <button
                type="button"
                onClick={() => handleRateSm2(5)}
                className="duo-btn duo-btn-purple"
              >
                Quá dễ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
