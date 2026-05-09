import type { AnswerKey } from '../engine/types';

interface AnswerOptionProps {
  letter: AnswerKey;
  text: string;
  selected: boolean;
  hidden: boolean;
  /** When true, lock all interaction (reveal phase or end states). */
  locked: boolean;
  /** Reveal-state visuals; only rendered while parent says reveal phase is active. */
  reveal?: 'correct' | 'wrong' | 'none';
  onSelect: (key: AnswerKey) => void;
}

export function AnswerOption({ letter, text, selected, hidden, locked, reveal = 'none', onSelect }: AnswerOptionProps) {
  const cls = ['answer'];
  if (selected && reveal === 'none') cls.push('is-selected');
  if (reveal === 'correct') cls.push('is-correct');
  if (reveal === 'wrong') cls.push('is-wrong');
  if (hidden) cls.push('is-hidden');

  return (
    <button
      type="button"
      className={cls.join(' ')}
      disabled={locked || hidden}
      onClick={() => onSelect(letter)}
      aria-pressed={selected}
      aria-label={`Answer ${letter}: ${text}`}
    >
      <span className="answer__key">{letter}</span>
      <span className="answer__text">{text}</span>
    </button>
  );
}
