using System.Net.Http.Json;
using System.Text.Json;
using OmanCommunityServicesPlatform.Models;

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
     
        public async Task<string> CreateSessionAsync(Payment payment,string productName)
        {
            string baseUrl = Required("Thawani:BaseUrl").TrimEnd('/');
            string secretKey = Required("Thawani:SecretKey");
            string returnUrl = Required("Payments:ReturnUrl");

            string paymentReturnUrl =
                $"{returnUrl}?paymentId={payment.paymentId}";

            var body = new
            {
                client_reference_id = payment.paymentId.ToString(),
                products = new[]
                {
                    new
                    {
                        name = productName,
                        quantity = 1,
                        unit_amount = payment.amountBaisa
                    }
                },
                success_url = paymentReturnUrl,
                cancel_url = paymentReturnUrl
            };

            using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/checkout/session" );

            request.Headers.Add( "thawani-api-key", secretKey );
            request.Content =  JsonContent.Create(body);

            using HttpResponseMessage response = await http.SendAsync(request);

            response.EnsureSuccessStatusCode();
            string json = await response.Content.ReadAsStringAsync();

            using JsonDocument document = JsonDocument.Parse(json);

            string? sessionId = document.RootElement
                    .GetProperty("data")
                    .GetProperty("session_id")
                    .GetString();

            if (string.IsNullOrWhiteSpace(sessionId))
            {
                throw new InvalidOperationException(
                    "Thawani did not return a session ID."
                );
            }

            return sessionId;
        }
        // Step 1 CREATE (#137): the hosted pay page for a session, built from the
        // session id and Thawani:PublishableKey (format confirmed in #136).
        public string BuildPayUrl(string sessionId)
        {
            string publishableKey = Required("Thawani:PublishableKey");

            // Same host as the API, so switching BaseUrl to live moves the pay page too.
            Uri api = new Uri(Required("Thawani:BaseUrl"));
            return $"{api.Scheme}://{api.Authority}/pay/{Uri.EscapeDataString(sessionId)}" +
                $"?key={Uri.EscapeDataString(publishableKey)}";
        }

        // appsettings.json ships the keys as "", which is missing too - never send an empty key.
        private string Required(string key)
        {
            string? value = config[key];
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidOperationException($"{key} must be configured.");
            }
            return value;
        }

        // Step 3 CONFIRM (#139): GET {Thawani:BaseUrl}/checkout/session/{sessionId}.
        // Returns payment_status: "paid", "unpaid" or "cancelled".
        public async Task<string> GetPaymentStatusAsync(string sessionId)
        {
            string baseUrl = Required("Thawani:BaseUrl").TrimEnd('/');
            string secretKey = Required("Thawani:SecretKey");

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
