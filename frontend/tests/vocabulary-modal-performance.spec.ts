import { test, expect } from '@playwright/test';
import { mockVocabApi } from './fixtures/mocks';

/**
 * Headline performance tests for the vocabulary detail modal.
 *
 * Optimization under verification:
 *   `onSelectWord` previously did `await vocabularyApi.getById(id)` BEFORE
 *   calling `setSelectedWord`, so every card click was gated by a 200–700ms
 *   network round-trip. The fix opens the modal instantly with list-row data
 *   and enriches asynchronously, with a race-guard
 *   (`prev?.id === word.id`) that prevents stale detail responses from
 *   clobbering a newer selection.
 *
 * Two budget metrics are used and they measure different things:
 *
 *   - `toBeAttached`  — element is in the DOM. This is the React commit
 *     time and is the correct metric for "did the click trigger an
 *     immediate UI response?". Independent of the entrance animation.
 *
 *   - `toBeVisible`   — element is in the DOM AND has a non-zero opacity.
 *     With Framer Motion this includes the 200ms scale/opacity easing,
 *     so realistic budgets must allow for it.
 */

const DETAIL_DELAY_MS = 2000;
const SLOW_PATH_VISIBLE_BUDGET_MS = 500; // <<< slow detail must NOT gate visibility
const FAST_PATH_ATTACH_BUDGET_MS = 600;  // React commit (no network)
const FAST_PATH_VISIBLE_BUDGET_MS = 1000; // commit + 200ms motion + slack

test.describe('Vocabulary modal — instant-open guarantee', () => {
    test('modal opens within budget even when detail fetch is slow', async ({ page }) => {
        await mockVocabApi(page, { detailDelayMs: DETAIL_DELAY_MS });
        await page.goto('/vocabulary');

        let detailResolvedAt = 0;
        page.on('requestfinished', (req) => {
            if (/\/api\/vocabulary\/\d+(\?|$)/.test(req.url())) {
                detailResolvedAt = Date.now();
            }
        });

        const firstCard = page.getByTestId('vocab-card').first();
        await firstCard.waitFor({ state: 'visible' });

        await firstCard.click();

        // Budget is enforced by Playwright's own timeout — if the modal is
        // not visible within SLOW_PATH_VISIBLE_BUDGET_MS this fails. No
        // additional Date.now() assert is needed (and would double-count
        // the polling overhead).
        await expect(page.getByTestId('vocab-modal'))
            .toBeVisible({ timeout: SLOW_PATH_VISIBLE_BUDGET_MS });
        const modalShownAt = Date.now();

        // Hard proof the modal beat the slow detail fetch:
        // either the request hasn't finished yet at all, or it finished
        // strictly AFTER the modal was already on screen.
        expect(detailResolvedAt === 0 || modalShownAt < detailResolvedAt).toBe(true);

        // Modal renders with list-row data — heading matches the clicked card.
        const cardWord = await firstCard.getByRole('heading').first().innerText();
        await expect(
            page.getByTestId('vocab-modal-content').getByRole('heading', { name: cardWord }),
        ).toBeVisible();
    });

    test('modal commits to DOM with no perceptible delay when API is fast', async ({ page }) => {
        await mockVocabApi(page, { detailDelayMs: 0 });
        await page.goto('/vocabulary');

        const card = page.getByTestId('vocab-card').first();
        await card.waitFor({ state: 'visible' });

        await card.click();

        // toBeAttached measures React commit time (state -> DOM) — the
        // metric the optimization actually targets. The 200ms Framer
        // entrance animation is unrelated to "did the click trigger an
        // immediate render?", so visibility is asserted separately with
        // a looser budget. Both budgets are enforced by Playwright's
        // built-in timeout argument; no manual Date.now compare needed.
        await expect(page.getByTestId('vocab-modal'))
            .toBeAttached({ timeout: FAST_PATH_ATTACH_BUDGET_MS });

        await expect(page.getByTestId('vocab-modal'))
            .toBeVisible({ timeout: FAST_PATH_VISIBLE_BUDGET_MS });
    });

    test('stale detail response from a previous selection does not clobber the current one', async ({ page }) => {
        // The modal overlay intentionally captures pointer events while open
        // (clicking the backdrop closes it; the inner content stops
        // propagation). So the realistic race scenario is:
        //   click A -> modal opens with A -> close -> click B before A's
        //   detail fetch resolves -> A's stale response arrives -> the
        //   `prev?.id === word.id` guard must keep B on screen.
        await mockVocabApi(page, { detailDelayMs: 1500 });
        await page.goto('/vocabulary');

        const cards = page.getByTestId('vocab-card');
        await cards.first().waitFor({ state: 'visible' });

        const aWord = await cards.nth(0).getByRole('heading').first().innerText();
        const bWord = await cards.nth(1).getByRole('heading').first().innerText();

        // Click A -> modal opens with A's list-row data.
        await cards.nth(0).click();
        await expect(page.getByTestId('vocab-modal')).toBeVisible();
        await expect(
            page.getByTestId('vocab-modal-content').getByRole('heading', { name: aWord }),
        ).toBeVisible();

        // Close the modal so the second card is reachable. A's detail
        // fetch is still in flight (1500ms delay).
        await page.getByLabel('Đóng chi tiết từ vựng').click();
        await expect(page.getByTestId('vocab-modal')).toBeHidden();

        // Click B before A's detail fetch resolves.
        await cards.nth(1).click();
        await expect(page.getByTestId('vocab-modal')).toBeVisible();
        await expect(
            page.getByTestId('vocab-modal-content').getByRole('heading', { name: bWord }),
        ).toBeVisible();

        // Wait long enough that BOTH the stale A fetch (started ~T+0) and
        // the B fetch (started ~T+0.5s) have resolved.
        await page.waitForTimeout(1800);

        // Race-guard assertion: modal must still be showing B, never A.
        const modal = page.getByTestId('vocab-modal-content');
        await expect(modal.getByRole('heading', { name: bWord })).toBeVisible();
        await expect(modal.getByRole('heading', { name: aWord })).toHaveCount(0);
    });
});
