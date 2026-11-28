import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "../ui";
import { playSfx } from "../../utils/sound";

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
  const [lastMatchedId, setLastMatchedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ side: Side; id: number } | null>(null);
  const [wrong, setWrong] = useState<{ wordId: number; meaningId: number } | null>(null);
  const finishedRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [tethers, setTethers] = useState<{ id: number; x1: number; y1: number; x2: number; y2: number }[]>([]);

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
      playSfx("complete");
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
        playSfx("correct");
        setMatched((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setLastMatchedId(id);
        setSelected(null);
      } else {
        playSfx("wrong");
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

  const recomputeTethers = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const bRect = board.getBoundingClientRect();
    const next: { id: number; x1: number; y1: number; x2: number; y2: number }[] = [];
    page.left.forEach((p) => {
      if (!matched.has(p.id)) return;
      const lEl = leftRefs.current[p.id];
      const rEl = rightRefs.current[p.id];
      if (!lEl || !rEl) return;
      const l = lEl.getBoundingClientRect();
      const r = rEl.getBoundingClientRect();
      if (r.left <= l.right) return;
      next.push({
        id: p.id,
        x1: l.right - bRect.left,
        y1: l.top + l.height / 2 - bRect.top,
        x2: r.left - bRect.left,
        y2: r.top + r.height / 2 - bRect.top,
      });
    });
    setTethers(next);
  }, [page.left, matched]);

  useLayoutEffect(() => {
    recomputeTethers();
    window.addEventListener("resize", recomputeTethers);
    return () => window.removeEventListener("resize", recomputeTethers);
  }, [recomputeTethers, pageIndex]);

  const cardClass = (side: Side, id: number) => {
    const base =
      "relative z-10 w-full min-h-16 rounded-[var(--radius-element)] border-2 px-4 py-3 text-[15px] font-semibold leading-snug transition-colors duration-150 text-center break-words active:scale-[0.98]";
    if (matched.has(id))
      return `${base} cursor-default border-primary/45 bg-primary-light text-primary`;
    if (selected?.side === side && selected.id === id)
      return `${base} cursor-pointer border-primary bg-primary text-text-on-accent`;
    const isWrong = side === "word" ? wrong?.wordId === id : wrong?.meaningId === id;
    if (isWrong)
      return `${base} cursor-pointer border-danger-color bg-danger-color/15 text-danger-color ring-2 ring-danger-color/30`;
    return `${base} cursor-pointer border-border bg-surface text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:border-primary hover:bg-surface-hover`;
  };

  const lumoSrc = wrong
    ? "/mascot-lumo-oops.webp"
    : lastMatchedId != null && matched.size === totalPairs
      ? "/mascot-lumo-happy.webp"
      : "/mascot-lumo-peek-side.webp";

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-[-0.01em] text-text-primary">Nối từ</h2>
        <span className="shrink-0 rounded-full border-2 border-primary/25 bg-primary-light px-3.5 py-1 text-sm font-bold tabular-nums text-primary">
          {matched.size} / {totalPairs} cặp
        </span>
      </div>

      {/* Progress bar (counts all pairs, not only current page) */}
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[transform] duration-500 origin-left"
          style={{ transform: `scaleX(${progressPct / 100})` }}
        />
      </div>

      {/* Tactile matching board + side-peeking Lumo */}
      <div className="relative flex items-center">
        <div
          ref={boardRef}
          className="learning-card relative z-10 w-full p-4 sm:p-6"
        >
          {/* Violet bezier energy tethers for matched pairs on current page */}
          <svg
            className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible sm:block"
            aria-hidden="true"
          >
            {tethers.map((t) => {
              const mid = (t.x1 + t.x2) / 2;
              const d = `M ${t.x1} ${t.y1} C ${mid} ${t.y1}, ${mid} ${t.y2}, ${t.x2} ${t.y2}`;
              const isLatest = t.id === lastMatchedId;
              return (
                <g key={t.id}>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth={isLatest ? 3 : 2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0.25 }}
                    animate={{ pathLength: 1, opacity: isLatest ? 0.92 : 0.34 }}
                    transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <circle cx={t.x1} cy={t.y1} r={isLatest ? 4 : 3} fill="var(--accent-color)" opacity={isLatest ? 1 : 0.45} />
                  <circle cx={t.x2} cy={t.y2} r={isLatest ? 4 : 3} fill="var(--accent-color)" opacity={isLatest ? 1 : 0.45} />
                </g>
              );
            })}
          </svg>

          {/* Two-column matching area */}
          <div className="grid grid-cols-2 gap-3 sm:gap-14">
            <div className="flex flex-col gap-3">
              {page.left.map((p) => (
                <button
                  key={`w-${p.id}`}
                  ref={(el) => {
                    leftRefs.current[p.id] = el;
                  }}
                  type="button"
                  disabled={matched.has(p.id)}
                  onClick={() => handleClick("word", p.id)}
                  style={wrong?.wordId === p.id ? { animation: "shake 0.5s ease-in-out" } : undefined}
                  className={`${cardClass("word", p.id)} ${type === "ipa" ? "font-ipa" : ""}`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    {matched.has(p.id) && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                    {p.left}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {page.right.map((p) => (
                <button
                  key={`m-${p.id}`}
                  ref={(el) => {
                    rightRefs.current[p.id] = el;
                  }}
                  type="button"
                  disabled={matched.has(p.id)}
                  onClick={() => handleClick("meaning", p.id)}
                  style={wrong?.meaningId === p.id ? { animation: "shake 0.5s ease-in-out" } : undefined}
                  className={cardClass("meaning", p.id)}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    {matched.has(p.id) && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                    {p.right}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <img
          src={lumoSrc}
          alt=""
          aria-hidden="true"
          width={92}
          height={110}
          className="pointer-events-none -ml-3 hidden h-auto w-[92px] shrink-0 lg:block"
        />
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
