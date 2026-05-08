using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('users', 'google_subject') IS NULL
    ALTER TABLE [users] ADD [google_subject] nvarchar(200) NULL;

IF COL_LENGTH('users', 'updated_at') IS NULL
    ALTER TABLE [users] ADD [updated_at] datetime NULL;

IF COL_LENGTH('users', 'is_deleted') IS NULL
    ALTER TABLE [users] ADD [is_deleted] bit NOT NULL DEFAULT 0;

IF COL_LENGTH('users', 'deleted_at') IS NULL
    ALTER TABLE [users] ADD [deleted_at] datetime NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_users_google_subject'
    AND object_id = OBJECT_ID(N'[users]'))
    CREATE UNIQUE INDEX [IX_users_google_subject]
    ON [users] ([google_subject])
    WHERE [google_subject] IS NOT NULL;

IF COL_LENGTH('vocabulary', 'updated_at') IS NULL
    ALTER TABLE [vocabulary] ADD [updated_at] datetime NULL;

IF COL_LENGTH('user_vocabulary', 'updated_at') IS NULL
    ALTER TABLE [user_vocabulary] ADD [updated_at] datetime NULL;

IF OBJECT_ID(N'[password_reset_token]', N'U') IS NULL
BEGIN
    CREATE TABLE [password_reset_token] (
        [password_reset_token_id] bigint NOT NULL IDENTITY,
        [user_id] bigint NOT NULL,
        [token_hash] nvarchar(255) NOT NULL,
        [expires_at] datetime2 NOT NULL,
        [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
        [used_at] datetime2 NULL,
        [consumed_by_ip] nvarchar(64) NULL,
        CONSTRAINT [PK_password_reset_token] PRIMARY KEY ([password_reset_token_id]),
        CONSTRAINT [FK_password_reset_token_users_user_id]
            FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_password_reset_token_token_hash]
        ON [password_reset_token] ([token_hash]);

    CREATE INDEX [IX_password_reset_token_user_id_created_at]
        ON [password_reset_token] ([user_id], [created_at]);

    CREATE INDEX [IX_password_reset_token_expires_at]
        ON [password_reset_token] ([expires_at]);
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[password_reset_token]', N'U') IS NOT NULL
    DROP TABLE [password_reset_token];

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_users_google_subject'
    AND object_id = OBJECT_ID(N'[users]'))
    DROP INDEX [IX_users_google_subject] ON [users];

IF COL_LENGTH('users', 'deleted_at') IS NOT NULL
    ALTER TABLE [users] DROP COLUMN [deleted_at];

IF COL_LENGTH('users', 'is_deleted') IS NOT NULL
BEGIN
    DECLARE @dfn nvarchar(128);
    SELECT @dfn = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[users]')
      AND c.name = 'is_deleted';
    IF @dfn IS NOT NULL
        EXEC('ALTER TABLE [users] DROP CONSTRAINT [' + @dfn + ']');
    ALTER TABLE [users] DROP COLUMN [is_deleted];
END

IF COL_LENGTH('users', 'updated_at') IS NOT NULL
    ALTER TABLE [users] DROP COLUMN [updated_at];

IF COL_LENGTH('users', 'google_subject') IS NOT NULL
    ALTER TABLE [users] DROP COLUMN [google_subject];

IF COL_LENGTH('vocabulary', 'updated_at') IS NOT NULL
    ALTER TABLE [vocabulary] DROP COLUMN [updated_at];

IF COL_LENGTH('user_vocabulary', 'updated_at') IS NOT NULL
    ALTER TABLE [user_vocabulary] DROP COLUMN [updated_at];");
        }
    }
}
