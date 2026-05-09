interface LogoProps {
  variant?: 'hero' | 'header';
}

/**
 * The PNG lives in `public/logo.png`, so Vite serves it at the root path
 * unchanged in dev and copies it into `dist/` at build time.
 */
const LOGO_SRC = '/logo.png';

export function Logo({ variant = 'hero' }: LogoProps) {
  return (
    <div className={`logo logo--${variant}`} aria-label="Bậc Thầy Từ Vựng">
      <img src={LOGO_SRC} alt="Bậc Thầy Từ Vựng" />
    </div>
  );
}
