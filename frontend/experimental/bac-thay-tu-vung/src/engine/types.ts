export type AnswerKey = 'A' | 'B' | 'C' | 'D';

export const ANSWER_KEYS: readonly AnswerKey[] = ['A', 'B', 'C', 'D'] as const;

export type QuestionKind = 'definition' | 'synonym' | 'antonym' | 'usage' | 'listening';

export interface Question {
  id: string;
  level: number; // 1..15, controls difficulty + ladder slot
  kind: QuestionKind;
  prompt: string; // e.g. "Choose the correct meaning of: ABUNDANT"
  word: string; // the target English word
  choices: Record<AnswerKey, string>;
  correct: AnswerKey;
  explanation?: string;
  /**
   * Optional pronunciation audio URL. The UI is wired to render a speaker
   * button when set; left empty in the prototype.
   */
  audioSrc?: string;
}

export type GameStatus =
  | 'intro'
  | 'playing'
  | 'reveal' // showing correct/wrong state before advancing
  | 'won'
  | 'lost';

export interface Lifelines {
  fiftyFifty: boolean;
  audienceHint: boolean;
  skip: boolean;
}

export interface GameState {
  status: GameStatus;
  questionIndex: number;
  questions: Question[];
  selected: AnswerKey | null;
  timeLeft: number; // seconds remaining for the current question
  timePerQuestion: number;
  lifelines: Lifelines;
  /**
   * Banked points — the guaranteed payout if the player loses now. Updated
   * after each correct answer to the highest cleared safe-haven, and on a
   * top-level win to the final prize value.
   */
  bankedLevel: number;
  /**
   * Hidden choices (set when 50:50 is used). Always size 0 or 2.
   */
  hiddenChoices: AnswerKey[];
}

export type GameAction =
  | { type: 'START'; questions: Question[]; timePerQuestion: number }
  | { type: 'SELECT'; choice: AnswerKey }
  | { type: 'CONFIRM' }
  | { type: 'TICK' }
  | { type: 'TIMEOUT' }
  | { type: 'NEXT' }
  | { type: 'USE_FIFTY_FIFTY' }
  | { type: 'USE_AUDIENCE_HINT' }
  | { type: 'USE_SKIP' }
  | { type: 'RESET' };
