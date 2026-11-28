// Synthesized machine SFX and Lumo beeps have been disabled per user preference.
// Exports are retained as silent no-ops so existing call sites stay clean.

export type SfxKind = 'tap' | 'toggle-on' | 'toggle-off' | 'flip' | 'unsure' | 'correct' | 'wrong' | 'complete';
export type LumoMood = 'greet' | 'celebrate' | 'curious';

export function isSfxEnabled(): boolean {
  return false;
}

export function setSfxEnabled(_enabled: boolean): void {
  // No-op: machine sound effects are permanently disabled.
}

export function playLumoVoice(_mood: LumoMood = 'greet', _delay = 0): void {
  // No-op: synthesized mascot voice removed.
}

export function playSfx(_type: SfxKind): void {
  // No-op: synthesized UI sound effects removed.
}

export function attachGlobalTactileTap(): () => void {
  return () => {};
}
