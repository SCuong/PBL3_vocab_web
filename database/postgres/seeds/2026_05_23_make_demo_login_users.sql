-- ============================================================================
-- Make 3 demo users login-capable for manual testing.
-- Date: 2026-05-23
-- Target: PostgreSQL / Neon. Demo/test database only.
--
-- Depends on: database/postgres/seeds/2026_05_23_seed_demo_users.sql
-- (the 20 data-only demo users must already exist).
--
-- Affects ONLY:
--   demo.user01@vocablearning.test
--   demo.user02@vocablearning.test
--   demo.user03@vocablearning.test
--
-- Password (all three): Demo@123456
-- Hashes below are REAL project-format hashes:
--   PBKDF2$<iterations>$<base64 salt>$<base64 key>
--   PBKDF2-HMAC-SHA256, 120000 iterations, 16-byte salt, 32-byte key.
-- Generated with the same parameters as CustomAuthenticationService.HashPassword
-- and verified to validate against TryVerifyCustomHash. Each user has a distinct salt.
--
-- google_subject: KEPT (not nulled). Reasons:
--   1. Cleanup/idempotency of the main seed identifies demo users by
--      google_subject LIKE 'seed-demo-google-sub-%'. Nulling it would orphan
--      these 3 from that scope.
--   2. The fake google_subject can NEVER authenticate via real Google login
--      (no Google-issued token carries that "sub"), so keeping it is harmless.
--   3. Password login is independent of google_subject.
--
-- Idempotent: plain UPDATE — re-running re-applies the same valid state.
-- Does NOT touch Google/data-only users (their password_hash stays NULL).
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

UPDATE users
SET password_hash = 'PBKDF2$120000$SuIayBQ/f5ddf8gntzYQJA==$WlhjcM+mAHQvWgnv1oWrN9/JcbzskyQzV7IfsW3xK5I=',
    is_email_verified = TRUE,
    status = 'ACTIVE',
    role = 'LEARNER'
WHERE email = 'demo.user01@vocablearning.test';

UPDATE users
SET password_hash = 'PBKDF2$120000$r52SUzS/gJNlcI0gL8rUww==$VoEq9DwBpsC/f3/qGyBU3e7qiYUWA+iLWm4VVyHSZKg=',
    is_email_verified = TRUE,
    status = 'ACTIVE',
    role = 'LEARNER'
WHERE email = 'demo.user02@vocablearning.test';

UPDATE users
SET password_hash = 'PBKDF2$120000$2k1GhR6FE54+6MSbCY2c4w==$QmZQaqrwyII3b1GPgLJulJwU56jeW/18irhc8Qxdnzo=',
    is_email_verified = TRUE,
    status = 'ACTIVE',
    role = 'LEARNER'
WHERE email = 'demo.user03@vocablearning.test';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT email, password_hash IS NOT NULL AS has_password, is_email_verified, role, status
-- FROM users
-- WHERE email IN (
--     'demo.user01@vocablearning.test',
--     'demo.user02@vocablearning.test',
--     'demo.user03@vocablearning.test'
-- )
-- ORDER BY email;
-- Expect: has_password = t, is_email_verified = t, role = LEARNER, status = ACTIVE (x3).

-- ============================================================================
-- REVERT (make them data-only again — back to non-login):
-- ============================================================================
-- UPDATE users SET password_hash = NULL
-- WHERE email IN (
--     'demo.user01@vocablearning.test',
--     'demo.user02@vocablearning.test',
--     'demo.user03@vocablearning.test'
-- );
