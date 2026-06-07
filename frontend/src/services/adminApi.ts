// ── Types ─────────────────────────────────────────────────────────────────────
import { apiFetch } from './apiClient';
import type { LearnerDashboard } from './dashboardApi';

export interface AdminUser {
    userId: number;
    username: string;
    email: string;
    role: string;
    status: string;
    hasGoogleLogin: boolean;
    hasLocalPassword: boolean;
    createdAt: string;
    isDeleted: boolean;
    deletedAt?: string;
    isHiddenFromLeaderboard: boolean;
}

export interface AdminTopic {
    topicId: number;
    name: string;
    description: string;
    parentTopicId?: number;
    parentTopicName?: string;
}

export interface LearningOverviewRow {
    userId: number;
    username: string;
    topicId: number;
    topicName: string;
    sessionCount: number;
    wordsStudied: number;
    activeMinutes: number;
    firstActivityAt: string;
    lastActivityAt: string;
}

export interface AdminLearningOverviewResult {
    rows: LearningOverviewRow[];
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    activeUserCount: number;
    learnedTopicCount: number;
    totalWordsStudied: number;
    totalActiveHours: number;
}

export interface AdminLearnerDetail {
    user: AdminUser;
    learning: LearnerDashboard;
}

export interface RetentionAnalytics {
    activeLearners: number;
    returningLearners: number;
    retentionRate: number;
}

export interface ReviewCompletionAnalytics {
    reviewAttempts: number;
    successfulReviews: number;
    dueReviews: number;
    completionRate: number;
    successRate: number;
}

export interface VocabularyDifficultyItem {
    vocabId: number;
    word: string;
    meaningVi: string;
    topicName: string;
    attempts: number;
    failures: number;
    failureRate: number;
    averageQuality: number;
    difficultyScore: number;
}

export interface ExerciseFailureItem {
    exerciseId: number;
    vocabId: number;
    word: string;
    exerciseType: string;
    matchMode?: string;
    attempts: number;
    failures: number;
    failureRate: number;
    lastFailedAt?: string;
}

export interface DailyLearningTrend {
    date: string;
    activeLearners: number;
    sessionCount: number;
    wordsStudied: number;
    averageScore: number;
}

export interface LearningOverviewParams {
    userId?: number;
    topicId?: number;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
}

// ── Request Payloads ──────────────────────────────────────────────────────────

export interface AdminCreateUserPayload {
    username: string;
    email: string;
    password: string;
    role: string;
    status: string;
}

export interface AdminUpdateUserPayload {
    username: string;
    email: string;
    password?: string;
    role: string;
    status: string;
}

export interface AdminXpAdjustmentPayload {
    amount: number;
    reason: string;
}

export interface AdminResetProgressPayload {
    scope: 'all' | 'topic';
    topicId?: number;
    reason: string;
}

export interface AdminDeleteLearningDataPayload {
    reason: string;
    confirmationText: string;
}

export interface AdminLeaderboardVisibilityPayload {
    hidden: boolean;
    reason: string;
}

export interface AdminCreateTopicPayload {
    name: string;
    description: string;
    parentTopicId?: number;
}

export interface AdminUpdateTopicPayload {
    name: string;
    description: string;
    parentTopicId?: number;
}

// ── Vocabulary types ──────────────────────────────────────────────────────────

export interface AdminExampleItem {
    exampleId: number;
    vocabId: number;
    exampleEn: string;
    exampleVi: string;
    audioUrl?: string;
}

export interface AdminVocabularyItem {
    vocabId: number;
    word: string;
    ipa?: string;
    audioUrl?: string;
    level?: string;
    meaningVi?: string;
    topicId?: number;
    topicName?: string;
    examples: AdminExampleItem[];
}

