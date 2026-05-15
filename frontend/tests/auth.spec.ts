import { test, expect, type Page } from '@playwright/test';
import { mockVocabApi } from './fixtures/mocks';

/**
 * The /login route renders <Auth /> which is a flip-card component:
 * BOTH the login panel and the register panel exist in the DOM at all times
 * (the flip is a CSS animation, not a conditional mount). That means
 * `getByPlaceholder('Mật khẩu')` matches two inputs — one per panel.
 *
 * All login-form selectors below are therefore scoped to
 * `data-testid="login-panel"` so they uniquely target the login side.
 */
const loginPanel = (page: Page) => page.getByTestId('login-panel');

test.describe('Auth flow', () => {
    test.beforeEach(async ({ page }) => {
        await mockVocabApi(page);
    });

    test('login form renders required inputs and submit', async ({ page }) => {
        await page.goto('/login');

        const panel = loginPanel(page);
        await expect(panel.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
        await expect(panel.getByPlaceholder('Tên đăng nhập hoặc email')).toBeVisible();
        await expect(panel.getByPlaceholder('Mật khẩu')).toBeVisible();
        await expect(panel.getByRole('button', { name: 'Vào học ngay' })).toBeVisible();
    });

    test('typing populates fields without triggering submit', async ({ page }) => {
        await page.goto('/login');

        const panel = loginPanel(page);
        const email = panel.getByPlaceholder('Tên đăng nhập hoặc email');
        const password = panel.getByPlaceholder('Mật khẩu');

        await email.fill('learner@example.com');
        await password.fill('Secret#123');

        await expect(email).toHaveValue('learner@example.com');
        await expect(password).toHaveValue('Secret#123');
        await expect(page).toHaveURL(/\/login$/);
    });

    test('successful login redirects to /home (mocked backend)', async ({ page }) => {
        // Keep auth/me as guest (mockVocabApi default 401) so PublicOnlyRoute
        // renders the login form. The login response itself sets
        // currentUser via syncUserGameData; no auth/me refetch is required.
        const learner = {
            userId: 1,
            username: 'learner',
            email: 'learner@example.com',
            role: 'Learner',
            status: 'Active',
            isEmailVerified: true,
            hasGoogleLogin: false,
            hasLocalPassword: true,
        };

        await page.route('**/api/auth/login', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ succeeded: true, user: learner }),
            }),
        );

        await page.goto('/login');
        const panel = loginPanel(page);
        await panel.getByPlaceholder('Tên đăng nhập hoặc email').fill('learner@example.com');
        await panel.getByPlaceholder('Mật khẩu').fill('Secret#123');
        await panel.getByRole('button', { name: 'Vào học ngay' }).click();

        // Auth.handleSubmit does navigate(PATHS.home) on success — '/home'.
        await expect(page).toHaveURL(/\/home$/);
    });

    test('failed login shows server error message', async ({ page }) => {
        await page.route('**/api/auth/login', (route) =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    succeeded: false,
                    message: 'Username/email or password is incorrect.',
                }),
            }),
        );

        await page.goto('/login');
        const panel = loginPanel(page);
        await panel.getByPlaceholder('Tên đăng nhập hoặc email').fill('wrong@example.com');
        await panel.getByPlaceholder('Mật khẩu').fill('badpass');
        await panel.getByRole('button', { name: 'Vào học ngay' }).click();

        await expect(panel.getByText(/incorrect|sai|không/i).first()).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
    });
});
