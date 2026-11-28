export interface AvatarHeroRect {
    left: number;
    top: number;
    width: number;
    height: number;
    capturedAt: number;
    originElement: HTMLElement | null;
}

const MAX_AGE_MS = 2500;
let pendingOrigin: AvatarHeroRect | null = null;

/**
 * Snapshot the navbar avatar's viewport rect right before navigating to /profile
 * so the profile hero avatar can perform a choreographed curved FLIP morph.
 */
export function captureAvatarHeroOrigin(element: HTMLElement | null): void {
    if (!element || typeof window === 'undefined') return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pendingOrigin = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        capturedAt: performance.now(),
        originElement: element,
    };
}

/**
 * Read the pending origin rect without clearing it immediately (React StrictMode-safe).
 * Call clearAvatarHeroOrigin() once the animation finishes.
 */
export function peekAvatarHeroOrigin(): AvatarHeroRect | null {
    if (!pendingOrigin || typeof window === 'undefined') return null;
    if (performance.now() - pendingOrigin.capturedAt > MAX_AGE_MS) {
        pendingOrigin = null;
        return null;
    }
    return pendingOrigin;
}

export function clearAvatarHeroOrigin(): void {
    pendingOrigin = null;
}
