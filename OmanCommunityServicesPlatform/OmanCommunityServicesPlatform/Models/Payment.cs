using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Payments")]
    public class Payment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int paymentId { get; set; }              // System generated

        // foreign key — every payment is for one issue
        [Required]
        [ForeignKey(nameof(issue))]
        public int issueId { get; set; }                // Foreign Key
        public Issue? issue { get; set; }

        // Whole baisa: 1 OMR = 1,000 baisa, so 2.000 OMR is 2000.
        // Never a decimal — money must not be rounded.
        [Required]
        public long amountBaisa { get; set; }

        [Required]
        public PaymentStatus status { get; set; } = PaymentStatus.Pending;    // Default Value

        // Thawani's checkout session id, saved when the session is created.
        [MaxLength(100)]
        public string? sessionId { get; set; }

        [Required]
        public DateTime createdAt { get; set; } = DateTime.UtcNow;            // Default Value
    }
}
