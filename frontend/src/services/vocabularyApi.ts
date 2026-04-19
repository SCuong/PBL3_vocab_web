export type VocabularyListItem = {
    id: number;
    word: string;
    ipa: string;
    meaning: string;
    cefr: string;
    topicId?: number;
    topicName: string;
    audioUrl: string;
};

export type VocabularyExampleItem = {
    id: number;
    exampleEn: string;
    exampleVi: string;
    audioUrl: string;
};

export type VocabularyDetailItem = VocabularyListItem & {
    examples: VocabularyExampleItem[];
};

export type VocabularyTopicItem = {
    topicId: number;
    name: string;
    description: string;
    parentTopicId?: number;
};

export type VocabularyLearningItem = {
    id: number;
    word: string;
    ipa: string;
    meaning: string;
    cefr: string;
    topicId?: number;
    topicName: string;
    audioUrl: string;
    example: string;
    exampleAudioUrl: string;
};

export const vocabularyApi = {
    getAll: async (): Promise<VocabularyListItem[]> => {
        const response = await fetch('/api/vocabulary', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load vocabulary list.');
        }

        const data = (await response.json()) as VocabularyListItem[];

        // Log audio URLs for debugging
        const missingAudio = data.filter(item => !item.audioUrl || item.audioUrl.trim() === '');
        if (missingAudio.length > 0) {
            console.warn(`${missingAudio.length} words have missing or empty audioUrl:`, missingAudio.map(w => w.word));
        }

        return data;
    },

    getById: async (id: number): Promise<VocabularyDetailItem> => {
        const response = await fetch(`/api/vocabulary/${id}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load vocabulary detail.');
        }

        const data = (await response.json()) as VocabularyDetailItem;

        // Log audio URLs for debugging
        if (!data.audioUrl || data.audioUrl.trim() === '') {
            console.warn(`Word detail (${data.word}): Missing or empty audioUrl`);
        }
        if (data.examples) {
            data.examples.forEach((example, index) => {
                if (!example.audioUrl || example.audioUrl.trim() === '') {
                    console.warn(`Example ${index + 1} of "${data.word}": Missing or empty audioUrl`);
                }
            });
        }

        return data;
    },

    getTopics: async (): Promise<VocabularyTopicItem[]> => {
        const response = await fetch('/api/vocabulary/topics', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load topic list.');
        }

        return (await response.json()) as VocabularyTopicItem[];
    },

    getLearningByTopic: async (topicId: number): Promise<VocabularyLearningItem[]> => {
        const response = await fetch(`/api/learning/topics/${topicId}/vocabulary`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load learning vocabulary by topic.');
        }

        const data = (await response.json()) as VocabularyLearningItem[];

        // Log audio URLs for debugging
        data.forEach((item, index) => {
            if (!item.audioUrl || item.audioUrl.trim() === '') {
                console.warn(`Word ${index + 1} (${item.word}): Missing or empty audioUrl`);
            }
            if (!item.exampleAudioUrl || item.exampleAudioUrl.trim() === '') {
                console.warn(`Example ${index + 1} (${item.word}): Missing or empty exampleAudioUrl`);
            }
        });

        return data;
    }
};
