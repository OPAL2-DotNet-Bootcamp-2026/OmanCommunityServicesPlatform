using OmanCommunityServicesPlatform.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServices.Models
{
    public class Attachment
    {

        [Key]
        public int attachmentId { get; set; }

        [Required]
        public int issueId { get; set; }

        [Required]
        public int uploadedById { get; set; }

        [Required]
        [StringLength(300)]
        public string fileUrl { get; set; } = string.Empty;

        [Required]
        public string fileType { get; set; }

        [Required]
        public DateTime uploadedAt { get; set; }
            = DateTime.UtcNow;


        // Navigation Properties

        [ForeignKey(nameof(issueId))]
        public Issue Issue { get; set; } = null!;

        [ForeignKey(nameof(uploadedById))]
        public User UploadedBy { get; set; } = null!;
    }
}
        