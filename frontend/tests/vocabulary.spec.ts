import { test, expect } from '@playwright/test';
import { mockVocabApi, TEST_VOCAB } from './fixtures/mocks';

test.describe('Vocabulary list page', () => {
    test.beforeEach(async ({ page }) => {
        await mockVocabApi(page);
    });

    test('renders mocked vocabulary cards', async ({ page }) => {
        await page.goto('/vocabulary');

        const cards = page.getByTestId('vocab-card');
        await expect(cards).toHaveCount(TEST_VOCAB.length);

        for (const row of TEST_VOCAB) {
            await expect(page.getByRole('heading', { name: row.word })).toBeVisible();
        }
    });

    test('search input is visible and accepts input', async ({ page }) => {
        await page.goto('/vocabulary');

        const search = page.getByPlaceholder('Tìm kiếm từ vựng...');
        await expect(search).toBeVisible();
        await search.fill('serendipity');
        await expect(search).toHaveValue('serendipity');
    });

    test('clicking a card opens the detail modal with that word', async ({ page }) => {
        await page.goto('/vocabulary');

        const card = page.getByTestId('vocab-card').first();
        const word = await card.getByRole('heading').first().innerText();
        await card.click();

        const modal = page.getByTestId('vocab-modal');
        await expect(modal).toBeVisible();
        await expect(modal.getByRole('heading', { name: word })).toBeVisible();
    });

    test('modal closes via the close button', async ({ page }) => {
        await page.goto('/vocabulary');

        await page.getByTestId('vocab-card').first().click();
        await expect(page.getByTestId('vocab-modal')).toBeVisible();

        await page.getByLabel('Đóng chi tiết từ vựng').click();
        await expect(page.getByTestId('vocab-modal')).toBeHidden();
    });
});
