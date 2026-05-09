/**
 * Placeholder sound bus. The prototype ships without audio assets; calls are
 * guarded so the UI can wire `play(...)` everywhere it eventually wants sound,
 * and dropping MP3s into `public/sfx/` later will light it up with no
 * component-level changes.
 */
export type SoundId =
  | 'select'
  | 'confirm'
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'win'
  | 'lose'
  | 'lifeline'
  | 'intro';

const SOURCES: Record<SoundId, string> = {
  select: '/sfx/select.mp3',
  confirm: '/sfx/confirm.mp3',
  correct: '/sfx/correct.mp3',
  wrong: '/sfx/wrong.mp3',
  tick: '/sfx/tick.mp3',
  win: '/sfx/win.mp3',
  lose: '/sfx/lose.mp3',
  lifeline: '/sfx/lifeline.mp3',
  intro: '/sfx/intro.mp3',
};

class SoundManagerImpl {
  private cache = new Map<SoundId, HTMLAudioElement>();
  private muted = false;

  setMuted(value: boolean): void {
    this.muted = value;
  }

  isMuted(): boolean {
    return this.muted;
  }

  preload(): void {
    if (typeof Audio === 'undefined') return;
    for (const id of Object.keys(SOURCES) as SoundId[]) this.get(id);
  }

  play(id: SoundId): void {
    if (this.muted || typeof Audio === 'undefined') return;
    const el = this.get(id);
    if (!el) return;
    try {
      el.currentTime = 0;
      void el.play().catch(() => {
        // Autoplay restrictions or missing asset — fail silently.
      });
    } catch {
      // Older browsers throw on currentTime when not loaded yet.
    }
  }

  private get(id: SoundId): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    let el = this.cache.get(id);
    if (!el) {
      el = new Audio(SOURCES[id]);
      el.preload = 'auto';
      this.cache.set(id, el);
    }
    return el;
  }
}

export const SoundManager = new SoundManagerImpl();
