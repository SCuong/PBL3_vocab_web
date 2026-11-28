-- ============================================================================
-- Demo / test seed: 20 fake LEARNER users + learning data.
-- Date: 2026-05-23
-- Target: PostgreSQL / Neon. Run only on a non-production or demo database.
--
-- Scope marker (used for idempotency + cleanup):
--   google_subject LIKE 'seed-demo-google-sub-%'
--   email          LIKE 'demo.user%@vocablearning.test'
--
-- Idempotent: re-running upserts the 20 users (stable user_id) and fully
-- rebuilds their learning data. Real users are never touched.
--
-- Prerequisites: vocabulary and topic tables must already contain content
-- (run init.sql + content seed first). Session/log seeding is skipped if no
-- topic exists; vocabulary-based rows are skipped if no vocabulary exists.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Users (upsert by unique email; password_hash NULL = external/no-login demo)
-- ----------------------------------------------------------------------------
INSERT INTO users (
    username, email, password_hash, google_subject,
    role, status, is_email_verified, created_at, is_deleted
)
SELECT
    'Demo User ' || to_char(n, 'FM00'),
    'demo.user' || to_char(n, 'FM00') || '@vocablearning.test',
    NULL,
    'seed-demo-google-sub-' || to_char(n, 'FM00'),
    'LEARNER',
    'ACTIVE',
    TRUE,
    NOW() - ((n * 3) || ' days')::interval,   -- spread across last ~60 days
    FALSE
FROM generate_series(1, 20) AS n
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Clean previously-seeded demo learning data (child -> parent) for re-runs.
--    Users themselves are kept so user_id stays stable.
-- ----------------------------------------------------------------------------
DELETE FROM learning_log
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

DELETE FROM exercise_result
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

DELETE FROM exercise_session
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

DELETE FROM learning_session_item
WHERE session_id IN (
    SELECT session_id FROM learning_session
    WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%')
);

DELETE FROM learning_session
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

DELETE FROM progress
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

DELETE FROM user_vocabulary
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

DELETE FROM sticky_note
WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');

-- ----------------------------------------------------------------------------
-- 3. user_vocabulary (saved words / notebook). Each demo user gets 5..14 words
--    taken dynamically from the existing vocabulary table.
-- ----------------------------------------------------------------------------
WITH demo AS (
    SELECT user_id,
           (regexp_replace(google_subject, '\D', '', 'g'))::int AS idx
    FROM users
    WHERE google_subject LIKE 'seed-demo-google-sub-%'
),
vocab_ranked AS (
    SELECT vocab_id,
           row_number() OVER (ORDER BY vocab_id) AS rn,
           count(*) OVER () AS total
    FROM vocabulary
)
INSERT INTO user_vocabulary (user_id, vocab_id, status, note, first_learned_date)
SELECT
    d.user_id,
    vr.vocab_id,
    CASE (vr.rn % 3)
        WHEN 0 THEN 'MASTERED'
        WHEN 1 THEN 'LEARNING'
        ELSE 'NEW'
    END,
    CASE WHEN vr.rn % 4 = 0
         THEN 'Demo note: remember word #' || vr.vocab_id
         ELSE '' END,
    CASE WHEN vr.rn % 3 = 2
         THEN NULL                                            -- NEW words: not learned yet
         ELSE NOW() - ((vr.rn % 30) || ' days')::interval
    END
FROM demo d
JOIN vocab_ranked vr
    ON vr.rn <= LEAST(vr.total, 5 + (d.idx % 10))             -- 5..14 words per user
