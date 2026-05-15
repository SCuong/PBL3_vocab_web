import type { VocabularyTopicItem } from '../services/vocabularyApi';
import type { LearningProgressState, LearningProgressTopicStateItem } from '../services/learningProgressApi';

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

const DEFAULT_CATEGORY_ICON = '📚';
const DEFAULT_TOPIC_ICON = '📘';

// Keyed by normalized topic name (trim + lowercase). Names are stable across
// DB migrations; topic_id is not — Postgres IDENTITY reassigns ids based on
// insert order, so the previous id-keyed maps broke after migrating off SQL
// Server. Both '&' and 'and' spellings are accepted for parent titles.
const CATEGORY_ICONS_BY_NAME: Record<string, string> = {
    'daily communication': '💬',
    'work and education': '💼',
    'work & education': '💼',
    'health': '💪',
    'entertainment and travel': '✈️',
    'entertainment & travel': '✈️',
    'daily life': '🏠',
    'emotions and opinions': '💭',
    'emotions & opinions': '💭',
    'culture and science': '🌍',
    'culture & science': '🌍'
};

const TOPIC_ICONS_BY_NAME: Record<string, string> = {
    // Daily Communication
    'greetings and introductions': '👋',
    'family': '👨‍👩‍👧‍👦',
    'friends and relationships': '🤝',
    'weather': '☀️',
    'numbers and dates': '📅',
    'colors': '🎨',
    'household items': '🏠',
    'asking for and giving directions': '📍',
    'shopping': '🛍️',
    'ordering food': '🍽️',

    // Work and Education
    'jobs and occupations': '👨‍💼',
    'office': '🏢',
    'school and education': '🎓',
    'basic email communication': '📧',
    'daily tasks at work': '📝',
    'team meetings': '👥',
    'schedules and time': '⏰',
    'office equipment': '🖨️',
    'colleagues': '🤝',

    // Health
    'body parts': '🦶',
    'illnesses and health': '🤒',
    'exercise and sports': '🏃',
    'healthy habits': '🥗',
    'diet and nutrition': '🍎',

    // Entertainment and Travel
    'movies and music': '🎬',
    'travel and exploration': '🌍',
    'famous places': '🗽',
    'hotels and accommodation': '🏨',
    'outdoor activities': '🏕️',

    // Daily Life
    'food and drinks': '🍔',
    'supermarket': '🛒',
    'transportation': '🚌',
    'pets and animals': '🐶',
    'leisure time': '🪁',
    'clothing and shopping': '👗',
    'daily routines': '🚿',
    'kitchen and cooking': '🍳',
    'house cleaning': '🧹',
    'technology and internet': '🌐',

    // Emotions and Opinions
    'feelings and emotions': '😊',
    'hobbies': '🎨',
    'personal opinions': '💬',
    'future plans': '🎯',
    'festivals and events': '🎉',

    // Culture and Science
    'nature and environment': '🌿',
    'wildlife': '🦁',
    'books and literature': '📚',
    'history and culture': '🏛️',
    'traditions and customs': '🎎',
    'holidays around the world': '🌎'
};

type TopicProgressLookup = Record<number, LearningProgressTopicStateItem>;

const normalizeTopicKey = (name: string) => name.trim().toLowerCase();

const getCategoryIcon = (parent: VocabularyTopicItem) =>
    CATEGORY_ICONS_BY_NAME[normalizeTopicKey(parent.name)] ?? DEFAULT_CATEGORY_ICON;

const getTopicIcon = (topic: VocabularyTopicItem) =>
    TOPIC_ICONS_BY_NAME[normalizeTopicKey(topic.name)] ?? DEFAULT_TOPIC_ICON;

const createProgressLookup = (progressState: LearningProgressState | null): TopicProgressLookup => {
    if (!progressState?.topics) {
        return {};
    }

    return progressState.topics.reduce<TopicProgressLookup>((acc, topicState) => {
        acc[topicState.topicId] = topicState;
        return acc;
    }, {});
};

const calculateTopicStats = (wordCount: number, topicProgress?: LearningProgressTopicStateItem): TopicStats => {
    const learned = new Set(topicProgress?.learnedWordIds ?? []).size;
    const review = new Set(topicProgress?.reviewWordIds ?? []).size;
    const total = wordCount;

    return {
        new: Math.max(0, total - learned - review),
        review,
        learned,
        total
    };
};

export const buildLearningTopicGroups = (
    topicFilters: VocabularyTopicItem[],
    progressState: LearningProgressState | null
): TopicGroupUiModel[] => {
    const progressLookup = createProgressLookup(progressState);

    const byParent = topicFilters
        .filter(topic => !topic.parentTopicId)
        .sort((a, b) => a.topicId - b.topicId);
    const children = topicFilters
        .filter(topic => topic.parentTopicId)
        .sort((a, b) => a.topicId - b.topicId);

    const toTopicUiModel = (topic: VocabularyTopicItem): TopicUiModel => ({
        id: topic.topicId,
        title: topic.name,
        description: topic.description,
        icon: getTopicIcon(topic),
        stats: calculateTopicStats(topic.wordCount ?? 0, progressLookup[topic.topicId])
    });

    if (byParent.length === 0 && topicFilters.length > 0) {
        return [
            {
                id: 'all',
                title: 'Chủ đề học tập',
                icon: DEFAULT_CATEGORY_ICON,
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
