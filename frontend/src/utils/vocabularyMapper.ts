import {
    type VocabularyDetailItem,
    type VocabularyExampleItem,
    type VocabularyLearningItem,
    type VocabularyListItem
} from '../services/vocabularyApi';

export type VocabularyUiExample = {
    id: number;
    exampleEn: string;
    exampleVi: string;
    audioUrl: string;
};

export type VocabularyUiItem = {
    id: number;
    word: string;
    transcription: string;
    meaning: string;
    cefr: string;
    topicId?: number;
    topicName: string;
    example: string;
    translation: string;
    exampleAudioUrl: string;
    examples: VocabularyUiExample[];
    audioUrl: string;
    imageUrl: string;
};

const normalizeExamples = (examples?: VocabularyExampleItem[]): VocabularyUiExample[] => {
    if (!Array.isArray(examples)) return [];
    return examples
        .filter((ex) => Boolean(ex && ex.exampleEn?.trim()))
        .map((ex) => ({
            id: ex.id,
            exampleEn: ex.exampleEn.trim(),
            exampleVi: ex.exampleVi?.trim() || '',
            audioUrl: ex.audioUrl?.trim() || '',
        }));
};

export const mapVocabularyToUiModel = (item: VocabularyListItem | VocabularyDetailItem): VocabularyUiItem => {
    const examples = 'examples' in item ? normalizeExamples(item.examples) : [];
    const primaryExample = examples[0];

    return {
        id: item.id,
        word: item.word,
        transcription: item.ipa,
        meaning: item.meaning,
        cefr: item.cefr,
        topicId: item.topicId,
        topicName: item.topicName,
        example: primaryExample?.exampleEn || '',
        translation: primaryExample?.exampleVi || '',
        exampleAudioUrl: primaryExample?.audioUrl || '',
        examples,
        audioUrl: item.audioUrl?.trim() || '',
        imageUrl: item.imageUrl?.trim() || '',
    };
};

export const mapLearningVocabularyToUiModel = (item: VocabularyLearningItem) => ({
    id: item.id,
    word: item.word,
    transcription: item.ipa,
    meaning: item.meaning,
    cefr: item.cefr,
    topicId: item.topicId,
    topicName: item.topicName,
    example: item.example || '',
    translation: item.exampleVi || '',
    exampleAudioUrl: item.exampleAudioUrl?.trim() || '',
    audioUrl: item.audioUrl?.trim() || '',
    imageUrl: item.imageUrl?.trim() || ''
});
