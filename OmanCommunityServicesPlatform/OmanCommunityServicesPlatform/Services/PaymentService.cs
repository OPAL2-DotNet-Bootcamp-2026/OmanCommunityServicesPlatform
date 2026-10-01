using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

namespace OmanCommunityServicesPlatform.Services
{
    public class PaymentService
    {
        private PaymentRepo paymentRepo;
        private IssueRepo issueRepo;
        private ThawaniClient thawani;
        private IConfiguration config;
        private ILogger<PaymentService> logger;

        public PaymentService(PaymentRepo _paymentRepo, IssueRepo _issueRepo, ThawaniClient _thawani, IConfiguration _config, ILogger<PaymentService> _logger)
        {
            paymentRepo = _paymentRepo;
            issueRepo = _issueRepo;
            thawani = _thawani;
            config = _config;
            logger = _logger;
        }

        // Step 1 CREATE (#137): open a Thawani session for the caller's own issue.
        // Returns null when the issue is missing or not theirs — the controller
        // answers 404 for both, so issue ids can't be probed.
        public async Task<CheckoutResponseDto?> StartCheckoutAsync(int issueId,int userId)
        {
          
            Issue? issue = issueRepo.GetById(issueId);

            // Same result when the issue does not exist
            // or belongs to another citizen.
            if (issue == null || issue.reportedById != userId)
            {
                return null;
            }

            // Read the fixed urgent fee from configuration.
            long urgentFeeBaisa = config.GetValue<long>("Payments:UrgentFeeBaisa");

            // Create our Payment first so we get paymentId.
            Payment payment = new Payment
            {
                issueId = issueId,
                amountBaisa = urgentFeeBaisa,
                status = PaymentStatus.Pending,
                createdAt = DateTime.UtcNow
            };

            paymentRepo.Add(payment);

            // Ask Thawani to create the checkout session.
            string sessionId =
                await thawani.CreateSessionAsync(
                    payment,
                    "Urgent Issue Handling"
                );

            // Save Thawani's session id in our database.
            payment.sessionId = sessionId;
            paymentRepo.Update();

            // Build the hosted Thawani payment page URL.
            string payUrl =
                thawani.BuildPayUrl(sessionId);

            return new CheckoutResponseDto
            {
                paymentId = payment.paymentId,
                payUrl = payUrl
            };
        }

        // Step 3 CONFIRM (#139): the caller's own payment, confirmed with Thawani
        // while it is still Pending. Returns null when missing or not theirs.
        public Task<PaymentStatusDto?> GetStatusAsync(int paymentId, int userId)
        {
            throw new NotImplementedException("Step 3 CONFIRM — issue #139");
        }

        // Step 3 CONFIRM (#139): ask Thawani, then record Paid (and issue.isUrgent)
        // or Cancelled. Reused by the webhook (#140), so it must be safe to call twice.
        public Task<Payment?> ConfirmAsync(int paymentId)
        {
            throw new NotImplementedException("Step 3 CONFIRM — issue #139");
        }
    }
}
