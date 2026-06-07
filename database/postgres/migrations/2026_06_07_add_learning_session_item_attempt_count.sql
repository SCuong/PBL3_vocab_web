-- Track repeated answers within one learning session so Phase B scheduling is persisted.

BEGIN;

ALTER TABLE public.learning_session_item
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.learning_session_item
SET attempt_count = 1
WHERE is_answered = TRUE
  AND attempt_count = 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ck_learning_session_item_attempt_count'
          AND conrelid = 'public.learning_session_item'::regclass
    ) THEN
        ALTER TABLE public.learning_session_item
            ADD CONSTRAINT ck_learning_session_item_attempt_count
            CHECK (attempt_count >= 0);
    END IF;
END $$;

COMMIT;
