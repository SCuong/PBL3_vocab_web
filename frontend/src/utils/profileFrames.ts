// Cosmetic profile frames. `key` maps to a dashboard badge key — unlock state is
// derived from that badge (never faked). Selection is local-only (localStorage),
// shared app-wide via AppContext so the avatar shows the same frame everywhere
// (Profile, Navbar, Leaderboard).
export type ProfileFrame = { key: string; label: string; img: string };

export const PROFILE_FRAMES: ProfileFrame[] = [
    { key: 'first-session', label: 'Tân binh', img: '/profile-frames/tan_binh.png' },
    { key: 'week-streak', label: 'Bền bỉ', img: '/profile-frames/ben_bi.png' },
    { key: 'hundred-words', label: '100 từ', img: '/profile-frames/lv100.png' },
    { key: 'mastery', label: 'Bậc thầy', img: '/profile-frames/bac_thay.png' },
    { key: 'xp-1000', label: '1,000 XP', img: '/profile-frames/1000xp.png' },
];

export const profileFrameStorageKey = (userId: number | string) => `profile_frame_${userId}`;

export const getProfileFrameImg = (frameKey: string | null | undefined): string | null =>
    frameKey ? (PROFILE_FRAMES.find((frame) => frame.key === frameKey)?.img ?? null) : null;
