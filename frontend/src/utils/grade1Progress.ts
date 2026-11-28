// Persists Grade 1 Global Success Unit completion & stars (1-3 stars per unit)

const STORAGE_KEY = 'vocablearning_grade1_progress_v1';

export type UnitProgressRecord = {
  stars: number; // 1..3
  completedAt: string;
};

export type Grade1ProgressState = {
  units: Record<number, UnitProgressRecord>;
  reviews: Record<number, UnitProgressRecord>; // Review 1 (U1-4), Review 2 (U5-8), Review 3 (U9-12), Review 4 (U13-16)
  unlockAll: boolean;
};

const DEFAULT_STATE: Grade1ProgressState = {
  units: {},
  reviews: {},
  unlockAll: false,
};

export function loadGrade1Progress(): Grade1ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<Grade1ProgressState>;
    return {
      units: parsed.units && typeof parsed.units === 'object' ? parsed.units : {},
      reviews: parsed.reviews && typeof parsed.reviews === 'object' ? parsed.reviews : {},
      unlockAll: Boolean(parsed.unlockAll),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveGrade1Progress(state: Grade1ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordUnitCompletion(
  prev: Grade1ProgressState,
  unitNumber: number,
  stars: number,
): Grade1ProgressState {
  const clamped = Math.max(1, Math.min(3, Math.round(stars)));
  const existing = prev.units[unitNumber];
  const bestStars = existing ? Math.max(existing.stars, clamped) : clamped;
  const next: Grade1ProgressState = {
    ...prev,
    units: {
      ...prev.units,
      [unitNumber]: {
        stars: bestStars,
        completedAt: new Date().toISOString(),
      },
    },
  };
  saveGrade1Progress(next);
  return next;
}

export function recordReviewCompletion(
  prev: Grade1ProgressState,
  reviewNumber: number,
  stars: number,
): Grade1ProgressState {
  const clamped = Math.max(1, Math.min(3, Math.round(stars)));
  const existing = prev.reviews[reviewNumber];
  const bestStars = existing ? Math.max(existing.stars, clamped) : clamped;
  const next: Grade1ProgressState = {
    ...prev,
    reviews: {
      ...prev.reviews,
      [reviewNumber]: {
        stars: bestStars,
        completedAt: new Date().toISOString(),
      },
    },
  };
  saveGrade1Progress(next);
  return next;
}

export function isReviewUnlocked(state: Grade1ProgressState, reviewNumber: number): boolean {
  if (state.unlockAll) return true;
  const endUnit = reviewNumber * 4;
  return Boolean(state.units[endUnit]?.stars);
}

export function isUnitUnlocked(state: Grade1ProgressState, unitNumber: number): boolean {
  if (state.unlockAll || unitNumber <= 1) return true;
  return Boolean(state.units[unitNumber - 1]?.stars);
}

export function getTotalStars(state: Grade1ProgressState): number {
  const unitStars = Object.values(state.units).reduce((sum, item) => sum + (item?.stars ?? 0), 0);
  const reviewStars = Object.values(state.reviews).reduce((sum, item) => sum + (item?.stars ?? 0), 0);
  return unitStars + reviewStars;
}
