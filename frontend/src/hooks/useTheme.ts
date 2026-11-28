import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type ThemeMode = 'light' | 'dark';
export type ThemeTransitionOrigin = {
    onAfterTransition?: () => void;
};

export const THEME_STORAGE_KEY = 'vocablearning-theme';
const THEME_CHANGE_EVENT = 'vocablearning-theme-change';

type ViewTransitionLike = {
    ready: Promise<void>;
    finished: Promise<void>;
};

type DocumentWithViewTransition = Document & {
    startViewTransition?: (updateCallback: () => void) => ViewTransitionLike;
};

const isThemeMode = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark';

const readStoredTheme = (): ThemeMode => {
    if (typeof window === 'undefined') return 'light';

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'light';
};

const applyTheme = (theme: ThemeMode) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
};

export const initializeTheme = () => {
    if (typeof document === 'undefined') return;
    applyTheme(readStoredTheme());
};

/**
 * Mounts a single lightweight SVG ocean-wave light crest ONLY during the
 * View Transition so it glides down in exact lockstep with the wave mask.
 */
const mountWaveCrest = (toTheme: ThemeMode) => {
    const existing = document.getElementById('vl-theme-beam');
    existing?.remove();

    const isDawn = toTheme === 'light';
    const c1 = isDawn ? '#fbbf24' : '#a78bfa';
    const c2 = isDawn ? '#fde68a' : '#7c3aed';

    const wrapper = document.createElement('div');
    wrapper.id = 'vl-theme-beam';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.className = 'theme-wave-crest';
    wrapper.innerHTML = `
        <svg viewBox="0 0 1000 200" preserveAspectRatio="none" width="100%" height="100%" fill="none">
            <defs>
                <linearGradient id="vl-wave-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${c1}" stop-opacity="0" />
                    <stop offset="48%" stop-color="${c1}" stop-opacity="0.52" />
                    <stop offset="72%" stop-color="${c2}" stop-opacity="0.32" />
                    <stop offset="100%" stop-color="${c2}" stop-opacity="0" />
                </linearGradient>
            </defs>
            <path d="M0,45 C170,-15 340,125 520,55 C710,-20 860,115 1000,40 L1000,145 C860,210 710,85 520,155 C340,220 170,80 0,155 Z" fill="url(#vl-wave-grad)" />
            <path d="M0,108 C170,35 340,175 520,102 C710,25 860,165 1000,92" stroke="${c1}" stroke-opacity="0.7" stroke-width="3.5" />
        </svg>
    `;
    document.body.appendChild(wrapper);
    return wrapper;
};

export const useTheme = () => {
    const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());

    useLayoutEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key === THEME_STORAGE_KEY && isThemeMode(event.newValue)) {
                setThemeState(event.newValue);
            }
        };
        const onThemeChange = () => setThemeState(readStoredTheme());

        window.addEventListener('storage', onStorage);
        window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
        };
    }, []);

    const setTheme = useCallback((nextTheme: ThemeMode) => {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    }, []);

    const toggleTheme = useCallback((options?: ThemeTransitionOrigin) => {
        const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
        const doc = document as DocumentWithViewTransition;
        const prefersReduced =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!doc.startViewTransition || prefersReduced) {
            setTheme(nextTheme);
            return;
        }

        const root = document.documentElement;
        root.classList.add('is-theme-transitioning');

        let crest: HTMLDivElement | null = null;

        const transition = doc.startViewTransition(() => {
            crest = mountWaveCrest(nextTheme);
            flushSync(() => {
                setTheme(nextTheme);
            });
        });

        void transition.finished.finally(() => {
            crest?.remove();
            document.getElementById('vl-theme-beam')?.remove();
            root.classList.remove('is-theme-transitioning');
            options?.onAfterTransition?.();
        });
    }, [setTheme, theme]);

    return { theme, setTheme, toggleTheme };
};
