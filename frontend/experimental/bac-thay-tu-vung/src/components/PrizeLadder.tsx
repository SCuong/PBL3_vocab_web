import { PRIZE_LADDER } from '../data/prizeLadder';

interface PrizeLadderProps {
  /** Level the player is currently attempting (1-based). */
  currentLevel: number;
}

export function PrizeLadder({ currentLevel }: PrizeLadderProps) {
  return (
    <ol className="ladder" aria-label="Prize ladder">
      {PRIZE_LADDER.map((rung) => {
        const cls = ['ladder__row'];
        if (rung.safeHaven) cls.push('is-safe');
        if (rung.level === currentLevel) cls.push('is-current');
        else if (rung.level < currentLevel) cls.push('is-cleared');
        return (
          <li key={rung.level} className={cls.join(' ')}>
            <span>
              <span className="ladder__lvl">{String(rung.level).padStart(2, '0')}</span>
              {rung.safeHaven ? '★' : ''}
            </span>
            <span>{rung.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
