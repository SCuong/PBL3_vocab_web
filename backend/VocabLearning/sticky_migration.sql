BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    ALTER TABLE [users] DROP CONSTRAINT [CK_users_role];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    ALTER TABLE [users] DROP CONSTRAINT [CK_users_status];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[vocabulary]') AND [c].[name] = N'updated_at');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [vocabulary] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [vocabulary] DROP COLUMN [updated_at];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[users]') AND [c].[name] = N'updated_at');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [users] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [users] DROP COLUMN [updated_at];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[user_vocabulary]') AND [c].[name] = N'updated_at');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [user_vocabulary] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [user_vocabulary] DROP COLUMN [updated_at];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[progress]') AND [c].[name] = N'ease_factor');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [progress] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [progress] ALTER COLUMN [ease_factor] float NOT NULL;
    ALTER TABLE [progress] ADD DEFAULT 2.5E0 FOR [ease_factor];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    DROP INDEX [IX_exercise_result_user_id_answered_at] ON [exercise_result];
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[exercise_result]') AND [c].[name] = N'answered_at');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [exercise_result] DROP CONSTRAINT ' + @var4 + ';');
    EXEC(N'UPDATE [exercise_result] SET [answered_at] = ''0001-01-01T00:00:00.0000000'' WHERE [answered_at] IS NULL');
    ALTER TABLE [exercise_result] ALTER COLUMN [answered_at] datetime2 NOT NULL;
    ALTER TABLE [exercise_result] ADD DEFAULT '0001-01-01T00:00:00.0000000' FOR [answered_at];
    CREATE INDEX [IX_exercise_result_user_id_answered_at] ON [exercise_result] ([user_id], [answered_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    CREATE TABLE [sticky_note] (
        [sticky_note_id] bigint NOT NULL IDENTITY,
        [user_id] bigint NOT NULL,
        [content] nvarchar(1000) NOT NULL DEFAULT N'',
        [color] nvarchar(32) NOT NULL DEFAULT N'yellow',
        [is_pinned] bit NOT NULL DEFAULT CAST(0 AS bit),
        [created_at] datetime2 NOT NULL DEFAULT (GETDATE()),
        [updated_at] datetime2 NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT [PK_sticky_note] PRIMARY KEY ([sticky_note_id]),
        CONSTRAINT [FK_sticky_note_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    CREATE INDEX [IX_sticky_note_user_id_is_pinned_updated_at] ON [sticky_note] ([user_id], [is_pinned], [updated_at]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260512074617_AddStickyNotesTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260512074617_AddStickyNotesTable', N'10.0.5');
END;

COMMIT;
GO

