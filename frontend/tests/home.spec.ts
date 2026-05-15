import { test, expect } from '@playwright/test';
import { mockVocabApi } from './fixtures/mocks';

test.describe('Home page (guest)', () => {
    test.beforeEach(async ({ page }) => {
        await mockVocabApi(page);
    });

    test('renders home and shows guest auth actions in navbar', async ({ page }) => {
        await page.goto('/home');

        // Navbar guest actions exist as real buttons (Vietnamese labels).
        // The app does not have an English "Login" button — the prior test was wrong.
        await expect(page.getByRole('button', { name: 'Đăng nhập' }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Đăng ký' }).first()).toBeVisible();
    });

    test('login button navigates to /login', async ({ page }) => {
        await page.goto('/home');

        await page.getByRole('button', { name: 'Đăng nhập' }).first().click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    });

    test('register button navigates to /register', async ({ page }) => {
        await page.goto('/home');

        await page.getByRole('button', { name: 'Đăng ký' }).first().click();
        await expect(page).toHaveURL(/\/register$/);
        await expect(page.getByRole('heading', { name: 'Đăng ký' })).toBeVisible();
    });
});
