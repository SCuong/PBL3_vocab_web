using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'dbo.users', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[users] (
        [user_id] BIGINT IDENTITY(1,1) NOT NULL,
        [username] NVARCHAR(50) NOT NULL,
        [email] NVARCHAR(100) NOT NULL,
        [password_hash] NVARCHAR(255) NOT NULL,
        [google_subject] NVARCHAR(200) NULL,
        [role] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_role] DEFAULT N'LEARNER',
        [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_status] DEFAULT N'ACTIVE',
        [is_email_verified] BIT NOT NULL CONSTRAINT [DF_users_is_email_verified] DEFAULT ((1)),
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_users_created_at] DEFAULT GETDATE(),
        [is_deleted] BIT NOT NULL CONSTRAINT [DF_users_is_deleted] DEFAULT ((0)),
        [deleted_at] DATETIME2 NULL,
        CONSTRAINT [PK_users] PRIMARY KEY ([user_id])
    );
END;

IF OBJECT_ID(N'dbo.topic', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[topic] (
        [topic_id] BIGINT IDENTITY(1,1) NOT NULL,
        [name] NVARCHAR(MAX) NOT NULL,
        [description] NVARCHAR(MAX) NOT NULL,
        [parent_topic_id] BIGINT NULL,
        CONSTRAINT [PK_topic] PRIMARY KEY ([topic_id])
    );
END;

IF OBJECT_ID(N'dbo.vocabulary', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[vocabulary] (
        [vocab_id] BIGINT IDENTITY(1,1) NOT NULL,
        [word] NVARCHAR(MAX) NULL,
        [ipa] NVARCHAR(MAX) NULL,
        [audio_url] NVARCHAR(MAX) NULL,
        [level] NVARCHAR(MAX) NULL,
        [meaning_vi] NVARCHAR(MAX) NULL,
        [topic_id] BIGINT NULL,
        CONSTRAINT [PK_vocabulary] PRIMARY KEY ([vocab_id])
    );
END;

IF OBJECT_ID(N'dbo.exercise', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[exercise] (
        [exercise_id] BIGINT IDENTITY(1,1) NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [exercise_type] NVARCHAR(450) NOT NULL,
        [match_mode] NVARCHAR(450) NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_exercise_created_at] DEFAULT GETDATE(),
        CONSTRAINT [PK_exercise] PRIMARY KEY ([exercise_id])
    );
END;

IF OBJECT_ID(N'dbo.password_reset_token', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[password_reset_token] (
        [password_reset_token_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [token_hash] NVARCHAR(255) NOT NULL,
        [expires_at] DATETIME2 NOT NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_password_reset_token_created_at] DEFAULT GETDATE(),
        [used_at] DATETIME2 NULL,
        [consumed_by_ip] NVARCHAR(64) NULL,
        CONSTRAINT [PK_password_reset_token] PRIMARY KEY ([password_reset_token_id])
    );
END;

IF OBJECT_ID(N'dbo.email_verification_token', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[email_verification_token] (
        [email_verification_token_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [token_hash] NVARCHAR(255) NOT NULL,
        [expires_at] DATETIME2 NOT NULL,
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_email_verification_token_created_at] DEFAULT GETDATE(),
        [used_at] DATETIME2 NULL,
        [consumed_by_ip] NVARCHAR(64) NULL,
        CONSTRAINT [PK_email_verification_token] PRIMARY KEY ([email_verification_token_id])
    );
END;

IF OBJECT_ID(N'dbo.sticky_note', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[sticky_note] (
        [sticky_note_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [content] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_sticky_note_content] DEFAULT N'',
        [color] NVARCHAR(32) NOT NULL CONSTRAINT [DF_sticky_note_color] DEFAULT N'yellow',
        [is_pinned] BIT NOT NULL CONSTRAINT [DF_sticky_note_is_pinned] DEFAULT ((0)),
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_sticky_note_created_at] DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_sticky_note_updated_at] DEFAULT GETDATE(),
        CONSTRAINT [PK_sticky_note] PRIMARY KEY ([sticky_note_id])
    );
END;

IF OBJECT_ID(N'dbo.user_vocabulary', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[user_vocabulary] (
        [user_id] BIGINT NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [status] NVARCHAR(MAX) NOT NULL,
        [note] NVARCHAR(MAX) NOT NULL,
        [first_learned_date] DATETIME2 NULL,
        CONSTRAINT [PK_user_vocabulary] PRIMARY KEY ([user_id], [vocab_id])
    );
END;

IF OBJECT_ID(N'dbo.example', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[example] (
        [example_id] BIGINT IDENTITY(1,1) NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [sentence] NVARCHAR(MAX) NOT NULL,
        [translation] NVARCHAR(MAX) NOT NULL,
        [audio_url] NVARCHAR(MAX) NULL,
        CONSTRAINT [PK_example] PRIMARY KEY ([example_id])
    );
END;

IF OBJECT_ID(N'dbo.meaning', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[meaning] (
        [meaning_id] BIGINT IDENTITY(1,1) NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [meaning_en] NVARCHAR(MAX) NOT NULL,
        [meaning_vi] NVARCHAR(MAX) NOT NULL,
        [type] NVARCHAR(MAX) NOT NULL,
        CONSTRAINT [PK_meaning] PRIMARY KEY ([meaning_id])
    );
END;

IF OBJECT_ID(N'dbo.exercise_session', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[exercise_session] (
        [session_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [topic_id] BIGINT NOT NULL,
        [session_type] NVARCHAR(MAX) NOT NULL,
        [started_at] DATETIME2 NOT NULL,
        [finished_at] DATETIME2 NULL,
        [total_questions] INT NOT NULL,
        [correct_count] INT NOT NULL,
        [score] REAL NOT NULL,
        CONSTRAINT [PK_exercise_session] PRIMARY KEY ([session_id])
    );
END;

IF OBJECT_ID(N'dbo.exercise_result', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[exercise_result] (
        [result_id] BIGINT IDENTITY(1,1) NOT NULL,
        [session_id] BIGINT NOT NULL,
        [exercise_id] BIGINT NOT NULL,
        [user_id] BIGINT NOT NULL,
        [is_correct] BIT NOT NULL,
        [quality] INT NOT NULL CONSTRAINT [DF_exercise_result_quality] DEFAULT ((0)),
        [answered_at] DATETIME2 NOT NULL CONSTRAINT [DF_exercise_result_answered_at] DEFAULT GETDATE(),
        CONSTRAINT [PK_exercise_result] PRIMARY KEY ([result_id])
    );
END;

IF OBJECT_ID(N'dbo.learning_log', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[learning_log] (
        [log_id] BIGINT IDENTITY(1,1) NOT NULL,
        [user_id] BIGINT NOT NULL,
        [session_id] BIGINT NOT NULL CONSTRAINT [DF_learning_log_session_id] DEFAULT ((0)),
        [date] DATETIME2 NOT NULL,
        [activity_type] NVARCHAR(MAX) NOT NULL,
        [words_studied] INT NOT NULL CONSTRAINT [DF_learning_log_words_studied] DEFAULT ((0)),
        [score] REAL NOT NULL CONSTRAINT [DF_learning_log_score] DEFAULT ((0)),
        CONSTRAINT [PK_learning_log] PRIMARY KEY ([log_id])
    );
END;

IF OBJECT_ID(N'dbo.progress', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[progress] (
        [user_id] BIGINT NOT NULL,
        [vocab_id] BIGINT NOT NULL,
        [ease_factor] FLOAT NOT NULL CONSTRAINT [DF_progress_ease_factor] DEFAULT ((2.5)),
        [interval_days] INT NOT NULL CONSTRAINT [DF_progress_interval_days] DEFAULT ((1)),
        [repetitions] INT NOT NULL CONSTRAINT [DF_progress_repetitions] DEFAULT ((0)),
        [last_review_date] DATETIME2 NULL,
        [next_review_date] DATETIME2 NULL,
        CONSTRAINT [PK_progress] PRIMARY KEY ([user_id], [vocab_id])
    );
END;");

            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.users', 'username') IS NULL ALTER TABLE [dbo].[users] ADD [username] NVARCHAR(50) NULL;
IF COL_LENGTH('dbo.users', 'email') IS NULL ALTER TABLE [dbo].[users] ADD [email] NVARCHAR(100) NOT NULL CONSTRAINT [DF_users_email_repair] DEFAULT N'';
IF COL_LENGTH('dbo.users', 'password_hash') IS NULL ALTER TABLE [dbo].[users] ADD [password_hash] NVARCHAR(255) NOT NULL CONSTRAINT [DF_users_password_hash_repair] DEFAULT N'';
IF COL_LENGTH('dbo.users', 'google_subject') IS NULL ALTER TABLE [dbo].[users] ADD [google_subject] NVARCHAR(200) NULL;
IF COL_LENGTH('dbo.users', 'role') IS NULL ALTER TABLE [dbo].[users] ADD [role] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_role_repair] DEFAULT N'LEARNER';
IF COL_LENGTH('dbo.users', 'status') IS NULL ALTER TABLE [dbo].[users] ADD [status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_users_status_repair] DEFAULT N'ACTIVE';
IF COL_LENGTH('dbo.users', 'is_email_verified') IS NULL ALTER TABLE [dbo].[users] ADD [is_email_verified] BIT NOT NULL CONSTRAINT [DF_users_is_email_verified_repair] DEFAULT ((1));
IF COL_LENGTH('dbo.users', 'created_at') IS NULL ALTER TABLE [dbo].[users] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_users_created_at_repair] DEFAULT GETDATE();
IF COL_LENGTH('dbo.users', 'is_deleted') IS NULL ALTER TABLE [dbo].[users] ADD [is_deleted] BIT NOT NULL CONSTRAINT [DF_users_is_deleted_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.users', 'deleted_at') IS NULL ALTER TABLE [dbo].[users] ADD [deleted_at] DATETIME2 NULL;

UPDATE [dbo].[users]
SET [username] = LEFT(LTRIM(RTRIM(COALESCE(NULLIF([email], N''), CONCAT(N'user_', [user_id])))), 50)
WHERE [username] IS NULL OR NULLIF(LTRIM(RTRIM([username])), N'') IS NULL;

IF COL_LENGTH('dbo.topic', 'name') IS NULL ALTER TABLE [dbo].[topic] ADD [name] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_topic_name_repair] DEFAULT N'';
IF COL_LENGTH('dbo.topic', 'description') IS NULL ALTER TABLE [dbo].[topic] ADD [description] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_topic_description_repair] DEFAULT N'';
IF COL_LENGTH('dbo.topic', 'parent_topic_id') IS NULL ALTER TABLE [dbo].[topic] ADD [parent_topic_id] BIGINT NULL;

IF COL_LENGTH('dbo.vocabulary', 'word') IS NULL ALTER TABLE [dbo].[vocabulary] ADD [word] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.vocabulary', 'ipa') IS NULL ALTER TABLE [dbo].[vocabulary] ADD [ipa] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.vocabulary', 'audio_url') IS NULL ALTER TABLE [dbo].[vocabulary] ADD [audio_url] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.vocabulary', 'level') IS NULL ALTER TABLE [dbo].[vocabulary] ADD [level] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.vocabulary', 'meaning_vi') IS NULL ALTER TABLE [dbo].[vocabulary] ADD [meaning_vi] NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.vocabulary', 'topic_id') IS NULL ALTER TABLE [dbo].[vocabulary] ADD [topic_id] BIGINT NULL;

IF COL_LENGTH('dbo.exercise', 'vocab_id') IS NULL ALTER TABLE [dbo].[exercise] ADD [vocab_id] BIGINT NOT NULL CONSTRAINT [DF_exercise_vocab_id_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.exercise', 'exercise_type') IS NULL ALTER TABLE [dbo].[exercise] ADD [exercise_type] NVARCHAR(450) NOT NULL CONSTRAINT [DF_exercise_type_repair] DEFAULT N'';
IF COL_LENGTH('dbo.exercise', 'match_mode') IS NULL ALTER TABLE [dbo].[exercise] ADD [match_mode] NVARCHAR(450) NULL;
IF COL_LENGTH('dbo.exercise', 'created_at') IS NULL ALTER TABLE [dbo].[exercise] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_exercise_created_at_repair] DEFAULT GETDATE();

IF COL_LENGTH('dbo.password_reset_token', 'consumed_by_ip') IS NULL ALTER TABLE [dbo].[password_reset_token] ADD [consumed_by_ip] NVARCHAR(64) NULL;
IF COL_LENGTH('dbo.email_verification_token', 'consumed_by_ip') IS NULL ALTER TABLE [dbo].[email_verification_token] ADD [consumed_by_ip] NVARCHAR(64) NULL;

IF COL_LENGTH('dbo.sticky_note', 'content') IS NULL ALTER TABLE [dbo].[sticky_note] ADD [content] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_sticky_note_content_repair] DEFAULT N'';
IF COL_LENGTH('dbo.sticky_note', 'color') IS NULL ALTER TABLE [dbo].[sticky_note] ADD [color] NVARCHAR(32) NOT NULL CONSTRAINT [DF_sticky_note_color_repair] DEFAULT N'yellow';
IF COL_LENGTH('dbo.sticky_note', 'is_pinned') IS NULL ALTER TABLE [dbo].[sticky_note] ADD [is_pinned] BIT NOT NULL CONSTRAINT [DF_sticky_note_is_pinned_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.sticky_note', 'created_at') IS NULL ALTER TABLE [dbo].[sticky_note] ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_sticky_note_created_at_repair] DEFAULT GETDATE();
IF COL_LENGTH('dbo.sticky_note', 'updated_at') IS NULL ALTER TABLE [dbo].[sticky_note] ADD [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_sticky_note_updated_at_repair] DEFAULT GETDATE();

IF COL_LENGTH('dbo.user_vocabulary', 'status') IS NULL ALTER TABLE [dbo].[user_vocabulary] ADD [status] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_user_vocabulary_status_repair] DEFAULT N'';
IF COL_LENGTH('dbo.user_vocabulary', 'note') IS NULL ALTER TABLE [dbo].[user_vocabulary] ADD [note] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_user_vocabulary_note_repair] DEFAULT N'';
IF COL_LENGTH('dbo.user_vocabulary', 'first_learned_date') IS NULL ALTER TABLE [dbo].[user_vocabulary] ADD [first_learned_date] DATETIME2 NULL;

IF COL_LENGTH('dbo.example', 'sentence') IS NULL ALTER TABLE [dbo].[example] ADD [sentence] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_example_sentence_repair] DEFAULT N'';
IF COL_LENGTH('dbo.example', 'translation') IS NULL ALTER TABLE [dbo].[example] ADD [translation] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_example_translation_repair] DEFAULT N'';
IF COL_LENGTH('dbo.example', 'audio_url') IS NULL ALTER TABLE [dbo].[example] ADD [audio_url] NVARCHAR(MAX) NULL;

IF COL_LENGTH('dbo.meaning', 'meaning_en') IS NULL ALTER TABLE [dbo].[meaning] ADD [meaning_en] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_meaning_en_repair] DEFAULT N'';
IF COL_LENGTH('dbo.meaning', 'meaning_vi') IS NULL ALTER TABLE [dbo].[meaning] ADD [meaning_vi] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_meaning_vi_repair] DEFAULT N'';
IF COL_LENGTH('dbo.meaning', 'type') IS NULL ALTER TABLE [dbo].[meaning] ADD [type] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_meaning_type_repair] DEFAULT N'';

