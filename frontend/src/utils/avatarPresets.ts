export type AvatarPreset = {
    id: string;
    url: string;
};

const AVATAR_COUNT = 21;

export const AVATAR_PRESETS: AvatarPreset[] = Array.from({ length: AVATAR_COUNT }, (_, index) => {
    const id = `avatar-${index + 1}`;
    return {
        id,
        url: `/avatars/${id}.webp`
    };
});

const AVATAR_PRESET_URLS = new Set(AVATAR_PRESETS.map((item) => item.url));

// Avatars were previously stored as `/avatars/avatar-N.png`. After switching the
// assets to WebP, map any legacy `.png` value to its WebP equivalent so existing
// users keep the avatar they already selected.
const LEGACY_PNG_TO_WEBP = new Map(
    AVATAR_PRESETS.map((item) => [item.url.replace(/\.webp$/, '.png'), item.url]),
);

export const normalizeAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) {
        return undefined;
    }

    if (AVATAR_PRESET_URLS.has(avatarUrl)) {
        return avatarUrl;
    }

    return LEGACY_PNG_TO_WEBP.get(avatarUrl) ?? undefined;
};
