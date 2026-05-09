import { useEffect } from 'react';
import { PRIZE_LADDER, pointsAtLevel } from '../data/prizeLadder';

interface RewardModalProps {
  /** The level the player just cleared. */
  clearedLevel: number;
  /** True when this clears the final rung — show a richer "champion" frame. */
  isFinalWin: boolean;
  onContinue: () => void;
}

/**
 * Reward popup shown after every correct answer. Highlights the cleared
 * rung and the next milestone to chase. Click anywhere (or press Enter /
 * Space) to dismiss and advance.
 */
export function RewardModal({ clearedLevel, isFinalWin, onContinue }: RewardModalProps) {
  const cleared = PRIZE_LADDER.find((r) => r.level === clearedLevel);
  const next = PRIZE_LADDER.find((r) => r.level === clearedLevel + 1) ?? null;
  const earned = pointsAtLevel(clearedLevel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  if (!cleared) return null;

  return (
    <div
      className="reward-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Phần thưởng"
      onClick={onContinue}
    >
      <div className="reward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reward-modal__halo" aria-hidden="true" />

        <header className="reward-modal__head">
          <span className="reward-modal__eyebrow">{isFinalWin ? 'Quán quân!' : 'Trả lời chính xác'}</span>
          <h3 className="reward-modal__title">
            {isFinalWin ? 'Bậc Thầy Từ Vựng' : `Vượt Cấp ${clearedLevel}`}
          </h3>
        </header>

        <div className="reward-modal__earned">
          <small>Điểm đạt được</small>
          <strong>{earned.toLocaleString('en-US')}</strong>
        </div>

        <ol className="reward-modal__ladder" aria-label="Bậc thang phần thưởng">
          {PRIZE_LADDER.map((rung) => {
            const cls = ['reward-modal__row'];
            if (rung.safeHaven) cls.push('is-safe');
            if (rung.level === clearedLevel) cls.push('is-current');
            else if (rung.level < clearedLevel) cls.push('is-cleared');
            else if (next && rung.level === next.level) cls.push('is-next');
            return (
              <li key={rung.level} className={cls.join(' ')}>
                <span className="reward-modal__lvl">
                  {String(rung.level).padStart(2, '0')}
                  {rung.safeHaven ? ' ★' : ''}
                </span>
                <span>{rung.label}</span>
              </li>
            );
          })}
        </ol>

        {next && (
          <div className="reward-modal__next">
            <small>Mốc kế tiếp</small>
            <strong>
              Cấp {next.level} · {next.label}
            </strong>
          </div>
        )}

        <button type="button" className="btn-primary" onClick={onContinue} autoFocus>
          {isFinalWin ? 'Hoàn tất' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  );
}
