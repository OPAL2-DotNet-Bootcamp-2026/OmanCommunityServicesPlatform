using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace OmanCommunityServicesPlatform.Tests
{
    public abstract class AccessControlTest : IDisposable
    {
        protected readonly AccessControlApi Api = new AccessControlApi();

        protected AccessControlTest()
        {
            Api.Seed();
        }

        public void Dispose()
        {
            Api.Dispose();
        }

        protected static async Task<JsonElement> Json(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
        {
            Assert.Equal(expected, response.StatusCode);
            return await response.Content.ReadFromJsonAsync<JsonElement>();
        }

        // instance echoes the path the caller already sent and traceId is unique
        // per request, so neither can tell a foreign record from a missing one.
        private static readonly string[] PerRequestFields = { "instance", "traceId" };

        // Every other field must match exactly: a title or detail that named the
        // record would tell the caller whether it exists.
        protected static async Task SameNotFound(HttpResponseMessage foreign, HttpResponseMessage missing)
        {
            Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
            Assert.Equal(
                await Comparable(missing),
                await Comparable(foreign));
        }

        private static async Task<string> Comparable(HttpResponseMessage response)
        {
            string body = await response.Content.ReadAsStringAsync();

            if (string.IsNullOrWhiteSpace(body))
            {
                return string.Empty;
            }

            using JsonDocument document = JsonDocument.Parse(body);

            SortedDictionary<string, string> fields = new SortedDictionary<string, string>(StringComparer.Ordinal);

            foreach (JsonProperty property in document.RootElement.EnumerateObject())
            {
                if (!PerRequestFields.Contains(property.Name))
                {
                    fields[property.Name] = property.Value.ToString();
                }
            }

            return string.Join("; ", fields.Select(field => field.Key + "=" + field.Value));
        }
    }
}
