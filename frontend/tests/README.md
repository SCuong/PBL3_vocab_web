# Playwright E2E suite

End-to-end tests for the VocabLearning frontend. All API calls are mocked via
`page.route` (see `fixtures/mocks.ts`), so the suite runs without a live
backend or PostgreSQL — only the Vite dev server is required, and Playwright
spins it up automatically (`webServer` in `playwright.config.ts`).

## Run

```
npm run test:e2e          # headless, all specs
npm run test:e2e:ui       # interactive UI mode
npm run test:e2e:report   # open the HTML report from the last run
```

First-time only: `npx playwright install chromium`.

## Files

| File | Purpose |
|---|---|
| `home.spec.ts` | Home page renders, guest navbar buttons navigate to `/login` and `/register` |
| `auth.spec.ts` | Login form selectors, field interaction, success redirect, server-error handling |
| `navigation.spec.ts` | `/` redirect, protected-route gate, unknown-route fallback, vocabulary entry |
| `vocabulary.spec.ts` | List renders mocked rows, search input, click opens modal, close button works |
| `vocabulary-modal-performance.spec.ts` | **Headline.** Modal must open within 500ms even when `/api/vocabulary/{id}` is artificially delayed by 2s. Also verifies rapid card switching does not get clobbered by stale detail responses. |
| `fixtures/mocks.ts` | Shared API mocks and test data |

## Selector strategy

Priority order, matching Playwright's recommended practice:

1. `getByRole` — buttons, headings, links
2. `getByPlaceholder` / `getByLabel` — form fields
3. `getByTestId` — only when role/label/placeholder cannot uniquely identify
   the element (e.g. the vocabulary card grid items, the modal overlay)

`data-testid` attributes added to source: `vocab-card`, `vocab-modal`,
`vocab-modal-content`. Each card also exposes `data-vocab-id` for targeted
selection by id when needed.

## Why mocks instead of a real backend?

- The suite is hermetic — no DB seeding, no auth tokens, no SMTP, no flaky
  network. Same result on any machine, every run.
- The vocabulary modal performance test specifically *requires* control over
  the detail-fetch latency to prove the optimization holds. That is only
  possible with route interception.
- Auth, vocabulary, and topic endpoints are mocked at the HTTP layer, so the
  real frontend wiring (`apiClient.apiFetch`, `vocabularyApi.getById`,
  AppContext bootstrap) is exercised end-to-end exactly as in production.
