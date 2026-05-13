using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VocabLearning.Migrations
{
    /// <inheritdoc />
    public partial class AddStickyNotesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "sticky_note",
                columns: table => new
                {
                    sticky_note_id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<long>(type: "bigint", nullable: false),
                    content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false, defaultValue: ""),
                    color = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "yellow"),
                    is_pinned = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sticky_note", x => x.sticky_note_id);
                    table.ForeignKey(
                        name: "FK_sticky_note_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "user_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sticky_note_user_id_is_pinned_updated_at",
                table: "sticky_note",
                columns: new[] { "user_id", "is_pinned", "updated_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "sticky_note");
        }
    }
}
