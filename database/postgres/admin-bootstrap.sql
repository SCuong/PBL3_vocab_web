-- One-time first-admin bootstrap.
-- Run manually with psql variables. Never commit a real password or plaintext secret.
--
-- Example:
-- psql "$DATABASE_URL" \
--   -v admin_username='Admin' \
--   -v admin_email='admin@example.com' \
--   -v admin_password_hash='PBKDF2$120000$...' \
--   -f database/postgres/admin-bootstrap.sql

\set ON_ERROR_STOP on

\if :{?admin_username}
\else
\echo 'admin_username is required'
\quit 1
\endif

\if :{?admin_email}
\else
\echo 'admin_email is required'
\quit 1
\endif

\if :{?admin_password_hash}
\else
\echo 'admin_password_hash is required'
\quit 1
\endif

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE role = 'ADMIN'
          AND status = 'ACTIVE'
          AND is_deleted = FALSE
    ) THEN
        RAISE EXCEPTION 'Active admin already exists. Bootstrap refused.';
    END IF;
END $$;

INSERT INTO users (
    username,
    email,
    password_hash,
    role,
    status,
    is_email_verified,
    created_at,
    is_deleted
)
VALUES (
    :'admin_username',
    :'admin_email',
    :'admin_password_hash',
    'ADMIN',
    'ACTIVE',
    TRUE,
    CURRENT_TIMESTAMP,
    FALSE
);

COMMIT;
