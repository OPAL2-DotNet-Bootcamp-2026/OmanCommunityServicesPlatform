using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmanCommunityServicesPlatform.Migrations
{
    /// <inheritdoc />
    public partial class AddPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "isUrgent",
                table: "Issues",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    paymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    issueId = table.Column<int>(type: "int", nullable: false),
                    amountBaisa = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    sessionId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    createdAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.paymentId);
                    table.ForeignKey(
                        name: "FK_Payments_Issues_issueId",
                        column: x => x.issueId,
                        principalTable: "Issues",
                        principalColumn: "issueId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_issueId",
                table: "Payments",
                column: "issueId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropColumn(
                name: "isUrgent",
                table: "Issues");
        }
    }
}
