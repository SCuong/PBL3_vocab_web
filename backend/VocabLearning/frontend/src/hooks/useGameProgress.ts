import { useCallback, useState } from 'react';
import { EMPTY_CURRENT_USER_GAME_DATA, XP_RULES } from '../constants/appConstants';
import { mockData } from '../mocks/mockData';
import {
    appendStudyDate,
    calculateStreakFromHistory,
    getTodayStudyDate
} from '../utils/studyHistory';

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
        let shouldAwardStreakBonus = false;

        setGameData(prev => {
            const alreadyStudiedToday = prev.currentUser.studyHistory.includes(today);

            if (alreadyStudiedToday) {
                const recalculatedStreak = calculateStreakFromHistory(prev.currentUser.studyHistory);

                if (recalculatedStreak === prev.currentUser.streak && prev.currentUser.lastStudyDate === today) {
                    return prev;
                }

                return {
                    ...prev,
                    currentUser: {
                        ...prev.currentUser,
                        streak: recalculatedStreak,
                        lastStudyDate: today
                    }
                };
            }

            const nextHistory = appendStudyDate(prev.currentUser.studyHistory, today);
            nextStreak = calculateStreakFromHistory(nextHistory);
            shouldAwardStreakBonus = true;

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

        if (nextStreak !== null && shouldAwardStreakBonus) {
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
