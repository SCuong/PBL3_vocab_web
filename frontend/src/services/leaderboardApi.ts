import { apiFetch } from './apiClient';

export type LeaderboardEntry = {
    rank: number;
    userId: number;
    username: string;
    totalXp: number;
    level: number;
    streak: number;
    masteredWords: number;
    isCurrentUser: boolean;
};

export type LeaderboardResponse = {
    succeeded: boolean;
    message?: string;
    entries: LeaderboardEntry[];
    currentUser: LeaderboardEntry | null;
};

export const leaderboardApi = {
    get: async (): Promise<LeaderboardResponse> => {
        const response = await apiFetch('/api/leaderboard');

        if (!response.ok) {
            throw new Error('Không thể tải bảng xếp hạng.');
        }

        return (await response.json()) as LeaderboardResponse;
    },
};
