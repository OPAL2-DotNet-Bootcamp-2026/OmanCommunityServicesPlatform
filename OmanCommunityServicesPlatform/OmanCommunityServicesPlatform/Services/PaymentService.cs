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
        public async Task<PaymentStatusDto?> GetStatusAsync(int paymentId, int userId)
        {
            Payment? payment = paymentRepo.GetById(paymentId);

            // Missing and "not yours" look the same, so payment ids can't be probed
            if (payment == null || payment.issue == null || payment.issue.reportedById != userId)
            {
                return null;
            }

            if (payment.status == PaymentStatus.Pending)
            {
                try
                {
                    payment = await ConfirmAsync(paymentId) ?? payment;
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                {
                    // Thawani unreachable or timed out: report the current (Pending) state
                    // instead of a 500, the result page can ask again.
                    logger.LogWarning(ex, "Could not reach Thawani while confirming payment {PaymentId}", paymentId);
                }
            }

            return new PaymentStatusDto
            {
                paymentId = payment.paymentId,
                status = payment.status,
                isUrgent = payment.issue?.isUrgent ?? false
            };
        }

        // Step 3 CONFIRM (#139): ask Thawani, then record Paid (and issue.isUrgent)
        // or Cancelled. Reused by the webhook (#140), so it must be safe to call twice.
        public async Task<Payment?> ConfirmAsync(int paymentId)
        {
            Payment? payment = paymentRepo.GetById(paymentId);
            if (payment == null)
            {
                return null;
            }

            // Already decided (Paid or Cancelled): confirming again changes nothing
            if (payment.status != PaymentStatus.Pending)
            {
                return payment;
            }

            // CREATE has not saved a session yet, so there is nothing to ask Thawani
            if (string.IsNullOrEmpty(payment.sessionId))
            {
                logger.LogWarning("Payment {PaymentId} has no Thawani session yet", paymentId);
                return payment;
            }

            string thawaniStatus = await thawani.GetPaymentStatusAsync(payment.sessionId);

            if (thawaniStatus == "paid")
            {
                payment.status = PaymentStatus.Paid;
                if (payment.issue != null)
                {
                    payment.issue.isUrgent = true;
                }
                paymentRepo.Update(); // saves the payment and its issue together
                logger.LogInformation("Payment {PaymentId} confirmed Paid; issue {IssueId} is now urgent", payment.paymentId, payment.issueId);
            }
            else if (thawaniStatus == "cancelled")
            {
                payment.status = PaymentStatus.Cancelled;
                paymentRepo.Update();
                logger.LogInformation("Payment {PaymentId} confirmed Cancelled; issue {IssueId} stays normal", payment.paymentId, payment.issueId);
            }
            else if (thawaniStatus != "unpaid")
            {
                // Anything unexpected is not proof of payment: stay Pending
                logger.LogWarning("Payment {PaymentId}: unexpected Thawani status {ThawaniStatus}", payment.paymentId, thawaniStatus);
            }
            // "unpaid": leave it Pending

            return payment;
        }
    }
}
