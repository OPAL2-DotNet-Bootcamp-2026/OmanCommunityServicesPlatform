using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;

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

    // GET /payment/{paymentId} — response
    public class PaymentStatusDto
    {
        public int paymentId { get; set; }
        public PaymentStatus status { get; set; }
        public bool isUrgent { get; set; }
    }
}
