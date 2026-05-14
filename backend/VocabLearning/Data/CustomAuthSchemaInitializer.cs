using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;

namespace VocabLearning.Data
{
    public static class CustomAuthSchemaInitializer
    {
        public static async Task InitializeAsync(IServiceProvider services)
        {
            await using var scope = services.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var exerciseTypeInListSql = BuildSqlInList(ExerciseTypes.All);
            var matchModeInListSql = BuildSqlInList(ExerciseMatchModes.All);
            var learningActivityTypeInListSql = BuildSqlInList(LearningActivityTypes.All);

            var commands = new[]
            {
                $@"
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[users]
    (
        [user_id] BIGINT IDENTITY(1,1) NOT NULL,
        [username] NVARCHAR(50) NOT NULL,
        [email] NVARCHAR(100) NOT NULL,
        [password_hash] NVARCHAR(255) NOT NULL,
        [google_subject] NVARCHAR(200) NULL,
        [role] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_role] DEFAULT N'{UserRoles.Learner}',
        [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_status] DEFAULT N'ACTIVE',
        [is_email_verified] BIT NOT NULL CONSTRAINT [DF_users_is_email_verified] DEFAULT ((1)),
        [created_at] DATETIME NOT NULL CONSTRAINT [DF_users_created_at] DEFAULT GETDATE(),
        [is_deleted] BIT NOT NULL CONSTRAINT [DF_users_is_deleted] DEFAULT ((0)),
        [deleted_at] DATETIME NULL,
        CONSTRAINT [PK_users] PRIMARY KEY ([user_id]),
        CONSTRAINT [UQ_users_username] UNIQUE ([username]),
        CONSTRAINT [UQ_users_email] UNIQUE ([email])
    );
END;",
                @"
IF COL_LENGTH('dbo.users', 'username') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [username] NVARCHAR(50) NULL;
END;",
                $@"
IF COL_LENGTH('dbo.users', 'role') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [role] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_role_upgrade] DEFAULT N'{UserRoles.Learner}';
END;",
                @"
IF COL_LENGTH('dbo.users', 'status') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_status_upgrade] DEFAULT N'ACTIVE';
END;",
                @"
IF COL_LENGTH('dbo.users', 'is_email_verified') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [is_email_verified] BIT NOT NULL CONSTRAINT [DF_users_is_email_verified] DEFAULT ((1));
END;",
                @"
IF COL_LENGTH('dbo.users', 'created_at') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [created_at] DATETIME NOT NULL CONSTRAINT [DF_users_created_at_upgrade] DEFAULT GETDATE();
END;",
                @"
IF COL_LENGTH('dbo.users', 'password_hash') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [password_hash] NVARCHAR(255) NOT NULL CONSTRAINT [DF_users_password_hash_upgrade] DEFAULT N'';
END;",
                @"
IF COL_LENGTH('dbo.users', 'google_subject') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [google_subject] NVARCHAR(200) NULL;
END;",
                @"
UPDATE [dbo].[users]
SET [username] = LEFT(LTRIM(RTRIM([email])), 50)
WHERE [username] IS NULL;",
                @"
UPDATE [dbo].[users]
SET [username] = CONCAT(N'user_', [user_id])
WHERE NULLIF(LTRIM(RTRIM([username])), N'') IS NULL;",
                @"
UPDATE [dbo].[users]
SET [email] = LTRIM(RTRIM([email]))
WHERE [email] <> LTRIM(RTRIM([email]));",
                @"
IF COL_LENGTH('dbo.users', 'google_subject') IS NOT NULL
BEGIN
    UPDATE [dbo].[users]
    SET [google_subject] = NULL
    WHERE NULLIF(LTRIM(RTRIM([google_subject])), N'') IS NULL;

