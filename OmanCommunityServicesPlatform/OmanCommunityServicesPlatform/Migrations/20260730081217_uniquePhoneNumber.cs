using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmanCommunityServicesPlatform.Migrations
{
    /// <inheritdoc />
    public partial class uniquePhoneNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Users_phoneNumber",
                table: "Users",
                column: "phoneNumber",
                unique: true,
                filter: "[phoneNumber] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_phoneNumber",
                table: "Users");
        }
    }
}
