# Backend Production Deployment

## Current Decision

This branch is migration-prep only. Do not deploy PostgreSQL to production until a real Docker/PostgreSQL runtime smoke test passes.

Keep Cookie Auth for the first PostgreSQL deployment. The frontend already uses credentialed requests and Google OAuth uses the existing external-cookie flow. Rewriting to JWT during database migration would mix two high-risk changes.

Use the reviewed manual PostgreSQL baseline in `database/postgres/init.sql`. Do not run legacy SQL Server EF migrations against PostgreSQL.

The baseline is fail-fast by design: run it only against an empty PostgreSQL database. If any production table already exists, stop and audit the database instead of trying to rerun the baseline. The script also requires permission to create the `citext` extension; verify that privilege on managed PostgreSQL before cutover.

## Admin Bootstrap

Fresh PostgreSQL has no admin by design. Production must create the first admin through a one-time bootstrap using a precomputed PBKDF2 hash.

Rules:

1. Never commit plaintext admin passwords.
2. Never commit real admin password hashes.
3. Run bootstrap only when no active admin exists.
4. Store bootstrap command and generated hash in the deployment secret manager or an operator vault only.

Bootstrap command shape:

```bash
psql "$DATABASE_URL" \
  -v admin_username='Admin' \
  -v admin_email='admin@example.com' \
  -v admin_password_hash='PBKDF2$120000$...' \
  -f database/postgres/admin-bootstrap.sql
```

Generate `admin_password_hash` with the same `PBKDF2$120000$base64Salt$base64Hash` format used by `CustomAuthenticationService`. Preferred source is a one-time local utility or staging-only endpoint that calls the existing password hasher, then gets removed before production.

## Deployment Checklist

1. Create a staging host with the same Docker Compose file and a separate PostgreSQL volume.
2. Set `FRONTEND_ORIGIN` to the exact Vercel origin, not localhost.
3. Set a strong `POSTGRES_PASSWORD`.
4. Set SMTP and Google OAuth secrets only through host environment or `.env`, never in tracked config.
5. Run `docker compose config` and verify no empty required values.
6. Start staging with `docker compose up -d --build`.
7. Verify `GET /health` returns success.
8. Run first-admin bootstrap if this is a fresh DB.
9. Run the smoke checklist below.
10. Promote the same image/config pattern to production only after staging passes.

## Smoke Checklist

Run this against staging with real PostgreSQL, not EF InMemory:

1. Backend starts and stays running for 5 minutes.
2. `GET /health` returns success.
3. Admin login succeeds through `/api/auth/login`.
4. `GET /api/auth/me` returns the admin DTO.
5. Learner registration succeeds.
6. Email verification flow succeeds, or staging uses a controlled fallback.
7. Learner login succeeds.
8. Vocabulary list returns seeded/imported words.
9. Learning action creates/updates `user_vocabulary` and `progress`.
10. Review action updates `progress.next_review_date`.
11. `GET /api/dashboard/learner` shows due review data after a due `progress` row exists.
12. Sticky note create, update, list, delete all work.
13. Password reset token creation and consumption work.
14. Admin can create/update exercise, exercise result, and learning log.
15. Delete vocabulary smoke test does not fail on PostgreSQL quoting. Current code still contains SQL Server bracketed raw SQL in `VocabularyService.DeleteVocabulary`; fix before production if this endpoint is required.

## PostgreSQL Migration Path

For a new deployment, PostgreSQL initializes schema from `database/postgres/init.sql` only on first volume creation. If the volume already contains objects, Docker will not replay the init script; create a new volume or run a reviewed migration.

For existing SQL Server data:

1. Freeze writes or schedule maintenance.
2. Back up SQL Server.
3. Restore backup to a staging SQL Server instance for export.
4. Export tables in dependency order:
   `users`, `topic`, `vocabulary`, `example`, `exercise`, `user_vocabulary`, `progress`, `exercise_session`, `exercise_result`, `learning_log`, `meaning`, `password_reset_token`, `email_verification_token`, `sticky_note`.
5. Normalize data before loading:
   empty `google_subject` to `NULL`;
   null `note` to empty string;
   null `translation` requires a real translation or row rejection;
   null `exercise_result.session_id` requires valid session repair or row rejection;
   null `learning_log.session_id` requires valid session repair or row rejection;
   null `exercise_session.topic_id` requires valid topic repair or row rejection;
   invalid `users.status` values must map to `ACTIVE` or `INACTIVE`;
   invalid `learning_log.activity_type` values must map to `LEARN`, `REVIEW`, or `TEST`.
6. Load into a staging PostgreSQL database.
7. Run `database/postgres/reset-sequences-after-import.sql`.
8. Validate row counts, FK checks, and unique constraints.
9. Run the smoke checklist.
10. Cut production only after backup and rollback path are verified.

## Sequence Reset

After importing explicit identity values:

```bash
psql "$DATABASE_URL" -f database/postgres/reset-sequences-after-import.sql
```

Then insert one row into each identity table in staging and roll it back to verify sequences are ahead of imported IDs.

## Backup Strategy

Run `pg_dump` before every deploy that changes schema or data shape:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/vocablearning.backup
docker compose cp db:/tmp/vocablearning.backup ./backups/vocablearning-$(date +%Y%m%d%H%M%S).backup
```

Keep at least daily backups plus one pre-deploy backup. Test restore on staging.

## Restore Strategy

Restore to a new volume, not over the failed DB:

```bash
docker compose down
docker volume create vocablearning_postgres_restore
docker compose up -d db
docker compose cp ./backups/vocablearning.backup db:/tmp/vocablearning.backup
docker compose exec db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists /tmp/vocablearning.backup
```

Point backend to the restored DB and run the smoke checklist before exposing traffic.

## Rollback Checklist

1. Stop backend container.
2. Restore previous backend image or previous Git commit.
3. If schema/data changed, restore the pre-deploy PostgreSQL backup to a new volume.
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
