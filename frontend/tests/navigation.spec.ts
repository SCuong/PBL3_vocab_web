import { test, expect } from '@playwright/test';
import { mockVocabApi } from './fixtures/mocks';

test.describe('Public navigation', () => {
    test.beforeEach(async ({ page }) => {
        await mockVocabApi(page);
    });

    test('root redirects to /home', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/home$/);
    });

    test('protected route /dashboard redirects guest to /login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/login$/);
    });

    test('unknown route falls back to /home', async ({ page }) => {
        await page.goto('/this-does-not-exist');
        await expect(page).toHaveURL(/\/home$/);
    });

    test('navigating /vocabulary loads the vocabulary list', async ({ page }) => {
        await page.goto('/vocabulary');
        await expect(page.getByPlaceholder('Tìm kiếm từ vựng...')).toBeVisible();
        await expect(page.getByTestId('vocab-card').first()).toBeVisible();
    });
});
