using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_ExerciseSession_SRS : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM [learning_log]");
            migrationBuilder.Sql("DELETE FROM [exercise_result]");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_vocab_id_type_is_mini_test' AND object_id = OBJECT_ID(N'[exercise]'))
    DROP INDEX [IX_exercise_vocab_id_type_is_mini_test] ON [exercise];
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_topic_id_is_mini_test_type' AND object_id = OBJECT_ID(N'[exercise]'))
    DROP INDEX [IX_exercise_topic_id_is_mini_test_type] ON [exercise];
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_vocab_type_minitest' AND object_id = OBJECT_ID(N'[exercise]'))
    DROP INDEX [IX_exercise_vocab_type_minitest] ON [exercise];
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_topic_minitest_type' AND object_id = OBJECT_ID(N'[exercise]'))
    DROP INDEX [IX_exercise_topic_minitest_type] ON [exercise];");

            migrationBuilder.Sql(@"
IF COL_LENGTH('exercise', 'is_mini_test') IS NOT NULL
BEGIN
    DECLARE @df1 nvarchar(128);
    SELECT @df1 = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID(N'[exercise]')
      AND c.name = 'is_mini_test';

    IF @df1 IS NOT NULL
        EXEC('ALTER TABLE [exercise] DROP CONSTRAINT [' + @df1 + ']');

    ALTER TABLE [exercise] DROP COLUMN [is_mini_test];
END");

            migrationBuilder.Sql(@"
IF COL_LENGTH('exercise', 'topic_id') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_exercise_topic_topic_id')
        ALTER TABLE [exercise] DROP CONSTRAINT [FK_exercise_topic_topic_id];
    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_exercise_topic')
        ALTER TABLE [exercise] DROP CONSTRAINT [FK_exercise_topic];

    ALTER TABLE [exercise] DROP COLUMN [topic_id];
END");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_vocab_id_exercise_type_match_mode' AND object_id = OBJECT_ID(N'[exercise]'))
    CREATE UNIQUE INDEX [IX_exercise_vocab_id_exercise_type_match_mode]
    ON [exercise] ([vocab_id], [exercise_type], [match_mode])
    WHERE [match_mode] IS NOT NULL;");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[exercise_session]', N'U') IS NULL
BEGIN
    CREATE TABLE [exercise_session] (
        [session_id] bigint NOT NULL IDENTITY,
        [user_id] bigint NOT NULL,
        [topic_id] bigint NOT NULL,
        [session_type] nvarchar(max) NOT NULL,
        [started_at] datetime2 NOT NULL,
        [finished_at] datetime2 NULL,
        [total_questions] int NOT NULL,
        [correct_count] int NOT NULL,
        [score] real NOT NULL,
        CONSTRAINT [PK_exercise_session] PRIMARY KEY ([session_id]),
        CONSTRAINT [FK_exercise_session_topic_topic_id] FOREIGN KEY ([topic_id]) REFERENCES [topic] ([topic_id]),
        CONSTRAINT [FK_exercise_session_users_user_id] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id])
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_session_topic_id' AND object_id = OBJECT_ID(N'[exercise_session]'))
    CREATE INDEX [IX_exercise_session_topic_id] ON [exercise_session] ([topic_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_session_user_id_started_at' AND object_id = OBJECT_ID(N'[exercise_session]'))
    CREATE INDEX [IX_exercise_session_user_id_started_at] ON [exercise_session] ([user_id], [started_at]);");
            migrationBuilder.Sql(@"
IF COL_LENGTH('exercise_result', 'session_id') IS NULL
    ALTER TABLE [exercise_result] ADD [session_id] bigint NOT NULL DEFAULT CAST(0 AS bigint);

IF COL_LENGTH('learning_log', 'session_id') IS NULL
    ALTER TABLE [learning_log] ADD [session_id] bigint NOT NULL DEFAULT CAST(0 AS bigint);

IF COL_LENGTH('learning_log', 'words_studied') IS NULL
    ALTER TABLE [learning_log] ADD [words_studied] int NOT NULL DEFAULT 0;");

            migrationBuilder.Sql("UPDATE [learning_log] SET [score] = 0 WHERE [score] IS NULL");

            migrationBuilder.Sql(@"
IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'[learning_log]')
      AND c.name = 'score'
      AND t.name <> 'real')
    ALTER TABLE [learning_log] ALTER COLUMN [score] real NOT NULL;");

            migrationBuilder.Sql(@"
IF COL_LENGTH('progress', 'ease_factor') IS NULL
    ALTER TABLE [progress] ADD [ease_factor] real NOT NULL DEFAULT CAST(2.5 AS real);

IF COL_LENGTH('progress', 'interval_days') IS NULL
    ALTER TABLE [progress] ADD [interval_days] int NOT NULL DEFAULT 1;

IF COL_LENGTH('progress', 'repetitions') IS NULL
    ALTER TABLE [progress] ADD [repetitions] int NOT NULL DEFAULT 0;");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_exercise_result_session_id_exercise_id' AND object_id = OBJECT_ID(N'[exercise_result]'))
    CREATE INDEX [IX_exercise_result_session_id_exercise_id] ON [exercise_result] ([session_id], [exercise_id]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_learning_log_session_id' AND object_id = OBJECT_ID(N'[learning_log]'))
    CREATE UNIQUE INDEX [IX_learning_log_session_id] ON [learning_log] ([session_id]) WHERE [session_id] <> 0;");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_exercise_result_exercise_session_session_id')
    ALTER TABLE [exercise_result]
    ADD CONSTRAINT [FK_exercise_result_exercise_session_session_id]
    FOREIGN KEY ([session_id]) REFERENCES [exercise_session]([session_id]);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_learning_log_exercise_session_session_id')
    ALTER TABLE [learning_log]
    ADD CONSTRAINT [FK_learning_log_exercise_session_session_id]
    FOREIGN KEY ([session_id]) REFERENCES [exercise_session]([session_id]);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_exercise_result_exercise_session_session_id",
                table: "exercise_result");

            migrationBuilder.DropForeignKey(
                name: "FK_learning_log_exercise_session_session_id",
                table: "learning_log");

            migrationBuilder.DropTable(
                name: "exercise_session");

            migrationBuilder.DropIndex(
                name: "IX_learning_log_session_id",
                table: "learning_log");

            migrationBuilder.DropIndex(
                name: "IX_exercise_result_session_id_exercise_id",
                table: "exercise_result");

            migrationBuilder.DropIndex(
                name: "IX_exercise_vocab_id_exercise_type_match_mode",
                table: "exercise");

            migrationBuilder.DropColumn(
                name: "session_id",
                table: "exercise_result");

            migrationBuilder.DropColumn(
                name: "session_id",
                table: "learning_log");

            migrationBuilder.DropColumn(
                name: "words_studied",
                table: "learning_log");

            migrationBuilder.DropColumn(
                name: "ease_factor",
                table: "progress");

            migrationBuilder.DropColumn(
                name: "interval_days",
                table: "progress");

            migrationBuilder.DropColumn(
                name: "repetitions",
                table: "progress");

            migrationBuilder.AlterColumn<int>(
                name: "score",
                table: "learning_log",
                type: "int",
                nullable: true,
                oldClrType: typeof(float),
                oldType: "real");

            migrationBuilder.AddColumn<bool>(
                name: "is_mini_test",
                table: "exercise",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "topic_id",
                table: "exercise",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_exercise_vocab_id_type_is_mini_test",
                table: "exercise",
                columns: new[] { "vocab_id", "exercise_type", "is_mini_test" });

            migrationBuilder.CreateIndex(
                name: "IX_exercise_topic_id_is_mini_test_type",
                table: "exercise",
                columns: new[] { "topic_id", "is_mini_test", "exercise_type" });
        }
    }
}
