import type { ReactNode } from 'react';
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

type BadgeVariant = 'purple' | 'cyan' | 'pink' | 'green' | 'warn' | 'red' | 'accent';

type BadgeProps = {
    children: ReactNode;
    variant?: BadgeVariant;
    className?: string;
};

const VARIANTS = {
    purple: 'purple',
    accent: 'purple',
    cyan: 'cyan',
    pink: 'pink',
    green: 'green',
    warn: 'orange',
    red: 'red',
} as const;

/** House badge: tinted Astryx Badge for categorising (levels, roles, states). */
export const Badge = ({ children, variant = 'purple', className }: BadgeProps) => (
    <AstryxBadge label={children} variant={VARIANTS[variant]} className={className} />
);
