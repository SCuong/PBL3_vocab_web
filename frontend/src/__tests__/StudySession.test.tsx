import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { StudySession } from '../components/learning/StudySession';

vi.mock('framer-motion', async () => {
  const { createElement, Fragment } = await import('react');
  return {
    motion: new Proxy({} as any, {
      get: (_: any, tag: string) =>
        ({ children, initial, animate, exit, transition, variants, whileHover, whileTap, layout, layoutId, ...rest }: any) =>
          createElement(tag as any, rest, children),
    }),
    AnimatePresence: ({ children }: any) => createElement(Fragment, null, children),
  };
});

vi.mock('../utils/audio', () => ({ playPronunciationAudio: vi.fn() }));

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('../mocks/mockData', () => ({
  mockData: { vocabulary: [], topics: [], categories: [] },
  readingPassages: [
    {
      topicId: 1,
      title: 'Test Passage',
      content: 'Content here.',
      questions: [
        { q: 'Q1?', options: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'A.' },
      ],
    },
  ],
}));

vi.mock('../../mocks/mockData', async () => {
  const mod = await vi.importMock('../mocks/mockData');
  return mod;
});

const words = [
  { id: 1, word: 'apple', transcription: '/ˈæp.əl/', meaning: 'quả táo', example: 'I eat an apple.', cefr: 'A1', topicId: 1, audioUrl: '', exampleAudioUrl: '' },
  { id: 2, word: 'book', transcription: '/bʊk/', meaning: 'cuốn sách', example: 'Read a book.', cefr: 'A1', topicId: 1, audioUrl: '', exampleAudioUrl: '' },
  { id: 3, word: 'cat', transcription: '/kæt/', meaning: 'con mèo', example: 'A cat sleeps.', cefr: 'A1', topicId: 1, audioUrl: '', exampleAudioUrl: '' },
];

const topicGroups = [
  {
    id: 'cat-1',
    title: 'Animals',
    icon: '🐾',
    topics: [{ id: 1, title: 'Basic Words', description: '', icon: '📚', stats: { new: 3, review: 0, learned: 0, total: 3 } }],
  },
];

const defaultProps = {
  topicId: 1,
  studyWords: words,
  topicGroups,
  learningProgressState: { topics: [] },
  onFinish: vi.fn(),
  onAddXP: vi.fn(),
  onStreakCheck: vi.fn(),
  onAddToast: vi.fn(),
  onWordsLearned: vi.fn().mockResolvedValue(undefined),
  onRecordStudyHistory: vi.fn(),
};

describe('StudySession — empty words', () => {
  it('shows empty state when no words provided', () => {
    render(<StudySession {...defaultProps} studyWords={[]} />);
    expect(screen.getByText(/Không tìm thấy từ vựng cho chủ đề này/)).toBeInTheDocument();
  });
});

describe('StudySession — Flashcard tab', () => {
  it('shows first word and correct counter', () => {
    render(<StudySession {...defaultProps} />);
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('"Trước" button is disabled on first card', () => {
    render(<StudySession {...defaultProps} />);
    expect(screen.getByRole('button', { name: '← Trước' })).toBeDisabled();
  });

  it('"Tiếp theo →" advances to next word', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Tiếp theo →' }));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('book')).toBeInTheDocument();
  });

  it('"Tiếp theo →" disabled on last card', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Tiếp theo →' }));
    await user.click(screen.getByRole('button', { name: 'Tiếp theo →' }));
    // Now on card 3/3 — next button should be disabled
    expect(screen.getByRole('button', { name: 'Tiếp theo →' })).toBeDisabled();
  });

  it('breadcrumb "Learning" link calls onFinish', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} onFinish={onFinish} />);

    // "Learning" breadcrumb is a button that navigates back to topic list
    await user.click(screen.getByRole('button', { name: 'Learning' }));
    expect(onFinish).toHaveBeenCalled();
  });
});

describe('StudySession — Learn tab', () => {
  it('shows step 1 word selection on Learn tab click', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /📖 Learn/ }));

    expect(screen.getByText('Chọn từ')).toBeInTheDocument();
    expect(screen.getByText('Xem qua')).toBeInTheDocument();
    expect(screen.getByText('Luyện tập')).toBeInTheDocument();
  });

  it('"Bắt đầu học" is disabled when no words selected', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /📖 Learn/ }));

    expect(screen.getByRole('button', { name: 'Bắt đầu học' })).toBeDisabled();
  });

  it('smart preset "Nhanh 5 phút" selects words and enables start', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /📖 Learn/ }));
    await user.click(screen.getByRole('button', { name: 'Nhanh 5 phút' }));

    // Should now have words selected → "Bắt đầu học" enabled
    expect(screen.getByRole('button', { name: 'Bắt đầu học' })).not.toBeDisabled();
  });

  it('custom mode shows word list when Custom selected', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /📖 Learn/ }));
    await user.click(screen.getByRole('button', { name: /🛠️ Custom/ }));

    // Custom word list appears with individual words
    expect(screen.getAllByText('apple').length).toBeGreaterThan(0);
  });
});

describe('StudySession — Minitest tab', () => {
  it('renders Minitest component on Minitest tab', async () => {
    const user = userEvent.setup();
    render(<StudySession {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /🧪 Minitest/ }));

    // Minitest renders "Nộp bài ngay" submit button
    expect(screen.getByRole('button', { name: /Nộp bài ngay/ })).toBeInTheDocument();
  });
});
