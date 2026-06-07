import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui";

const PAIRS_PER_PAGE = 7;

type Side = "word" | "meaning";

type MatchingGameProps = {
  words: any[];
  type: "word" | "ipa";
  onFinish: (correct: number, total: number, time: number) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const MatchingGame = ({ words, type, onFinish }: MatchingGameProps) => {
  const [startTime] = useState(Date.now());

  // One pair per word: left = word/ipa, right = meaning. Stable id = vocab id.
  const pairs = useMemo(
    () =>
      words
        .map((w: any) => ({
          id: Number(w.id),
          left: type === "ipa" ? (w.transcription ?? w.word) : w.word,
          right: w.meaning,
        }))
        .filter((p) => Number.isFinite(p.id)),
    [words, type],
  );
  type Pair = (typeof pairs)[number];

  const totalPairs = pairs.length;
  const totalPages = Math.max(1, Math.ceil(totalPairs / PAIRS_PER_PAGE));

  // Per-page left (in order) + right (shuffled independently). Stable across
  // re-renders and page changes — only re-shuffles when the word set/type changes.
  const pages = useMemo(() => {
    const result: { left: Pair[]; right: Pair[] }[] = [];
    for (let i = 0; i < totalPairs; i += PAIRS_PER_PAGE) {
      const slice = pairs.slice(i, i + PAIRS_PER_PAGE);
      result.push({ left: slice, right: shuffle(slice) });
    }
    return result.length > 0 ? result : [{ left: [], right: [] }];
  }, [pairs, totalPairs]);

  const [pageIndex, setPageIndex] = useState(0);
  // Matched is GLOBAL by pair id — persists across page changes.
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<{ side: Side; id: number } | null>(null);
  const [wrong, setWrong] = useState<{ wordId: number; meaningId: number } | null>(null);
  const finishedRef = useRef(false);

  // New word set -> full reset.
  useEffect(() => {
    setPageIndex(0);
    setMatched(new Set());
    setSelected(null);
    setWrong(null);
    finishedRef.current = false;
  }, [pairs]);

  // Selection resets on page change; matched stays global.
  useEffect(() => {
    setSelected(null);
    setWrong(null);
  }, [pageIndex]);

  // Clear the wrong flash.
  useEffect(() => {
    if (!wrong) return;
    const t = setTimeout(() => setWrong(null), 900);
    return () => clearTimeout(t);
  }, [wrong]);

  // Completion is based on TOTAL matched pairs (all pages), and fires onFinish
  // exactly once via finishedRef.
  useEffect(() => {
    if (finishedRef.current) return;
    if (totalPairs > 0 && matched.size === totalPairs) {
      finishedRef.current = true;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const t = setTimeout(() => onFinish(matched.size, totalPairs, elapsed), 400);
      return () => clearTimeout(t);
    }
  }, [matched, totalPairs, onFinish, startTime]);

  const handleClick = useCallback(
    (side: Side, id: number) => {
      if (matched.has(id) || wrong) return;
      if (!selected) {
        setSelected({ side, id });
        return;
      }
      if (selected.side === side) {
        // same column: deselect if same card, else switch selection
        setSelected(selected.id === id ? null : { side, id });
        return;
      }
      // opposite column: compare pair ids
      if (selected.id === id) {
        setMatched((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setSelected(null);
      } else {
        setWrong({
          wordId: side === "word" ? id : selected.id,
          meaningId: side === "meaning" ? id : selected.id,
        });
        setSelected(null);
      }
    },
    [matched, wrong, selected],
  );

  if (totalPairs === 0) {
    return (
      <div className="learning-card mx-auto max-w-md p-8 text-center text-text-secondary">
        Không có từ để luyện tập.
      </div>
    );
  }

  const page = pages[Math.min(pageIndex, pages.length - 1)];
  const progressPct = totalPairs > 0 ? (matched.size / totalPairs) * 100 : 0;

  const cardClass = (side: Side, id: number) => {
    const base =
      "w-full min-h-[64px] rounded-2xl border-2 px-4 py-3 text-sm font-bold leading-snug transition-all duration-200 text-center break-words";
    if (matched.has(id))
      return `${base} cursor-default border-primary/40 bg-primary/10 text-primary opacity-50`;
    if (selected?.side === side && selected.id === id)
      return `${base} cursor-pointer border-primary bg-primary/5 shadow-lg scale-[1.02]`;
    const isWrong = side === "word" ? wrong?.wordId === id : wrong?.meaningId === id;
    if (isWrong)
      return `${base} cursor-pointer border-danger-color bg-danger-color/10 text-danger-color`;
    return `${base} cursor-pointer border-primary/10 bg-surface text-text-primary hover:border-primary/40 hover:bg-primary/5`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-primary/15 bg-surface/95 p-5 shadow-[0_18px_50px_var(--shadow-color)] backdrop-blur-sm sm:p-7">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-text-primary sm:text-2xl">Nối từ</h2>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {matched.size} / {totalPairs} cặp
        </span>
      </div>

      {/* Progress bar (counts all pairs, not only current page) */}
      <div className="mb-6 h-2.5 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-secondary to-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Two-column matching area */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex flex-col gap-3">
          {page.left.map((p) => (
            <button
              key={`w-${p.id}`}
              type="button"
              disabled={matched.has(p.id)}
              onClick={() => handleClick("word", p.id)}
              style={wrong?.wordId === p.id ? { animation: "shake 0.5s ease-in-out" } : undefined}
              className={`${cardClass("word", p.id)} ${type === "ipa" ? "font-ipa" : ""}`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {page.right.map((p) => (
            <button
              key={`m-${p.id}`}
              type="button"
              disabled={matched.has(p.id)}
              onClick={() => handleClick("meaning", p.id)}
              style={wrong?.meaningId === p.id ? { animation: "shake 0.5s ease-in-out" } : undefined}
              className={cardClass("meaning", p.id)}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>

      {/* Pagination (only when more than one page) */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            disabled={pageIndex === 0}
          >
            ← Trước
          </Button>
          <span className="text-sm font-bold text-text-muted tabular-nums">
            {pageIndex + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
            disabled={pageIndex === totalPages - 1}
          >
            Tiếp →
          </Button>
        </div>
      )}
    </div>
  );
};
