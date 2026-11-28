import { Children, isValidElement, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { Button as AstryxButton, type ButtonVariant as AstryxVariant } from '@astryxdesign/core/Button';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'> & {
    children: ReactNode;
    variant?: ButtonVariant;
    size?: 'sm' | 'md' | 'lg';
    /** Stretch to the container width. */
    fullWidth?: boolean;
    isLoading?: boolean;
    title?: string;
};

const VARIANTS: Record<ButtonVariant, AstryxVariant> = {
    primary: 'primary',
    accent: 'primary',
    secondary: 'secondary',
    ghost: 'ghost',
    danger: 'destructive',
};

/** Plain text of a React subtree, used as the accessible label. */
const textOf = (node: ReactNode): string =>
    Children.toArray(node)
        .map(child => {
            if (typeof child === 'string' || typeof child === 'number') return String(child);
            if (isValidElement(child)) return textOf((child as ReactElement<{ children?: ReactNode }>).props.children);
            return '';
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

/** House button: the app's API on top of Astryx Button. */
export const Button = ({
    children,
    variant = 'primary',
    size = 'lg',
    fullWidth,
    isLoading,
    disabled,
    title,
    type = 'button',
    'aria-label': ariaLabel,
    ...rest
}: ButtonProps) => (
    <AstryxButton
        {...rest}
        type={type}
        label={ariaLabel ?? (textOf(children) || title || '')}
        variant={VARIANTS[variant]}
        size={size}
        width={fullWidth ? '100%' : undefined}
        isDisabled={disabled}
        isLoading={isLoading}
        tooltip={title}
    >
        {/* Children may mix lucide icons and text; keep them on one line without clipping. */}
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">{children}</span>
    </AstryxButton>
);
