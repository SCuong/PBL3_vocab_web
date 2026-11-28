-- ============================================================================
-- Demo streak / dashboard scenarios for the 3 login-capable demo users.
-- Date: 2026-05-23
-- Target: PostgreSQL / Neon. Demo/test database only.
--
-- Depends on:
--   database/postgres/seeds/2026_05_23_seed_demo_users.sql       (creates users)
--   database/postgres/seeds/2026_05_23_make_demo_login_users.sql (gives passwords)
--
-- Scope: ONLY these 3 users (by email). Real users + other demo users untouched.
--   demo.user01@vocablearning.test
--   demo.user02@vocablearning.test
--   demo.user03@vocablearning.test
--
-- Streak rule (DashboardAnalyticsService.CalculateStreak):
--   distinct learning_log.date; start at today if active today else yesterday;
--   count consecutive days backward. No stored "longest streak" — history is the
--   28-day heatmap (learning_log) + recent-activity list.
--
-- Scenarios:
--   user01 -> active 5,4,3,2 days ago (a 4-day block), NOT yesterday/today
--             => current streak = 0 (broken); heatmap shows the past 4-day block.
--   user02 -> active every day for last 7 days INCLUDING today
--             => current streak = 7 (also unlocks the 7-day-streak badge).
--   user03 -> active today, then every other day (today, -2, -4, -6, -8)
--             => current streak = 1; recent activity shows visible gaps.
--
-- XP = sum(learning_log.words_studied)*10 (+ correct exercises*5; none seeded).
--   words_studied/day: user02=8 (highest XP), user01=5, user03=4.
--
-- Idempotent: deletes only these 3 users' learning data (child->parent) then
-- rebuilds. CURRENT_DATE-based so it stays correct whenever re-run.
-- Prereqs: vocabulary + topic content already loaded (session.topic_id NOT NULL;
-- user_vocabulary/progress derive from vocabulary). Session/log seeding is
-- skipped if no topic exists.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Clean prior learning data for the 3 target users (child -> parent).
--    sticky_note is intentionally left alone (notebook from the main seed).
-- ----------------------------------------------------------------------------
DELETE FROM learning_log
WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
    'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test'));

DELETE FROM exercise_result
WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
    'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test'));

DELETE FROM exercise_session
WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
    'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test'));

DELETE FROM learning_session_item
WHERE session_id IN (
    SELECT session_id FROM learning_session
    WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
        'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')));

DELETE FROM learning_session
WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
    'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test'));

DELETE FROM progress
WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
    'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test'));

DELETE FROM user_vocabulary
WHERE user_id IN (SELECT user_id FROM users WHERE email IN (
    'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test'));

