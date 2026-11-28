// Persisted learner preferences (daily goal & default pronunciation speed).

const DAILY_GOAL_KEY = 'vocablearning_daily_goal';
const AUDIO_SPEED_KEY = 'vocablearning_audio_speed';
const AUTO_PLAY_PRONUNCIATION_KEY = 'vocablearning_auto_play_pronunciation';

export type DailyGoalOption = 5 | 10 | 20;
export type AudioSpeedOption = 1 | 0.75;

export function getAutoPlayPronunciation(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(AUTO_PLAY_PRONUNCIATION_KEY);
  return saved === null ? true : saved === 'true';
}

export function setAutoPlayPronunciation(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTO_PLAY_PRONUNCIATION_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent('vocablearning:prefs-change'));
}

export function getDailyGoal(): DailyGoalOption {
  if (typeof window === 'undefined') return 5;
  const raw = Number(window.localStorage.getItem(DAILY_GOAL_KEY));
  if (raw === 10 || raw === 20) return raw;
  return 5;
}

export function setDailyGoal(goal: DailyGoalOption): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DAILY_GOAL_KEY, String(goal));
  window.dispatchEvent(new CustomEvent('vocablearning:prefs-change'));
}

export function getDefaultAudioSpeed(): AudioSpeedOption {
  if (typeof window === 'undefined') return 1;
  const raw = Number(window.localStorage.getItem(AUDIO_SPEED_KEY));
  return raw === 0.75 ? 0.75 : 1;
}

export function setDefaultAudioSpeed(speed: AudioSpeedOption): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUDIO_SPEED_KEY, String(speed));
  window.dispatchEvent(new CustomEvent('vocablearning:prefs-change'));
}
