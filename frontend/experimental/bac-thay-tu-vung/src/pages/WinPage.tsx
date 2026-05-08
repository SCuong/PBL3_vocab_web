import { Logo } from '../components/Logo';
import { TOP_LEVEL, pointsAtLevel } from '../data/prizeLadder';

interface WinPageProps {
  onRestart: () => void;
  onHome: () => void;
}

export function WinPage({ onRestart, onHome }: WinPageProps) {
  return (
    <div className="screen endscreen win">
      <div className="confetti" aria-hidden="true" />
      <Logo variant="hero" />
      <h2>Bạn là Bậc Thầy Từ Vựng!</h2>
      <p className="summary">
        Vượt qua tất cả {TOP_LEVEL} cấp độ. Một thành tựu xứng đáng với một học giả thực thụ.
      </p>
      <div className="payout">{pointsAtLevel(TOP_LEVEL).toLocaleString('en-US')} điểm</div>
      <div className="actions">
        <button type="button" className="btn-primary" onClick={onRestart}>
          Chơi lại
        </button>
        <button type="button" className="btn-ghost" onClick={onHome}>
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
