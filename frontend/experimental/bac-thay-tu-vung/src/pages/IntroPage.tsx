import { Logo } from '../components/Logo';

interface IntroPageProps {
  onStart: () => void;
}

export function IntroPage({ onStart }: IntroPageProps) {
  return (
    <div className="screen intro">
      <Logo variant="hero" />
      <h1>Bậc Thầy Từ Vựng</h1>
      <p>
        Vượt qua 15 cấp độ từ vựng tiếng Anh để trở thành Bậc Thầy. Trả lời đúng để
        leo bậc thang điểm thưởng — hai mốc an toàn ở Cấp 5 và Cấp 10 sẽ khoá điểm
        cho bạn.
      </p>
      <div className="actions">
        <button type="button" className="btn-primary" onClick={onStart}>
          Bắt đầu chơi
        </button>
      </div>
      <div className="keys" aria-label="Keyboard shortcuts">
        <span>Phím:</span>
        <kbd>A</kbd>
        <kbd>B</kbd>
        <kbd>C</kbd>
        <kbd>D</kbd>
        <kbd>Enter</kbd>
        <kbd>Esc</kbd>
      </div>
    </div>
  );
}
