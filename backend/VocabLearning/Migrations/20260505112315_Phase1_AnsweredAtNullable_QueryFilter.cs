using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    /// <inheritdoc />
    public partial class Phase1_AnsweredAtNullable_QueryFilter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "exercise",
                columns: table => new
                {
                    exercise_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    vocab_id = table.Column<long>(type: "bigint", nullable: false),
                    exercise_type = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    match_mode = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exercise", x => x.exercise_id);
                });

            migrationBuilder.CreateTable(
                name: "topic",
                columns: table => new
                {
                    topic_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    parent_topic_id = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_topic", x => x.topic_id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    user_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    google_subject = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    is_deleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    deleted_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.user_id);
                    table.CheckConstraint("CK_users_role", "[role] IN ('ADMIN', 'LEARNER')");
                    table.CheckConstraint("CK_users_status", "[status] IN ('ACTIVE', 'INACTIVE')");
                });

            migrationBuilder.CreateTable(
                name: "vocabulary",
                columns: table => new
                {
                    vocab_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    word = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ipa = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    audio_url = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    level = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    meaning_vi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    topic_id = table.Column<long>(type: "bigint", nullable: true),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocabulary", x => x.vocab_id);
                    table.ForeignKey(
                        name: "FK_vocabulary_topic_topic_id",
                        column: x => x.topic_id,
                        principalTable: "topic",
                        principalColumn: "topic_id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "exercise_session",
                columns: table => new
                {
                    session_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    topic_id = table.Column<long>(type: "bigint", nullable: false),
                    session_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    started_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    finished_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    total_questions = table.Column<int>(type: "int", nullable: false),
                    correct_count = table.Column<int>(type: "int", nullable: false),
                    score = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exercise_session", x => x.session_id);
                    table.ForeignKey(
                        name: "FK_exercise_session_topic_topic_id",
                        column: x => x.topic_id,
                        principalTable: "topic",
                        principalColumn: "topic_id");
                    table.ForeignKey(
                        name: "FK_exercise_session_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "password_reset_token",
                columns: table => new
                {
                    password_reset_token_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    token_hash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    expires_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    used_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    consumed_by_ip = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_password_reset_token", x => x.password_reset_token_id);
                    table.ForeignKey(
                        name: "FK_password_reset_token_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_vocabulary",
                columns: table => new
                {
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    vocab_id = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    note = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    first_learned_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_vocabulary", x => new { x.user_id, x.vocab_id });
                    table.ForeignKey(
                        name: "FK_user_vocabulary_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "example",
                columns: table => new
                {
                    example_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    vocab_id = table.Column<long>(type: "bigint", nullable: false),
                    sentence = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    translation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    audio_url = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_example", x => x.example_id);
                    table.ForeignKey(
                        name: "FK_example_vocabulary_vocab_id",
                        column: x => x.vocab_id,
                        principalTable: "vocabulary",
                        principalColumn: "vocab_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "meaning",
                columns: table => new
                {
                    meaning_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    vocab_id = table.Column<long>(type: "bigint", nullable: false),
                    meaning_en = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    meaning_vi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    type = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_meaning", x => x.meaning_id);
                    table.ForeignKey(
                        name: "FK_meaning_vocabulary_vocab_id",
                        column: x => x.vocab_id,
                        principalTable: "vocabulary",
                        principalColumn: "vocab_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exercise_result",
                columns: table => new
                {
                    result_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    session_id = table.Column<long>(type: "bigint", nullable: false),
                    exercise_id = table.Column<long>(type: "bigint", nullable: false),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    is_correct = table.Column<bool>(type: "bit", nullable: false),
                    answered_at = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exercise_result", x => x.result_id);
                    table.ForeignKey(
                        name: "FK_exercise_result_exercise_session_session_id",
                        column: x => x.session_id,
                        principalTable: "exercise_session",
                        principalColumn: "session_id");
                    table.ForeignKey(
                        name: "FK_exercise_result_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateTable(
                name: "learning_log",
                columns: table => new
                {
                    log_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    session_id = table.Column<long>(type: "bigint", nullable: false),
                    date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    activity_type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    words_studied = table.Column<int>(type: "int", nullable: false),
                    score = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_learning_log", x => x.log_id);
                    table.ForeignKey(
                        name: "FK_learning_log_exercise_session_session_id",
                        column: x => x.session_id,
                        principalTable: "exercise_session",
                        principalColumn: "session_id");
                });

            migrationBuilder.CreateTable(
                name: "progress",
                columns: table => new
                {
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    vocab_id = table.Column<long>(type: "bigint", nullable: false),
                    ease_factor = table.Column<float>(type: "real", nullable: false, defaultValue: 2.5f),
                    interval_days = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    repetitions = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    last_review_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    next_review_date = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_progress", x => new { x.user_id, x.vocab_id });
                    table.ForeignKey(
                        name: "FK_progress_user_vocabulary_user_id_vocab_id",
                        columns: x => new { x.user_id, x.vocab_id },
                        principalTable: "user_vocabulary",
                        principalColumns: new[] { "user_id", "vocab_id" });
                    table.ForeignKey(
                        name: "FK_progress_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_example_vocab_id",
                table: "example",
                column: "vocab_id");

            migrationBuilder.CreateIndex(
                name: "IX_exercise_vocab_id_exercise_type_match_mode",
                table: "exercise",
                columns: new[] { "vocab_id", "exercise_type", "match_mode" },
                unique: true,
                filter: "[match_mode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_exercise_result_session_id_exercise_id",
                table: "exercise_result",
                columns: new[] { "session_id", "exercise_id" });

            migrationBuilder.CreateIndex(
                name: "IX_exercise_result_user_id_answered_at",
                table: "exercise_result",
                columns: new[] { "user_id", "answered_at" });

            migrationBuilder.CreateIndex(
                name: "IX_exercise_session_topic_id",
                table: "exercise_session",
                column: "topic_id");

            migrationBuilder.CreateIndex(
                name: "IX_exercise_session_user_id_started_at",
                table: "exercise_session",
                columns: new[] { "user_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "IX_learning_log_session_id",
                table: "learning_log",
                column: "session_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_learning_log_user_id_date",
                table: "learning_log",
                columns: new[] { "user_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_meaning_vocab_id",
                table: "meaning",
                column: "vocab_id");

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_token_expires_at",
                table: "password_reset_token",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_token_token_hash",
                table: "password_reset_token",
                column: "token_hash");

            migrationBuilder.CreateIndex(
                name: "IX_password_reset_token_user_id_created_at",
                table: "password_reset_token",
                columns: new[] { "user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_progress_user_id_next_review_date",
                table: "progress",
                columns: new[] { "user_id", "next_review_date" });

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_google_subject",
                table: "users",
                column: "google_subject",
                unique: true,
                filter: "[google_subject] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_users_username",
                table: "users",
                column: "username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vocabulary_topic_id",
                table: "vocabulary",
                column: "topic_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "example");

            migrationBuilder.DropTable(
                name: "exercise");

            migrationBuilder.DropTable(
                name: "exercise_result");

            migrationBuilder.DropTable(
                name: "learning_log");

            migrationBuilder.DropTable(
                name: "meaning");

            migrationBuilder.DropTable(
                name: "password_reset_token");

            migrationBuilder.DropTable(
                name: "progress");

            migrationBuilder.DropTable(
                name: "exercise_session");

            migrationBuilder.DropTable(
                name: "vocabulary");

            migrationBuilder.DropTable(
                name: "user_vocabulary");

            migrationBuilder.DropTable(
                name: "topic");

            migrationBuilder.DropTable(
                name: "users");
        }
    }
}
