export type ProfilePreferences = {
    avatarUrl?: string;
};

const STORAGE_KEY_PREFIX = 'vocab-learning:profile-preferences:';

const getStorageKey = (userId: number) => `${STORAGE_KEY_PREFIX}${userId}`;

export const loadProfilePreferences = (userId: number): ProfilePreferences => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(getStorageKey(userId));
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as ProfilePreferences;
        const legacyAvatarDataUrl = (parsed as { avatarDataUrl?: string }).avatarDataUrl;
        return {
            avatarUrl: typeof parsed.avatarUrl === 'string'
                ? parsed.avatarUrl
                : typeof legacyAvatarDataUrl === 'string'
                    ? legacyAvatarDataUrl
                : undefined
        };
    } catch {
        return {};
    }
};

export const saveProfilePreferences = (userId: number, preferences: ProfilePreferences) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const payload: ProfilePreferences = {
            avatarUrl: preferences.avatarUrl || undefined
        };

        window.localStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
    } catch {
    }
};
