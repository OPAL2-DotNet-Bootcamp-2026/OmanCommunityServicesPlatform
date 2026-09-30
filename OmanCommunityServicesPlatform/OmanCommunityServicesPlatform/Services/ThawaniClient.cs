using OmanCommunityServicesPlatform.Models;
using System.Text.Json;

namespace OmanCommunityServicesPlatform.Services
{
    // Every call to Thawani goes through here. The secret key stays on the
    // server: the browser only ever receives the hosted pay-page URL.
    public class ThawaniClient
    {
        private readonly HttpClient http;
        private readonly IConfiguration config;

        public ThawaniClient(HttpClient _http, IConfiguration _config)
        {
            http = _http;
            config = _config;
        }

        // Step 1 CREATE (#137): POST {Thawani:BaseUrl}/checkout/session with the
        // thawani-api-key header. Returns Thawani's session_id.
        public Task<string> CreateSessionAsync(Payment payment, string productName)
        {
            throw new NotImplementedException("Step 1 CREATE — issue #137");
        }

        // Step 1 CREATE (#137): the hosted pay page for a session, built from the
        // session id and Thawani:PublishableKey (format confirmed in #136).
        public string BuildPayUrl(string sessionId)
        {
            throw new NotImplementedException("Step 1 CREATE — issue #137");
        }

        // Step 3 CONFIRM (#139): GET {Thawani:BaseUrl}/checkout/session/{sessionId}.
        // Returns payment_status: "paid", "unpaid" or "cancelled".
        public async Task<string> GetPaymentStatusAsync(string sessionId)
        {
            string baseUrl = (config["Thawani:BaseUrl"] ?? "").TrimEnd('/');
            string secretKey = config["Thawani:SecretKey"] ?? "";

            if (baseUrl == "" || secretKey == "")
            {
                // Name the missing setting, but never print the key itself
                throw new InvalidOperationException("Thawani:BaseUrl and Thawani:SecretKey must be configured.");
            }

            using HttpRequestMessage request = new HttpRequestMessage(
                HttpMethod.Get,
                $"{baseUrl}/checkout/session/{Uri.EscapeDataString(sessionId)}");
            request.Headers.Add("thawani-api-key", secretKey);

            using HttpResponseMessage response = await http.SendAsync(request);
            response.EnsureSuccessStatusCode();

            string json = await response.Content.ReadAsStringAsync();
            using JsonDocument doc = JsonDocument.Parse(json);

            // Thawani wraps the session in "data": { ..., "payment_status": "paid" }.
            // Fall back to the top level in case the shape differs (confirm in Postman, #136).
            JsonElement source = doc.RootElement;
            if (source.TryGetProperty("data", out JsonElement data) && data.ValueKind == JsonValueKind.Object)
            {
                source = data;
            }

            if (source.TryGetProperty("payment_status", out JsonElement status) && status.ValueKind == JsonValueKind.String)
            {
                return status.GetString()!.ToLowerInvariant();
            }

            throw new InvalidOperationException("Thawani's response did not contain payment_status.");
        }
    }
}
