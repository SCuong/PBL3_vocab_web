/**
 * Deterministic Fisher-Yates shuffle. Given the same seed, the same input
 * produces the same output — useful for reproducible test runs and for
 * shuffling answer choices without re-rendering them on every keystroke.
 */
export function shuffle<T>(input: readonly T[], seed = Date.now()): T[] {
  const out = input.slice();
  let s = seed >>> 0;
  const rand = () => {
    // xorshift32 — small, fast, good enough for UI shuffling.
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
