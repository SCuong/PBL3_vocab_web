import { apiFetch } from './apiClient';

export type DashboardHeatmapDay = {
    date: string;
    wordsStudied: number;
    sessionCount: number;
    score: number;
    intensity: number;
};

export type DashboardMasteryProgress = {
    totalWords: number;
    learnedWords: number;
    masteredWords: number;
    reviewWords: number;
    learnedPercent: number;
    masteredPercent: number;
};

export type DashboardReviewForecast = {
    dueToday: number;
    dueTomorrow: number;
    dueThisWeek: number;
    generatedAt: string;
};

export type DashboardXpLevel = {
    totalXp: number;
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    levelProgressPercent: number;
};

export type DashboardActivity = {
    sessionId: number | null;
    date: string;
    activityType: string;
    topicName: string;
    wordsStudied: number;
    score: number;
};

export type DashboardBadge = {
    key: string;
    label: string;
    description: string;
    unlocked: boolean;
    unlockedAt: string | null;
};

export type DashboardContinueLearning = {
    mode: string;
    topicId: number | null;
    topicName: string;
    vocabId: number | null;
    word: string;
    availableWords: number;
    dueAt: string | null;
};

export type LearnerDashboard = {
    succeeded: boolean;
    message?: string;
    streak: number;
    heatmap: DashboardHeatmapDay[];
    masteryProgress: DashboardMasteryProgress;
    reviewForecast: DashboardReviewForecast;
    xp: DashboardXpLevel;
    recentActivity: DashboardActivity[];
    badges: DashboardBadge[];
    continueLearning: DashboardContinueLearning | null;
};

export const dashboardApi = {
    getLearnerDashboard: async (): Promise<LearnerDashboard> => {
        const response = await apiFetch('/api/dashboard/learner');

        if (!response.ok) {
            throw new Error('Không thể tải dữ liệu bảng điều khiển.');
        }

        return (await response.json()) as LearnerDashboard;
    },
};
