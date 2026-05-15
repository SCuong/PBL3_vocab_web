import type { Page, Route } from '@playwright/test';

export type VocabRow = {
    id: number;
    word: string;
    ipa: string;
    meaning: string;
    cefr: string;
    topicId: number;
    topicName: string;
    audioUrl: string;
};

export const TEST_VOCAB: VocabRow[] = [
    { id: 101, word: 'serendipity', ipa: '/ˌsɛr.ənˈdɪp.ɪ.ti/', meaning: 'sự may mắn tình cờ', cefr: 'C1', topicId: 1, topicName: 'Daily Communication', audioUrl: '' },
    { id: 102, word: 'ephemeral',   ipa: '/ɪˈfɛm.ər.əl/',     meaning: 'phù du, ngắn ngủi',   cefr: 'C2', topicId: 1, topicName: 'Daily Communication', audioUrl: '' },
    { id: 103, word: 'pragmatic',   ipa: '/præɡˈmæt.ɪk/',     meaning: 'thực dụng',            cefr: 'B2', topicId: 2, topicName: 'Work and Education', audioUrl: '' },
    { id: 104, word: 'ubiquitous',  ipa: '/juːˈbɪk.wɪ.təs/',  meaning: 'có ở khắp nơi',        cefr: 'C1', topicId: 7, topicName: 'Culture and Science', audioUrl: '' },
];

export const TEST_TOPICS = [
    { topicId: 1, name: 'Daily Communication',   description: '', wordCount: 2 },
    { topicId: 2, name: 'Work and Education',    description: '', wordCount: 1 },
    { topicId: 7, name: 'Culture and Science',   description: '', wordCount: 1 },
];

export const PAGED = (rows: VocabRow[]) => ({
    items: rows,
    page: 1,
    pageSize: 24,
    totalCount: rows.length,
    totalPages: 1,
    hasNextPage: false,
});

export const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
    });

/**
 * Mock the API surface needed for vocabulary-page tests.
 * - /api/auth/me           → 401 (guest)
 * - /api/vocabulary/topics → fixed topic list
 * - /api/vocabulary?...    → fixed paged result
 * - /api/vocabulary/:id    → detail (with optional artificial delay)
 */
export const mockVocabApi = async (
    page: Page,
    opts: { detailDelayMs?: number; rows?: VocabRow[] } = {},
) => {
    const rows = opts.rows ?? TEST_VOCAB;

    await page.route('**/api/auth/me', (route) => json(route, { succeeded: false, message: 'guest' }, 401));
    await page.route('**/api/vocabulary/topics', (route) => json(route, TEST_TOPICS));
    await page.route(/\/api\/vocabulary\?/, (route) => json(route, PAGED(rows)));

    await page.route(/\/api\/vocabulary\/\d+(?:\?.*)?$/, async (route) => {
        const match = route.request().url().match(/\/api\/vocabulary\/(\d+)/);
        const id = match ? Number(match[1]) : -1;
        const row = rows.find((r) => r.id === id);
        if (!row) {
            return json(route, { error: 'not found' }, 404);
        }
        if (opts.detailDelayMs && opts.detailDelayMs > 0) {
            await new Promise((r) => setTimeout(r, opts.detailDelayMs));
        }
        return json(route, { ...row, examples: [] });
    });

    await page.route(/\/api\/learning\/.*/, (route) => json(route, { topics: [] }));
};
