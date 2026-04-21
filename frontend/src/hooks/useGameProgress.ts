import { useCallback, useState } from 'react';
import { EMPTY_CURRENT_USER_GAME_DATA, XP_RULES } from '../constants/appConstants';
import { mockData } from '../mocks/mockData';
import { appendStudyDate, getTodayStudyDate } from '../utils/studyHistory';

export type XpFloatItem = {
    id: number;
    amount: number;
};

export const useGameProgress = (addToast: (message: string, type?: string) => void) => {
    const [gameData, setGameData] = useState({
        ...mockData.gameData,
        currentUser: { ...EMPTY_CURRENT_USER_GAME_DATA }
    });
    const [xpFloats, setXpFloats] = useState<XpFloatItem[]>([]);

    const addXP = useCallback((amount: number) => {
        setGameData(prev => ({
            ...prev,
            currentUser: { ...prev.currentUser, xp: prev.currentUser.xp + amount }
        }));

        const id = Date.now();
        setXpFloats(prev => [...prev, { id, amount }]);
        setTimeout(() => {
            setXpFloats(prev => prev.filter(item => item.id !== id));
        }, 2000);
    }, []);

    const triggerStreakCheck = useCallback(() => {
        const today = getTodayStudyDate();
        let nextStreak: number | null = null;

        setGameData(prev => {
            if (prev.currentUser.lastStudyDate === today) {
                return prev;
            }

            nextStreak = prev.currentUser.streak + 1;
            const nextHistory = appendStudyDate(prev.currentUser.studyHistory, today);

            return {
                ...prev,
                currentUser: {
                    ...prev.currentUser,
                    streak: nextStreak,
                    lastStudyDate: today,
                    studyHistory: nextHistory
                }
            };
        });

        if (nextStreak !== null) {
            addXP(XP_RULES.STREAK_BONUS(nextStreak));
            addToast(`Streak ${nextStreak} ngày! 🔥`, 'success');
        }
    }, [addToast, addXP]);

    return {
        gameData,
        setGameData,
        xpFloats,
        addXP,
        triggerStreakCheck
    };
};
