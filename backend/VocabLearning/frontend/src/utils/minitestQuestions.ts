export type MinitestFillQuestion = {
    id: number;
    q: string;
    a: string;
    options: string[];
    promptType: 'example' | 'meaning';
};

type VocabularyQuestionItem = {
    id: number;
    word?: string;
    meaning?: string;
    example?: string;
};

const normalizeText = (value?: string): string => (value ?? '').trim();

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildBlankExample = (example: string, word: string): string | null => {
    const trimmedExample = normalizeText(example);
    const trimmedWord = normalizeText(word);

    if (!trimmedExample || !trimmedWord) {
        return null;
    }

    const wordRegex = new RegExp(`\\b${escapeRegExp(trimmedWord)}\\b`, 'gi');
    if (!wordRegex.test(trimmedExample)) {
        return null;
    }

    const blankedExample = trimmedExample.replace(wordRegex, '_____');
    return blankedExample === trimmedExample ? null : blankedExample;
};

export const buildMinitestFillQuestions = (
    learnedWords: VocabularyQuestionItem[],
    topicWords: VocabularyQuestionItem[],
    limit = 5
): MinitestFillQuestion[] => {
    const safeLearnedWords = (Array.isArray(learnedWords) ? learnedWords : [])
        .filter(item => typeof item?.word === 'string' && normalizeText(item.word) !== '')
        .slice(0, limit);

    const topicWordPool = (Array.isArray(topicWords) ? topicWords : [])
        .filter(item => typeof item?.word === 'string' && normalizeText(item.word) !== '');

    return safeLearnedWords.map(item => {
        const correctWord = normalizeText(item.word);

        const distractors = shuffle(
            topicWordPool
                .filter(topicItem => topicItem.id !== item.id)
                .map(topicItem => normalizeText(topicItem.word))
                .filter(word => word !== '')
                .filter(word => word.toLowerCase() !== correctWord.toLowerCase())
                .filter((word, index, array) => array.findIndex(candidate => candidate.toLowerCase() === word.toLowerCase()) === index)
        ).slice(0, 3);

        const blankedExample = buildBlankExample(normalizeText(item.example), correctWord);
        const questionText = blankedExample || normalizeText(item.meaning) || 'Chọn từ phù hợp';

        return {
            id: item.id,
            q: questionText,
            a: correctWord,
            options: shuffle([correctWord, ...distractors]),
            promptType: blankedExample ? 'example' : 'meaning'
        };
    });
};
