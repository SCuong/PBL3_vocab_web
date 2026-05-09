export type AvatarPreset = {
    id: string;
    url: string;
};

const AVATAR_COUNT = 21;

export const AVATAR_PRESETS: AvatarPreset[] = Array.from({ length: AVATAR_COUNT }, (_, index) => {
    const id = `avatar-${index + 1}`;
    return {
        id,
        url: `/avatars/${id}.png`
    };
});

const AVATAR_PRESET_URLS = new Set(AVATAR_PRESETS.map((item) => item.url));

export const normalizeAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) {
        return undefined;
    }

    return AVATAR_PRESET_URLS.has(avatarUrl)
        ? avatarUrl
        : undefined;
};
