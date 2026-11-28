// SuperMemo-2 (SM-2) Spaced Repetition Engine for Tiếng Anh 1 – Global Success (64 words)

const SM2_STORAGE_KEY = 'vocablearning_sm2_g1_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export type Sm2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export type Sm2Card = {
  slug: string;
  easeFactor: number; // default 2.5, minimum 1.3
  intervalDays: number; // 0 -> 1 -> 6 -> round(interval * EF)
  repetitions: number;
  nextReviewAt: string; // ISO string
  lastReviewedAt: string; // ISO string
  lapses: number;
};

export type Sm2Store = Record<string, Sm2Card>;

export function loadSm2Store(): Sm2Store {
  try {
    const raw = localStorage.getItem(SM2_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Sm2Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSm2Store(store: Sm2Store): void {
  try {
    localStorage.setItem(SM2_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Pure SuperMemo-2 update calculation.
 * quality: 5 = instant/first-try correct, 4 = good, 3 = correct with hesitation/retry, <3 = forgotten/wrong
 */
export function calculateSm2Next(
  existing: Sm2Card | undefined,
  slug: string,
  quality: Sm2Quality,
  nowMs = Date.now(),
): Sm2Card {
  const prevEf = existing?.easeFactor ?? 2.5;
  const prevInterval = existing?.intervalDays ?? 0;
  const prevReps = existing?.repetitions ?? 0;
  const prevLapses = existing?.lapses ?? 0;

  let repetitions: number;
  let intervalDays: number;
  let lapses = prevLapses;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
    lapses = prevLapses + 1;
  } else {
    if (prevReps === 0) {
      intervalDays = 1;
    } else if (prevReps === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.max(1, Math.round(prevInterval * prevEf));
    }
    repetitions = prevReps + 1;
  }

  const nextEf = Math.max(
    1.3,
    Number((prevEf + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2)),
  );

  // When forgotten (quality < 3), schedule due immediately so smart review picks it up right away
  const nextReviewMs = quality < 3 ? nowMs : nowMs + intervalDays * DAY_MS;

  return {
    slug,
    easeFactor: nextEf,
    intervalDays,
    repetitions,
    nextReviewAt: new Date(nextReviewMs).toISOString(),
    lastReviewedAt: new Date(nowMs).toISOString(),
    lapses,
  };
}

export function recordSm2Review(slug: string, quality: Sm2Quality): Sm2Card {
  const store = loadSm2Store();
  const updated = calculateSm2Next(store[slug], slug, quality);
  store[slug] = updated;
  saveSm2Store(store);
  return updated;
}

export function markSm2Introduced(slug: string): void {
  const store = loadSm2Store();
  if (store[slug]) return;
  const now = new Date();
  store[slug] = {
    slug,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: now.toISOString(),
    lastReviewedAt: now.toISOString(),
    lapses: 0,
  };
  saveSm2Store(store);
}

export function getDueSm2Cards(nowMs = Date.now()): Sm2Card[] {
  const store = loadSm2Store();
  return Object.values(store)
    .filter((card) => new Date(card.nextReviewAt).getTime() <= nowMs)
    .sort((a, b) => {
      // Prioritize lower easeFactor / more overdue cards
      const diffA = nowMs - new Date(a.nextReviewAt).getTime();
      const diffB = nowMs - new Date(b.nextReviewAt).getTime();
      if (a.easeFactor !== b.easeFactor) return a.easeFactor - b.easeFactor;
      return diffB - diffA;
    });
}

export function getSm2Summary(nowMs = Date.now()): {
  learnedCount: number;
  masteredCount: number;
  dueCount: number;
} {
  const cards = Object.values(loadSm2Store());
  let masteredCount = 0;
  let dueCount = 0;
  for (const c of cards) {
    if (c.repetitions >= 2 && c.intervalDays >= 6) masteredCount += 1;
    if (new Date(c.nextReviewAt).getTime() <= nowMs) dueCount += 1;
  }
  return {
    learnedCount: cards.length,
    masteredCount,
    dueCount,
  };
}