export interface AdminVocabularyListResult {
    items: AdminVocabularyItem[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface AdminVocabularyListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    cefr?: string;
    topicId?: number;
}

export interface AdminCreateVocabularyPayload {
    word: string;
    ipa?: string;
    audioUrl?: string;
    level: string;
    meaningVi?: string;
    topicId?: number;
}

export interface AdminUpdateVocabularyPayload {
    word: string;
    ipa?: string;
    audioUrl?: string;
    level: string;
    meaningVi?: string;
    topicId?: number;
}

export interface AdminCreateExamplePayload {
    exampleEn: string;
    exampleVi: string;
    audioUrl?: string;
}

export interface AdminUpdateExamplePayload {
    exampleEn: string;
    exampleVi: string;
    audioUrl?: string;
}

// ── Internal fetch helper ─────────────────────────────────────────────────────

async function adminFetch<T>(
    url: string,
    options?: RequestInit,
    emptyBodyMessage = 'Không thể tải dữ liệu quản trị. Vui lòng thử lại.'
): Promise<T & { succeeded: boolean; message?: string }> {
    const response = await apiFetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    const rawBody = await response.text();
    if (!rawBody.trim()) {
        throw new Error(emptyBodyMessage);
    }

    let data: T & { succeeded: boolean; message?: string };
    try {
        data = JSON.parse(rawBody) as T & { succeeded: boolean; message?: string };
    } catch {
        throw new Error(emptyBodyMessage);
    }

    if (!response.ok || !data.succeeded) {
        throw new Error(data.message ?? `Yêu cầu thất bại (${response.status})`);
    }
    return data;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminApi = {
    // Users
    getUsers: async (): Promise<AdminUser[]> => {
        const data = await adminFetch<{ users: AdminUser[]; totalCount: number }>('/api/admin/users');
        return data.users;
    },

    createUser: async (payload: AdminCreateUserPayload): Promise<AdminUser> => {
        const data = await adminFetch<{ user?: AdminUser }>('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!data.user) throw new Error('Máy chủ không trả về người dùng vừa tạo.');
        return data.user;
    },

    updateUser: async (id: number, payload: AdminUpdateUserPayload): Promise<void> => {
        await adminFetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    deleteUser: async (id: number): Promise<void> => {
        await adminFetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
        });
    },

    getLearnerDetail: async (id: number): Promise<AdminLearnerDetail> => {
        const data = await adminFetch<{ user?: AdminUser; learning?: LearnerDashboard }>(
            `/api/admin/users/${id}/learning-detail`,
            undefined,
            'Không thể tải chi tiết học tập. Vui lòng thử lại.'
        );
        if (!data.user || !data.learning) throw new Error('Máy chủ không trả về chi tiết học tập.');
        return { user: data.user, learning: data.learning };
    },

    adjustXp: async (id: number, payload: AdminXpAdjustmentPayload): Promise<void> => {
        await adminFetch(`/api/admin/users/${id}/xp-adjustments`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    resetProgress: async (id: number, payload: AdminResetProgressPayload): Promise<void> => {
        await adminFetch(`/api/admin/users/${id}/reset-progress`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    deleteLearningData: async (id: number, payload: AdminDeleteLearningDataPayload): Promise<void> => {
        await adminFetch(`/api/admin/users/${id}/delete-learning-data`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    setLeaderboardVisibility: async (id: number, payload: AdminLeaderboardVisibilityPayload): Promise<void> => {
        await adminFetch(`/api/admin/users/${id}/leaderboard-visibility`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    // Topics
    getTopics: async (): Promise<AdminTopic[]> => {
        const data = await adminFetch<{ topics: AdminTopic[] }>('/api/admin/topics');
        return data.topics;
    },

    createTopic: async (payload: AdminCreateTopicPayload): Promise<AdminTopic> => {
        const data = await adminFetch<{ topic?: AdminTopic }>('/api/admin/topics', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!data.topic) throw new Error('Máy chủ không trả về chủ đề vừa tạo.');
        return data.topic;
    },

    updateTopic: async (id: number, payload: AdminUpdateTopicPayload): Promise<void> => {
        await adminFetch(`/api/admin/topics/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    deleteTopic: async (id: number): Promise<void> => {
        await adminFetch(`/api/admin/topics/${id}`, {
            method: 'DELETE',
        });
    },

    // Vocabulary
    getVocabulary: async (params: AdminVocabularyListParams = {}): Promise<AdminVocabularyListResult> => {
        const query = new URLSearchParams();
        if (params.page != null) query.set('page', String(params.page));
        if (params.pageSize != null) query.set('pageSize', String(params.pageSize));
        if (params.search) query.set('search', params.search);
        if (params.cefr) query.set('cefr', params.cefr);
        if (params.topicId != null) query.set('topicId', String(params.topicId));
        const qs = query.toString();
        const data = await adminFetch<AdminVocabularyListResult>(
            `/api/admin/vocabulary${qs ? `?${qs}` : ''}`
        );
        return data;
    },

    createVocabulary: async (payload: AdminCreateVocabularyPayload): Promise<AdminVocabularyItem> => {
        const data = await adminFetch<{ vocabulary?: AdminVocabularyItem }>('/api/admin/vocabulary', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!data.vocabulary) throw new Error('Máy chủ không trả về từ vựng vừa tạo.');
        return data.vocabulary;
    },

    updateVocabulary: async (id: number, payload: AdminUpdateVocabularyPayload): Promise<void> => {
        await adminFetch(`/api/admin/vocabulary/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    deleteVocabulary: async (id: number): Promise<void> => {
        await adminFetch(`/api/admin/vocabulary/${id}`, {
            method: 'DELETE',
        });
    },

    // Examples
    createExample: async (vocabId: number, payload: AdminCreateExamplePayload): Promise<AdminExampleItem> => {
        const data = await adminFetch<{ example?: AdminExampleItem }>(`/api/admin/vocabulary/${vocabId}/examples`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (!data.example) throw new Error('Máy chủ không trả về ví dụ vừa tạo.');
        return data.example;
    },

    updateExample: async (id: number, payload: AdminUpdateExamplePayload): Promise<void> => {
        await adminFetch(`/api/admin/examples/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    },

    deleteExample: async (id: number): Promise<void> => {
        await adminFetch(`/api/admin/examples/${id}`, {
            method: 'DELETE',
        });
    },

    // Learning Overview
    getLearningOverview: async (params: LearningOverviewParams = {}): Promise<AdminLearningOverviewResult> => {
        const query = new URLSearchParams();
        if (params.userId != null) query.set('userId', String(params.userId));
        if (params.topicId != null) query.set('topicId', String(params.topicId));
        if (params.fromDate) query.set('fromDate', params.fromDate);
        if (params.toDate) query.set('toDate', params.toDate);
        if (params.sortBy) query.set('sortBy', params.sortBy);
        if (params.sortDirection) query.set('sortDirection', params.sortDirection);
        if (params.page != null) query.set('page', String(params.page));
        if (params.pageSize != null) query.set('pageSize', String(params.pageSize));
        const qs = query.toString();
        const data = await adminFetch<AdminLearningOverviewResult>(
            `/api/admin/learning-overview${qs ? `?${qs}` : ''}`
        );
        return data;
    },

    getRetentionAnalytics: async (fromDate?: string, toDate?: string): Promise<RetentionAnalytics> => {
        const query = dateRangeQuery(fromDate, toDate);
        return adminFetch<RetentionAnalytics>(`/api/admin/analytics/retention${query}`);
    },

    getReviewCompletionAnalytics: async (fromDate?: string, toDate?: string): Promise<ReviewCompletionAnalytics> => {
        const query = dateRangeQuery(fromDate, toDate);
        return adminFetch<ReviewCompletionAnalytics>(`/api/admin/analytics/review-completion${query}`);
    },

    getVocabularyDifficultyAnalytics: async (limit = 5): Promise<VocabularyDifficultyItem[]> => {
        const data = await adminFetch<{ items: VocabularyDifficultyItem[] }>(
            `/api/admin/analytics/vocabulary-difficulty?limit=${limit}`
        );
        return data.items;
    },

    getExerciseFailureAnalytics: async (limit = 5): Promise<ExerciseFailureItem[]> => {
        const data = await adminFetch<{ items: ExerciseFailureItem[] }>(
            `/api/admin/analytics/exercise-failures?limit=${limit}`
        );
        return data.items;
    },

    getDailyLearningTrends: async (fromDate?: string, toDate?: string): Promise<DailyLearningTrend[]> => {
        const query = dateRangeQuery(fromDate, toDate);
        const data = await adminFetch<{ items: DailyLearningTrend[] }>(
            `/api/admin/analytics/daily-trends${query}`
        );
        return data.items;
    },
};

function dateRangeQuery(fromDate?: string, toDate?: string): string {
    const query = new URLSearchParams();
    if (fromDate) query.set('fromDate', fromDate);
    if (toDate) query.set('toDate', toDate);
    const value = query.toString();
    return value ? `?${value}` : '';
}