-- ----------------------------------------------------------------------------
-- 2. user_vocabulary: 9 words/user (3 MASTERED, 3 LEARNING, 3 NEW), dynamic.
-- ----------------------------------------------------------------------------
WITH targets AS (
    SELECT user_id FROM users WHERE email IN (
        'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
),
vr AS (
    SELECT vocab_id,
           row_number() OVER (ORDER BY vocab_id) AS rn,
           count(*) OVER () AS total
    FROM vocabulary
)
INSERT INTO user_vocabulary (user_id, vocab_id, status, note, first_learned_date)
SELECT
    t.user_id,
    vr.vocab_id,
    CASE (vr.rn % 3) WHEN 0 THEN 'MASTERED' WHEN 1 THEN 'LEARNING' ELSE 'NEW' END,
    CASE WHEN vr.rn % 4 = 0 THEN 'Demo note: word #' || vr.vocab_id ELSE '' END,
    CASE WHEN vr.rn % 3 = 2 THEN NULL ELSE NOW() - ((vr.rn % 30) || ' days')::interval END
FROM targets t
JOIN vr ON vr.rn <= LEAST(vr.total, 9)
ON CONFLICT (user_id, vocab_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. progress for LEARNING/MASTERED words. next_review_date spread:
--    rn%3=0 -> past (DUE), rn%3=1 -> today (DUE), rn%3=2 -> future.
-- ----------------------------------------------------------------------------
WITH targets AS (
    SELECT user_id FROM users WHERE email IN (
        'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
),
uv AS (
    SELECT uvx.user_id, uvx.vocab_id,
           row_number() OVER (PARTITION BY uvx.user_id ORDER BY uvx.vocab_id) AS rn
    FROM user_vocabulary uvx
    WHERE uvx.user_id IN (SELECT user_id FROM targets)
      AND uvx.status IN ('LEARNING','MASTERED')
)
INSERT INTO progress (
    user_id, vocab_id, ease_factor, interval_days, repetitions,
    last_review_date, next_review_date
)
SELECT
    uv.user_id, uv.vocab_id,
    2.3 + (uv.rn % 4) * 0.2,                                  -- 2.3..2.9 (>=1.3)
    GREATEST(1, (uv.rn * 2) % 30),                            -- interval_days >=1
    uv.rn % 6,                                                -- repetitions 0..5
    NOW() - ((uv.rn % 10) || ' days')::interval,
    CASE uv.rn % 3
        WHEN 0 THEN NOW() - ((1 + uv.rn % 5) || ' days')::interval   -- DUE (past)
        WHEN 1 THEN date_trunc('day', NOW())                          -- due TODAY
        ELSE        NOW() + ((1 + uv.rn % 7) || ' days')::interval    -- future
    END
FROM uv
ON CONFLICT (user_id, vocab_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. exercise_session + learning_log on scenario-specific days (CURRENT_DATE-based).
--    One session per active day; learning_log.session_id references it (NOT NULL FK).
-- ----------------------------------------------------------------------------
WITH targets AS (
    SELECT user_id, email FROM users WHERE email IN (
        'demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
),
day_offsets(email, off) AS (
    VALUES
        -- user01: 4-day block ending 2 days ago; yesterday + today missing -> streak 0
        ('demo.user01@vocablearning.test', 5),
        ('demo.user01@vocablearning.test', 4),
        ('demo.user01@vocablearning.test', 3),
        ('demo.user01@vocablearning.test', 2),
        -- user02: 7 consecutive days including today -> streak 7
        ('demo.user02@vocablearning.test', 6),
        ('demo.user02@vocablearning.test', 5),
        ('demo.user02@vocablearning.test', 4),
        ('demo.user02@vocablearning.test', 3),
        ('demo.user02@vocablearning.test', 2),
        ('demo.user02@vocablearning.test', 1),
        ('demo.user02@vocablearning.test', 0),
        -- user03: every other day including today -> streak 1, visible gaps
        ('demo.user03@vocablearning.test', 0),
        ('demo.user03@vocablearning.test', 2),
        ('demo.user03@vocablearning.test', 4),
        ('demo.user03@vocablearning.test', 6),
        ('demo.user03@vocablearning.test', 8)
),
plan AS (
    SELECT t.user_id,
           (CURRENT_DATE - d.off)::timestamp + TIME '09:00' AS activity_ts,
           CASE t.email
               WHEN 'demo.user02@vocablearning.test' THEN 8   -- highest XP
               WHEN 'demo.user01@vocablearning.test' THEN 5
               ELSE 4
           END AS words
    FROM targets t
    JOIN day_offsets d ON d.email = t.email
),
topic_pick AS (SELECT MIN(topic_id) AS topic_id FROM topic),
ins_sessions AS (
    INSERT INTO exercise_session (
        user_id, topic_id, session_type, started_at, finished_at,
        total_questions, correct_count, score
    )
    SELECT
        p.user_id, tp.topic_id, 'PRACTICE',
        p.activity_ts, p.activity_ts + INTERVAL '5 minutes',
        10, p.words, p.words * 10
    FROM plan p
    CROSS JOIN topic_pick tp
    WHERE tp.topic_id IS NOT NULL
    RETURNING session_id, user_id, started_at, correct_count, score
)
INSERT INTO learning_log (user_id, session_id, date, activity_type, words_studied, score)
SELECT user_id, session_id, started_at, 'LEARN', correct_count, score
FROM ins_sessions;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Activity dates per user (newest first):
--   SELECT u.email, l.date::date AS activity_day
--   FROM users u JOIN learning_log l ON l.user_id = u.user_id
--   WHERE u.email IN ('demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
--   ORDER BY u.email, activity_day DESC;
--
-- Active-day count + most recent active day per user:
--   SELECT u.email,
--          count(DISTINCT l.date::date) AS active_days,
--          max(l.date::date) AS last_active_day
--   FROM users u JOIN learning_log l ON l.user_id = u.user_id
--   WHERE u.email IN ('demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
--   GROUP BY u.email ORDER BY u.email;
--   Expect: user01 active_days=4 last<=CURRENT_DATE-2 ; user02=7 last=CURRENT_DATE ; user03=5 last=CURRENT_DATE.
--
-- Due-for-review now (next_review_date <= now):
--   SELECT u.email, count(*) AS due_now
--   FROM users u JOIN progress p ON p.user_id = u.user_id
--   WHERE u.email IN ('demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
--     AND p.next_review_date <= NOW()
--   GROUP BY u.email ORDER BY u.email;
--
-- Progress rows per user:
--   SELECT u.email, count(p.*) AS progress_rows
--   FROM users u LEFT JOIN progress p ON p.user_id = u.user_id
--   WHERE u.email IN ('demo.user01@vocablearning.test','demo.user02@vocablearning.test','demo.user03@vocablearning.test')
--   GROUP BY u.email ORDER BY u.email;   -- expect 6 each (3 MASTERED + 3 LEARNING)
--
-- ============================================================================
-- EXPECTED UI
--   user01: current streak = 0 (broken: missed yesterday/today). Heatmap shows a
--           4-day block 5..2 days ago. Dashboard has learned/mastered words + due reviews.
--   user02: current streak = 7 (active incl today). 7-day-streak badge unlocked.
--           Highest XP of the three. Full recent-activity list, due reviews present.
--   user03: current streak = 1 (active today, gaps every other day). Heatmap clearly
--           shows alternating active/empty days. Learned/mastered words + due reviews.
-- ============================================================================