    UPDATE [dbo].[users]
    SET [google_subject] = LTRIM(RTRIM([google_subject]))
    WHERE [google_subject] IS NOT NULL
      AND [google_subject] <> LTRIM(RTRIM([google_subject]));
END;",
                @"
IF COL_LENGTH('dbo.users', 'is_deleted') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [is_deleted] BIT NOT NULL CONSTRAINT [DF_users_is_deleted] DEFAULT ((0));
END;",
                @"
IF COL_LENGTH('dbo.users', 'deleted_at') IS NULL
BEGIN
    ALTER TABLE [dbo].[users] ADD [deleted_at] DATETIME NULL;
END;",
                @"
UPDATE [dbo].[users]
SET [role] = UPPER(LTRIM(RTRIM([role])));",
                @"
UPDATE [dbo].[users]
SET [status] = UPPER(LTRIM(RTRIM([status])));",
                @"
IF COL_LENGTH('dbo.users', 'google_subject') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1
       FROM [sys].[indexes]
       WHERE [name] = N'UX_users_google_subject'
         AND [object_id] = OBJECT_ID(N'dbo.users')
   )
BEGIN
    CREATE UNIQUE INDEX [UX_users_google_subject]
        ON [dbo].[users]([google_subject])
        WHERE [google_subject] IS NOT NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.topic', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[topic]
    (
        [topic_id] BIGINT IDENTITY(1,1) NOT NULL,
        [name] NVARCHAR(100) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [parent_topic_id] BIGINT NULL,
        CONSTRAINT [PK_topic] PRIMARY KEY ([topic_id])
    );
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[vocabulary]
    (
        [vocab_id] BIGINT IDENTITY(1,1) NOT NULL,
        [word] NVARCHAR(100) NULL,
        [ipa] NVARCHAR(100) NULL,
        [audio_url] NVARCHAR(255) NULL,
        [level] NVARCHAR(10) NOT NULL CONSTRAINT [DF_vocabulary_level] DEFAULT N'A1',
        [meaning_vi] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_vocabulary_meaning_vi] DEFAULT N'',
        [topic_id] BIGINT NULL,
        CONSTRAINT [PK_vocabulary] PRIMARY KEY ([vocab_id])
    );
END;",
                @"
IF OBJECT_ID(N'dbo.topic', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.topic', 'description') IS NULL
BEGIN
    ALTER TABLE [dbo].[topic] ADD [description] NVARCHAR(MAX) NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.topic', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.topic', 'parent_topic_id') IS NULL
BEGIN
    ALTER TABLE [dbo].[topic] ADD [parent_topic_id] BIGINT NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.vocabulary', 'word') IS NULL
BEGIN
    ALTER TABLE [dbo].[vocabulary] ADD [word] NVARCHAR(100) NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.vocabulary', 'ipa') IS NULL
BEGIN
    ALTER TABLE [dbo].[vocabulary] ADD [ipa] NVARCHAR(100) NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.vocabulary', 'audio_url') IS NULL
BEGIN
    ALTER TABLE [dbo].[vocabulary] ADD [audio_url] NVARCHAR(255) NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.vocabulary', 'meaning_vi') IS NULL
BEGIN
    ALTER TABLE [dbo].[vocabulary] ADD [meaning_vi] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_vocabulary_meaning_vi_upgrade] DEFAULT N'';
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.vocabulary', 'topic_id') IS NULL
BEGIN
    ALTER TABLE [dbo].[vocabulary] ADD [topic_id] BIGINT NULL;
END;",
                @"
IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.vocabulary', 'level') IS NULL
BEGIN
    ALTER TABLE [dbo].[vocabulary] ADD [level] NVARCHAR(10) NOT NULL CONSTRAINT [DF_vocabulary_level_upgrade] DEFAULT N'A1';
END;",
                @"
IF OBJECT_ID(N'dbo.password_reset_token', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[password_reset_token]
    (
        [password_reset_token_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [token_hash] NVARCHAR(255) NOT NULL,
        [expires_at] DATETIME NOT NULL,
        [created_at] DATETIME NOT NULL CONSTRAINT [DF_password_reset_token_created_at] DEFAULT GETDATE(),
        [used_at] DATETIME NULL,
        [consumed_by_ip] NVARCHAR(64) NULL,
        CONSTRAINT [PK_password_reset_token] PRIMARY KEY ([password_reset_token_id]),
        CONSTRAINT [FK_password_reset_token_users]
            FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id])
            ON DELETE NO ACTION
    );
END;",
                @"
