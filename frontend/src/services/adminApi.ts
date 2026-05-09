// ── Types ─────────────────────────────────────────────────────────────────────

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
    options?: RequestInit
): Promise<T & { succeeded: boolean; message?: string }> {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    const data = (await response.json()) as T & { succeeded: boolean; message?: string };
    if (!response.ok || !data.succeeded) {
        throw new Error(data.message ?? `Request failed (${response.status})`);
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
        if (!data.user) throw new Error('Server did not return the created user.');
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
        if (!data.topic) throw new Error('Server did not return the created topic.');
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
        if (!data.vocabulary) throw new Error('Server did not return the created vocabulary.');
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
        if (!data.example) throw new Error('Server did not return the created example.');
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
};
