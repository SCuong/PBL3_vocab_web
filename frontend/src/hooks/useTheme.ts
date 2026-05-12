import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'vocablearning-theme';
const THEME_CHANGE_EVENT = 'vocablearning-theme-change';

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

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [setTheme, theme]);

    return { theme, setTheme, toggleTheme };
};
