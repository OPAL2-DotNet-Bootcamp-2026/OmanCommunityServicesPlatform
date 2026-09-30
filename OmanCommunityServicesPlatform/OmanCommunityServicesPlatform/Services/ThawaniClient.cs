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
        public Task<string> GetPaymentStatusAsync(string sessionId)
        {
            throw new NotImplementedException("Step 3 CONFIRM — issue #139");
        }
    }
}
