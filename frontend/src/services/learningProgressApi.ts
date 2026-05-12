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

export const learningProgressApi = {
    getState: async (): Promise<LearningProgressState> => {
        const response = await fetch('/api/learning/progress', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load learning progress state.');
        }

        return (await response.json()) as LearningProgressState;
    },

    getBatchReviewOptions: async (vocabIds: number[], repeatedVocabIds: number[] = []): Promise<Record<number, ReviewOptionItem[]>> => {
        if (vocabIds.length === 0) return {};
        const response = await fetch('/api/learning/review-options/batch', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vocabIds, repeatedVocabIds }),
        });
        if (!response.ok) throw new Error('Failed to load review options.');
        const data: ReviewOptionsResponse[] = await response.json();
        return Object.fromEntries(data.map(item => [item.vocabId, item.options]));
    },

    submitSingleReview: async (vocabId: number, topicId: number, quality: number): Promise<LearningProgressState> => {
        const response = await fetch('/api/learning/words/review', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vocabId, topicId, quality }),
        });
        if (!response.ok) throw new Error('Failed to submit review.');
        return (await response.json()) as LearningProgressState;
    },

    markWordsLearned: async (topicId: number, wordIds: number[]): Promise<LearningProgressState> => {
        const response = await fetch('/api/learning/progress/learn', {
            method: 'POST',
            credentials: 'include',
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
    }
};
