import type { Lifelines as LifelineState } from '../engine/types';

interface LifelinesProps {
  state: LifelineState;
  disabled: boolean;
  onFiftyFifty: () => void;
  onAudienceHint: () => void;
  onSkip: () => void;
}

interface LifelineButtonProps {
  icon: string;
  label: string;
  title: string;
  available: boolean;
  disabled: boolean;
  onClick: () => void;
}

function LifelineButton({ icon, label, title, available, disabled, onClick }: LifelineButtonProps) {
  return (
    <button
      type="button"
      className={`lifeline ${available ? '' : 'is-spent'}`}
      title={title}
      aria-label={title}
      disabled={disabled || !available}
      onClick={onClick}
    >
      <span className="lifeline__icon" aria-hidden="true">{icon}</span>
      <span className="lifeline__label">{label}</span>
    </button>
  );
}

/**
 * Order is fixed by the design spec: 50:50 → SKIP → HINT.
 * Rendered as pill buttons in the top bar (not as a floating side rail).
 */
export function Lifelines({ state, disabled, onFiftyFifty, onAudienceHint, onSkip }: LifelinesProps) {
  return (
    <div className="lifelines" role="group" aria-label="Lifelines">
      <LifelineButton
        icon="◐"
        label="50:50"
        title="50:50 — remove two wrong answers"
        available={state.fiftyFifty}
        disabled={disabled}
        onClick={onFiftyFifty}
      />
      <LifelineButton
        icon="↦"
        label="SKIP"
        title="Skip — advance without answering"
        available={state.skip}
        disabled={disabled}
        onClick={onSkip}
      />
      <LifelineButton
        icon="✦"
        label="HINT"
        title="Hint (placeholder)"
        available={state.audienceHint}
        disabled={disabled}
        onClick={onAudienceHint}
      />
    </div>
  );
}
