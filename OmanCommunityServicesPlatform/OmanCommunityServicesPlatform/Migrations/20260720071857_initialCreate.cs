using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OmanCommunityServicesPlatform.Migrations
{
    /// <inheritdoc />
    public partial class initialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Regions",
                columns: table => new
                {
                    regionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    regionName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    governorate = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Regions", x => x.regionId);
                });

            migrationBuilder.CreateTable(
                name: "Departments",
                columns: table => new
                {
                    departmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    departmentName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    contactEmail = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    regionId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departments", x => x.departmentId);
                    table.ForeignKey(
                        name: "FK_Departments_Regions_regionId",
                        column: x => x.regionId,
                        principalTable: "Regions",
                        principalColumn: "regionId");
                });

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    categoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    categoryName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    departmentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.categoryId);
                    table.ForeignKey(
                        name: "FK_Categories_Departments_departmentId",
                        column: x => x.departmentId,
                        principalTable: "Departments",
                        principalColumn: "departmentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    userId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    fullName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    passwordHash = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    phoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    role = table.Column<int>(type: "int", nullable: false),
                    regionId = table.Column<int>(type: "int", nullable: true),
                    departmentId = table.Column<int>(type: "int", nullable: true),
                    registrationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    isActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.userId);
                    table.ForeignKey(
                        name: "FK_Users_Departments_departmentId",
                        column: x => x.departmentId,
                        principalTable: "Departments",
                        principalColumn: "departmentId");
                    table.ForeignKey(
                        name: "FK_Users_Regions_regionId",
                        column: x => x.regionId,
                        principalTable: "Regions",
                        principalColumn: "regionId");
                });

            migrationBuilder.CreateTable(
                name: "Issues",
                columns: table => new
                {
                    issueId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    location = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    latitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    longitude = table.Column<decimal>(type: "decimal(9,6)", nullable: true),
                    priority = table.Column<int>(type: "int", nullable: false),
                    currentStatus = table.Column<int>(type: "int", nullable: false),
                    reportedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    reportedById = table.Column<int>(type: "int", nullable: false),
                    categoryId = table.Column<int>(type: "int", nullable: false),
                    regionId = table.Column<int>(type: "int", nullable: false),
                    assignedDepartmentId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Issues", x => x.issueId);
                    table.ForeignKey(
                        name: "FK_Issues_Categories_categoryId",
                        column: x => x.categoryId,
                        principalTable: "Categories",
                        principalColumn: "categoryId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Issues_Departments_assignedDepartmentId",
                        column: x => x.assignedDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "departmentId");
                    table.ForeignKey(
                        name: "FK_Issues_Regions_regionId",
                        column: x => x.regionId,
                        principalTable: "Regions",
                        principalColumn: "regionId",
                        onDelete: ReferentialAction.NoAction);
                    table.ForeignKey(
                        name: "FK_Issues_Users_reportedById",
                        column: x => x.reportedById,
                        principalTable: "Users",
                        principalColumn: "userId",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Attachments",
                columns: table => new
                {
                    attachmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    issueId = table.Column<int>(type: "int", nullable: false),
                    uploadedById = table.Column<int>(type: "int", nullable: false),
                    fileUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    fileType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    uploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attachments", x => x.attachmentId);
                    table.ForeignKey(
                        name: "FK_Attachments_Issues_issueId",
                        column: x => x.issueId,
                        principalTable: "Issues",
                        principalColumn: "issueId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Attachments_Users_uploadedById",
                        column: x => x.uploadedById,
                        principalTable: "Users",
                        principalColumn: "userId",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Comments",
                columns: table => new
                {
                    commentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    issueId = table.Column<int>(type: "int", nullable: false),
                    userId = table.Column<int>(type: "int", nullable: false),
                    content = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    isStaffComment = table.Column<bool>(type: "bit", nullable: false),
                    commentDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comments", x => x.commentId);
                    table.ForeignKey(
                        name: "FK_Comments_Issues_issueId",
                        column: x => x.issueId,
                        principalTable: "Issues",
                        principalColumn: "issueId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Comments_Users_userId",
                        column: x => x.userId,
                        principalTable: "Users",
                        principalColumn: "userId",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    notificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    userId = table.Column<int>(type: "int", nullable: false),
                    issueId = table.Column<int>(type: "int", nullable: true),
                    message = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    type = table.Column<int>(type: "int", maxLength: 30, nullable: false),
                    isRead = table.Column<bool>(type: "bit", nullable: false),
                    createdAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.notificationId);
                    table.ForeignKey(
                        name: "FK_Notifications_Issues_issueId",
                        column: x => x.issueId,
                        principalTable: "Issues",
                        principalColumn: "issueId");
                    table.ForeignKey(
                        name: "FK_Notifications_Users_userId",
                        column: x => x.userId,
                        principalTable: "Users",
                        principalColumn: "userId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Ratings",
                columns: table => new
                {
                    ratingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    issueId = table.Column<int>(type: "int", nullable: false),
                    userId = table.Column<int>(type: "int", nullable: false),
                    score = table.Column<int>(type: "int", nullable: false),
                    feedback = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ratedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ratings", x => x.ratingId);
                    table.ForeignKey(
                        name: "FK_Ratings_Issues_issueId",
                        column: x => x.issueId,
                        principalTable: "Issues",
                        principalColumn: "issueId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Ratings_Users_userId",
                        column: x => x.userId,
                        principalTable: "Users",
                        principalColumn: "userId",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "StatusUpdates",
                columns: table => new
                {
                    statusUpdateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    issueId = table.Column<int>(type: "int", nullable: false),
                    updatedById = table.Column<int>(type: "int", nullable: false),
                    previousStatus = table.Column<int>(type: "int", nullable: false),
                    newStatus = table.Column<int>(type: "int", nullable: false),
                    notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    updatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusUpdates", x => x.statusUpdateId);
                    table.ForeignKey(
                        name: "FK_StatusUpdates_Issues_issueId",
                        column: x => x.issueId,
                        principalTable: "Issues",
                        principalColumn: "issueId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StatusUpdates_Users_updatedById",
                        column: x => x.updatedById,
                        principalTable: "Users",
                        principalColumn: "userId",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_issueId_fileUrl",
                table: "Attachments",
                columns: new[] { "issueId", "fileUrl" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_uploadedById",
                table: "Attachments",
                column: "uploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_categoryName",
                table: "Categories",
                column: "categoryName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_departmentId",
                table: "Categories",
                column: "departmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_issueId",
                table: "Comments",
                column: "issueId");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_userId",
                table: "Comments",
                column: "userId");

            migrationBuilder.CreateIndex(
                name: "IX_Departments_departmentName",
                table: "Departments",
                column: "departmentName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departments_regionId",
                table: "Departments",
                column: "regionId");

            migrationBuilder.CreateIndex(
                name: "IX_Issues_assignedDepartmentId",
                table: "Issues",
                column: "assignedDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Issues_categoryId",
                table: "Issues",
                column: "categoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Issues_regionId",
                table: "Issues",
                column: "regionId");

            migrationBuilder.CreateIndex(
                name: "IX_Issues_reportedById",
                table: "Issues",
                column: "reportedById");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_issueId",
                table: "Notifications",
                column: "issueId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_userId_issueId_type_message",
                table: "Notifications",
                columns: new[] { "userId", "issueId", "type", "message" },
                unique: true,
                filter: "[issueId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_issueId_userId",
                table: "Ratings",
                columns: new[] { "issueId", "userId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_userId",
                table: "Ratings",
                column: "userId");

            migrationBuilder.CreateIndex(
                name: "IX_Regions_regionName",
                table: "Regions",
                column: "regionName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StatusUpdates_issueId",
                table: "StatusUpdates",
                column: "issueId");

            migrationBuilder.CreateIndex(
                name: "IX_StatusUpdates_updatedById",
                table: "StatusUpdates",
                column: "updatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Users_departmentId",
                table: "Users",
                column: "departmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_email",
                table: "Users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_regionId",
                table: "Users",
                column: "regionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Attachments");

            migrationBuilder.DropTable(
                name: "Comments");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "Ratings");

            migrationBuilder.DropTable(
                name: "StatusUpdates");

            migrationBuilder.DropTable(
                name: "Issues");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Departments");

            migrationBuilder.DropTable(
                name: "Regions");
        }
    }
}
