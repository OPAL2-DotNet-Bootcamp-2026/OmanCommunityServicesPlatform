using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Models.Enums;

namespace OmanCommunityServicesPlatform.Tests
{
    // Each test gets its own host/database. Authentication, controllers, services and
    // repositories run unchanged; no SQL server, external credentials or login calls.
    public sealed class AccessControlApi : WebApplicationFactory<Program>
    {
        public const int CitizenA = 1;
        public const int CitizenB = 2;
        public const int Staff = 3;
        public const int Admin = 4;
        public const int CitizenWithoutIssues = 5;
        public const int IssueA = 101;
        public const int IssueB = 102;
        public const int EmptyIssueA = 103;
        public const int EmptyIssueB = 104;
        public const int AttachmentA = 201;
        public const int AttachmentB = 202;
        public const int RatingA = 301;
        public const int RatingB = 302;
        public const int CrossAuthoredAttachment = 203;
        public const int CrossAuthoredRating = 303;
        public const int NotificationA = 401;
        public const int NotificationB = 402;
        public const int Missing = 9999;
        private const string SigningKey = "issue-128-test-only-signing-key-not-used-outside-tests-2026";
        private const string Issuer = "access-control-tests";
        private const string Audience = "access-control-test-client";

        private readonly string databaseName = Guid.NewGuid().ToString();

        protected override IHost CreateHost(IHostBuilder builder)
        {
            // Supply settings before Program reads them, including fail-fast JWT checks.
            // WebApplicationFactory forwards host settings into the application's startup.
            builder.ConfigureHostConfiguration(config => config.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["JwtSettings:SecretKey"] = SigningKey,
                    ["JwtSettings:Issuer"] = Issuer,
                    ["JwtSettings:Audience"] = Audience,
                    ["AllowedOrigins:0"] = "https://frontend.example.test",
                    ["ConnectionStrings:DefaultConnection"] = "unused-in-integration-tests"
                }));

            return base.CreateHost(builder);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<OCSPContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<OCSPContext>>();
                services.AddDbContext<OCSPContext>(options => options.UseInMemoryDatabase(databaseName));
            });
        }

        public HttpClient Client(string? role = null, string? userId = null)
        {
            HttpClient client = CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

            if (role != null)
            {
                List<Claim> claims = new List<Claim>
                {
                    new Claim(ClaimTypes.Role, role)
                };

                if (userId != null)
                {
                    claims.Add(new Claim("userId", userId));
                }

                JwtSecurityToken token = new JwtSecurityToken(Issuer, Audience, claims,
                    expires: DateTime.UtcNow.AddMinutes(5),
                    signingCredentials: new SigningCredentials(
                        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(SigningKey)), SecurityAlgorithms.HmacSha256));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                    "Bearer", new JwtSecurityTokenHandler().WriteToken(token));
            }

            return client;
        }

        public void Seed()
        {
            using IServiceScope scope = Services.CreateScope();
            OCSPContext db = scope.ServiceProvider.GetRequiredService<OCSPContext>();
            db.Database.EnsureCreated();
            db.Users.AddRange(
                NewUser(CitizenA, UserRole.Citizen), NewUser(CitizenB, UserRole.Citizen),
                NewUser(Staff, UserRole.Staff), NewUser(Admin, UserRole.Admin), NewUser(CitizenWithoutIssues, UserRole.Citizen));
            db.Regions.Add(new Region
            {
                regionId = 1,
                regionName = "Test region"
            });
            db.Departments.Add(new Department
            {
                departmentId = 1,
                departmentName = "Test department",
                contactEmail = "department@example.test"
            });
            db.Categories.Add(new Category
            {
                categoryId = 1,
                categoryName = "Test category",
                departmentId = 1
            });
            db.Issues.AddRange(NewIssue(IssueA, CitizenA), NewIssue(IssueB, CitizenB),
                NewIssue(EmptyIssueA, CitizenA), NewIssue(EmptyIssueB, CitizenB));
            db.Comments.AddRange(
                new Comment
                {
                    commentId = 501,
                    issueId = IssueA,
                    userId = CitizenA,
                    content = "Citizen A comment"
                },
                new Comment
                {
                    commentId = 502,
                    issueId = IssueB,
                    userId = CitizenB,
                    content = "Citizen B private comment"
                });
            db.Attachments.AddRange(
                new Attachment
                {
                    attachmentId = AttachmentA,
                    issueId = IssueA,
                    uploadedById = CitizenA,
                    fileUrl = "https://example.test/a.png"
                },
                new Attachment
                {
                    attachmentId = AttachmentB,
                    issueId = IssueB,
                    uploadedById = CitizenB,
                    fileUrl = "https://example.test/b-private.png"
                },
                new Attachment
                {
                    attachmentId = CrossAuthoredAttachment,
                    issueId = IssueB,
                    uploadedById = CitizenA,
                    fileUrl = "https://example.test/cross-authored.png"
                });
            db.Ratings.AddRange(
                new Rating
                {
                    ratingId = RatingA,
                    issueId = IssueA,
                    userId = CitizenA,
                    score = 5,
                    feedback = "Citizen A feedback"
                },
                new Rating
                {
                    ratingId = RatingB,
                    issueId = IssueB,
                    userId = CitizenB,
                    score = 2,
                    feedback = "Citizen B private feedback"
                },
                new Rating
                {
                    ratingId = CrossAuthoredRating,
                    issueId = IssueB,
                    userId = CitizenA,
                    score = 3,
                    feedback = "Cross-authored rating"
                });
            db.Notifications.AddRange(
                NewNotification(NotificationA, CitizenA, IssueA), NewNotification(NotificationB, CitizenB, IssueB));
            db.SaveChanges();
        }

        public T Inspect<T>(Func<OCSPContext, T> query)
        {
            using IServiceScope scope = Services.CreateScope();
            return query(scope.ServiceProvider.GetRequiredService<OCSPContext>());
        }

        private static User NewUser(int id, UserRole role)
        {
            return new User
            {
                userId = id,
                fullName = $"Test user {id}",
                email = $"user{id}@example.test",
                passwordHash = "not-a-real-password-hash",
                role = role
            };
        }

        private static Issue NewIssue(int id, int owner)
        {
            return new Issue
            {
                issueId = id,
                reportedById = owner,
                categoryId = 1,
                regionId = 1,
                title = $"Issue {id}",
                description = "Test description",
                location = "Test location"
            };
        }

        private static Notification NewNotification(int id, int owner, int issue)
        {
            return new Notification
            {
                notificationId = id,
                userId = owner,
                issueId = issue,
                message = $"Private notification for {owner}",
                type = NotificationType.Comment
            };
        }
    }
}
