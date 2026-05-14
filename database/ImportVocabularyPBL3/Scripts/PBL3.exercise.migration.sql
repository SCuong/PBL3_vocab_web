USE [pbl3];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* =========================================================
   0) Guard
   ========================================================= */
IF OBJECT_ID(N'dbo.[exercise]', N'U') IS NULL
BEGIN
    RAISERROR(N'Table dbo.exercise does not exist.', 16, 1);
    RETURN;
END
GO

/* =========================================================
   1) EXERCISE schema upgrade (giữ is_mini_test + topic_id)
   ========================================================= */
IF COL_LENGTH('dbo.exercise', 'match_mode') IS NULL
BEGIN
    ALTER TABLE dbo.[exercise] ADD [match_mode] NVARCHAR(30) NULL;
END
GO

IF COL_LENGTH('dbo.exercise', 'is_mini_test') IS NULL
BEGIN
    ALTER TABLE dbo.[exercise]
    ADD [is_mini_test] BIT
        CONSTRAINT [DF_exercise_is_mini_test] DEFAULT (0) NOT NULL;
END
GO

IF COL_LENGTH('dbo.exercise', 'topic_id') IS NULL
BEGIN
    ALTER TABLE dbo.[exercise] ADD [topic_id] BIGINT NULL;
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.foreign_keys
    WHERE [name] = N'FK_exercise_topic'
      AND [parent_object_id] = OBJECT_ID(N'dbo.[exercise]')
)
AND OBJECT_ID(N'dbo.[topic]', N'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.[exercise]
    ADD CONSTRAINT [FK_exercise_topic]
        FOREIGN KEY ([topic_id]) REFERENCES dbo.[topic] ([topic_id]);
END
GO

/* FK exercise -> vocabulary (nếu chưa có) */
IF NOT EXISTS
(
    SELECT 1 FROM sys.foreign_keys WHERE [name] = N'FK_exercise_vocab'
)
AND OBJECT_ID(N'dbo.[vocabulary]', N'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.[exercise]
    ADD CONSTRAINT [FK_exercise_vocab]
        FOREIGN KEY ([vocab_id]) REFERENCES dbo.[vocabulary]([vocab_id]);
END
GO

/* Data migration from old exercise types */
UPDATE dbo.[exercise]
SET [exercise_type] = 'MATCH_MEANING',
    [match_mode] = 'MATCH_IPA'
WHERE [exercise_type] = 'MATCH_IPA';
GO

UPDATE dbo.[exercise]
SET [exercise_type] = 'MATCH_MEANING',
    [match_mode] = ISNULL([match_mode], 'MATCH_MEANING')
WHERE [exercise_type] = 'LISTEN_CHOOSE_MEANING';
GO

UPDATE dbo.[exercise]
SET [exercise_type] = 'FILLING',
    [match_mode] = NULL
WHERE [exercise_type] = 'READING';
GO

UPDATE dbo.[exercise]
SET [match_mode] = 'MATCH_MEANING'
WHERE [exercise_type] = 'MATCH_MEANING'
  AND [match_mode] IS NULL;
GO

/*******************************************************
 Drop old CHECK constraints on exercise (except new names)
*******************************************************/
DECLARE @dropChecksSql NVARCHAR(MAX) = N'';

SELECT @dropChecksSql = @dropChecksSql +
    N'ALTER TABLE dbo.[exercise] DROP CONSTRAINT ' + QUOTENAME(cc.[name]) + N';' + CHAR(10)
FROM sys.check_constraints cc
WHERE cc.parent_object_id = OBJECT_ID(N'dbo.[exercise]')
  AND cc.[name] NOT IN (N'CK_exercise_type', N'CK_exercise_match_mode');

IF LEN(@dropChecksSql) > 0
    EXEC sp_executesql @dropChecksSql;
GO

/* Add new CHECK constraints */
IF NOT EXISTS
(
    SELECT 1
    FROM sys.check_constraints
    WHERE [name] = N'CK_exercise_type'
      AND [parent_object_id] = OBJECT_ID(N'dbo.[exercise]')
)
BEGIN
    ALTER TABLE dbo.[exercise]
    ADD CONSTRAINT [CK_exercise_type]
        CHECK ([exercise_type] IN ('MATCH_MEANING', 'FILLING'));
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.check_constraints
    WHERE [name] = N'CK_exercise_match_mode'
      AND [parent_object_id] = OBJECT_ID(N'dbo.[exercise]')
)
BEGIN
    ALTER TABLE dbo.[exercise]
    ADD CONSTRAINT [CK_exercise_match_mode]
        CHECK
        (
            ([exercise_type] = 'MATCH_MEANING' AND [match_mode] IN ('MATCH_IPA', 'MATCH_MEANING'))
            OR ([exercise_type] = 'FILLING' AND [match_mode] IS NULL)
        );
END
GO

/* Optional indexes for exercise */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_vocab_type_minitest' AND object_id = OBJECT_ID(N'dbo.exercise'))
BEGIN
    CREATE INDEX IX_exercise_vocab_type_minitest
    ON dbo.exercise(vocab_id, exercise_type, is_mini_test);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_topic_minitest_type' AND object_id = OBJECT_ID(N'dbo.exercise'))
BEGIN
    CREATE INDEX IX_exercise_topic_minitest_type
    ON dbo.exercise(topic_id, is_mini_test, exercise_type);
END
GO

/* =========================================================
   2) EXERCISE_SESSION
   ========================================================= */
IF OBJECT_ID(N'dbo.exercise_session', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.exercise_session
    (
        session_id       BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id          BIGINT       NOT NULL,
        topic_id         BIGINT       NULL,
        session_type     VARCHAR(20)  NOT NULL,   -- MINI_TEST | PRACTICE | REVIEW
        started_at       DATETIME2    NOT NULL CONSTRAINT DF_exercise_session_started_at DEFAULT SYSUTCDATETIME(),
        finished_at      DATETIME2    NULL,
        total_questions  INT          NOT NULL CONSTRAINT DF_exercise_session_total_questions DEFAULT (0),
        correct_count    INT          NOT NULL CONSTRAINT DF_exercise_session_correct_count DEFAULT (0),
        score            FLOAT        NOT NULL CONSTRAINT DF_exercise_session_score DEFAULT (0.0)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_session_user')
AND OBJECT_ID(N'dbo.[users]', N'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.exercise_session
    ADD CONSTRAINT FK_exercise_session_user
        FOREIGN KEY (user_id) REFERENCES dbo.[users](user_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_session_topic')
AND OBJECT_ID(N'dbo.[topic]', N'U') IS NOT NULL
BEGIN
    ALTER TABLE dbo.exercise_session
    ADD CONSTRAINT FK_exercise_session_topic
        FOREIGN KEY (topic_id) REFERENCES dbo.[topic](topic_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_exercise_session_type')
BEGIN
    ALTER TABLE dbo.exercise_session
    ADD CONSTRAINT CK_exercise_session_type
        CHECK (session_type IN ('MINI_TEST', 'PRACTICE', 'REVIEW'));
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_exercise_session_counts')
BEGIN
    ALTER TABLE dbo.exercise_session
    ADD CONSTRAINT CK_exercise_session_counts
        CHECK (total_questions >= 0 AND correct_count >= 0 AND correct_count <= total_questions);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_exercise_session_score')
BEGIN
    ALTER TABLE dbo.exercise_session
    ADD CONSTRAINT CK_exercise_session_score
        CHECK (score >= 0 AND score <= 100);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_session_user_started' AND object_id = OBJECT_ID(N'dbo.exercise_session'))
BEGIN
    CREATE INDEX IX_exercise_session_user_started
    ON dbo.exercise_session(user_id, started_at DESC);
END
GO

/* =========================================================
   3) EXERCISE_RESULT: add session_id + FK + index
   ========================================================= */
IF OBJECT_ID(N'dbo.exercise_result', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.exercise_result', 'session_id') IS NULL
        ALTER TABLE dbo.exercise_result ADD session_id BIGINT NULL;
END
GO

IF OBJECT_ID(N'dbo.exercise_result', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_result_session')
BEGIN
    ALTER TABLE dbo.exercise_result
    ADD CONSTRAINT FK_exercise_result_session
        FOREIGN KEY (session_id) REFERENCES dbo.exercise_session(session_id);
END
GO

IF OBJECT_ID(N'dbo.exercise_result', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_result_exercise')
BEGIN
    ALTER TABLE dbo.exercise_result
    ADD CONSTRAINT FK_exercise_result_exercise
        FOREIGN KEY (exercise_id) REFERENCES dbo.exercise(exercise_id);
END
GO

IF OBJECT_ID(N'dbo.exercise_result', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_result_session' AND object_id = OBJECT_ID(N'dbo.exercise_result'))
BEGIN
    CREATE INDEX IX_exercise_result_session ON dbo.exercise_result(session_id);
END
GO

/* =========================================================
   4) PROGRESS: add SRS fields
   ========================================================= */
IF OBJECT_ID(N'dbo.progress', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.progress', 'ease_factor') IS NULL
        ALTER TABLE dbo.progress ADD ease_factor FLOAT NOT NULL CONSTRAINT DF_progress_ease_factor DEFAULT (2.5);

    IF COL_LENGTH('dbo.progress', 'interval_days') IS NULL
        ALTER TABLE dbo.progress ADD interval_days INT NOT NULL CONSTRAINT DF_progress_interval_days DEFAULT (1);

    IF COL_LENGTH('dbo.progress', 'repetitions') IS NULL
        ALTER TABLE dbo.progress ADD repetitions INT NOT NULL CONSTRAINT DF_progress_repetitions DEFAULT (0);
END
GO

IF OBJECT_ID(N'dbo.progress', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_progress_srs')
BEGIN
    ALTER TABLE dbo.progress
    ADD CONSTRAINT CK_progress_srs
        CHECK (ease_factor >= 1.3 AND interval_days >= 0 AND repetitions >= 0);
END
GO

IF OBJECT_ID(N'dbo.progress', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_progress_user_next_review' AND object_id = OBJECT_ID(N'dbo.progress'))
BEGIN
    CREATE INDEX IX_progress_user_next_review
    ON dbo.progress(user_id, next_review_date);
END
GO

/* =========================================================
   5) LEARNING_LOG: add session_id, words_studied, score float
   ========================================================= */
IF OBJECT_ID(N'dbo.learning_log', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.learning_log', 'session_id') IS NULL
        ALTER TABLE dbo.learning_log ADD session_id BIGINT NULL;

    IF COL_LENGTH('dbo.learning_log', 'words_studied') IS NULL
        ALTER TABLE dbo.learning_log
        ADD words_studied INT NOT NULL CONSTRAINT DF_learning_log_words_studied DEFAULT (0);
END
GO

IF OBJECT_ID(N'dbo.learning_log', N'U') IS NOT NULL
AND EXISTS
(
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.learning_log')
      AND name = 'score'
      AND system_type_id IN (48,52,56,127) -- tinyint/smallint/int/bigint
)
BEGIN
    ALTER TABLE dbo.learning_log ALTER COLUMN score FLOAT NULL;
END
GO

IF OBJECT_ID(N'dbo.learning_log', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_learning_log_session')
BEGIN
    ALTER TABLE dbo.learning_log
    ADD CONSTRAINT FK_learning_log_session
        FOREIGN KEY (session_id) REFERENCES dbo.exercise_session(session_id);
END
GO

IF OBJECT_ID(N'dbo.learning_log', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_learning_log_user_date' AND object_id = OBJECT_ID(N'dbo.learning_log'))
BEGIN
    CREATE INDEX IX_learning_log_user_date
    ON dbo.learning_log(user_id, [date]);
END
GO

/* =========================================================
   6) Validate data violating new exercise constraints
   ========================================================= */
SELECT *
FROM dbo.exercise
WHERE NOT (exercise_type IN ('MATCH_MEANING', 'FILLING'));

SELECT *
FROM dbo.exercise
WHERE NOT (
    (exercise_type = 'MATCH_MEANING' AND match_mode IN ('MATCH_IPA', 'MATCH_MEANING'))
    OR (exercise_type = 'FILLING' AND match_mode IS NULL)
);
GO  