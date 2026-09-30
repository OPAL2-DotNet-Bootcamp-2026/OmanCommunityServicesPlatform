using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Repositories
{
    public class PaymentRepo
    {
        private OCSPContext context;
        public PaymentRepo(OCSPContext context)
        {
            this.context = context;
        }

        // Get one payment with its issue — the owner check needs
        // issue.reportedById, and confirming sets issue.isUrgent.
        public Payment? GetById(int paymentId)
        {
            return context.Payments
                .Include(p => p.issue)
                .FirstOrDefault(p => p.paymentId == paymentId);
        }

        // Get the payment behind a Thawani session (for the webhook)
        public Payment? GetBySessionId(string sessionId)
        {
            return context.Payments
                .Include(p => p.issue)
                .FirstOrDefault(p => p.sessionId == sessionId);
        }

        // Add new payment
        public void Add(Payment payment)
        {
            context.Payments.Add(payment);
            context.SaveChanges();
        }

        // Save updated payment — and its issue, in the same SaveChanges
        public void Update()
        {
            context.SaveChanges();
        }
    }
}
