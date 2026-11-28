import { useState } from 'react';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { AppDialog, Button } from '../ui';
import { useTheme } from '../../hooks/useTheme';
import {
  getAutoPlayPronunciation,
  getDailyGoal,
  getDefaultAudioSpeed,
  setAutoPlayPronunciation,
  setDailyGoal,
  setDefaultAudioSpeed,
  type AudioSpeedOption,
  type DailyGoalOption,
} from '../../utils/learningPreferences';

type LearningSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const LearningSettingsModal = ({ isOpen, onClose }: LearningSettingsModalProps) => {
  const { theme, setTheme } = useTheme();
  const [autoPlayEnabled, setAutoPlayState] = useState(() => getAutoPlayPronunciation());
  const [dailyGoalPref, setDailyGoalPref] = useState<DailyGoalOption>(() => getDailyGoal());
  const [audioSpeedPref, setAudioSpeedPref] = useState<AudioSpeedOption>(() => getDefaultAudioSpeed());

  return (
    <AppDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt học tập & Phát âm"
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Xong</Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* Auto-play Pronunciation */}
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-element)] border border-border bg-bg-light p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-text-primary">
              {autoPlayEnabled ? <Volume2 size={16} className="text-primary" aria-hidden /> : <VolumeX size={16} className="text-text-muted" aria-hidden />}
              Tự động đọc phát âm từ
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              Tự động phát âm tiếng Anh mỗi khi mở sang từ mới
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={autoPlayEnabled}
              aria-label="Bật hoặc tắt tự động đọc phát âm từ"
              onClick={() => {
                const next = !autoPlayEnabled;
                setAutoPlayPronunciation(next);
                setAutoPlayState(next);
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                autoPlayEnabled ? 'bg-primary' : 'bg-border-emphasized'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  autoPlayEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-element)] border border-border bg-bg-light p-4">
          <div>
            <p className="text-sm font-bold text-text-primary">Mục tiêu mỗi ngày</p>
            <p className="mt-0.5 text-xs text-text-muted">Số từ muốn hoàn thành mỗi ngày</p>
          </div>
          <div className="flex gap-1.5">
            {([5, 10, 20] as DailyGoalOption[]).map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => {
                  setDailyGoal(goal);
                  setDailyGoalPref(goal);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  dailyGoalPref === goal
                    ? 'border-primary bg-primary text-text-on-accent'
                    : 'border-border bg-surface text-text-muted hover:text-text-primary'
                }`}
              >
                {goal} từ
              </button>
            ))}
          </div>
        </div>

        {/* Default Pronunciation Speed */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-element)] border border-border bg-bg-light p-4">
          <div>
            <p className="text-sm font-bold text-text-primary">Tốc độ phát âm mặc định</p>
            <p className="mt-0.5 text-xs text-text-muted">Áp dụng cho thẻ từ, ví dụ và hội thoại</p>
          </div>
          <div className="flex gap-1.5">
            {([
              { value: 1 as AudioSpeedOption, label: '1.0× Chuẩn' },
              { value: 0.75 as AudioSpeedOption, label: '0.75× Chậm rõ' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setDefaultAudioSpeed(opt.value);
                  setAudioSpeedPref(opt.value);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  audioSpeedPref === opt.value
                    ? 'border-primary bg-primary text-text-on-accent'
                    : 'border-border bg-surface text-text-muted hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-element)] border border-border bg-bg-light p-4">
          <div>
            <p className="text-sm font-bold text-text-primary">Giao diện hiển thị</p>
            <p className="mt-0.5 text-xs text-text-muted">Chọn chế độ sáng hoặc tối dịu mắt</p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'border-primary bg-primary text-text-on-accent'
                  : 'border-border bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              <Sun size={13} aria-hidden /> Sáng
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme('dark');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'border-primary bg-primary text-text-on-accent'
                  : 'border-border bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              <Moon size={13} aria-hidden /> Tối
            </button>
          </div>
        </div>
      </div>
    </AppDialog>
  );
};
