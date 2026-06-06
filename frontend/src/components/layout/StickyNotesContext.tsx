import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type StickyNotesContextValue = {
    isOpen: boolean;
    isLauncherHidden: boolean;
    openStickyNotes: () => void;
    closeStickyNotes: () => void;
    toggleStickyNotes: () => void;
    setStickyNotesLauncherHidden: (hidden: boolean) => void;
};

const StickyNotesContext = createContext<StickyNotesContextValue | null>(null);

export const StickyNotesProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLauncherHidden, setIsLauncherHidden] = useState(false);

    const openStickyNotes = useCallback(() => setIsOpen(true), []);
    const closeStickyNotes = useCallback(() => setIsOpen(false), []);
    const toggleStickyNotes = useCallback(() => setIsOpen(current => !current), []);
    const setStickyNotesLauncherHidden = useCallback((hidden: boolean) => setIsLauncherHidden(hidden), []);

    const value = useMemo(
        () => ({
            isOpen,
            isLauncherHidden,
            openStickyNotes,
            closeStickyNotes,
            toggleStickyNotes,
            setStickyNotesLauncherHidden,
        }),
        [
            closeStickyNotes,
            isLauncherHidden,
            isOpen,
            openStickyNotes,
            setStickyNotesLauncherHidden,
            toggleStickyNotes,
        ],
    );

    return <StickyNotesContext.Provider value={value}>{children}</StickyNotesContext.Provider>;
};

export const useStickyNotes = () => {
    const context = useContext(StickyNotesContext);
    if (!context) {
        throw new Error('useStickyNotes must be used within StickyNotesProvider.');
    }

    return context;
};
