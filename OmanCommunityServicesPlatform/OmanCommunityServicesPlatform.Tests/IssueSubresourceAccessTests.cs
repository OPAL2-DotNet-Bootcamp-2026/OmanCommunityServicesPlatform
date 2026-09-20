using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using static OmanCommunityServicesPlatform.Tests.AccessControlApi;

namespace OmanCommunityServicesPlatform.Tests
{
    public class IssueSubresourceAccessTests : AccessControlTest
    {
        [Theory]
        [InlineData("/comment/issue/101", "/comment/issue/102", "/comment/issue/9999")]
        [InlineData("/attachment/201", "/attachment/202", "/attachment/9999")]
        [InlineData("/attachment/Issue/101", "/attachment/Issue/102", "/attachment/Issue/9999")]
        [InlineData("/rating/GetById/301", "/rating/GetById/302", "/rating/GetById/9999")]
        [InlineData("/rating/GetByIssueId/101", "/rating/GetByIssueId/102", "/rating/GetByIssueId/9999")]
        public async Task Citizen_can_read_own_resources_but_foreign_and_missing_are_indistinguishable(
            string ownPath, string foreignPath, string missingPath)
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            JsonElement own = await Json(await client.GetAsync(ownPath));
            Assert.DoesNotContain("private", own.ToString(), StringComparison.OrdinalIgnoreCase);
            await SameNotFound(await client.GetAsync(foreignPath), await client.GetAsync(missingPath));
        }

