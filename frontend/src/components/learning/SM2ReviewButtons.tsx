import React, { useEffect } from 'react';
import type { ReviewOptionItem } from '../../services/learningProgressApi';
import { playSfx } from '../../utils/sound';

interface SM2ReviewButtonsProps {
    options: ReviewOptionItem[];
    onSelect: (quality: number) => void;
    isSubmitting: boolean;
    /** Kept for callers; colours now come from theme tokens in every mode. */
    appearance?: 'default' | 'focusedLight' | 'focusedDark';
}

const BUTTON_CONFIG = [
    { quality: 0, key: '1', label: 'Quên', sfx: 'wrong' as const, tone: 'var(--danger-color)' },
    { quality: 3, key: '2', label: 'Chưa chắc', sfx: 'unsure' as const, tone: 'var(--warning-color)' },
    { quality: 5, key: '3', label: 'Nhớ', sfx: 'correct' as const, tone: 'var(--success-color)' },
] as const;

const formatSubLabel = (days: number): string => {
    if (days === 0) return 'Ôn lại ngay';
    if (days === 1) return 'Sau 1 ngày';
    return `Sau ${days} ngày`;
};

const SM2ReviewButtons: React.FC<SM2ReviewButtonsProps> = ({ options, onSelect, isSubmitting }) => {
    const getOption = (quality: number) => options.find(o => o.quality === quality);

    // Desktop shortcut: 1 / 2 / 3, ignored while typing.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (isSubmitting || event.metaKey || event.ctrlKey || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            const config = BUTTON_CONFIG.find(c => c.key === event.key);
            if (config) {
                event.preventDefault();
                playSfx(config.sfx);
                onSelect(config.quality);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isSubmitting, onSelect]);

    return (
        <div className="mx-auto mt-4 w-full max-w-2xl sm:mt-6">
            <p className="mb-3 text-center text-sm font-medium text-text-muted">Bạn nhớ từ này ở mức nào?</p>
            <div className="grid grid-cols-3 gap-2">
                {BUTTON_CONFIG.map(({ quality, key, label, sfx, tone }) => {
                    const option = getOption(quality);
                    return (
                        <button
                            key={quality}
                            type="button"
                            data-no-tap-sfx="true"
                            disabled={isSubmitting}
                            onClick={() => {
                                playSfx(sfx);
                                onSelect(quality);
                            }}
                            aria-keyshortcuts={key}
                            style={{ '--tone': tone } as React.CSSProperties}
                            className="group relative flex min-h-[4.5rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-element)] border border-border bg-surface px-2 py-3 transition-colors duration-150 hover:border-[var(--tone)] hover:bg-[color-mix(in_srgb,var(--tone)_8%,var(--surface))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <span className="mb-1 h-1.5 w-6 rounded-full bg-[var(--tone)]" aria-hidden />
                            <span className="text-sm font-semibold text-text-primary sm:text-[15px]">{label}</span>
                            <span className="text-xs tabular-nums text-text-muted">{option ? formatSubLabel(option.days) : '…'}</span>
                            <kbd className="absolute right-2 top-2 hidden rounded border border-border px-1 text-[11px] font-medium text-text-muted lg:block" aria-hidden>
                                {key}
                            </kbd>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export { SM2ReviewButtons };
