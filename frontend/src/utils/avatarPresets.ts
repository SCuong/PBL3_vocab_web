export type AvatarGroup = 'mascot' | 'learner';

export type AvatarPreset = {
    id: string;
    url: string;
    label: string;
    group: AvatarGroup;
};

const ACTIVE_AVATARS: readonly Omit<AvatarPreset, 'url'>[] = [
    { id: 'avatar-1', label: 'Lumo Học giả', group: 'mascot' },
    { id: 'avatar-2', label: 'Lumo Matcha', group: 'mascot' },
    { id: 'avatar-3', label: 'Lumo Anh đào', group: 'mascot' },
    { id: 'avatar-4', label: 'Lumo Họa sĩ', group: 'mascot' },
    { id: 'avatar-5', label: 'Lumo Quán quân', group: 'mascot' },
    { id: 'avatar-6', label: 'Minh · Len xanh', group: 'learner' },
    { id: 'avatar-7', label: 'Khoa · Tai nghe', group: 'learner' },
    { id: 'avatar-8', label: 'Hà · Nơ tím', group: 'learner' },
    { id: 'avatar-9', label: 'Nam · Mũ len', group: 'learner' },
];

export const AVATAR_PRESETS: AvatarPreset[] = ACTIVE_AVATARS.map((item) => ({
    ...item,
    url: `/avatars/${item.id}.webp`,
}));

export const MASCOT_AVATAR_PRESETS = AVATAR_PRESETS.filter((item) => item.group === 'mascot');
export const LEARNER_AVATAR_PRESETS = AVATAR_PRESETS.filter((item) => item.group === 'learner');

const AVATAR_PRESET_URLS = new Set(AVATAR_PRESETS.map((item) => item.url));

// Preserve backwards compatibility for persisted user avatars:
// - Maps legacy `.png` URLs to `.webp`.
// - Maps removed legacy flat clip-art slots (`avatar-10..21`) deterministically onto
//   an active 2D watercolor preset so existing users never see a broken image.
const LEGACY_AVATAR_PATTERN = /^\/avatars\/avatar-(\d+)\.(png|webp)$/i;

export const normalizeAvatarUrl = (avatarUrl?: string) => {
    if (!avatarUrl) {
        return undefined;
    }

    if (AVATAR_PRESET_URLS.has(avatarUrl)) {
        return avatarUrl;
    }

    const match = LEGACY_AVATAR_PATTERN.exec(avatarUrl.trim());
    if (!match) {
        return undefined;
    }

    const index = Number(match[1]);
    if (!Number.isFinite(index) || index < 1 || index > 21) {
        return undefined;
    }

    return AVATAR_PRESETS[(index - 1) % AVATAR_PRESETS.length].url;
};
