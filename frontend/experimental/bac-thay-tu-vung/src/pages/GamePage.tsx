import { useEffect, useMemo, useState } from 'react';
import { AnswerOption } from '../components/AnswerOption';
import { Lifelines } from '../components/Lifelines';
import { Logo } from '../components/Logo';
import { QuestionCard } from '../components/QuestionCard';
import { RewardModal } from '../components/RewardModal';
import { Timer } from '../components/Timer';
import { ANSWER_KEYS, type AnswerKey } from '../engine/types';
import { TOP_LEVEL, pointsAtLevel } from '../data/prizeLadder';
import { SoundManager } from '../audio/SoundManager';
import { useKeyboard } from '../hooks/useKeyboard';
import { useTimer } from '../hooks/useTimer';
import type { GameEngineApi } from '../engine/useGameEngine';

interface GamePageProps {
  engine: GameEngineApi;
  onQuit: () => void;
}

const REVEAL_DELAY_MS = 1500;

interface RewardState {
  level: number;
  isFinalWin: boolean;
}

export function GamePage({ engine, onQuit }: GamePageProps) {
  const { state, question, select, confirm, tick, next, spendFiftyFifty, spendAudienceHint, spendSkip } = engine;
  const [muted, setMuted] = useState(false);
  const [reward, setReward] = useState<RewardState | null>(null);

  useEffect(() => {
    SoundManager.setMuted(muted);
  }, [muted]);

  // Drive the per-question countdown via the engine.
  useTimer({
    active: state.status === 'playing',
    onTick: tick,
    resetKey: state.questionIndex,
  });

  // Reveal phase → if correct, show reward modal; if wrong/timeout, advance into lost state.
  useEffect(() => {
    if (state.status !== 'reveal' || !question) return;
    const correct = state.selected === question.correct;
    SoundManager.play(correct ? 'correct' : 'wrong');
    const id = window.setTimeout(() => {
      if (correct) {
        setReward({ level: question.level, isFinalWin: question.level >= TOP_LEVEL });
      } else {
        next();
      }
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [state.status, state.selected, question, next]);

  // Tick SFX in the last 5 seconds.
  useEffect(() => {
    if (state.status === 'playing' && state.timeLeft <= 5 && state.timeLeft > 0) {
      SoundManager.play('tick');
    }
  }, [state.timeLeft, state.status]);

  const isLocked = state.status !== 'playing';

  const onSelect = (choice: AnswerKey) => {
    if (isLocked) return;
    SoundManager.play('select');
    select(choice);
  };

  const onConfirm = () => {
    if (state.status !== 'playing' || state.selected == null) return;
    SoundManager.play('confirm');
    confirm();
  };

  const closeReward = () => {
    setReward(null);
    next();
  };

  // Disable global key handler while the reward modal owns the keyboard.
  useKeyboard({
    enabled: (state.status === 'playing' || state.status === 'reveal') && reward == null,
    onSelect,
    onConfirm,
    onEscape: onQuit,
  });

  const revealMap = useMemo(() => {
    const map: Record<AnswerKey, 'correct' | 'wrong' | 'none'> = { A: 'none', B: 'none', C: 'none', D: 'none' };
    if (state.status !== 'reveal' || !question) return map;
    map[question.correct] = 'correct';
    if (state.selected && state.selected !== question.correct) {
      map[state.selected] = 'wrong';
    }
    return map;
  }, [state.status, state.selected, question]);

  if (!question) return null;

  const currentPoints = pointsAtLevel(question.level);

  return (
    <div className="screen game-v2">
      {/* === TOP BAR =====================================================
            Three-column grid: brand+score (left) · lifelines (center) · controls (right)
        ============================================================== */}
      <header className="topbar">
        <div className="topbar__brand">
          <Logo variant="header" />
          <div className="brand__meta">
            <span className="brand__title">Bậc Thầy Từ Vựng</span>
            <span className="brand__sub">
              Cấp <strong>{question.level}</strong> · {currentPoints.toLocaleString('en-US')} điểm
            </span>
          </div>
        </div>

        <div className="topbar__lifelines">
          <Lifelines
            state={state.lifelines}
            disabled={isLocked}
            onFiftyFifty={() => {
              SoundManager.play('lifeline');
              spendFiftyFifty();
            }}
            onAudienceHint={() => {
              SoundManager.play('lifeline');
              spendAudienceHint();
            }}
            onSkip={() => {
              SoundManager.play('lifeline');
              spendSkip();
            }}
          />
        </div>

        <div className="topbar__controls">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMuted((m) => !m)}
            aria-pressed={muted}
            aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={onQuit}
            aria-label="Thoát"
            title="Thoát"
          >
            ✕
          </button>
        </div>
      </header>

      {/* === HERO ========================================================
            Centered timer above big question + 2x2 answer grid.
        ============================================================== */}
      <main className="hero">
        <div className="hero__timer">
          <Timer value={state.timeLeft} total={state.timePerQuestion} />
          <span className="hero__timer-label">Câu {state.questionIndex + 1}</span>
        </div>

        <div className="hero__question">
          <QuestionCard question={question} onPlayAudio={() => SoundManager.play('tick')} />
        </div>

        <div className="hero__answers answers-xl">
          {ANSWER_KEYS.map((k) => (
            <AnswerOption
              key={k}
              letter={k}
              text={question.choices[k]}
              selected={state.selected === k}
              hidden={state.hiddenChoices.includes(k)}
              locked={isLocked}
              reveal={revealMap[k]}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div className="hero__confirm">
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={state.status !== 'playing' || state.selected == null}
          >
            Chốt đáp án (Enter)
          </button>
        </div>
      </main>

      {reward && (
        <RewardModal
          clearedLevel={reward.level}
          isFinalWin={reward.isFinalWin}
          onContinue={closeReward}
        />
      )}
    </div>
  );
}