IF COL_LENGTH('dbo.exercise_result', 'quality') IS NULL ALTER TABLE [dbo].[exercise_result] ADD [quality] INT NOT NULL CONSTRAINT [DF_exercise_result_quality_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.exercise_result', 'answered_at') IS NULL ALTER TABLE [dbo].[exercise_result] ADD [answered_at] DATETIME2 NOT NULL CONSTRAINT [DF_exercise_result_answered_at_repair] DEFAULT GETDATE();

IF COL_LENGTH('dbo.learning_log', 'session_id') IS NULL ALTER TABLE [dbo].[learning_log] ADD [session_id] BIGINT NOT NULL CONSTRAINT [DF_learning_log_session_id_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.learning_log', 'words_studied') IS NULL ALTER TABLE [dbo].[learning_log] ADD [words_studied] INT NOT NULL CONSTRAINT [DF_learning_log_words_studied_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.learning_log', 'score') IS NULL ALTER TABLE [dbo].[learning_log] ADD [score] REAL NOT NULL CONSTRAINT [DF_learning_log_score_repair] DEFAULT ((0));

IF COL_LENGTH('dbo.progress', 'ease_factor') IS NULL ALTER TABLE [dbo].[progress] ADD [ease_factor] FLOAT NOT NULL CONSTRAINT [DF_progress_ease_factor_repair] DEFAULT ((2.5));
IF COL_LENGTH('dbo.progress', 'interval_days') IS NULL ALTER TABLE [dbo].[progress] ADD [interval_days] INT NOT NULL CONSTRAINT [DF_progress_interval_days_repair] DEFAULT ((1));
IF COL_LENGTH('dbo.progress', 'repetitions') IS NULL ALTER TABLE [dbo].[progress] ADD [repetitions] INT NOT NULL CONSTRAINT [DF_progress_repetitions_repair] DEFAULT ((0));
IF COL_LENGTH('dbo.progress', 'last_review_date') IS NULL ALTER TABLE [dbo].[progress] ADD [last_review_date] DATETIME2 NULL;
IF COL_LENGTH('dbo.progress', 'next_review_date') IS NULL ALTER TABLE [dbo].[progress] ADD [next_review_date] DATETIME2 NULL;");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_username' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE UNIQUE INDEX [IX_users_username] ON [dbo].[users]([username]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_email' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE UNIQUE INDEX [IX_users_email] ON [dbo].[users]([email]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_users_google_subject' AND object_id = OBJECT_ID(N'dbo.users'))
    CREATE UNIQUE INDEX [IX_users_google_subject] ON [dbo].[users]([google_subject]) WHERE [google_subject] IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_vocabulary_topic_id' AND object_id = OBJECT_ID(N'dbo.vocabulary'))
    CREATE INDEX [IX_vocabulary_topic_id] ON [dbo].[vocabulary]([topic_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_vocab_id_exercise_type_match_mode' AND object_id = OBJECT_ID(N'dbo.exercise'))
    CREATE UNIQUE INDEX [IX_exercise_vocab_id_exercise_type_match_mode] ON [dbo].[exercise]([vocab_id], [exercise_type], [match_mode]) WHERE [match_mode] IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_password_reset_token_token_hash' AND object_id = OBJECT_ID(N'dbo.password_reset_token'))
    CREATE INDEX [IX_password_reset_token_token_hash] ON [dbo].[password_reset_token]([token_hash]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_password_reset_token_user_id_created_at' AND object_id = OBJECT_ID(N'dbo.password_reset_token'))
    CREATE INDEX [IX_password_reset_token_user_id_created_at] ON [dbo].[password_reset_token]([user_id], [created_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_password_reset_token_expires_at' AND object_id = OBJECT_ID(N'dbo.password_reset_token'))
    CREATE INDEX [IX_password_reset_token_expires_at] ON [dbo].[password_reset_token]([expires_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_email_verification_token_token_hash' AND object_id = OBJECT_ID(N'dbo.email_verification_token'))
    CREATE UNIQUE INDEX [IX_email_verification_token_token_hash] ON [dbo].[email_verification_token]([token_hash]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_email_verification_token_user_id_created_at' AND object_id = OBJECT_ID(N'dbo.email_verification_token'))
    CREATE INDEX [IX_email_verification_token_user_id_created_at] ON [dbo].[email_verification_token]([user_id], [created_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_email_verification_token_expires_at' AND object_id = OBJECT_ID(N'dbo.email_verification_token'))
    CREATE INDEX [IX_email_verification_token_expires_at] ON [dbo].[email_verification_token]([expires_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_sticky_note_user_id_is_pinned_updated_at' AND object_id = OBJECT_ID(N'dbo.sticky_note'))
    CREATE INDEX [IX_sticky_note_user_id_is_pinned_updated_at] ON [dbo].[sticky_note]([user_id], [is_pinned], [updated_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_example_vocab_id' AND object_id = OBJECT_ID(N'dbo.example'))
    CREATE INDEX [IX_example_vocab_id] ON [dbo].[example]([vocab_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_meaning_vocab_id' AND object_id = OBJECT_ID(N'dbo.meaning'))
    CREATE INDEX [IX_meaning_vocab_id] ON [dbo].[meaning]([vocab_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_session_topic_id' AND object_id = OBJECT_ID(N'dbo.exercise_session'))
    CREATE INDEX [IX_exercise_session_topic_id] ON [dbo].[exercise_session]([topic_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_session_user_id_started_at' AND object_id = OBJECT_ID(N'dbo.exercise_session'))
    CREATE INDEX [IX_exercise_session_user_id_started_at] ON [dbo].[exercise_session]([user_id], [started_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_result_session_id_exercise_id' AND object_id = OBJECT_ID(N'dbo.exercise_result'))
    CREATE INDEX [IX_exercise_result_session_id_exercise_id] ON [dbo].[exercise_result]([session_id], [exercise_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_exercise_result_user_id_answered_at' AND object_id = OBJECT_ID(N'dbo.exercise_result'))
    CREATE INDEX [IX_exercise_result_user_id_answered_at] ON [dbo].[exercise_result]([user_id], [answered_at]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_learning_log_session_id' AND object_id = OBJECT_ID(N'dbo.learning_log'))
    CREATE UNIQUE INDEX [IX_learning_log_session_id] ON [dbo].[learning_log]([session_id]) WHERE [session_id] <> 0;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_learning_log_user_id_date' AND object_id = OBJECT_ID(N'dbo.learning_log'))
    CREATE INDEX [IX_learning_log_user_id_date] ON [dbo].[learning_log]([user_id], [date]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_progress_user_id_next_review_date' AND object_id = OBJECT_ID(N'dbo.progress'))
    CREATE INDEX [IX_progress_user_id_next_review_date] ON [dbo].[progress]([user_id], [next_review_date]);");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_vocabulary_topic_topic_id')
    ALTER TABLE [dbo].[vocabulary] WITH NOCHECK ADD CONSTRAINT [FK_vocabulary_topic_topic_id] FOREIGN KEY ([topic_id]) REFERENCES [dbo].[topic]([topic_id]) ON DELETE SET NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_password_reset_token_users_user_id')
    ALTER TABLE [dbo].[password_reset_token] WITH NOCHECK ADD CONSTRAINT [FK_password_reset_token_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_email_verification_token_users_user_id')
    ALTER TABLE [dbo].[email_verification_token] WITH NOCHECK ADD CONSTRAINT [FK_email_verification_token_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_sticky_note_users_user_id')
    ALTER TABLE [dbo].[sticky_note] WITH NOCHECK ADD CONSTRAINT [FK_sticky_note_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_user_vocabulary_users_user_id')
    ALTER TABLE [dbo].[user_vocabulary] WITH NOCHECK ADD CONSTRAINT [FK_user_vocabulary_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_example_vocabulary_vocab_id')
    ALTER TABLE [dbo].[example] WITH NOCHECK ADD CONSTRAINT [FK_example_vocabulary_vocab_id] FOREIGN KEY ([vocab_id]) REFERENCES [dbo].[vocabulary]([vocab_id]) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_meaning_vocabulary_vocab_id')
    ALTER TABLE [dbo].[meaning] WITH NOCHECK ADD CONSTRAINT [FK_meaning_vocabulary_vocab_id] FOREIGN KEY ([vocab_id]) REFERENCES [dbo].[vocabulary]([vocab_id]) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_session_topic_topic_id')
    ALTER TABLE [dbo].[exercise_session] WITH NOCHECK ADD CONSTRAINT [FK_exercise_session_topic_topic_id] FOREIGN KEY ([topic_id]) REFERENCES [dbo].[topic]([topic_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_session_users_user_id')
    ALTER TABLE [dbo].[exercise_session] WITH NOCHECK ADD CONSTRAINT [FK_exercise_session_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_result_exercise_session_session_id')
    ALTER TABLE [dbo].[exercise_result] WITH NOCHECK ADD CONSTRAINT [FK_exercise_result_exercise_session_session_id] FOREIGN KEY ([session_id]) REFERENCES [dbo].[exercise_session]([session_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_exercise_result_users_user_id')
    ALTER TABLE [dbo].[exercise_result] WITH NOCHECK ADD CONSTRAINT [FK_exercise_result_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_learning_log_exercise_session_session_id')
    ALTER TABLE [dbo].[learning_log] WITH NOCHECK ADD CONSTRAINT [FK_learning_log_exercise_session_session_id] FOREIGN KEY ([session_id]) REFERENCES [dbo].[exercise_session]([session_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_progress_users_user_id')
    ALTER TABLE [dbo].[progress] WITH NOCHECK ADD CONSTRAINT [FK_progress_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_progress_user_vocabulary_user_id_vocab_id')
    ALTER TABLE [dbo].[progress] WITH NOCHECK ADD CONSTRAINT [FK_progress_user_vocabulary_user_id_vocab_id] FOREIGN KEY ([user_id], [vocab_id]) REFERENCES [dbo].[user_vocabulary]([user_id], [vocab_id]) ON DELETE CASCADE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally no-op: this baseline repairs production schema without dropping existing data.
        }
    }
}
