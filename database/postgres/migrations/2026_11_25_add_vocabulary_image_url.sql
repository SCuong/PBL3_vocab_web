-- Add optional illustration/photo URL column to vocabulary items.
-- Idempotent migration safe for existing PostgreSQL databases.

ALTER TABLE vocabulary
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048) NULL;
