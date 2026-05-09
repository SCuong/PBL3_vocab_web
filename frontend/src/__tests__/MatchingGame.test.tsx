import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MatchingGame } from '../components/learning/MatchingGame';

const words = [
  { id: 1, word: 'apple', transcription: '/ˈæp.əl/', meaning: 'quả táo' },
  { id: 2, word: 'book', transcription: '/bʊk/', meaning: 'cuốn sách' },
  { id: 3, word: 'cat', transcription: '/kæt/', meaning: 'con mèo' },
];

describe('MatchingGame — word mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all words on the left and meanings on the right', () => {
    render(<MatchingGame words={words} type="word" onFinish={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'apple' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'book' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cat' })).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'quả táo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cuốn sách' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'con mèo' })).toBeInTheDocument();
  });

  it('correctly matched pair becomes disabled', async () => {
    render(<MatchingGame words={words} type="word" onFinish={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'apple' }));
      fireEvent.click(screen.getByRole('button', { name: 'quả táo' }));
    });

    expect(screen.getByRole('button', { name: 'apple' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'quả táo' })).toBeDisabled();
  });

  it('wrong pair resets selection after 1 second', async () => {
    render(<MatchingGame words={words} type="word" onFinish={vi.fn()} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'apple' }));
      fireEvent.click(screen.getByRole('button', { name: 'cuốn sách' })); // wrong
    });

    // After 1s timeout, both deselected (re-enabled and not matched)
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByRole('button', { name: 'apple' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'cuốn sách' })).not.toBeDisabled();
  });

  it('calls onFinish when all pairs matched', async () => {
    const onFinish = vi.fn();
    render(<MatchingGame words={words} type="word" onFinish={onFinish} />);

    // Each pair needs its own act() so React processes state + effects between pairs
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'apple' })); fireEvent.click(screen.getByRole('button', { name: 'quả táo' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'book' })); fireEvent.click(screen.getByRole('button', { name: 'cuốn sách' })); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'cat' })); fireEvent.click(screen.getByRole('button', { name: 'con mèo' })); });

    await act(async () => { vi.advanceTimersByTime(600); });

    expect(onFinish).toHaveBeenCalledWith(words.length, words.length, expect.any(Number));
  });
});

describe('MatchingGame — IPA mode', () => {
  it('shows transcriptions on the left instead of words', () => {
    render(<MatchingGame words={words} type="ipa" onFinish={vi.fn()} />);

    expect(screen.getByRole('button', { name: '/ˈæp.əl/' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '/bʊk/' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'apple' })).not.toBeInTheDocument();
  });
});
