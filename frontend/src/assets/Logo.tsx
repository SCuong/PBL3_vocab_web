type LogoProps = {
    size?: number;
    className?: string;
};

export const Logo = ({ size = 36, className = '' }: LogoProps) => (
    <img
        src="/logo.webp"
        width={size}
        height={size}
        alt="VocabLearning logo"
        className={className}
        style={{ objectFit: 'contain' }}
    />
);
