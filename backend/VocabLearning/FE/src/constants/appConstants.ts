export type CurrentUserGameData = {
    learnedWords: number;
    streak: number;
    xp: number;
    streakFreezes: number;
    lastStudyDate: string;
    studyHistory: string[];
    rank: number;
};

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const XP_RULES = {
    LEARN_WORD: 10,
    MATCHING_CORRECT: 5,
    TEST_CORRECT: 20,
    STREAK_BONUS: (days: number) => days * 5,
    GROUP_BONUS: 50
};

export const EMPTY_CURRENT_USER_GAME_DATA: CurrentUserGameData = {
    learnedWords: 0,
    streak: 0,
    xp: 0,
    streakFreezes: 0,
    lastStudyDate: '',
    studyHistory: [] as string[],
    rank: 0
};
