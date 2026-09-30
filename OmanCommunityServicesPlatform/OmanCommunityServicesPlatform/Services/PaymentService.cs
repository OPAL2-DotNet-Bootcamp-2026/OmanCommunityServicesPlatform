using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;
using System.Buffers;
using System.Security.Cryptography;
using System.Text;

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

        // Shared UAT keys have no webhook secret. Confirmation with Thawani is
        // still required, even when signature verification is skipped.
        public bool IsWebhookSignatureValid(byte[] rawBody, string? signature, string? timestamp)
        {
            string? secret = config["Thawani:WebhookSecret"];
            if (string.IsNullOrEmpty(secret))
            {
                return true;
            }

            if (signature == null || signature.Length != 64 || string.IsNullOrWhiteSpace(timestamp))
            {
                return false;
            }

            Span<byte> suppliedHash = stackalloc byte[SHA256.HashSizeInBytes];
            if (Convert.FromHexString(signature, suppliedHash, out _, out _) != OperationStatus.Done)
            {
                return false;
            }

            // Hash the original bytes, including whitespace, before parsing JSON.
            using IncrementalHash hmac = IncrementalHash.CreateHMAC(HashAlgorithmName.SHA256, Encoding.UTF8.GetBytes(secret));
            hmac.AppendData(rawBody);
            hmac.AppendData(Encoding.UTF8.GetBytes("-" + timestamp));
            return CryptographicOperations.FixedTimeEquals(hmac.GetHashAndReset(), suppliedHash);
        }

        public async Task HandleWebhookAsync(PaymentWebhookDto? dto)
        {
            string? sessionId = dto?.data?.sessionId;
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                return;
            }

            Payment? payment = null;
            if (int.TryParse(dto?.data?.clientReferenceId, out int paymentId) && paymentId > 0)
            {
                payment = paymentRepo.GetById(paymentId);
            }

            // A supplied reference must belong to this session. Fall back to the
            // saved session when the reference is absent, invalid, or unrelated.
            if (payment == null || !string.Equals(payment.sessionId, sessionId, StringComparison.Ordinal))
            {
                payment = paymentRepo.GetBySessionId(sessionId);
            }

            if (payment == null || !string.Equals(payment.sessionId, sessionId, StringComparison.Ordinal))
            {
                logger.LogWarning("Ignoring Thawani webhook for unknown session {SessionId} and payment reference {PaymentReference}.",
                    sessionId, dto?.data?.clientReferenceId);
                return;
            }

            // Never use the event's claimed payment status or acknowledge a
            // failed confirmation: Thawani must be able to retry on failure.
            await ConfirmAsync(payment.paymentId);
        }

        // Step 1 CREATE (#137): open a Thawani session for the caller's own issue.
        // Returns null when the issue is missing or not theirs — the controller
        // answers 404 for both, so issue ids can't be probed.
        public Task<CheckoutResponseDto?> StartCheckoutAsync(int issueId, int userId)
        {
            throw new NotImplementedException("Step 1 CREATE — issue #137");
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
