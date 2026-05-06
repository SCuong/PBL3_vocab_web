import {
    EMPTY_CURRENT_USER_GAME_DATA,
    type CurrentUserGameData
} from '../constants/appConstants';
import {
    buildHistoryFromStreak,
    calculateStreakFromHistory,
    getLatestStudyDate,
    normalizeStudyHistory
} from './studyHistory';

const STORAGE_KEY_PREFIX = 'vocab-learning:current-user-game-data:';

const getStorageKey = (userId: number) => `${STORAGE_KEY_PREFIX}${userId}`;

export const normalizeCurrentUserGameData = (
    data?: Partial<CurrentUserGameData> | null
): CurrentUserGameData => {
    const normalizedHistory = normalizeStudyHistory(data?.studyHistory);
    const historyFromStreak = buildHistoryFromStreak(data?.lastStudyDate || '', data?.streak || 0);
    const studyHistory = normalizedHistory.length > 0 ? normalizedHistory : historyFromStreak;
    const streak = studyHistory.length > 0
        ? calculateStreakFromHistory(studyHistory)
        : (Number.isFinite(data?.streak) ? Number(data?.streak) : 0);
    const lastStudyDate = getLatestStudyDate(studyHistory) || data?.lastStudyDate || '';

    return {
        ...EMPTY_CURRENT_USER_GAME_DATA,
        ...data,
        streak,
        lastStudyDate,
        studyHistory,
        studyHistoryDetails: data?.studyHistoryDetails && typeof data.studyHistoryDetails === 'object'
            ? data.studyHistoryDetails
            : {}
    };
};

export const loadCurrentUserGameData = (userId: number): CurrentUserGameData => {
    if (typeof window === 'undefined') {
        return normalizeCurrentUserGameData();
    }

    try {
        const raw = window.localStorage.getItem(getStorageKey(userId));
        if (!raw) {
            return normalizeCurrentUserGameData();
        }

        const parsed = JSON.parse(raw) as Partial<CurrentUserGameData>;
        return normalizeCurrentUserGameData(parsed);
    } catch {
        return normalizeCurrentUserGameData();
    }
};

export const saveCurrentUserGameData = (userId: number, data: CurrentUserGameData) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const normalized = normalizeCurrentUserGameData(data);
        window.localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
    } catch {
    }
};
