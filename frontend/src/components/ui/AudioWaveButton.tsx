import { useEffect, useState, type MouseEvent } from 'react';
import { Volume2 } from 'lucide-react';
import { playPronunciationAudio, stopPronunciationAudio } from '../../utils/audio';

const WAVE_PEAKS = [0.36, 0.78, 1, 0.62, 0.94, 0.48, 0.88, 0.66, 0.34];
const COMPACT_PEAKS = [0.45, 0.95, 0.62, 0.88, 0.42];

export type AudioWaveButtonProps = {
    text: string;
    audioUrl?: string | null;
    playbackRate?: number;
    label?: string;
    caption?: string;
    variant?: 'pill' | 'compact';
    size?: 'sm' | 'md';
    className?: string;
    onPlayStart?: () => void;
    onPlayEnd?: () => void;
};

/**
 * Shared pronunciation trigger with live GPU-animated audio waveform bars.
 * Clicking a second button cancels any currently speaking audio cleanly.
 */
export const AudioWaveButton = ({
    text,
    audioUrl,
    playbackRate = 1,
    label,
    caption,
    variant = 'pill',
    size = 'md',
    className = '',
    onPlayStart,
    onPlayEnd,
}: AudioWaveButtonProps) => {
    const [playing, setPlaying] = useState(false);

    useEffect(
        () => () => {
            if (playing) {
                stopPronunciationAudio();
            }
        },
        [playing],
    );

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (playing) {
            stopPronunciationAudio();
            setPlaying(false);
            onPlayEnd?.();
            return;
        }
        setPlaying(true);
        onPlayStart?.();
        playPronunciationAudio(audioUrl ?? undefined, text, () => {
            setPlaying(false);
            onPlayEnd?.();
        }, playbackRate);
    };

    const peaks = variant === 'compact' ? COMPACT_PEAKS : WAVE_PEAKS;
    const heightClass = size === 'sm' ? 'min-h-9 px-3 text-xs gap-2' : 'min-h-11 px-3.5 text-sm gap-2.5';

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={label ?? `Nghe phát âm ${text}`}
            aria-pressed={playing}
            className={`inline-flex items-center justify-center rounded-full border-2 font-semibold cursor-pointer transition-colors duration-150 active:scale-[0.97] ${heightClass} ${
                playing
                    ? 'border-primary bg-primary text-text-on-accent'
                    : 'border-border-emphasized bg-primary-light text-primary hover:border-primary hover:bg-primary hover:text-text-on-accent'
            } ${className}`}
        >
            <Volume2 size={size === 'sm' ? 15 : 17} strokeWidth={2.1} aria-hidden="true" className="shrink-0" />
            <span
                className={`inline-flex items-center gap-[2.5px] h-4 ${playing ? 'vl-wave-live' : ''}`}
                aria-hidden="true"
            >
                {peaks.map((peak, idx) => (
                    <span
                        key={idx}
                        className="vl-wave-bar"
                        style={{
                            ['--vl-peak' as string]: peak,
                            ['--vl-delay' as string]: `${idx * 55}ms`,
                        }}
                    />
                ))}
            </span>
            {caption && <span className="whitespace-nowrap">{caption}</span>}
        </button>
    );
};
