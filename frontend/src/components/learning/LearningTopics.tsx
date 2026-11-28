import { useMemo, useState } from 'react';
import { Compass, Lock, Star, Trophy, Unlock } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { GRADE1_ALL_WORDS, GRADE1_UNITS, getGrade1Unit } from '../../data/grade1Curriculum';
import {
  getTotalStars,
  isReviewUnlocked,
  isUnitUnlocked,
  loadGrade1Progress,
  recordReviewCompletion,
  recordUnitCompletion,
  saveGrade1Progress,
} from '../../utils/grade1Progress';
import { getDueSm2Cards, getSm2Summary } from '../../utils/sm2';
import { useAppContext } from '../../context/AppContext';
import { UnitAdventure } from '../kids/UnitAdventure';
import { ReviewSession } from '../kids/ReviewSession';

// Candy Crush x Duolingo S-curve SVG coordinate system (10 nodes per semester: 8 Units + 2 Reviews)
const MAP_VIEWBOX_W = 800;
const NODE_STEP_Y = 156;
const MAP_TOP_PAD = 108;
const MAP_BOTTOM_PAD = 110;
const NODE_X_CURVE = [400, 200, 145, 370, 625, 655, 445, 180, 255, 535];

function buildSmoothRoadPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

type MapNode =
  | { kind: 'unit'; unit: number }
  | { kind: 'review'; reviewNumber: number; fromUnit: number; toUnit: number };