IF OBJECT_ID(N'dbo.password_reset_token', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[indexes]
        WHERE [name] = N'IX_password_reset_token_token_hash'
          AND [object_id] = OBJECT_ID(N'dbo.password_reset_token')
    )
    BEGIN
        CREATE INDEX [IX_password_reset_token_token_hash]
            ON [dbo].[password_reset_token]([token_hash]);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[indexes]
        WHERE [name] = N'IX_password_reset_token_user_id_created_at'
          AND [object_id] = OBJECT_ID(N'dbo.password_reset_token')
    )
    BEGIN
        CREATE INDEX [IX_password_reset_token_user_id_created_at]
            ON [dbo].[password_reset_token]([user_id], [created_at]);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[indexes]
        WHERE [name] = N'IX_password_reset_token_expires_at'
          AND [object_id] = OBJECT_ID(N'dbo.password_reset_token')
    )
    BEGIN
        CREATE INDEX [IX_password_reset_token_expires_at]
            ON [dbo].[password_reset_token]([expires_at]);
    END;
END;",
                @"
IF OBJECT_ID(N'dbo.email_verification_token', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[email_verification_token]
    (
        [email_verification_token_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [token_hash] NVARCHAR(255) NOT NULL,
        [expires_at] DATETIME NOT NULL,
        [created_at] DATETIME NOT NULL CONSTRAINT [DF_email_verification_token_created_at] DEFAULT GETDATE(),
        [used_at] DATETIME NULL,
        [consumed_by_ip] NVARCHAR(64) NULL,
        CONSTRAINT [PK_email_verification_token] PRIMARY KEY ([email_verification_token_id]),
        CONSTRAINT [FK_email_verification_token_users]
            FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id])
            ON DELETE CASCADE
    );
END;",
                @"
IF OBJECT_ID(N'dbo.email_verification_token', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[indexes]
        WHERE [name] = N'IX_email_verification_token_token_hash'
          AND [object_id] = OBJECT_ID(N'dbo.email_verification_token')
    )
    BEGIN
        CREATE UNIQUE INDEX [IX_email_verification_token_token_hash]
            ON [dbo].[email_verification_token]([token_hash]);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[indexes]
        WHERE [name] = N'IX_email_verification_token_user_id_created_at'
          AND [object_id] = OBJECT_ID(N'dbo.email_verification_token')
    )
    BEGIN
        CREATE INDEX [IX_email_verification_token_user_id_created_at]
            ON [dbo].[email_verification_token]([user_id], [created_at]);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[indexes]
        WHERE [name] = N'IX_email_verification_token_expires_at'
          AND [object_id] = OBJECT_ID(N'dbo.email_verification_token')
    )
    BEGIN
        CREATE INDEX [IX_email_verification_token_expires_at]
            ON [dbo].[email_verification_token]([expires_at]);
    END;
END;",
                @"
IF OBJECT_ID(N'dbo.sticky_note', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[sticky_note]
    (
        [sticky_note_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [content] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_sticky_note_content] DEFAULT N'',
        [color] NVARCHAR(32) NOT NULL CONSTRAINT [DF_sticky_note_color] DEFAULT N'yellow',
        [is_pinned] BIT NOT NULL CONSTRAINT [DF_sticky_note_is_pinned] DEFAULT ((0)),
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_sticky_note_created_at] DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_sticky_note_updated_at] DEFAULT GETDATE(),
        CONSTRAINT [PK_sticky_note] PRIMARY KEY ([sticky_note_id]),
        CONSTRAINT [FK_sticky_note_users_user_id]
            FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id])
            ON DELETE CASCADE
    );
END;",
                @"
IF OBJECT_ID(N'dbo.sticky_note', N'U') IS NOT NULL
   AND NOT EXISTS
   (
       SELECT 1
       FROM [sys].[indexes]
       WHERE [name] = N'IX_sticky_note_user_id_is_pinned_updated_at'
         AND [object_id] = OBJECT_ID(N'dbo.sticky_note')
   )
BEGIN
    CREATE INDEX [IX_sticky_note_user_id_is_pinned_updated_at]
        ON [dbo].[sticky_note]([user_id], [is_pinned], [updated_at]);
END;",
                @"
