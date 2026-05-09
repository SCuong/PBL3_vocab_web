import { useCallback, useMemo, useReducer } from 'react';
import { INITIAL_STATE, currentQuestion, reducer } from './GameEngine';
import type { AnswerKey, GameState, Question } from './types';

export interface GameEngineApi {
  state: GameState;
  question: Question | null;
  start: (questions: Question[], timePerQuestion?: number) => void;
  select: (choice: AnswerKey) => void;
  confirm: () => void;
  tick: () => void;
  next: () => void;
  reset: () => void;
  // Action verbs (`spend*`) avoid the `use*` prefix that would trigger
  // React's rules-of-hooks lint when these are called from event handlers.
  spendFiftyFifty: () => void;
  spendAudienceHint: () => void;
  spendSkip: () => void;
}

export function useGameEngine(): GameEngineApi {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const api = useMemo<Omit<GameEngineApi, 'state' | 'question'>>(
    () => ({
      start: (questions, timePerQuestion = 30) =>
        dispatch({ type: 'START', questions, timePerQuestion }),
      select: (choice) => dispatch({ type: 'SELECT', choice }),
      confirm: () => dispatch({ type: 'CONFIRM' }),
      tick: () => dispatch({ type: 'TICK' }),
      next: () => dispatch({ type: 'NEXT' }),
      reset: () => dispatch({ type: 'RESET' }),
      spendFiftyFifty: () => dispatch({ type: 'USE_FIFTY_FIFTY' }),
      spendAudienceHint: () => dispatch({ type: 'USE_AUDIENCE_HINT' }),
      spendSkip: () => dispatch({ type: 'USE_SKIP' }),
    }),
    [],
  );

  const select = useCallback((choice: AnswerKey) => api.select(choice), [api]);
  const confirm = useCallback(() => api.confirm(), [api]);

  return {
    state,
    question: currentQuestion(state),
    ...api,
    select,
    confirm,
  };
}
