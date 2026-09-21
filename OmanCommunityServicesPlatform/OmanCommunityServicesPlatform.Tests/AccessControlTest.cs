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

        protected static async Task SameNotFound(HttpResponseMessage foreign, HttpResponseMessage missing)
        {
            Assert.Equal(HttpStatusCode.NotFound, foreign.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
            Assert.Equal(await missing.Content.ReadAsStringAsync(), await foreign.Content.ReadAsStringAsync());
        }
    }
}
