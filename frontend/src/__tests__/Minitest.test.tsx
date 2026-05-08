import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('../mocks/mockData', () => ({
  mockData: { vocabulary: [], topics: [], categories: [] },
  readingPassages: [
    {
      topicId: 1,
      title: 'Reading Passage',
      content: 'Vocabulary is important for communication.',
      questions: [
        {
          q: 'What is vocabulary important for?',
          options: ['Communication', 'Math', 'Science', 'Art'],
          correct: 0,
          explanation: 'Vocabulary helps with communication.',
        },
      ],
    },
  ],
}));

// Minitest imports from mockData via relative paths — remap correctly
vi.mock('../../mocks/mockData', async () => {
  const mod = await vi.importMock('../mocks/mockData');
  return mod;
});

import { Minitest } from '../components/learning/Minitest';

const topicWords = [
  { id: 1, word: 'apple', meaning: 'quả táo', example: 'I ate an apple yesterday.' },
  { id: 2, word: 'book', meaning: 'cuốn sách', example: 'She reads a book daily.' },
  { id: 3, word: 'cat', meaning: 'con mèo', example: 'The cat is sleeping.' },
  { id: 4, word: 'dog', meaning: 'con chó', example: 'The dog barks loudly.' },
];

const learnedWords = topicWords.slice(0, 2); // apple + book

describe('Minitest — no learned words', () => {
  it('shows "no learned words" message for Part 1', () => {
    render(
      <Minitest topicId={1} learnedWords={[]} topicWords={topicWords} onFinish={vi.fn()} />,
    );
    expect(
      screen.getByText(/Bạn chưa có từ nào đã học trong chủ đề này/),
    ).toBeInTheDocument();
  });

  it('still renders "Sang bài 2" button to proceed to reading', () => {
    render(
      <Minitest topicId={1} learnedWords={[]} topicWords={topicWords} onFinish={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /Sang bài 2/ })).toBeInTheDocument();
  });
});

describe('Minitest — with learned words', () => {
  it('renders fill questions for each learned word', () => {
    render(
      <Minitest topicId={1} learnedWords={learnedWords} topicWords={topicWords} onFinish={vi.fn()} />,
    );
    // 2 learned words → 2 fill questions (numbered 1 and 2)
    const questionNumbers = screen.getAllByText(/^[12]$/, { selector: 'span' });
    expect(questionNumbers).toHaveLength(2);
  });

  it('answered count increments when option selected', async () => {
    const user = userEvent.setup();
    render(
      <Minitest topicId={1} learnedWords={learnedWords} topicWords={topicWords} onFinish={vi.fn()} />,
    );

    const progress = screen.getByText(/0 \/ \d+ câu/);
    expect(progress).toBeInTheDocument();

    // Select first option in question 1
    const radios = screen.getAllByRole('radio');
    await user.click(radios[0]);

    expect(screen.getByText(/1 \/ \d+ câu/)).toBeInTheDocument();
  });

  it('"Sang bài 2" reveals reading section', async () => {
    const user = userEvent.setup();
    render(
      <Minitest topicId={1} learnedWords={learnedWords} topicWords={topicWords} onFinish={vi.fn()} />,
    );

    expect(screen.queryByText('Reading Passage')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Sang bài 2/ }));
    expect(screen.getByText('Reading Passage')).toBeInTheDocument();
  });

  it('submit calls onFinish with fill + reading scores', async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    render(
      <Minitest topicId={1} learnedWords={learnedWords} topicWords={topicWords} onFinish={onFinish} />,
    );

    // Move to part 2
    await user.click(screen.getByRole('button', { name: /Sang bài 2/ }));
    // Answer reading question (option 0 = correct)
    const radios = screen.getAllByRole('radio');
    const readingRadios = radios.filter((r) => r.getAttribute('name')?.startsWith('fill') === false);
    if (readingRadios.length > 0) {
      await user.click(readingRadios[0]);
    }

    await user.click(screen.getByRole('button', { name: /Nộp bài ngay/ }));

    expect(onFinish).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.objectContaining({ fill: expect.any(Number), reading: expect.any(Number) }),
    );
  });

  it('shows correct/incorrect feedback after submit', async () => {
    const user = userEvent.setup();
    render(
      <Minitest topicId={1} learnedWords={learnedWords} topicWords={topicWords} onFinish={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /Sang bài 2/ }));
    await user.click(screen.getByRole('button', { name: /Nộp bài ngay/ }));

    // After submit, correct answer labels appear
    expect(screen.getAllByText(/Chính xác!|Đáp án:/)[0]).toBeInTheDocument();
  });
});
