import React from 'react';
import type { ReviewOptionItem } from '../../services/learningProgressApi';

interface SM2ReviewButtonsProps {
    options: ReviewOptionItem[];
    onSelect: (quality: number) => void;
    isSubmitting: boolean;
}

const BUTTON_CONFIG = [
    {
        quality: 0,
        emoji: '😵',
        label: 'Quên rồi',
        classes: 'border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-red-200',
    },
    {
        quality: 3,
        emoji: '🤔',
        label: 'Hơi nhớ',
        classes: 'border-orange-200 hover:bg-orange-50 hover:border-orange-300 focus:ring-orange-200',
    },
    {
        quality: 4,
        emoji: '😊',
        label: 'Nhớ tốt',
        classes: 'border-blue-200 hover:bg-blue-50 hover:border-blue-300 focus:ring-blue-200',
    },
    {
        quality: 5,
        emoji: '🔥',
        label: 'Thuộc luôn',
        classes: 'border-green-200 hover:bg-green-50 hover:border-green-300 focus:ring-green-200',
    },
] as const;

const formatSubLabel = (days: number): string => {
    if (days === 0) return 'Ôn lại ngay';
    if (days === 1) return 'Ôn sau 1 ngày';
    return `Ôn sau ${days} ngày`;
};

const SM2ReviewButtons: React.FC<SM2ReviewButtonsProps> = ({ options, onSelect, isSubmitting }) => {
    const getOption = (quality: number) => options.find(o => o.quality === quality);

    return (
        <div className="mt-6 w-full max-w-2xl mx-auto">
            <p className="text-center text-sm font-semibold text-text-muted mb-3 tracking-wide uppercase">
                Bạn nhớ từ này ở mức nào?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BUTTON_CONFIG.map(({ quality, emoji, label, classes }) => {
                    const option = getOption(quality);
                    const subLabel = option ? formatSubLabel(option.days) : '…';

                    return (
                        <button
                            key={quality}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => onSelect(quality)}
                            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border-2 bg-white/80 backdrop-blur-sm
                                transition-all duration-150 cursor-pointer
                                active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${classes}`}
                        >
                            <span className="text-2xl leading-none">{emoji}</span>
                            <span className="font-bold text-sm text-text-primary leading-tight">{label}</span>
                            <span className="text-[11px] text-text-muted leading-tight">{subLabel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export { SM2ReviewButtons };
