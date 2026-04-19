import {
    EMPTY_CURRENT_USER_GAME_DATA,
    type CurrentUserGameData
} from '../constants/appConstants';

const STORAGE_KEY_PREFIX = 'vocab-learning:current-user-game-data:';

const getStorageKey = (userId: number) => `${STORAGE_KEY_PREFIX}${userId}`;

export const normalizeCurrentUserGameData = (
    data?: Partial<CurrentUserGameData> | null
): CurrentUserGameData => ({
    ...EMPTY_CURRENT_USER_GAME_DATA,
    ...data,
    studyHistory: Array.isArray(data?.studyHistory)
        ? data.studyHistory
        : []
});

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