        [Theory]
        [InlineData("/comment/issue/102")]
        [InlineData("/attachment/202")]
        [InlineData("/attachment/Issue/102")]
        [InlineData("/rating/GetById/302")]
        [InlineData("/rating/GetByIssueId/102")]
        public async Task Second_citizen_can_read_their_own_resources(string path)
        {
            using HttpClient client = Api.Client("Citizen", CitizenB.ToString());
            JsonElement result = await Json(await client.GetAsync(path));
            Assert.Contains("private", result.ToString(), StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("Staff", Staff)]
        [InlineData("Admin", Admin)]
        public async Task Staff_and_admin_can_read_both_citizens_issue_resources(string role, int userId)
        {
            using HttpClient client = Api.Client(role, userId.ToString());
            string[] paths = new string[]
            {
                "/comment/issue/101",
                "/comment/issue/102",
                "/attachment/201",
                "/attachment/202",
                "/attachment/Issue/101",
                "/attachment/Issue/102",
                "/rating/GetById/301",
                "/rating/GetById/302",
                "/rating/GetByIssueId/101",
                "/rating/GetByIssueId/102"
            };
            foreach (string path in paths)
            {
                await Json(await client.GetAsync(path));
            }

            JsonElement allRatings = await Json(await client.GetAsync("/rating/GetAll"));
            Assert.Equal(3, allRatings.GetArrayLength());
        }

        [Fact]
        public async Task Citizen_rating_collection_is_filtered_by_reported_issue_owner()
        {
            foreach (int userId in new[] { CitizenA, CitizenB })
            {
                using HttpClient client = Api.Client("Citizen", userId.ToString());
                JsonElement ratings = await Json(await client.GetAsync("/rating/GetAll"));
                int[] expected = userId == CitizenA
                    ? new int[] { RatingA }
                    : new int[] { RatingB, CrossAuthoredRating };
                Assert.Equal(expected, ratings.EnumerateArray().Select(r => r.GetProperty("ratingId").GetInt32()).Order());
            }
        }

        [Theory]
        [InlineData("/rating/GetAll")]
        [InlineData("/rating/GetById/301")]
        [InlineData("/rating/GetByIssueId/101")]
        [InlineData("/comment/issue/101")]
        [InlineData("/attachment/201")]
        [InlineData("/attachment/Issue/101")]
        public async Task Anonymous_callers_cannot_read_issue_resources(string path)
        {
            using HttpClient client = Api.Client();
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
        }

        [Fact]
        public async Task Existing_empty_issues_keep_their_successful_empty_response()
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync($"/comment/issue/{EmptyIssueA}")).StatusCode);
            JsonElement attachments = await Json(await client.GetAsync($"/attachment/Issue/{EmptyIssueA}"));
            Assert.Empty(attachments.EnumerateArray());
            Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync($"/rating/GetByIssueId/{EmptyIssueA}")).StatusCode);
        }

        [Theory]
        [InlineData("/comment/issue/")]
        [InlineData("/attachment/Issue/")]
        [InlineData("/rating/GetByIssueId/")]
        public async Task Empty_foreign_issues_do_not_bypass_the_ownership_check(string route)
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            await SameNotFound(await client.GetAsync(route + EmptyIssueB), await client.GetAsync(route + Missing));
        }

        [Fact]
        public async Task Citizen_cannot_create_attachments_on_another_citizens_issue()
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            HttpResponseMessage foreign = await client.PostAsJsonAsync("/attachment/Create", ResourceRequest(IssueB));
            HttpResponseMessage missing = await client.PostAsJsonAsync("/attachment/Create", ResourceRequest(Missing));
            await SameNotFound(foreign, missing);
            Assert.Equal(3, Api.Inspect(db => db.Attachments.Count()));
            Assert.Equal(2, Api.Inspect(db => db.Comments.Count()));
        }

        [Fact]
        public async Task Citizen_can_create_an_attachment_on_their_own_issue()
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            JsonElement created = await Json(await client.PostAsJsonAsync("/attachment/Create", ResourceRequest(IssueA)));
            Assert.True(created.GetProperty("attachmentId").GetInt32() > 0);
            Assert.Equal(IssueA, created.GetProperty("issueId").GetInt32());
            Assert.Equal(CitizenA, created.GetProperty("uploadedById").GetInt32());
            Assert.Equal(4, Api.Inspect(db => db.Attachments.Count()));
        }

        [Theory]
        [InlineData("Staff", Staff)]
        [InlineData("Admin", Admin)]
        public async Task Attachment_uploads_remain_citizen_only(string role, int userId)
        {
            using HttpClient client = Api.Client(role, userId.ToString());
            Assert.Equal(HttpStatusCode.Forbidden,
                (await client.PostAsJsonAsync("/attachment/Create", ResourceRequest(IssueB))).StatusCode);
            Assert.Equal(3, Api.Inspect(db => db.Attachments.Count()));
        }

        [Theory]
        [InlineData("/attachment/203", "/attachment/9999")]
        [InlineData("/rating/GetById/303", "/rating/GetById/9999")]
        public async Task Read_access_depends_on_parent_issue_owner_rather_than_resource_author(string path, string missingPath)
        {
            using HttpClient author = Api.Client("Citizen", CitizenA.ToString());
            await SameNotFound(await author.GetAsync(path), await author.GetAsync(missingPath));
            using HttpClient issueOwner = Api.Client("Citizen", CitizenB.ToString());
            await Json(await issueOwner.GetAsync(path));
        }

        public static IEnumerable<object?[]> InvalidIdentityCases()
        {
            string[] paths = new string[]
            {
                "/comment/issue/101",
                "/attachment/201",
                "/attachment/Issue/101",
                "/rating/GetAll",
                "/rating/GetById/301",
                "/rating/GetByIssueId/101"
            };
            foreach (string path in paths)
            {
                foreach (string? claim in new string?[] { null, "not-an-integer" })
                {
                    yield return new object?[] { path, claim };
                }
            }
        }

        [Theory]
        [MemberData(nameof(InvalidIdentityCases))]
        public async Task Authenticated_token_without_a_valid_user_id_cannot_read_resources(string path, string? claim)
        {
            using HttpClient client = Api.Client("Citizen", claim);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("invalid")]
        public async Task Missing_or_malformed_user_id_cannot_create_attachments(string? claim)
        {
            using HttpClient client = Api.Client("Citizen", claim);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/attachment/Create", ResourceRequest(IssueA))).StatusCode);
            Assert.Equal(3, Api.Inspect(db => db.Attachments.Count()));
            Assert.Equal(2, Api.Inspect(db => db.Comments.Count()));
        }

        [Fact]
        public async Task Citizen_without_reported_issues_gets_no_ratings_even_when_others_have_ratings()
        {
            using HttpClient client = Api.Client("Citizen", CitizenWithoutIssues.ToString());
            Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync("/rating/GetAll")).StatusCode);
        }

        [Fact]
        public async Task Anonymous_caller_cannot_upload_an_attachment()
        {
            using HttpClient client = Api.Client();
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.PostAsJsonAsync("/attachment/Create", ResourceRequest(IssueA))).StatusCode);
            Assert.Equal(3, Api.Inspect(db => db.Attachments.Count()));
        }

        private static object ResourceRequest(int issueId)
        {
            return new
            {
                issueId,
                fileUrl = "https://example.test/new.png",
                fileType = "Image",
                // The uploader must come from the token, never from client-supplied fields.
                uploadedById = Staff
            };
        }
    }
}