IF OBJECT_ID(N'dbo.learning_log', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[learning_log]
    (
        [log_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [date] DATETIME NOT NULL,
        [activity_type] NVARCHAR(100) NOT NULL,
        [score] INT NULL,
        CONSTRAINT [PK_learning_log] PRIMARY KEY ([log_id])
    );
END;",
                @"
IF COL_LENGTH('dbo.learning_log', 'session_id') IS NULL
BEGIN
    ALTER TABLE [dbo].[learning_log] ADD [session_id] BIGINT NOT NULL CONSTRAINT [DF_learning_log_session_id] DEFAULT ((0));
END;",
                @"
IF COL_LENGTH('dbo.learning_log', 'words_studied') IS NULL
BEGIN
    ALTER TABLE [dbo].[learning_log] ADD [words_studied] INT NOT NULL CONSTRAINT [DF_learning_log_words_studied] DEFAULT ((0));
END;",
                @"
IF EXISTS (
    SELECT 1
    FROM [sys].[columns] c
    JOIN [sys].[types] t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.learning_log')
      AND c.name = N'score'
      AND t.name <> N'real'
)
BEGIN
    UPDATE [dbo].[learning_log]
    SET [score] = 0
    WHERE [score] IS NULL;

    ALTER TABLE [dbo].[learning_log] ALTER COLUMN [score] REAL NOT NULL;
END;",
                $@"
IF OBJECT_ID(N'dbo.learning_log', N'U') IS NOT NULL
BEGIN
    DECLARE @learningConstraintName SYSNAME;

    SELECT TOP (1) @learningConstraintName = [name]
    FROM [sys].[check_constraints]
    WHERE [parent_object_id] = OBJECT_ID(N'dbo.learning_log')
      AND CHARINDEX(N'activity_type', [definition]) > 0;

    IF @learningConstraintName IS NOT NULL
    BEGIN
        DECLARE @dropLearningConstraintSql NVARCHAR(MAX) =
            N'ALTER TABLE [dbo].[learning_log] DROP CONSTRAINT ' + QUOTENAME(@learningConstraintName);
        EXEC sp_executesql @dropLearningConstraintSql;
    END;

    ALTER TABLE [dbo].[learning_log] WITH NOCHECK
    ADD CONSTRAINT [CK_learning_log_activity_type]
    CHECK ([activity_type] IN ({learningActivityTypeInListSql}));
END;",
                @"
IF OBJECT_ID(N'dbo.exercise_result', N'U') IS NOT NULL
   AND COL_LENGTH('dbo.exercise_result', 'quality') IS NULL
BEGIN
    ALTER TABLE [dbo].[exercise_result]
    ADD [quality] INT NOT NULL
        CONSTRAINT [DF_exercise_result_quality] DEFAULT ((0));
END;",
                @"
IF OBJECT_ID(N'dbo.progress', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.user_vocabulary', N'U') IS NOT NULL
BEGIN
    DECLARE @progressUserVocabularyFk SYSNAME;
    DECLARE @progressUserVocabularyDeleteAction INT;

    SELECT TOP (1)
        @progressUserVocabularyFk = fk.[name],
        @progressUserVocabularyDeleteAction = fk.[delete_referential_action]
    FROM [sys].[foreign_keys] fk
    WHERE fk.[parent_object_id] = OBJECT_ID(N'dbo.progress')
      AND fk.[referenced_object_id] = OBJECT_ID(N'dbo.user_vocabulary');

    IF @progressUserVocabularyFk IS NOT NULL
       AND @progressUserVocabularyDeleteAction <> 1
    BEGIN
        DECLARE @dropProgressUserVocabularyFkSql NVARCHAR(MAX) =
            N'ALTER TABLE [dbo].[progress] DROP CONSTRAINT ' + QUOTENAME(@progressUserVocabularyFk);
        EXEC sp_executesql @dropProgressUserVocabularyFkSql;
        SET @progressUserVocabularyFk = NULL;
    END;

    IF @progressUserVocabularyFk IS NULL
    BEGIN
        ALTER TABLE [dbo].[progress] WITH CHECK
        ADD CONSTRAINT [FK_progress_user_vocabulary_user_id_vocab_id]
        FOREIGN KEY ([user_id], [vocab_id])
        REFERENCES [dbo].[user_vocabulary]([user_id], [vocab_id])
        ON DELETE CASCADE;
    END;
END;",
                $@"
IF OBJECT_ID(N'dbo.exercise', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.topic', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.exercise', 'match_mode') IS NULL
    BEGIN
        ALTER TABLE [dbo].[exercise] ADD [match_mode] NVARCHAR(50) NULL;
    END;

    IF COL_LENGTH('dbo.exercise', 'is_mini_test') IS NULL
    BEGIN
        ALTER TABLE [dbo].[exercise] ADD [is_mini_test] BIT NOT NULL CONSTRAINT [DF_exercise_is_mini_test] DEFAULT ((0));
    END;

    IF COL_LENGTH('dbo.exercise', 'topic_id') IS NULL
    BEGIN
        ALTER TABLE [dbo].[exercise] ADD [topic_id] BIGINT NULL;
    END;

    DECLARE @constraintName SYSNAME;

    SELECT TOP (1) @constraintName = [name]
    FROM [sys].[check_constraints]
    WHERE [parent_object_id] = OBJECT_ID(N'dbo.exercise')
      AND CHARINDEX(N'exercise_type', [definition]) > 0;

    IF @constraintName IS NOT NULL
    BEGIN
        DECLARE @dropSql NVARCHAR(MAX) =
            N'ALTER TABLE [dbo].[exercise] DROP CONSTRAINT ' + QUOTENAME(@constraintName);
        EXEC sp_executesql @dropSql;
    END;

    ALTER TABLE [dbo].[exercise] WITH NOCHECK
    ADD CONSTRAINT [CK_exercise_exercise_type]
    CHECK ([exercise_type] IN ({exerciseTypeInListSql}));

    SELECT TOP (1) @constraintName = [name]
    FROM [sys].[check_constraints]
    WHERE [parent_object_id] = OBJECT_ID(N'dbo.exercise')
      AND CHARINDEX(N'match_mode', [definition]) > 0;

    IF @constraintName IS NOT NULL
    BEGIN
        DECLARE @dropMatchModeConstraintSql NVARCHAR(MAX) =
            N'ALTER TABLE [dbo].[exercise] DROP CONSTRAINT ' + QUOTENAME(@constraintName);
        EXEC sp_executesql @dropMatchModeConstraintSql;
    END;

    ALTER TABLE [dbo].[exercise] WITH NOCHECK
    ADD CONSTRAINT [CK_exercise_match_mode]
    CHECK (
        [match_mode] IS NULL
        OR [match_mode] IN ({matchModeInListSql})
    );

    IF NOT EXISTS
    (
        SELECT 1
        FROM [sys].[foreign_keys]
        WHERE [name] = N'FK_exercise_topic'
          AND [parent_object_id] = OBJECT_ID(N'dbo.exercise')
    )
    BEGIN
        ALTER TABLE [dbo].[exercise] WITH NOCHECK
        ADD CONSTRAINT [FK_exercise_topic]
        FOREIGN KEY ([topic_id]) REFERENCES [dbo].[topic]([topic_id])
        ON DELETE SET NULL;
    END;
END;"
            };

            for (var i = 0; i < commands.Length; i++)
            {
                var command = commands[i];

                try
                {
                    await dbContext.Database.ExecuteSqlRawAsync(command);
                }
                catch (Exception ex)
                {
                    var previewLine = command
                        .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .FirstOrDefault() ?? "Unknown SQL command";
                    var rootCause = ex;
                    while (rootCause.InnerException is not null)
                    {
                        rootCause = rootCause.InnerException;
                    }

                    throw new InvalidOperationException(
                        $"Custom auth schema initialization failed at command #{i + 1}: {previewLine}. Root cause: {rootCause.Message}",
                        ex);
                }
            }
        }
        private static string BuildSqlInList(IEnumerable<string> values)
        {
            return string.Join(", ", values.Select(value => $"N'{EscapeSqlLiteral(value)}'"));
        }

        private static string EscapeSqlLiteral(string value)
        {
            return value.Replace("'", "''");
        }
    }
}
