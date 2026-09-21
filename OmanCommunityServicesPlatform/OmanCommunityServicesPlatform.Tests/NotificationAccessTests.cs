using System.Net;
using System.Net.Http.Json;
using OmanCommunityServicesPlatform.Models;
using static OmanCommunityServicesPlatform.Tests.AccessControlApi;

namespace OmanCommunityServicesPlatform.Tests
{
    public class NotificationAccessTests : AccessControlTest
    {
        [Theory]
        [InlineData("GET", "")]
        [InlineData("PATCH", "/read")]
        [InlineData("PATCH", "/read-status")]
        [InlineData("DELETE", "")]
        public async Task Foreign_and_missing_notifications_have_identical_404_responses(string method, string suffix)
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            await SameNotFound(await Send(client, method, NotificationB, suffix), await Send(client, method, Missing, suffix));
            Notification foreign = Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationB));
            Assert.False(foreign.isRead);
            Assert.Equal("Private notification for 2", foreign.message);
            Assert.Equal(2, Api.Inspect(db => db.Notifications.Count()));
        }

        [Theory]
        [InlineData("GET", "")]
        [InlineData("PATCH", "/read")]
        [InlineData("PATCH", "/read-status")]
        [InlineData("DELETE", "")]
        public async Task Owner_can_read_mark_and_delete_their_notification(string method, string suffix)
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            await Json(await Send(client, method, NotificationA, suffix));
            if (method == "DELETE")
            {
                Assert.False(Api.Inspect(db => db.Notifications.Any(n => n.notificationId == NotificationA)));
            }
            else if (method == "PATCH")
            {
                Assert.True(Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationA).isRead));
            }
        }

        [Fact]
        public async Task Owner_can_mark_their_notification_unread_again()
        {
            using HttpClient client = Api.Client("Citizen", CitizenA.ToString());
            await Json(await Send(client, "PATCH", NotificationA, "/read"));
            await Json(await client.PatchAsJsonAsync($"/notification/{NotificationA}/read-status", new { isRead = false }));
            Assert.False(Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationA).isRead));
        }

        [Theory]
        [InlineData("GET")]
        [InlineData("DELETE")]
        public async Task Admin_retains_permission_to_read_and_delete_another_users_notification(string method)
        {
            using HttpClient client = Api.Client("Admin", Admin.ToString());
            await Json(await Send(client, method, NotificationB, ""));
            if (method == "DELETE")
            {
                Assert.False(Api.Inspect(db => db.Notifications.Any(n => n.notificationId == NotificationB)));
            }
        }

        [Theory]
        [InlineData("Admin", Admin)]
        [InlineData("Staff", Staff)]
        public async Task Read_status_writes_remain_owner_only_even_for_privileged_roles(string role, int userId)
        {
            using HttpClient client = Api.Client(role, userId.ToString());
            foreach (string suffix in new[] { "/read", "/read-status" })
            {
                await SameNotFound(await Send(client, "PATCH", NotificationB, suffix), await Send(client, "PATCH", Missing, suffix));
            }
            Assert.False(Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationB).isRead));
        }

        [Fact]
        public async Task Staff_cannot_read_or_delete_another_users_notification()
        {
            using HttpClient client = Api.Client("Staff", Staff.ToString());
            foreach (string method in new[] { "GET", "DELETE" })
            {
                await SameNotFound(await Send(client, method, NotificationB, ""), await Send(client, method, Missing, ""));
            }
            Assert.Equal(2, Api.Inspect(db => db.Notifications.Count()));
        }

        [Theory]
        [InlineData("Citizen", CitizenA)]
        [InlineData("Staff", Staff)]
        public async Task Non_admin_message_updates_are_forbidden_regardless_of_record_existence(string role, int userId)
        {
            using HttpClient client = Api.Client(role, userId.ToString());
            foreach (int id in new[] { NotificationA, NotificationB, Missing })
            {
                Assert.Equal(HttpStatusCode.Forbidden, (await Send(client, "PUT", id, "")).StatusCode);
            }
            Assert.Equal("Private notification for 2", Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationB).message));
        }

        [Fact]
        public async Task Admin_can_update_notification_message_and_missing_updates_keep_existing_bad_request_contract()
        {
            using HttpClient client = Api.Client("Admin", Admin.ToString());
            await Json(await Send(client, "PUT", NotificationB, ""));
            Assert.Equal("Updated message", Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationB).message));
            Assert.Equal(HttpStatusCode.BadRequest, (await Send(client, "PUT", Missing, "")).StatusCode);
        }

        [Theory]
        [InlineData("GET", "")]
        [InlineData("PUT", "")]
        [InlineData("PATCH", "/read")]
        [InlineData("PATCH", "/read-status")]
        [InlineData("DELETE", "")]
        public async Task Anonymous_callers_cannot_read_or_change_notifications(string method, string suffix)
        {
            using HttpClient client = Api.Client();
            Assert.Equal(HttpStatusCode.Unauthorized, (await Send(client, method, NotificationA, suffix)).StatusCode);
        }

        public static IEnumerable<object?[]> InvalidIdentityCases()
        {
            foreach ((string method, string suffix) in new[] { ("GET", ""), ("DELETE", ""), ("PATCH", "/read"), ("PATCH", "/read-status") })
            {
                foreach (string? claim in new string?[] { null, "invalid" })
                {
                    yield return new object?[] { method, suffix, claim };
                }
            }
        }

        [Theory]
        [MemberData(nameof(InvalidIdentityCases))]
        public async Task Missing_or_malformed_user_id_cannot_access_a_notification(string method, string suffix, string? claim)
        {
            using HttpClient client = Api.Client("Citizen", claim);
            Assert.Equal(HttpStatusCode.Unauthorized, (await Send(client, method, NotificationA, suffix)).StatusCode);
            Assert.Equal(2, Api.Inspect(db => db.Notifications.Count()));
            Assert.False(Api.Inspect(db => db.Notifications.Single(n => n.notificationId == NotificationA).isRead));
        }

        private static Task<HttpResponseMessage> Send(HttpClient client, string method, int id, string suffix)
        {
            HttpRequestMessage request = new HttpRequestMessage(new HttpMethod(method), $"/notification/{id}{suffix}");
            if (method == "PUT")
            {
                request.Content = JsonContent.Create(new { message = "Updated message", type = "Comment" });
            }
            if (suffix == "/read-status")
            {
                request.Content = JsonContent.Create(new { isRead = true });
            }
            return client.SendAsync(request);
        }
    }
}
