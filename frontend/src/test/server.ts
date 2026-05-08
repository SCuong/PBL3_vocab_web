import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const mockUser = {
  userId: 1,
  username: 'testuser',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00Z',
  role: 'LEARNER',
  status: 'ACTIVE',
  hasGoogleLogin: false,
  hasLocalPassword: true,
};

export const handlers = [
  http.get('/api/v1/auth/antiforgery', () =>
    HttpResponse.json({ token: 'test-xsrf-token' }),
  ),

  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.usernameOrEmail === 'wrong@test.com') {
      return HttpResponse.json(
        { succeeded: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' },
        { status: 401 },
      );
    }
    return HttpResponse.json({ succeeded: true, user: mockUser });
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.email === 'taken@test.com') {
      return HttpResponse.json(
        { succeeded: false, message: 'Email đã được sử dụng.' },
        { status: 400 },
      );
    }
    return HttpResponse.json({ succeeded: true, user: mockUser });
  }),
];

export const server = setupServer(...handlers);
