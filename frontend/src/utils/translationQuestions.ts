export type TranslationQuestion = {
  id: number;
  englishSentence: string;
  correctTranslation: string;
  questionType: 'multiple-choice' | 'fill-in';
  options?: string[];
};

type VocabularyItem = {
  id: number;
  word?: string;
  example?: string;
  translation?: string;
};

const normalizeText = (value?: string): string => (value ?? '').trim();

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const buildTranslationQuestions = (
  learnedWords: VocabularyItem[],
  topicWords: VocabularyItem[],
  limit = 4
): TranslationQuestion[] => {
  const validWords = (Array.isArray(learnedWords) ? learnedWords : [])
    .filter(item =>
      item &&
      item.id &&
      normalizeText(item.example) !== '' &&
      normalizeText(item.translation) !== ''
    )
    .slice(0, limit);

  if (validWords.length === 0) return [];

  const distractorPool = (Array.isArray(topicWords) ? topicWords : [])
    .filter(item =>
      item &&
      normalizeText(item.translation) !== '' &&
      normalizeText(item.example) !== ''
    )
    .map(item => normalizeText(item.translation))
    .filter((value, index, array) => array.indexOf(value) === index);

  return validWords.map((item, index) => {
    const englishSentence = normalizeText(item.example);
    const correctTranslation = normalizeText(item.translation);

    const questionType = index % 2 === 0 ? 'multiple-choice' : 'fill-in';

    if (questionType === 'multiple-choice') {
      const distractors = shuffle(
        distractorPool.filter(t => t.toLowerCase() !== correctTranslation.toLowerCase())
      ).slice(0, 3);

      const options = shuffle([correctTranslation, ...distractors]);

      return {
        id: item.id,
        englishSentence,
        correctTranslation,
        questionType: 'multiple-choice',
        options
      };
    }

    return {
      id: item.id,
      englishSentence,
      correctTranslation,
      questionType: 'fill-in'
    };
  });
};
