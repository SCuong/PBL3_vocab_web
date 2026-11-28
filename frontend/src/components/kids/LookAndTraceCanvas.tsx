import { useEffect, useRef, useState } from 'react';
import { Check, Eraser, Sparkles } from 'lucide-react';

interface LookAndTraceCanvasProps {
  letter: string; // e.g. "Bb"
  color: string;
  onComplete: () => void;
  onReset?: () => void;
}

const CANVAS_W = 520;
const CANVAS_H = 260;
const GRID_STEP = 10;
const HIT_RADIUS = 13;
const LETTER_THRESHOLD = 0.85;

type CellPoint = { key: string; x: number; y: number; group: 0 | 1 };

export function LookAndTraceCanvas({
  letter,
  color,
  onComplete,
  onReset,
}: LookAndTraceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskAlphaRef = useRef<Uint8ClampedArray | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const targetCellsRef = useRef<CellPoint[]>([]);
  const groupTotalsRef = useRef<[number, number]>([0, 0]);
  const coveredCellsRef = useRef<Set<string>>(new Set());
  const coveredGroupsRef = useRef<[number, number]>([0, 0]);
  const completedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [outOfBoundsHint, setOutOfBoundsHint] = useState(false);

  const isInsideLetter = (x: number, y: number): boolean => {
    const data = maskAlphaRef.current;
    if (!data) return false;
    const cx = Math.round(x);
    const cy = Math.round(y);
    // Allow tiny 8px kid-friendly edge tolerance, reject holes & outside scribbling
    for (const dy of [0, -6, 6]) {
      for (const dx of [0, -6, 6]) {
        const px = cx + dx;
        const py = cy + dy;
        if (px < 0 || px >= CANVAS_W || py < 0 || py >= CANVAS_H) continue;
        if (data[(py * CANVAS_W + px) * 4 + 3] > 128) return true;
      }
    }
    return false;
  };

  const renderComposite = () => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const inkCanvas = inkCanvasRef.current;
    if (!canvas || !maskCanvas || !inkCanvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // 1. Notebook ruled lines
    ctx.save();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    [CANVAS_H * 0.24, CANVAS_H * 0.5, CANVAS_H * 0.78].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(CANVAS_W - 24, y);
      ctx.stroke();
    });
    ctx.restore();

    // 2. Soft letter background fill
    ctx.save();
    ctx.font = '900 170px "Plus Jakarta Sans", "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#F1F5F9';
    ctx.fillText(letter, CANVAS_W / 2, CANVAS_H / 2 + 6);
    ctx.restore();

    // 3. Stencil-clipped crayon ink (strictly inside letter shape, never spills into holes!)
    const clipped = document.createElement('canvas');
    clipped.width = CANVAS_W;
    clipped.height = CANVAS_H;
    const cctx = clipped.getContext('2d');
    if (cctx) {
      cctx.drawImage(maskCanvas, 0, 0);
      cctx.globalCompositeOperation = 'source-in';
      cctx.drawImage(inkCanvas, 0, 0);
      ctx.drawImage(clipped, 0, 0);
    }

    // 4. Crisp dashed letter outline on top
    ctx.save();
    ctx.font = '900 170px "Plus Jakarta Sans", "Nunito", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([10, 8]);
    ctx.strokeText(letter, CANVAS_W / 2, CANVAS_H / 2 + 6);
    ctx.restore();
  };

  useEffect(() => {
    const mask = document.createElement('canvas');
    mask.width = CANVAS_W;
    mask.height = CANVAS_H;
    const mctx = mask.getContext('2d');
    if (!mctx) return;

    mctx.font = '900 170px "Plus Jakarta Sans", "Nunito", system-ui, sans-serif';
    mctx.textAlign = 'center';
    mctx.textBaseline = 'middle';
    mctx.fillStyle = '#000000';
    mctx.fillText(letter, CANVAS_W / 2, CANVAS_H / 2 + 6);

    const data = mctx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
    maskCanvasRef.current = mask;
    maskAlphaRef.current = data;

    const ink = document.createElement('canvas');
    ink.width = CANVAS_W;
    ink.height = CANVAS_H;
    inkCanvasRef.current = ink;

    const rawPts: { x: number; y: number }[] = [];
    let minX = CANVAS_W;
    let maxX = 0;

    for (let y = GRID_STEP; y < CANVAS_H; y += GRID_STEP) {
      for (let x = GRID_STEP; x < CANVAS_W; x += GRID_STEP) {
        if (data[(y * CANVAS_W + x) * 4 + 3] > 128) {
          rawPts.push({ x, y });
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    const splitX = letter.length > 1 ? (minX + maxX) / 2 : CANVAS_W + 1;
    const cells: CellPoint[] = [];
    const totals: [number, number] = [0, 0];

    for (const pt of rawPts) {
      const group: 0 | 1 = pt.x <= splitX ? 0 : 1;
      totals[group] += 1;
      cells.push({ key: `${pt.x},${pt.y}`, x: pt.x, y: pt.y, group });
    }

    targetCellsRef.current = cells;
    groupTotalsRef.current = totals;
    coveredCellsRef.current = new Set();
    coveredGroupsRef.current = [0, 0];
    completedRef.current = false;
    setProgress(0);
    setDone(false);
    setOutOfBoundsHint(false);
    renderComposite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter]);

  const markCoverageAt = (x: number, y: number) => {
    const targets = targetCellsRef.current;
    if (targets.length === 0) return;
    const covered = coveredCellsRef.current;
    const r2 = HIT_RADIUS * HIT_RADIUS;
    let added = false;

    for (let i = 0; i < targets.length; i += 1) {
      const cell = targets[i];
      if (covered.has(cell.key)) continue;
      const dx = cell.x - x;
      const dy = cell.y - y;
      if (dx * dx + dy * dy <= r2) {
        covered.add(cell.key);
        coveredGroupsRef.current[cell.group] += 1;
        added = true;
      }
    }

    if (!added) return;
    const [tot0, tot1] = groupTotalsRef.current;
    const [cov0, cov1] = coveredGroupsRef.current;
    const r0 = tot0 > 0 ? Math.min(1, cov0 / (tot0 * LETTER_THRESHOLD)) : 1;
    const r1 = tot1 > 0 ? Math.min(1, cov1 / (tot1 * LETTER_THRESHOLD)) : 1;
    const displayPct = Math.min(100, Math.round(((r0 + r1) / 2) * 100));
    setProgress(displayPct);

    if (r0 >= 1 && r1 >= 1 && !completedRef.current) {
      completedRef.current = true;
      setDone(true);
      setOutOfBoundsHint(false);
      onComplete();
    }
  };

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const drawInkSegment = (x0: number, y0: number, x1: number, y1: number) => {
    const inkCtx = inkCanvasRef.current?.getContext('2d');
    if (!inkCtx) return;
    inkCtx.save();
    inkCtx.strokeStyle = color;
    inkCtx.lineWidth = 22;
    inkCtx.lineCap = 'round';
    inkCtx.lineJoin = 'round';
    inkCtx.beginPath();
    inkCtx.moveTo(x0, y0);
    inkCtx.lineTo(x1, y1);
    inkCtx.stroke();
    inkCtx.restore();

    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      markCoverageAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
    renderComposite();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = getPoint(e);
    if (!isInsideLetter(pt.x, pt.y)) {
      setOutOfBoundsHint(true);
      return;
    }
    setOutOfBoundsHint(false);
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPtRef.current = pt;
    drawInkSegment(pt.x, pt.y, pt.x + 0.1, pt.y + 0.1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = getPoint(e);
    if (!isInsideLetter(pt.x, pt.y)) {
      // Stop drawing cleanly when straying outside the letter boundary
      drawingRef.current = false;
      lastPtRef.current = null;
      setOutOfBoundsHint(true);
      return;
    }
    setOutOfBoundsHint(false);
    const prev = lastPtRef.current ?? pt;
    drawInkSegment(prev.x, prev.y, pt.x, pt.y);
    lastPtRef.current = pt;
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
    lastPtRef.current = null;
  };

  const handleClear = () => {
    const inkCtx = inkCanvasRef.current?.getContext('2d');
    if (inkCtx) inkCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    coveredCellsRef.current = new Set();
    coveredGroupsRef.current = [0, 0];
    completedRef.current = false;
    setProgress(0);
    setDone(false);
    setOutOfBoundsHint(false);
    renderComposite();
    onReset?.();
  };

  return (
    <div className="mx-auto max-w-[460px]">
      <div
        className={`relative overflow-hidden rounded-3xl border-4 bg-white transition-colors ${
          done
            ? 'border-[#10B981] ring-4 ring-[#10B981]/25'
            : outOfBoundsHint
              ? 'border-[#F59E0B]'
              : 'border-border/80'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-[220px] w-full cursor-crosshair touch-none sm:h-[250px]"
        />
      </div>

      {/* Separated progress & clear row cleanly below the canvas */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${progress}%`,
                backgroundColor: done ? '#10B981' : color,
              }}
            />
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-text-secondary">
            {done ? (
              <>
                <Check size={14} className="text-[#10B981]" /> Đẹp lắm!
              </>
            ) : outOfBoundsHint ? (
              <span className="text-[#D97706]">Tô trong nét chữ nhé!</span>
            ) : (
              <>
                <Sparkles size={13} className="text-[#F59E0B]" /> {progress}%
              </>
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs font-extrabold text-text-secondary hover:border-primary hover:text-primary"
        >
          <Eraser size={13} />
          Tô lại
        </button>
      </div>
    </div>
  );
}
