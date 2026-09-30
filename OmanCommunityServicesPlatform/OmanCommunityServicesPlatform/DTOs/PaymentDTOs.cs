using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace OmanCommunityServicesPlatform.DTOs
{
    // POST /payment/checkout — request
    public class CreateCheckoutDto
    {
        [Required]
        public int issueId { get; set; }
    }

    // POST /payment/checkout — response: send the browser to payUrl
    public class CheckoutResponseDto
    {
        public int paymentId { get; set; }
        public string payUrl { get; set; } = "";
    }

    // POST /payment/webhook — a hint to re-check our saved session with Thawani.
    public class PaymentWebhookDto
    {
        [JsonPropertyName("event_type")]
        public string? eventType { get; set; }

        public PaymentWebhookDataDto? data { get; set; }
    }

    public class PaymentWebhookDataDto
    {
        [JsonPropertyName("session_id")]
        public string? sessionId { get; set; }

        [JsonPropertyName("client_reference_id")]
        public string? clientReferenceId { get; set; }
    }

    // GET /payment/{paymentId} — response
    public class PaymentStatusDto
    {
        public int paymentId { get; set; }
        public PaymentStatus status { get; set; }
        public bool isUrgent { get; set; }
    }
}