ON CONFLICT (user_id, vocab_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. progress (SM-2 state) for learned/review words (LEARNING + MASTERED only).
--    Varies ease_factor / interval_days / repetitions and spreads
--    next_review_date across past (due), today, and future.
-- ----------------------------------------------------------------------------
WITH demo AS (
    SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%'
),
uv AS (
    SELECT uvx.user_id,
           uvx.vocab_id,
           row_number() OVER (PARTITION BY uvx.user_id ORDER BY uvx.vocab_id) AS rn
    FROM user_vocabulary uvx
    WHERE uvx.user_id IN (SELECT user_id FROM demo)
      AND uvx.status IN ('LEARNING', 'MASTERED')
)
INSERT INTO progress (
    user_id, vocab_id, ease_factor, interval_days, repetitions,
    last_review_date, next_review_date
)
SELECT
    uv.user_id,
    uv.vocab_id,
    2.3 + (uv.rn % 4) * 0.2,                                  -- 2.3 .. 2.9 (>= 1.3)
    GREATEST(1, (uv.rn * 2) % 30),                            -- interval_days >= 1
    uv.rn % 6,                                                -- repetitions 0..5
    NOW() - ((uv.rn % 10) || ' days')::interval,             -- last review in the past
    CASE uv.rn % 3
        WHEN 0 THEN NOW() - ((1 + uv.rn % 5) || ' days')::interval   -- DUE (past)
        WHEN 1 THEN date_trunc('day', NOW())                          -- due TODAY
        ELSE        NOW() + ((1 + uv.rn % 7) || ' days')::interval    -- FUTURE
    END
FROM uv
ON CONFLICT (user_id, vocab_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. exercise_session + learning_log -> drives streaks.
--    Streak shape by user index:
--      idx  1..7  -> 14 consecutive days  (HIGH streak)
--      idx  8..14 -> 2  consecutive days  (LOW streak)
--      idx 15..20 -> 6 days, every 2nd day (BROKEN streak, current = 1)
--    learning_log.session_id is NOT NULL FK -> a session is created per day.
--    Skipped entirely if no topic exists (session.topic_id is NOT NULL).
-- ----------------------------------------------------------------------------
WITH demo AS (
    SELECT user_id,
           (regexp_replace(google_subject, '\D', '', 'g'))::int AS idx
    FROM users
    WHERE google_subject LIKE 'seed-demo-google-sub-%'
),
day_spec AS (
    SELECT d.user_id,
           d.idx,
           CASE WHEN d.idx <= 7 THEN 14
                WHEN d.idx <= 14 THEN 2
                ELSE 6 END AS span,
           CASE WHEN d.idx <= 14 THEN 1 ELSE 2 END AS step   -- step 2 = gaps = broken
    FROM demo d
),
days AS (
    SELECT ds.user_id,
           ds.idx,
           (date_trunc('day', NOW()) - ((g.n * ds.step) * INTERVAL '1 day')) AS day
    FROM day_spec ds
    CROSS JOIN LATERAL generate_series(0, ds.span - 1) AS g(n)
),
topic_pick AS (
    SELECT MIN(topic_id) AS topic_id FROM topic
),
ins_sessions AS (
    INSERT INTO exercise_session (
        user_id, topic_id, session_type, started_at, finished_at,
        total_questions, correct_count, score
    )
    SELECT
        dy.user_id,
        tp.topic_id,
        'PRACTICE',
        dy.day + INTERVAL '9 hours',
        dy.day + INTERVAL '9 hours' + INTERVAL '5 minutes',
        10,
        6 + (dy.idx % 5),                                    -- 6..10 correct (<= total)
        (6 + (dy.idx % 5)) * 10                              -- score 60..100
    FROM days dy
    CROSS JOIN topic_pick tp
    WHERE tp.topic_id IS NOT NULL
    RETURNING session_id, user_id, started_at, correct_count, score
)
INSERT INTO learning_log (user_id, session_id, date, activity_type, words_studied, score)
SELECT user_id, session_id, started_at, 'LEARN', correct_count, score
FROM ins_sessions;

-- ----------------------------------------------------------------------------
-- 6. sticky_note (notebook sticky notes): 1..3 per user, varied color/pin.
-- ----------------------------------------------------------------------------
WITH demo AS (
    SELECT user_id,
           (regexp_replace(google_subject, '\D', '', 'g'))::int AS idx
    FROM users
    WHERE google_subject LIKE 'seed-demo-google-sub-%'
)
INSERT INTO sticky_note (user_id, content, color, is_pinned, created_at, updated_at)
SELECT
    d.user_id,
    'Demo sticky note #' || g.n || ' for user ' || d.user_id,
    (ARRAY['yellow', 'green', 'blue', 'pink'])[1 + ((d.idx + g.n) % 4)],
    (g.n = 1),                                               -- first note pinned
    NOW() - ((d.idx) || ' days')::interval,
    NOW() - ((d.idx) || ' days')::interval
FROM demo d
CROSS JOIN LATERAL generate_series(1, 1 + (d.idx % 3)) AS g(n);

COMMIT;

-- ============================================================================
-- VERIFICATION (run after seeding)
-- ============================================================================
-- Seeded users:
--   SELECT count(*) AS demo_users
--   FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%';
--
-- Streak-like activity (distinct active days per user = streak proxy):
--   SELECT u.username,
--          count(DISTINCT date_trunc('day', l.date)) AS active_days,
--          min(l.date)::date AS first_day,
--          max(l.date)::date AS last_day
--   FROM users u
--   JOIN learning_log l ON l.user_id = u.user_id
--   WHERE u.google_subject LIKE 'seed-demo-google-sub-%'
--   GROUP BY u.username
--   ORDER BY active_days DESC;
--
-- Progress rows per user:
--   SELECT u.username, count(p.*) AS progress_rows
--   FROM users u
--   LEFT JOIN progress p ON p.user_id = u.user_id
--   WHERE u.google_subject LIKE 'seed-demo-google-sub-%'
--   GROUP BY u.username ORDER BY progress_rows DESC;
--
-- Due-for-review counts (next_review_date <= now):
--   SELECT u.username, count(*) AS due_now
--   FROM users u
--   JOIN progress p ON p.user_id = u.user_id
--   WHERE u.google_subject LIKE 'seed-demo-google-sub-%'
--     AND p.next_review_date <= NOW()
--   GROUP BY u.username ORDER BY due_now DESC;
--
-- ============================================================================
-- CLEANUP — remove ALL demo data (child rows first, then users). Run manually.
-- ============================================================================
-- BEGIN;
-- DELETE FROM learning_log       WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM exercise_result    WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM exercise_session   WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM learning_session_item WHERE session_id IN (
--     SELECT session_id FROM learning_session
--     WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%'));
-- DELETE FROM learning_session   WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM progress           WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM user_vocabulary    WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM sticky_note        WHERE user_id IN (SELECT user_id FROM users WHERE google_subject LIKE 'seed-demo-google-sub-%');
-- DELETE FROM users              WHERE google_subject LIKE 'seed-demo-google-sub-%';
-- COMMIT;
