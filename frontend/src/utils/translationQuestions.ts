export type ArrangementDirection = 'en-to-vi' | 'vi-to-en';

export type TranslationQuestion = {
  id: number;
  direction: ArrangementDirection;
  prompt: string; // sentence shown to the user
  answer: string; // sentence the user must arrange (target)
};

type VocabularyItem = {
  id: number;
  word?: string;
  example?: string;
  translation?: string;
};

const normalizeText = (value?: string): string => (value ?? '').trim();

/**
 * Sentence-arrangement questions. Each eligible word (has both an English
 * example and a Vietnamese translation) becomes one question. Directions are
 * mixed by index: even -> EN→VI, odd -> VI→EN (so 5 questions => 3 + 2).
 */
export const buildTranslationQuestions = (
  learnedWords: VocabularyItem[],
  _topicWords: VocabularyItem[],
  limit = 5,
): TranslationQuestion[] => {
  const valid = (Array.isArray(learnedWords) ? learnedWords : [])
    .filter(
      (item) =>
        item &&
        item.id &&
        normalizeText(item.example) !== '' &&
        normalizeText(item.translation) !== '',
    )
    .slice(0, limit);

  return valid.map((item, index) => {
    const english = normalizeText(item.example);
    const vietnamese = normalizeText(item.translation);
    const direction: ArrangementDirection = index % 2 === 0 ? 'en-to-vi' : 'vi-to-en';
    return direction === 'en-to-vi'
      ? { id: item.id, direction, prompt: english, answer: vietnamese }
      : { id: item.id, direction, prompt: vietnamese, answer: english };
  });
};
