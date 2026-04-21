import type { VocabularyTopicItem } from '../services/vocabularyApi';
import type { LearningProgressState, LearningProgressTopicStateItem } from '../services/learningProgressApi';

type VocabularyUiItem = {
    id: number;
    topicId?: number;
};

type TopicStats = {
    new: number;
    review: number;
    learned: number;
    total: number;
};

type TopicUiModel = {
    id: number;
    title: string;
    description: string;
    icon: string;
    stats: TopicStats;
};

type TopicGroupUiModel = {
    id: string;
    title: string;
    icon: string;
    topics: TopicUiModel[];
};

const CATEGORY_ICONS_BY_PARENT_TOPIC_ID: Record<number, string> = {
    1: '💬',
    11: '💼',
    20: '💪',
    25: '✈️',
    29: '🏠',
    39: '💭',
    42: '🌍'
};

const CATEGORY_ICONS_BY_TITLE: Record<string, string> = {
    'daily communication': '💬',
    'work & education': '💼',
    'work and education': '💼',
    health: '💪',
    'entertainment & travel': '✈️',
    'entertainment and travel': '✈️',
    'daily life': '🏠',
    'emotions & opinions': '💭',
    'emotions and opinions': '💭',
    'culture & science': '🌍',
    'culture and science': '🌍'
};

const getCategoryIcon = (parent: VocabularyTopicItem) => {
    const iconById = CATEGORY_ICONS_BY_PARENT_TOPIC_ID[parent.topicId];
    if (iconById) {
        return iconById;
    }

    const normalizedTitle = parent.name.trim().toLowerCase();
    return CATEGORY_ICONS_BY_TITLE[normalizedTitle] ?? '📚';
};

const TOPIC_ICONS_BY_TOPIC_ID: Record<number, string> = {
    1: '👋',
    2: '👨‍👩-👧‍👦',
    3: '🤝',
    4: '☀️',
    5: '📅',
    6: '🎨',
    7: '🏠',
    8: '📍',
    9: '🛍️',
    10: '🍽️',
    11: '👨‍💼',
    12: '🏢',
    13: '🎓',
    14: '📧',
    15: '📝',
    16: '👥',
    17: '⏰',
    18: '🖨️',
    19: '🤝',
    20: '🦶',
    21: '🤒',
    22: '🏃',
    23: '🥗',
    24: '🍎',
    25: '🎬',
    26: '🌍',
    27: '🗽',
    28: '🏨',
    29: '🍔',
    30: '🛒',
    31: '🚌',
    32: '🐶',
    33: '🪁',
    34: '👗',
    35: '🚿',
    36: '🍳',
    37: '🧹',
    38: '🌐',
    39: '😊',
    40: '🎨',
    41: '💬',
    42: '🌿',
    43: '🦁',
    44: '📚'
};

type TopicProgressLookup = Record<number, LearningProgressTopicStateItem>;

const createProgressLookup = (progressState: LearningProgressState | null): TopicProgressLookup => {
    if (!progressState?.topics) {
        return {};
    }

    return progressState.topics.reduce<TopicProgressLookup>((acc, topicState) => {
        acc[topicState.topicId] = topicState;
        return acc;
    }, {});
};

const calculateTopicStats = (wordIds: number[], topicProgress?: LearningProgressTopicStateItem): TopicStats => {
    const learnedIds = new Set(topicProgress?.learnedWordIds ?? []);
    const reviewIds = new Set(topicProgress?.reviewWordIds ?? []);

    const learned = wordIds.reduce((count, wordId) => count + (learnedIds.has(wordId) ? 1 : 0), 0);
    const review = wordIds.reduce((count, wordId) => count + (reviewIds.has(wordId) && !learnedIds.has(wordId) ? 1 : 0), 0);
    const total = wordIds.length;

    return {
        new: Math.max(0, total - learned - review),
        review,
        learned,
        total
    };
};

export const buildLearningTopicGroups = (
    topicFilters: VocabularyTopicItem[],
    vocabularyItems: VocabularyUiItem[],
    progressState: LearningProgressState | null
): TopicGroupUiModel[] => {
    const progressLookup = createProgressLookup(progressState);
    const wordsByTopic = vocabularyItems.reduce<Record<number, number[]>>((acc, item) => {
        if (!item.topicId) {
            return acc;
        }

        if (!acc[item.topicId]) {
            acc[item.topicId] = [];
        }

        acc[item.topicId].push(item.id);
        return acc;
    }, {});

    const byParent = topicFilters
        .filter(topic => !topic.parentTopicId)
        .sort((a, b) => a.topicId - b.topicId);
    const children = topicFilters
        .filter(topic => topic.parentTopicId)
        .sort((a, b) => a.topicId - b.topicId);

    const toTopicUiModel = (topic: VocabularyTopicItem): TopicUiModel => {
        const wordIds = wordsByTopic[topic.topicId] ?? [];
        return {
            id: topic.topicId,
            title: topic.name,
            description: topic.description,
            icon: TOPIC_ICONS_BY_TOPIC_ID[topic.topicId] ?? '📘',
            stats: calculateTopicStats(wordIds, progressLookup[topic.topicId])
        };
    };

    if (byParent.length === 0 && topicFilters.length > 0) {
        return [
            {
                id: 'all',
                title: 'Chủ đề học tập',
                icon: '📚',
                topics: [...topicFilters]
                    .sort((a, b) => a.topicId - b.topicId)
                    .map(toTopicUiModel)
            }
        ];
    }

    return byParent.map(parent => {
        const childTopics = children.filter(topic => topic.parentTopicId === parent.topicId);
        const topics = (childTopics.length > 0 ? childTopics : [parent]).map(toTopicUiModel);

        return {
            id: String(parent.topicId),
            title: parent.name,
            icon: getCategoryIcon(parent),
            topics
        };
    });
};
