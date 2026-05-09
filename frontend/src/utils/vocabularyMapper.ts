import {
    type VocabularyDetailItem,
    type VocabularyLearningItem,
    type VocabularyListItem
} from '../services/vocabularyApi';

export const mapVocabularyToUiModel = (item: VocabularyListItem | VocabularyDetailItem) => ({
    id: item.id,
    word: item.word,
    transcription: item.ipa,
    meaning: item.meaning,
    cefr: item.cefr,
    topicId: item.topicId,
    topicName: item.topicName,
    example: 'examples' in item ? (item.examples[0]?.exampleEn || '') : '',
    translation: 'examples' in item ? (item.examples[0]?.exampleVi || '') : '',
    exampleAudioUrl: 'examples' in item ? (item.examples[0]?.audioUrl?.trim() || '') : '',
    audioUrl: item.audioUrl?.trim() || ''
});

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
    audioUrl: item.audioUrl?.trim() || ''
});
