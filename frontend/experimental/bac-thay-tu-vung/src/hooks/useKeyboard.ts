import { useEffect } from 'react';
import type { AnswerKey } from '../engine/types';

export interface KeyboardBindings {
  onSelect?: (choice: AnswerKey) => void;
  onConfirm?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

const KEY_TO_CHOICE: Record<string, AnswerKey> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  '1': 'A',
  '2': 'B',
  '3': 'C',
  '4': 'D',
};

/**
 * Global keyboard handler for the game screen. A/B/C/D and 1/2/3/4 select an
 * answer; Enter confirms; Escape bubbles up (e.g. back to intro).
 */
export function useKeyboard({ onSelect, onConfirm, onEscape, enabled = true }: KeyboardBindings): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const key = e.key.toLowerCase();
      const choice = KEY_TO_CHOICE[key];
      if (choice && onSelect) {
        e.preventDefault();
        onSelect(choice);
        return;
      }
      if (e.key === 'Enter' && onConfirm) {
        e.preventDefault();
        onConfirm();
        return;
      }
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onSelect, onConfirm, onEscape]);
}
