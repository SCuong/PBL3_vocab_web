import React from 'react';
import type { ReviewOptionItem } from '../../services/learningProgressApi';

interface SM2ReviewButtonsProps {
    options: ReviewOptionItem[];
    onSelect: (quality: number) => void;
    isSubmitting: boolean;
    appearance?: 'default' | 'focusedLight' | 'focusedDark';
}

const BUTTON_CONFIG = [
    {
        quality: 0,
        emoji: '😵',
        label: 'Quên rồi',
        defaultClasses: 'border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-red-200',
        focusedLightClasses: 'border-[#f4b6bc] hover:bg-[#fff5f6] hover:border-[#e88993] focus:ring-[#f4b6bc]',
        focusedDarkClasses: 'border-[#8f5965] hover:bg-[#4b3042] hover:border-[#c17b89] focus:ring-[#8f5965]',
    },
    {
        quality: 3,
        emoji: '🤔',
        label: 'Chưa chắc',
        defaultClasses: 'border-orange-200 hover:bg-orange-50 hover:border-orange-300 focus:ring-orange-200',
        focusedLightClasses: 'border-[#f2c27b] hover:bg-[#fff9ee] hover:border-[#dfa14d] focus:ring-[#f2c27b]',
        focusedDarkClasses: 'border-[#96744e] hover:bg-[#493c38] hover:border-[#c69b65] focus:ring-[#96744e]',
    },
    {
        quality: 5,
        emoji: '🔥',
        label: 'Nhớ rõ',
        defaultClasses: 'border-green-200 hover:bg-green-50 hover:border-green-300 focus:ring-green-200',
        focusedLightClasses: 'border-[#9bd8b5] hover:bg-[#f2fbf6] hover:border-[#65bf8c] focus:ring-[#9bd8b5]',
        focusedDarkClasses: 'border-[#4f856b] hover:bg-[#2c463e] hover:border-[#72b18e] focus:ring-[#4f856b]',
    },
] as const;

const formatSubLabel = (days: number): string => {
    if (days === 0) return 'Ôn lại ngay';
    if (days === 1) return 'Ôn sau 1 ngày';
    return `Ôn sau ${days} ngày`;
};

const SM2ReviewButtons: React.FC<SM2ReviewButtonsProps> = ({
    options,
    onSelect,
    isSubmitting,
    appearance = 'default',
}) => {
    const getOption = (quality: number) => options.find(o => o.quality === quality);
    const isFocusedLight = appearance === 'focusedLight';
    const isFocusedDark = appearance === 'focusedDark';

    return (
        <div className="mt-4 w-full max-w-2xl mx-auto sm:mt-6">
            <p className={`mb-2 text-center text-[11px] font-semibold uppercase tracking-wide sm:mb-3 sm:text-sm ${
                isFocusedLight ? 'text-[#6f6185]' : isFocusedDark ? 'text-[#cbbce2]' : 'text-text-muted'
            }`}>
                Bạn nhớ từ này ở mức nào?
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {BUTTON_CONFIG.map((config) => {
                    const { quality, emoji, label } = config;
                    const option = getOption(quality);
                    const subLabel = option ? formatSubLabel(option.days) : '…';
                    const colorClasses = isFocusedLight
                        ? config.focusedLightClasses
                        : isFocusedDark
                            ? config.focusedDarkClasses
                            : config.defaultClasses;

                    return (
                        <button
                            key={quality}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => onSelect(quality)}
                            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border-2 px-1 py-2.5 sm:rounded-2xl sm:px-2 sm:py-3
                                transition-all duration-150 cursor-pointer
                                active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${isFocusedLight
                                    ? 'bg-white/95 focus:ring-offset-[#f3ecff]'
                                    : isFocusedDark
                                        ? 'bg-[#3a304d] focus:ring-offset-[#282138]'
                                        : 'bg-surface'
                                }
                                ${colorClasses}`}
                        >
                            <span className="text-xl leading-none sm:text-2xl">{emoji}</span>
                            <span className={`text-[11px] font-bold leading-tight sm:text-sm ${
                                isFocusedLight ? 'text-[#2b2140]' : isFocusedDark ? 'text-[#f5f0ff]' : 'text-text-primary'
                            }`}>{label}</span>
                            <span className={`hidden text-[11px] leading-tight min-[390px]:block ${
                                isFocusedLight ? 'text-[#76688e]' : isFocusedDark ? 'text-[#cbbce2]' : 'text-text-muted'
                            }`}>{subLabel}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export { SM2ReviewButtons };
