export type LearningProgressTopicStateItem = {
    topicId: number;
    learnedWordIds: number[];
    reviewWordIds: number[];
};

export type LearningProgressState = {
    topics: LearningProgressTopicStateItem[];
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
