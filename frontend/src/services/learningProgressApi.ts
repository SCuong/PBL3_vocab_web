import { apiFetch } from './apiClient';

export type LearningProgressTopicStateItem = {
    topicId: number;
    learnedWordIds: number[];
    reviewWordIds: number[];
};

export type LearningProgressState = {
    topics: LearningProgressTopicStateItem[];
};

export type ReviewOptionItem = {
    quality: number;
    days: number;
    nextReviewDate: string;
};

export type ReviewOptionsResponse = {
    vocabId: number;
    options: ReviewOptionItem[];
};

const normalizeWordIds = (wordIds: number[]) => wordIds.filter(id => Number.isFinite(id) && id > 0);

const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
    try {
        const data = await response.clone().json();
        if (data && typeof data.message === 'string' && data.message.trim().length > 0) {
            return data.message;
        }
    } catch {
        // Body not JSON — fall back to default message.
    }
    return fallback;
};

export type LearningSessionMode = 'STUDY' | 'REVIEW';
export type LearningSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export type LearningSessionItem = {
    sessionItemId: number;
    vocabId: number;
    orderIndex: number;
    isAnswered: boolean;
    quality: number | null;
    answeredAt: string | null;
    word: string | null;
    ipa: string | null;
    audioUrl: string | null;
    level: string | null;
    meaningVi: string | null;
};

export type LearningSession = {
    sessionId: number;
    userId: number;
    topicId: number | null;
    mode: LearningSessionMode;
    status: LearningSessionStatus;
    currentIndex: number;
    startedAt: string;
    updatedAt: string;
    completedAt: string | null;
    abandonedAt: string | null;
    items: LearningSessionItem[];
};

export type CompleteLearningSessionResponse = {
    sessionId: number;
    status: LearningSessionStatus;
    completedAt: string;
    committedItemCount: number;
    progress: LearningProgressState;
};

export type StartLearningSessionPayload = {
    mode: LearningSessionMode;
    topicId?: number | null;
    vocabIds: number[];
};

export const learningProgressApi = {
    getState: async (): Promise<LearningProgressState> => {
        const response = await apiFetch('/api/learning/progress');

        if (!response.ok) {
            throw new Error('Failed to load learning progress state.');
        }

        return (await response.json()) as LearningProgressState;
    },

    getBatchReviewOptions: async (vocabIds: number[], repeatedVocabIds: number[] = []): Promise<Record<number, ReviewOptionItem[]>> => {
        if (vocabIds.length === 0) return {};
        const response = await apiFetch('/api/learning/review-options/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vocabIds, repeatedVocabIds }),
        });
        if (!response.ok) throw new Error('Failed to load review options.');
        const data: ReviewOptionsResponse[] = await response.json();
        return Object.fromEntries(data.map(item => [item.vocabId, item.options]));
    },

    submitSingleReview: async (vocabId: number, topicId: number, quality: number, isRepeatedThisSession = false): Promise<LearningProgressState> => {
        const response = await apiFetch('/api/learning/words/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vocabId, topicId, quality, isRepeatedThisSession }),
        });
        if (!response.ok) throw new Error('Failed to submit review.');
        return (await response.json()) as LearningProgressState;
    },

    markWordsLearned: async (topicId: number, wordIds: number[]): Promise<LearningProgressState> => {
        const response = await apiFetch('/api/learning/progress/learn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topicId,
                wordIds: normalizeWordIds(wordIds)
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update learning progress state.');
        }

        return (await response.json()) as LearningProgressState;
    },

    startLearningSession: async (payload: StartLearningSessionPayload): Promise<LearningSession> => {
        const response = await apiFetch('/api/learning/sessions/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: payload.mode,
                topicId: payload.topicId ?? null,
                vocabIds: normalizeWordIds(payload.vocabIds),
            }),
        });
        if (!response.ok) throw new Error(await extractErrorMessage(response, 'Không thể bắt đầu phiên học.'));
        return (await response.json()) as LearningSession;
    },

    getActiveLearningSession: async (mode: LearningSessionMode, topicId?: number | null): Promise<LearningSession | null> => {
        const params = new URLSearchParams({ mode });
        if (topicId != null) params.set('topicId', String(topicId));
        const response = await apiFetch(`/api/learning/sessions/active?${params.toString()}`);
        if (response.status === 204) return null;
        if (!response.ok) throw new Error('Failed to load active learning session.');
        return (await response.json()) as LearningSession;
    },

    saveLearningSessionAnswer: async (
        sessionId: number,
        vocabId: number,
        quality: number,
        currentIndex?: number,
    ): Promise<LearningSession> => {
        const response = await apiFetch(`/api/learning/sessions/${sessionId}/answers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vocabId,
                quality,
                currentIndex: currentIndex ?? null,
            }),
        });
        if (!response.ok) throw new Error('Failed to save session answer.');
        return (await response.json()) as LearningSession;
    },

    completeLearningSession: async (sessionId: number): Promise<CompleteLearningSessionResponse> => {
        const response = await apiFetch(`/api/learning/sessions/${sessionId}/complete`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(await extractErrorMessage(response, 'Không thể hoàn tất phiên học.'));
        return (await response.json()) as CompleteLearningSessionResponse;
    },

    abandonLearningSession: async (sessionId: number): Promise<{ succeeded: boolean; changed: boolean }> => {
        const response = await apiFetch(`/api/learning/sessions/${sessionId}/abandon`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to abandon learning session.');
        return (await response.json()) as { succeeded: boolean; changed: boolean };
    },
};
