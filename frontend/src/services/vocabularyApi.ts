import { apiFetch } from './apiClient';

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
    wordCount: number;
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
    exampleVi: string;
    exampleAudioUrl: string;
};

export type PagedVocabularyResult = {
    items: VocabularyListItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
};

type GetVocabularyPageParams = {
    page?: number;
    pageSize?: number;
    search?: string;
    cefr?: string;
    topicId?: number | null;
};

const buildVocabularyQuery = ({ page = 1, pageSize = 24, search = '', cefr = '', topicId = null }: GetVocabularyPageParams) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

    if (search.trim()) {
        params.set('search', search.trim());
    }

    if (cefr.trim() && cefr !== 'ALL') {
        params.set('cefr', cefr.trim());
    }

    if (typeof topicId === 'number' && Number.isFinite(topicId) && topicId > 0) {
        params.set('topicId', String(topicId));
    }

    return params.toString();
};

export const vocabularyApi = {
    getPage: async (params: GetVocabularyPageParams = {}): Promise<PagedVocabularyResult> => {
        const query = buildVocabularyQuery(params);
        const response = await apiFetch(`/api/vocabulary?${query}`);

        if (!response.ok) {
            throw new Error('Không thể tải danh sách từ vựng.');
        }

        return (await response.json()) as PagedVocabularyResult;
    },

    getByIds: async (ids: number[]): Promise<VocabularyListItem[]> => {
        const normalizedIds = ids
            .filter((id) => Number.isFinite(id) && id > 0)
            .filter((id, index, array) => array.indexOf(id) === index);

        if (normalizedIds.length === 0) {
            return [];
        }

        const query = normalizedIds.map((id) => `ids=${encodeURIComponent(String(id))}`).join('&');
        const response = await apiFetch(`/api/vocabulary/by-ids?${query}`);

        if (!response.ok) {
            throw new Error('Không thể tải danh sách từ đã học.');
        }

        return (await response.json()) as VocabularyListItem[];
    },

    getById: async (id: number): Promise<VocabularyDetailItem> => {
        const response = await apiFetch(`/api/vocabulary/${id}`);

        if (!response.ok) {
            throw new Error('Không thể tải chi tiết từ vựng.');
        }

        return (await response.json()) as VocabularyDetailItem;
    },

    getTopics: async (): Promise<VocabularyTopicItem[]> => {
        const response = await apiFetch('/api/vocabulary/topics');

        if (!response.ok) {
            throw new Error('Không thể tải danh sách chủ đề.');
        }

        return (await response.json()) as VocabularyTopicItem[];
    },

    getLearningByTopic: async (topicId: number): Promise<VocabularyLearningItem[]> => {
        const response = await apiFetch(`/api/learning/topics/${topicId}/vocabulary`);

        if (!response.ok) {
            throw new Error('Không thể tải danh sách học theo chủ đề.');
        }

        return (await response.json()) as VocabularyLearningItem[];
    }
};
