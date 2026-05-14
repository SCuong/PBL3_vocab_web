# Backend Production Deployment

## Current Decision

Keep Cookie Auth for first PostgreSQL deployment. The frontend already uses credentialed requests and Google OAuth uses the existing external-cookie flow. Rewriting to JWT during database migration would mix two high-risk changes.

JWT + refresh tokens should be a staged follow-up after PostgreSQL is stable.

## Deployment Checklist

1. Create a staging host with the same Docker Compose file and a separate PostgreSQL volume.
2. Set `FRONTEND_ORIGIN` to the exact Vercel origin, not localhost.
3. Set a strong `POSTGRES_PASSWORD`.
4. Set SMTP and Google OAuth secrets only through host environment or `.env`, never in tracked config.
5. Run `docker compose config` and verify no empty required values.
6. Start staging with `docker compose up -d --build`.
7. Verify `GET /health` returns success.
8. Register, verify email, login, call `GET /api/auth/me`, logout.
9. Run learner flows that write `user_vocabulary`, `progress`, `exercise_session`, `exercise_result`, and `learning_log`.
10. Promote the same image/config pattern to production.

## PostgreSQL Migration Path

For a new deployment, the PostgreSQL container initializes schema from `database/postgres/init.sql` on first volume creation.

For existing SQL Server data:

1. Freeze writes or schedule maintenance.
2. Back up SQL Server.
3. Export tables in dependency order: `users`, `topic`, `vocabulary`, `example`, `user_vocabulary`, `progress`, `exercise`, `exercise_session`, `exercise_result`, `learning_log`, `meaning`, auth token tables, `sticky_note`.
4. Load into a staging PostgreSQL database.
5. Validate row counts and key constraints.
6. Reset identity sequences to `MAX(id) + 1`.
7. Run application smoke tests against staging.
8. Cut production only after backup and rollback path are verified.

Do not run legacy SQL Server migrations against PostgreSQL. Do not enable `Database:AutoMigrate` for PostgreSQL.

## Backup Strategy

Run `pg_dump` before every deploy that changes schema or data shape:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/vocablearning.backup
docker compose cp db:/tmp/vocablearning.backup ./backups/vocablearning-$(date +%Y%m%d%H%M%S).backup
```

Keep at least daily backups plus one pre-deploy backup. Test restore on staging.

## Rollback Checklist

1. Stop backend container.
2. Restore previous backend image or previous Git commit.
3. If schema changed, restore the pre-deploy PostgreSQL backup to a new volume.
4. Point backend to restored DB.
5. Verify `/health`, login, `/api/auth/me`, and one write workflow.
6. Keep failed DB volume untouched until root cause is known.

## JWT Migration Stages

1. Add access-token issuing beside existing cookie login.
2. Add refresh-token table with hashed token, expiry, reuse detection, and rotation.
3. Update frontend API client to send `Authorization: Bearer`.
4. Keep cookie auth for one release as fallback.
5. Disable cookie login after logs show JWT traffic is stable.
6. Remove cookie dependency and external-cookie assumptions last.
