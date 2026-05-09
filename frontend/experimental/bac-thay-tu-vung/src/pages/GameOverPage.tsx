import { Logo } from '../components/Logo';

interface GameOverPageProps {
  bankedPoints: number;
  failedLevel: number;
  correctWord?: string;
  correctAnswer?: string;
  explanation?: string;
  onRestart: () => void;
  onHome: () => void;
}

export function GameOverPage({
  bankedPoints,
  failedLevel,
  correctWord,
  correctAnswer,
  explanation,
  onRestart,
  onHome,
}: GameOverPageProps) {
  return (
    <div className="screen endscreen lose">
      <Logo variant="header" />
      <h2>Hết lượt rồi!</h2>
      <p className="summary">
        Bạn dừng lại ở Cấp {failedLevel}. Điểm an toàn được khoá lại:
      </p>
      <div className="payout">{bankedPoints.toLocaleString('en-US')} điểm</div>
      {correctWord && correctAnswer && (
        <p className="summary">
          Đáp án đúng cho <strong>{correctWord}</strong>: <em>{correctAnswer}</em>
          {explanation ? ` — ${explanation}` : ''}
        </p>
      )}
      <div className="actions">
        <button type="button" className="btn-primary" onClick={onRestart}>
          Thử lại
        </button>
        <button type="button" className="btn-ghost" onClick={onHome}>
          Về trang chủ
        </button>
      </div>
    </div>
  );
}
