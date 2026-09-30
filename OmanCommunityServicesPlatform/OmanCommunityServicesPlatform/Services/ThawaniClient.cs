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
            string baseUrl = config["Thawani:BaseUrl"] 
                ?? throw new InvalidOperationException("Thawani:BaseUrl is missing.");

            string secretKey =config["Thawani:SecretKey"]
                ?? throw new InvalidOperationException("Thawani:SecretKey is missing.");

            string returnUrl = config["Payments:ReturnUrl"]
                ?? throw new InvalidOperationException("Payments:ReturnUrl is missing.");

            string paymentReturnUrl =
                $"{returnUrl}?paymentId={payment.paymentId}";

            var body = new
            {
                client_reference_id = payment.paymentId.ToString(),
                mode = "payment",
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
            string publishableKey = config["Thawani:PublishableKey"]
                ?? throw new InvalidOperationException("Thawani:PublishableKey is missing.");

            return
                $"https://uatcheckout.thawani.om/pay/{sessionId}?key={publishableKey}";
        }

        // Step 3 CONFIRM (#139): GET {Thawani:BaseUrl}/checkout/session/{sessionId}.
        // Returns payment_status: "paid", "unpaid" or "cancelled".
        public Task<string> GetPaymentStatusAsync(string sessionId)
        {
            throw new NotImplementedException("Step 3 CONFIRM — issue #139");
        }
    }
}
