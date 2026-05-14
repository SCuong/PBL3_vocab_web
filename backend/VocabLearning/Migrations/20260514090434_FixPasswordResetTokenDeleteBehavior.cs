using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    public partial class FixPasswordResetTokenDeleteBehavior : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_password_reset_token_users_user_id",
                table: "password_reset_token");

            migrationBuilder.AddForeignKey(
                name: "FK_password_reset_token_users_user_id",
                table: "password_reset_token",
                column: "user_id",
                principalTable: "users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.NoAction);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_password_reset_token_users_user_id",
                table: "password_reset_token");

            migrationBuilder.AddForeignKey(
                name: "FK_password_reset_token_users_user_id",
                table: "password_reset_token",
                column: "user_id",
                principalTable: "users",
                principalColumn: "user_id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
