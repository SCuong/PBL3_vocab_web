-- Migration: allow NULL password_hash for external (Google) users.
-- Date: 2026-05-23
-- Target: existing PostgreSQL databases (dev/prod/Neon) created from init.sql
--         before password_hash became nullable. Schema mirrors database/postgres/init.sql.
-- Idempotent: safe to re-run. DROP NOT NULL and DROP CONSTRAINT IF EXISTS are no-ops
--             when already applied; the recreated constraint matches init.sql exactly.
--
-- Rationale: Google-authenticated users have no local password. The previous
-- constraint required char_length(password_hash) BETWEEN 1 AND 255 on a NOT NULL
-- column, so inserting a passwordless user raised:
--   Npgsql.PostgresException 23514:
--   new row for relation "users" violates check constraint "ck_users_password_hash_length"

BEGIN;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_password_hash_length;

ALTER TABLE users ADD CONSTRAINT ck_users_password_hash_length
    CHECK (password_hash IS NULL OR char_length(password_hash) BETWEEN 1 AND 255);

COMMIT;
