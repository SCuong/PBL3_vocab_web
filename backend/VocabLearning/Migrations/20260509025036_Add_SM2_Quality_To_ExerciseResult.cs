using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    /// <inheritdoc />
    public partial class Add_SM2_Quality_To_ExerciseResult : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "quality",
                table: "exercise_result",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "deleted_at",
                table: "users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_deleted",
                table: "users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<double>(
                name: "ease_factor",
                table: "progress",
                type: "float",
                nullable: false,
                defaultValue: 2.5,
                oldClrType: typeof(float),
                oldType: "real",
                oldDefaultValue: 2.5f);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "quality",
                table: "exercise_result");

            migrationBuilder.DropTable(
                name: "password_reset_token");

            migrationBuilder.DropColumn(
                name: "deleted_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "is_deleted",
                table: "users");

            migrationBuilder.AlterColumn<float>(
                name: "ease_factor",
                table: "progress",
                type: "real",
                nullable: false,
                defaultValue: 2.5f,
                oldClrType: typeof(double),
                oldType: "float",
                oldDefaultValue: 2.5);
        }
    }
}
