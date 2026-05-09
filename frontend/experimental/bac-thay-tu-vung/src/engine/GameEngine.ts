import { ANSWER_KEYS, type AnswerKey, type GameAction, type GameState, type Question } from './types';
import { bankedPointsFor, pointsAtLevel, TOP_LEVEL } from '../data/prizeLadder';

export const INITIAL_STATE: GameState = {
  status: 'intro',
  questionIndex: 0,
  questions: [],
  selected: null,
  timeLeft: 0,
  timePerQuestion: 30,
  lifelines: { fiftyFifty: true, audienceHint: true, skip: true },
  bankedLevel: 0,
  hiddenChoices: [],
};

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START': {
      return {
        ...INITIAL_STATE,
        status: 'playing',
        questions: action.questions,
        timePerQuestion: action.timePerQuestion,
        timeLeft: action.timePerQuestion,
      };
    }

    case 'SELECT': {
      if (state.status !== 'playing') return state;
      if (state.hiddenChoices.includes(action.choice)) return state;
      return { ...state, selected: action.choice };
    }

    case 'CONFIRM': {
      if (state.status !== 'playing' || state.selected == null) return state;
      // Move into reveal phase; transitionToNext decides won/lost on NEXT.
      return { ...state, status: 'reveal' };
    }

    case 'TICK': {
      if (state.status !== 'playing') return state;
      const next = state.timeLeft - 1;
      if (next <= 0) return { ...state, timeLeft: 0, status: 'reveal', selected: state.selected };
      return { ...state, timeLeft: next };
    }

    case 'TIMEOUT': {
      if (state.status !== 'playing') return state;
      return { ...state, status: 'reveal', timeLeft: 0 };
    }

    case 'NEXT': {
      if (state.status !== 'reveal') return state;
      const current = state.questions[state.questionIndex];
      const correct = state.selected === current.correct;

      if (!correct) {
        return { ...state, status: 'lost', bankedLevel: bankedPointsFor(current.level - 1) };
      }

      const clearedTop = current.level >= TOP_LEVEL;
      if (clearedTop) {
        return { ...state, status: 'won', bankedLevel: pointsAtLevel(current.level) };
      }

      return {
        ...state,
        status: 'playing',
        questionIndex: state.questionIndex + 1,
        selected: null,
        hiddenChoices: [],
        timeLeft: state.timePerQuestion,
        bankedLevel: bankedPointsFor(current.level),
      };
    }

    case 'USE_FIFTY_FIFTY': {
      if (state.status !== 'playing' || !state.lifelines.fiftyFifty) return state;
      const current = state.questions[state.questionIndex];
      const wrongs = ANSWER_KEYS.filter((k) => k !== current.correct);
      // Drop two wrong answers, keep one wrong + the correct one.
      const dropA = wrongs[0];
      const dropB = wrongs[1];
      return {
        ...state,
        lifelines: { ...state.lifelines, fiftyFifty: false },
        hiddenChoices: [dropA, dropB],
        selected: state.selected && [dropA, dropB].includes(state.selected) ? null : state.selected,
      };
    }

    case 'USE_AUDIENCE_HINT': {
      if (state.status !== 'playing' || !state.lifelines.audienceHint) return state;
      // Hint state is rendered by the UI from the current question; engine only flips the flag.
      return { ...state, lifelines: { ...state.lifelines, audienceHint: false } };
    }

    case 'USE_SKIP': {
      if (state.status !== 'playing' || !state.lifelines.skip) return state;
      const current = state.questions[state.questionIndex];
      // Skip does not bank the current rung — the player gets a free pass but
      // doesn't *clear* the level. Banked progress only updates on a correct
      // answer (via NEXT).
      const isLast = current.level >= TOP_LEVEL;
      if (isLast) {
        return { ...state, status: 'playing' }; // nothing to skip into
      }
      return {
        ...state,
        lifelines: { ...state.lifelines, skip: false },
        questionIndex: state.questionIndex + 1,
        selected: null,
        hiddenChoices: [],
        timeLeft: state.timePerQuestion,
      };
    }

    case 'RESET':
      return INITIAL_STATE;

    default:
      return state;
  }
}

/** Convenience read-only helpers used by both the React adapter and tests. */
export function currentQuestion(state: GameState): Question | null {
  return state.questions[state.questionIndex] ?? null;
}

export function isAnswerCorrect(state: GameState, choice: AnswerKey): boolean {
  const q = currentQuestion(state);
  return q != null && q.correct === choice;
}