export function LearningTopics() {
  const { currentUser, addXP, triggerStreakCheck, addToast } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [semester, setSemester] = useState<1 | 2>(1);
  const [progress, setProgress] = useState(() => loadGrade1Progress());
  const [sm2Tick, setSm2Tick] = useState(0);

  const activeUnitParam = searchParams.get('unit');
  const activeReviewParam = searchParams.get('review');
  const activeSm2Param = searchParams.get('sm2');

  const activeUnitNumber = activeUnitParam ? Number(activeUnitParam) : null;
  const activeUnit =
    activeUnitNumber && activeUnitNumber >= 1 && activeUnitNumber <= 16
      ? getGrade1Unit(activeUnitNumber)
      : null;

  const activeReviewNumber =
    activeReviewParam && Number(activeReviewParam) >= 1 && Number(activeReviewParam) <= 4
      ? Number(activeReviewParam)
      : null;

  const isSm2Session = activeSm2Param === '1';

  const sm2Summary = useMemo(() => {
    void sm2Tick;
    return getSm2Summary();
  }, [sm2Tick]);

  const dueSm2Words = useMemo(() => {
    void sm2Tick;
    const dueCards = getDueSm2Cards();
    const bySlug = new Map(GRADE1_ALL_WORDS.map((w) => [w.slug, w]));
    return dueCards
      .map((c) => bySlug.get(c.slug))
      .filter((w): w is (typeof GRADE1_ALL_WORDS)[number] => Boolean(w));
  }, [sm2Tick]);

  // Structured textbook roadmap: every 4 Units -> 1 Milestone Boss Review (Review 1..4)
  const mapNodes = useMemo<MapNode[]>(() => {
    const units = GRADE1_UNITS.filter((u) => u.semester === semester);
    const nodes: MapNode[] = [];
    for (const u of units) {
      nodes.push({ kind: 'unit', unit: u.unit });
      if (u.unit % 4 === 0) {
        const reviewNumber = u.unit / 4;
        nodes.push({
          kind: 'review',
          reviewNumber,
          fromUnit: u.unit - 3,
          toUnit: u.unit,
        });
      }
    }
    return nodes;
  }, [semester]);

  const totalStars = getTotalStars(progress);

  const nextUnitNumber = useMemo(() => {
    const firstUnfinished = GRADE1_UNITS.find((u) => !progress.units[u.unit]?.stars);
    return firstUnfinished ? firstUnfinished.unit : 16;
  }, [progress]);

  const openUnit = (unitNum: number) => setSearchParams({ unit: String(unitNum) });
  const openReview = (reviewNum: number) => setSearchParams({ review: String(reviewNum) });
  const openSm2Review = () => setSearchParams({ sm2: '1' });
  const closeActive = () => {
    setSearchParams({});
    setSm2Tick((t) => t + 1);
  };

  const toggleUnlockAll = () => {
    const next = { ...progress, unlockAll: !progress.unlockAll };
    setProgress(next);
    saveGrade1Progress(next);
  };

  // =========================================================================
  // 1. ACTIVE UNIT ADVENTURE (/learning?unit=1)
  // =========================================================================
  if (activeUnit) {
    const hasNext = activeUnit.unit < 16;
    return (
      <UnitAdventure
        key={activeUnit.unit}
        unit={activeUnit}
        onExit={closeActive}
        onComplete={(stars) => {
          setProgress((prev) => recordUnitCompletion(prev, activeUnit.unit, stars));
          setSm2Tick((t) => t + 1);
          if (currentUser) {
            addXP(50);
            triggerStreakCheck();
          }
          addToast(`Hoan hô! Xong Unit ${activeUnit.unit} · +${stars} sao vàng`, 'success');
        }}
        onNextUnit={
          hasNext
            ? () => {
                const nextNum = activeUnit.unit + 1;
                if (nextNum >= 9) setSemester(2);
                openUnit(nextNum);
              }
            : undefined
        }
      />
    );
  }

  // =========================================================================
  // 2. MILESTONE BOSS REVIEW (/learning?review=1..4)
  // =========================================================================
  if (activeReviewNumber) {
    const fromUnit = (activeReviewNumber - 1) * 4 + 1;
    const toUnit = activeReviewNumber * 4;
    const pool = GRADE1_UNITS.filter((u) => u.unit >= fromUnit && u.unit <= toUnit).flatMap(
      (u) => u.words,
    );
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    return (
      <ReviewSession
        title={`Kiểm tra lớn · Review ${activeReviewNumber} (Unit ${fromUnit}–${toUnit})`}
        subtitle="Nghe và chọn đúng tranh tổng hợp 4 Unit!"
        words={shuffledPool}
        backdropUrl={
          activeReviewNumber <= 2
            ? '/illustrations/map-hk1-bg.webp'
            : '/illustrations/map-hk2-bg.webp'
        }
        onExit={closeActive}
        onComplete={(stars) => {
          setProgress((prev) => recordReviewCompletion(prev, activeReviewNumber, stars));
          setSm2Tick((t) => t + 1);
          if (currentUser) {
            addXP(80);
            triggerStreakCheck();
          }
          addToast(`Tuyệt vời! Vượt qua Review ${activeReviewNumber} · +${stars} sao vàng`, 'success');
        }}
      />
    );
  }

  // =========================================================================
  // 3. SM-2 SMART SPACED REPETITION REVIEW (/learning?sm2=1)
  // =========================================================================
  if (isSm2Session && dueSm2Words.length > 0) {
    return (
      <ReviewSession
        title="Ôn bài cùng Lumo"
        subtitle="Nghe và chọn đúng tranh nhé bé ơi!"
        words={dueSm2Words}
        backdropUrl="/illustrations/map-hk1-bg.webp"
        onExit={closeActive}
        onComplete={(stars) => {
          setSm2Tick((t) => t + 1);
          if (currentUser) {
            addXP(40);
            triggerStreakCheck();
          }
          addToast(`Hoan hô! Bé nhận thêm +${stars} sao vàng!`, 'success');
        }}
      />
    );
  }

  // =========================================================================
  // 4. STRUCTURED WORLD MAP (/learning)
  // =========================================================================
  const mapBg =
    semester === 1 ? '/illustrations/map-hk1-bg.webp' : '/illustrations/map-hk2-bg.webp';

  return (
    <div className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden">
      {/* Full-Bleed Flat-Vector Storybook World Backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 top-14 z-0">
        <img src={mapBg} alt="" className="h-full w-full object-cover object-center" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 50%, rgba(245,247,251,0.38) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[960px] px-4 pt-5 pb-24 sm:px-6">
        {/* Clean Minimal Control Bar (Low Button Density for Kids) */}
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-white/85 bg-white/92 p-4 shadow-[0_14px_32px_-14px_rgba(17,16,25,0.2)] backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#8B5CF6] text-white shadow-[0_4px_0_#5B21B6]">
              <Compass size={26} aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                Tiếng Anh 1 · Global Success
              </p>
              <h1 className="text-lg font-black tracking-tight text-[#111019] sm:text-2xl">
                Lộ trình học cùng Lumo
              </h1>
              <div className="mt-0.5 flex items-center gap-2 text-xs font-extrabold text-[#B45309]">
                <Star size={14} className="fill-[#F59E0B] text-[#F59E0B]" />
                <span>{totalStars} / 60 sao vàng</span>
              </div>
            </div>
          </div>

          <div className="inline-flex rounded-2xl border border-border bg-bg-secondary p-1">
            <button
              type="button"
              onClick={() => setSemester(1)}
              className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition-colors sm:text-sm ${
                semester === 1
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Học kỳ 1 (U1–8)
            </button>
            <button
              type="button"
              onClick={() => setSemester(2)}
              className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition-colors sm:text-sm ${
                semester === 2
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Học kỳ 2 (U9–16)
            </button>
          </div>
        </section>

        {/* Kid-Friendly Review Prompt (SM-2 runs silently under the hood!) + Parent Unlock */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
          <div>
            {sm2Summary.dueCount > 0 && (
              <button
                type="button"
                onClick={openSm2Review}
                className="duo-btn duo-btn-amber !px-5 !py-2.5 !text-sm"
              >
                <Star size={16} className="fill-current" aria-hidden />
                Ôn {sm2Summary.dueCount} từ cùng Lumo!
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleUnlockAll}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/80 bg-white/88 px-3.5 py-1.5 text-xs font-extrabold text-[#374151] shadow-xs transition-colors hover:bg-white hover:text-primary"
          >
            {progress.unlockAll ? <Unlock size={13} /> : <Lock size={13} />}
            {progress.unlockAll ? 'Đang mở tự do' : 'Phụ huynh: Mở tự do'}
          </button>
        </div>

        {/* Candy Crush x Duolingo Winding S-Curve SVG Adventure Trail */}
        {(() => {
          const points = mapNodes.map((_, idx) => ({
            x: NODE_X_CURVE[idx % NODE_X_CURVE.length],
            y: MAP_TOP_PAD + idx * NODE_STEP_Y,
          }));
          const totalHeight =
            MAP_TOP_PAD + Math.max(0, mapNodes.length - 1) * NODE_STEP_Y + MAP_BOTTOM_PAD;
          const fullRoadD = buildSmoothRoadPath(points);

          let highestUnlockedIdx = 0;
          mapNodes.forEach((node, idx) => {
            const isOpen =
              node.kind === 'review'
                ? isReviewUnlocked(progress, node.reviewNumber)
                : isUnitUnlocked(progress, node.unit);
            if (isOpen) highestUnlockedIdx = idx;
          });
          const progressRoadD = buildSmoothRoadPath(points.slice(0, highestUnlockedIdx + 1));

          return (
            <div
              className="relative mx-auto w-full max-w-[800px]"
              style={{ height: `${totalHeight}px` }}
            >
              {/* Layered Cubic Bézier Winding Cobblestone Road */}
              <svg
                aria-hidden="true"
                viewBox={`0 0 ${MAP_VIEWBOX_W} ${totalHeight}`}
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <defs>
                  <linearGradient id="lumoRoadProgress" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#F59E0B" />
                  </linearGradient>
                </defs>

                {/* Soft ground shadow under the road */}
                <path
                  d={fullRoadD}
                  fill="none"
                  stroke="rgba(17, 16, 25, 0.12)"
                  strokeWidth={44}
                  strokeLinecap="round"
                  transform="translate(0, 6)"
                />
                {/* Crisp white outer ribbon */}
                <path
                  d={fullRoadD}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={38}
                  strokeLinecap="round"
                />
                {/* Warm cream-amber trail bed */}
                <path
                  d={fullRoadD}
                  fill="none"
                  stroke="#FEF3C7"
                  strokeWidth={26}
                  strokeLinecap="round"
                />
                {/* Subtle stepping-stone dashes */}
                <path
                  d={fullRoadD}
                  fill="none"
                  stroke="#FCD34D"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray="10 16"
                />
                {/* Illuminated progress segment up to the child's current unlocked island */}
                {highestUnlockedIdx > 0 && (
                  <path
                    d={progressRoadD}
                    fill="none"
                    stroke="url(#lumoRoadProgress)"
                    strokeWidth={14}
                    strokeLinecap="round"
                  />
                )}
              </svg>

              {/* Tactile Circular 3D Level Medallions Positioned Right on the S-Curve */}
              {mapNodes.map((node, idx) => {
                const pt = points[idx];
                const leftPct = (pt.x / MAP_VIEWBOX_W) * 100;

                if (node.kind === 'review') {
                  const unlocked = isReviewUnlocked(progress, node.reviewNumber);
                  const stars = progress.reviews[node.reviewNumber]?.stars ?? 0;

                  return (
                    <div
                      key={`review-${node.reviewNumber}`}
                      style={{ left: `${leftPct}%`, top: `${pt.y}px` }}
                      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    >
                      {/* Arcing 3 Stars above Boss Medallion */}
                      <div className="mb-1.5 flex items-end gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            size={s === 2 ? 20 : 16}
                            className={`drop-shadow-xs ${
                              s === 2 ? '-translate-y-1' : ''
                            } ${
                              s <= stars
                                ? 'fill-[#F59E0B] text-[#D97706]'
                                : 'fill-white/90 text-[#CBD5E1]'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => openReview(node.reviewNumber)}
                        className={`flex h-24 w-24 flex-col items-center justify-center rounded-[28px] border-4 border-white transition-transform duration-150 ${
                          !unlocked
                            ? 'cursor-not-allowed bg-[#94A3B8] text-white/90 shadow-[0_7px_0_#64748B]'
                            : 'cursor-pointer bg-gradient-to-b from-[#FBBF24] to-[#F59E0B] text-white shadow-[0_8px_0_#B45309,0_16px_26px_-8px_rgba(245,158,11,0.55)] hover:-translate-y-1 active:translate-y-1'
                        }`}
                      >
                        {unlocked ? <Trophy size={34} /> : <Lock size={28} />}
                        <span className="mt-0.5 text-[11px] font-black uppercase tracking-wide">
                          Review {node.reviewNumber}
                        </span>
                      </button>

                      <span className="mt-2 whitespace-nowrap rounded-full border-2 border-[#FDE68A] bg-white/95 px-3.5 py-1 text-xs font-black text-[#92400E] shadow-xs">
                        Kiểm tra lớn · U{node.fromUnit}–{node.toUnit}
                      </span>
                    </div>
                  );
                }

                const u = getGrade1Unit(node.unit);
                const unlocked = isUnitUnlocked(progress, u.unit);
                const stars = progress.units[u.unit]?.stars ?? 0;
                const isCurrent = u.unit === nextUnitNumber;

                return (
                  <div
                    key={`unit-${u.unit}`}
                    style={{ left: `${leftPct}%`, top: `${pt.y}px` }}
                    className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  >
                    {/* Duolingo-style Bouncing "BẮT ĐẦU" Tag on Active Unit */}
                    {isCurrent && (
                      <div className="mb-1.5 animate-bounce rounded-xl border-2 border-[#F59E0B] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#D97706] shadow-sm">
                        Bắt đầu!
                      </div>
                    )}

                    {/* Candy Crush-style 3 Arcing Stars */}
                    {!isCurrent && (
                      <div className="mb-1.5 flex items-end gap-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            size={s === 2 ? 19 : 15}
                            className={`drop-shadow-xs ${
                              s === 2 ? '-translate-y-1' : ''
                            } ${
                              s <= stars
                                ? 'fill-[#F59E0B] text-[#D97706]'
                                : 'fill-white/90 text-[#CBD5E1]'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Circular 3D Tactile Medallion */}
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => openUnit(u.unit)}
                      style={
                        unlocked
                          ? {
                              backgroundColor: u.color,
                              boxShadow: isCurrent
                                ? '0 8px 0 rgba(17,16,25,0.28), 0 0 0 6px rgba(245,158,11,0.38)'
                                : '0 8px 0 rgba(17,16,25,0.24)',
                            }
                          : undefined
                      }
                      className={`group relative flex h-[86px] w-[86px] flex-col items-center justify-center rounded-full border-4 border-white text-white transition-transform duration-150 ${
                        !unlocked
                          ? 'cursor-not-allowed bg-[#94A3B8] shadow-[0_7px_0_#64748B]'
                          : 'cursor-pointer hover:-translate-y-1 hover:scale-105 active:translate-y-1'
                      }`}
                    >
                      {unlocked ? (
                        <>
                          <span className="text-[28px] font-black leading-none tracking-tight">
                            {u.phonicsLetter}
                          </span>
                          <span className="mt-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-extrabold leading-none">
                            Unit {u.unit}
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock size={24} />
                          <span className="mt-1 text-[10px] font-extrabold opacity-90">
                            Unit {u.unit}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Crisp Compact Label Pill below the Medallion */}
                    <span
                      className={`mt-2 whitespace-nowrap rounded-full border-2 px-3 py-0.5 text-xs font-black shadow-xs ${
                        isCurrent
                          ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]'
                          : unlocked
                            ? 'border-white bg-white/95 text-[#111019]'
                            : 'border-white/70 bg-white/80 text-[#64748B]'
                      }`}
                    >
                      {u.titleVi}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
