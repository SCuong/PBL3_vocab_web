import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LearningTopics } from '../components/learning/LearningTopics';

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

const makeTopic = (id: number, stats: { new: number; review: number; learned: number; total: number }) => ({
  id,
  title: `Topic ${id}`,
  description: `Description ${id}`,
  icon: '📚',
  stats,
});

const mockTopicGroups = [
  {
    id: 'cat-1',
    title: 'Category One',
    icon: '🎯',
    topics: [
      makeTopic(1, { new: 5, review: 2, learned: 3, total: 10 }),
      makeTopic(2, { new: 0, review: 0, learned: 8, total: 8 }),
      makeTopic(3, { new: 3, review: 1, learned: 2, total: 6 }),
      makeTopic(4, { new: 4, review: 0, learned: 0, total: 4 }),
    ],
  },
  {
    id: 'cat-2',
    title: 'Category Two',
    icon: '📖',
    topics: [
      makeTopic(5, { new: 2, review: 0, learned: 0, total: 2 }),
    ],
  },
];

const defaultProps = {
  onStartStudy: vi.fn(),
  currentUser: null,
  gameData: null,
  topicGroups: mockTopicGroups,
};

const renderTopics = (props = {}) =>
  render(
    <MemoryRouter>
      <LearningTopics {...defaultProps} {...props} />
    </MemoryRouter>,
  );

describe('LearningTopics — guest user', () => {
  it('shows guest banner with register CTA', () => {
    renderTopics();
    expect(screen.getByText(/Bạn đang xem chế độ khách/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Đăng ký miễn phí/ })).toHaveLength(2);
  });

  it('locks categories beyond the first', () => {
    renderTopics();
    // Second category accordion button should be disabled (locked)
    const catButtons = screen.getAllByRole('button', { name: /Category/ });
    expect(catButtons[1]).toBeDisabled();
  });

  it('expands first category by default and shows topic buttons', () => {
    renderTopics();
    // First 3 topics in first category are accessible
    expect(screen.getAllByRole('button', { name: 'Bắt đầu →' }).length).toBeGreaterThan(0);
  });

  it('sticky CTA footer is rendered for guest', () => {
    renderTopics();
    expect(screen.getByText(/Mở khóa 44 chủ đề đặc sắc/)).toBeInTheDocument();
  });
});

describe('LearningTopics — authenticated user', () => {
  const currentUser = { username: 'alice', streak: 7 };
  const gameData = { streak: 7 };

  it('shows greeting with username', () => {
    renderTopics({ currentUser, gameData });
    expect(screen.getByText(/Chào alice/)).toBeInTheDocument();
  });

  it('shows streak count', () => {
    renderTopics({ currentUser, gameData });
    expect(screen.getByText(/7 ngày liên tiếp/)).toBeInTheDocument();
  });

  it('does not show guest banner', () => {
    renderTopics({ currentUser, gameData });
    expect(screen.queryByText(/Bạn đang xem chế độ khách/)).not.toBeInTheDocument();
  });

  it('start button calls onStartStudy with correct topicId', async () => {
    const onStartStudy = vi.fn();
    const user = userEvent.setup();
    renderTopics({ currentUser, gameData, onStartStudy });

    // Topic 1 is in the first open category — "Bắt đầu →" button present
    const startButtons = screen.getAllByRole('button', { name: 'Bắt đầu →' });
    await user.click(startButtons[0]);

    expect(onStartStudy).toHaveBeenCalledWith(1);
  });

  it('fully-learned topic shows "Đã hoàn thành" and does not call onStartStudy', async () => {
    const onStartStudy = vi.fn();
    const user = userEvent.setup();
    renderTopics({ currentUser, gameData, onStartStudy });
    // Topic 2: new=0, review=0 → isLearnedOut=true
    const doneButton = screen.getByRole('button', { name: 'Đã hoàn thành' });
    expect(doneButton).toBeInTheDocument();
    await user.click(doneButton);
    expect(onStartStudy).not.toHaveBeenCalled();
  });

  it('accordion toggle opens and closes a category', async () => {
    const user = userEvent.setup();
    renderTopics({ currentUser, gameData });

    // Click on category 2 to open it
    await user.click(screen.getByRole('button', { name: /Category Two/ }));
    expect(screen.getByText('Topic 5')).toBeInTheDocument();
  });
});
