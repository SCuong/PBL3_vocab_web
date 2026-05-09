import { useCallback, useEffect } from 'react';
import { StageBackground } from './components/StageBackground';
import { QUESTION_BANK } from './data/questions';
import { useGameEngine } from './engine/useGameEngine';
import { GameOverPage } from './pages/GameOverPage';
import { GamePage } from './pages/GamePage';
import { IntroPage } from './pages/IntroPage';
import { WinPage } from './pages/WinPage';
import { SoundManager } from './audio/SoundManager';

const TIME_PER_QUESTION = 30;

export function App() {
  const engine = useGameEngine();
  const { state, reset, start } = engine;

  const begin = useCallback(() => {
    // Questions are pre-sorted by level in the bank; preserve that order so
    // the difficulty curve stays intentional rather than random.
    start([...QUESTION_BANK].sort((a, b) => a.level - b.level), TIME_PER_QUESTION);
  }, [start]);

  // Best-effort preload after first user gesture is implicit (intro click).
  useEffect(() => {
    SoundManager.preload();
  }, []);

  const lastQuestion = state.questions[state.questionIndex];

  return (
    <div className="app-shell">
      <StageBackground />
      {state.status === 'intro' && <IntroPage onStart={begin} />}
      {(state.status === 'playing' || state.status === 'reveal') && (
        <GamePage engine={engine} onQuit={reset} />
      )}
      {state.status === 'won' && <WinPage onRestart={begin} onHome={reset} />}
      {state.status === 'lost' && (
        <GameOverPage
          bankedPoints={state.bankedLevel}
          failedLevel={lastQuestion?.level ?? 0}
          correctWord={lastQuestion?.word}
          correctAnswer={lastQuestion ? lastQuestion.choices[lastQuestion.correct] : undefined}
          explanation={lastQuestion?.explanation}
          onRestart={begin}
          onHome={reset}
        />
      )}
    </div>
  );
}
