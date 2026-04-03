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
        [created_at] DATETIME NOT NULL CONSTRAINT [DF_users_created_at] DEFAULT GETDATE(),
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
END;"
            };

            foreach (var command in commands)
            {
                await dbContext.Database.ExecuteSqlRawAsync(command);
            }
        }
    }
}
