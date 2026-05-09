import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Auth from '../pages/Auth';

// Auth component uses no router hooks — no MemoryRouter needed.
// authApi is mocked to isolate component behavior from XSRF/fetch complexity.
vi.mock('../services/authApi', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    forgotPassword: vi.fn(),
  },
}));

import { authApi } from '../services/authApi';

const mockLogin = authApi.login as ReturnType<typeof vi.fn>;
const mockRegister = authApi.register as ReturnType<typeof vi.fn>;

const mockUser = {
  userId: 1,
  username: 'testuser',
  email: 'test@example.com',
  createdAt: '2024-01-01',
  role: 'LEARNER',
  status: 'ACTIVE',
  hasGoogleLogin: false,
  hasLocalPassword: true,
};

describe('Auth — Login', () => {
  const onLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls authApi.login and triggers onLogin on success', async () => {
    mockLogin.mockResolvedValueOnce(mockUser);
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="login" />);

    await user.type(screen.getByPlaceholderText('Tên đăng nhập hoặc email'), 'test@example.com');
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[0], 'Password1!');
    await user.click(screen.getByRole('button', { name: 'Vào học ngay' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(mockUser));
    expect(mockLogin).toHaveBeenCalledWith({
      usernameOrEmail: 'test@example.com',
      password: 'Password1!',
      rememberMe: true,
    });
  });

  it('shows error message when login API throws', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Tên đăng nhập hoặc mật khẩu không đúng.'));
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="login" />);

    await user.type(screen.getByPlaceholderText('Tên đăng nhập hoặc email'), 'wrong@test.com');
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[0], 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Vào học ngay' }));

    await waitFor(() =>
      expect(screen.getByText('Tên đăng nhập hoặc mật khẩu không đúng.')).toBeInTheDocument(),
    );
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('disables submit buttons while request is in flight', async () => {
    // Never resolves — both panel buttons stay in loading state
    mockLogin.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="login" />);

    await user.type(screen.getByPlaceholderText('Tên đăng nhập hoặc email'), 'x');
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[0], 'x');
    await user.click(screen.getByRole('button', { name: 'Vào học ngay' }));

    // Both panels' submit buttons transition to loading state (shared isSubmitting state)
    await waitFor(() => {
      const loadingButtons = screen.getAllByRole('button', { name: 'Đang xử lý...' });
      expect(loadingButtons.length).toBeGreaterThan(0);
      loadingButtons.forEach((btn) => expect(btn).toBeDisabled());
    });
  });
});

describe('Auth — Register', () => {
  const onLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error when password fails policy — no uppercase', async () => {
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="register" />);

    await user.type(screen.getByPlaceholderText('Tên hiển thị'), 'Test User');
    await user.type(screen.getByPlaceholderText('Email'), 'new@test.com');
    // Password missing uppercase — fails policy
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[1], 'password1!');
    await user.type(screen.getByPlaceholderText('Xác nhận mật khẩu'), 'password1!');
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() =>
      expect(screen.getByText('Mật khẩu chưa đúng định dạng yêu cầu.')).toBeInTheDocument(),
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="register" />);

    await user.type(screen.getByPlaceholderText('Tên hiển thị'), 'Test User');
    await user.type(screen.getByPlaceholderText('Email'), 'new@test.com');
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[1], 'Valid1!pw');
    await user.type(screen.getByPlaceholderText('Xác nhận mật khẩu'), 'Different1!pw');
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() =>
      expect(screen.getByText('Xác nhận mật khẩu không khớp.')).toBeInTheDocument(),
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('calls authApi.register and triggers onLogin on success', async () => {
    mockRegister.mockResolvedValueOnce(mockUser);
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="register" />);

    await user.type(screen.getByPlaceholderText('Tên hiển thị'), 'Test User');
    await user.type(screen.getByPlaceholderText('Email'), 'new@test.com');
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[1], 'Valid1!pw');
    await user.type(screen.getByPlaceholderText('Xác nhận mật khẩu'), 'Valid1!pw');
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(mockUser));
    expect(mockRegister).toHaveBeenCalledWith({
      name: 'Test User',
      email: 'new@test.com',
      password: 'Valid1!pw',
    });
  });

  it('shows API error when register fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email đã được sử dụng.'));
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="register" />);

    await user.type(screen.getByPlaceholderText('Tên hiển thị'), 'Dup User');
    await user.type(screen.getByPlaceholderText('Email'), 'taken@test.com');
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[1], 'Valid1!pw');
    await user.type(screen.getByPlaceholderText('Xác nhận mật khẩu'), 'Valid1!pw');
    await user.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() =>
      expect(screen.getByText('Email đã được sử dụng.')).toBeInTheDocument(),
    );
  });

  it('password policy checklist turns green as criteria met', async () => {
    const user = userEvent.setup();
    render(<Auth onLogin={onLogin} initialMode="register" />);

    // Type a valid password meeting all criteria
    await user.type(screen.getAllByPlaceholderText('Mật khẩu')[1], 'Abc1!xyz');

    expect(screen.getByText('Tối thiểu 8 ký tự').closest('p')).toHaveClass('text-green-700');
    expect(screen.getByText('Có ít nhất 1 chữ in hoa').closest('p')).toHaveClass('text-green-700');
    expect(screen.getByText('Có ít nhất 1 chữ số').closest('p')).toHaveClass('text-green-700');
    expect(screen.getByText('Có ít nhất 1 ký tự đặc biệt').closest('p')).toHaveClass('text-green-700');
  });
});
