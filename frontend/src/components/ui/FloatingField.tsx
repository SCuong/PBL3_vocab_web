import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export type FloatingFieldProps = {
    label: string;
    type?: 'text' | 'email' | 'password';
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    onEnter?: () => void;
    autoComplete?: string;
    maxLength?: number;
    error?: string;
    disabled?: boolean;
    isPassword?: boolean;
    shown?: boolean;
    onToggleShown?: () => void;
};

/**
 * Shared Pinterest-style floating-label input:
 * - Label rests centered inside when empty.
 * - Glides smoothly up into the top-left inside the box once characters are entered
 *   or browser autofill populates the field.
 * - Password fields include an Eye / EyeOff visibility icon inside the right edge.
 */
export const FloatingField = ({
    label,
    type = 'text',
    value,
    onChange,
    onBlur,
    onEnter,
    autoComplete,
    maxLength,
    error,
    disabled = false,
    isPassword = false,
    shown = false,
    onToggleShown,
}: FloatingFieldProps) => {
    const id = useId();
    const [focused, setFocused] = useState(false);
    const hasValue = value.length > 0;
    const inputType = isPassword ? (shown ? 'text' : 'password') : type;

    return (
        <div className="space-y-1.5">
            <div
                className={`relative h-[52px] overflow-hidden rounded-[14px] border-2 bg-surface transition-colors duration-150 ${
                    disabled ? 'opacity-60' : ''
                } ${
                    error
                        ? 'border-danger-color'
                        : focused
                          ? 'border-primary'
                          : 'border-border-emphasized hover:border-primary/50'
                }`}
            >
                <input
                    id={id}
                    type={inputType}
                    value={value}
                    disabled={disabled}
                    autoComplete={autoComplete}
                    maxLength={maxLength}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                        setFocused(false);
                        onBlur?.();
                    }}
                    onChange={(e) => {
                        const next = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
                        onChange(next);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && onEnter) {
                            e.preventDefault();
                            onEnter();
                        }
                    }}
                    className={`vl-float-input h-full w-full bg-transparent pl-3.5 text-[14.5px] font-medium text-text-primary outline-none disabled:cursor-not-allowed ${
                        isPassword ? 'pr-11' : 'pr-3.5'
                    } ${hasValue ? 'pt-[20px] pb-[4px]' : 'py-3'}`}
                />
                <label
                    htmlFor={id}
                    data-floated={hasValue ? 'true' : 'false'}
                    className={`vl-float-label pointer-events-none select-none text-[14.5px] leading-[1.2] ${
                        hasValue ? 'font-semibold' : 'font-normal'
                    } ${
                        error
                            ? 'text-danger-color'
                            : focused && hasValue
                              ? 'text-primary'
                              : 'text-text-muted'
                    }`}
                >
                    {label}
                </label>

                {isPassword && onToggleShown && (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={onToggleShown}
                        aria-label={shown ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
                        aria-pressed={shown}
                        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary disabled:pointer-events-none"
                    >
                        {shown ? <EyeOff size={18} strokeWidth={2} aria-hidden /> : <Eye size={18} strokeWidth={2} aria-hidden />}
                    </button>
                )}
            </div>

            {error && (
                <p role="alert" className="px-1 text-xs font-medium text-danger-color">
                    {error}
                </p>
            )}
        </div>
    );
};
