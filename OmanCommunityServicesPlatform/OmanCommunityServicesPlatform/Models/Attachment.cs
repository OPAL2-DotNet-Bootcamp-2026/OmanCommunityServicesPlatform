using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    public class Attachment
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // Auto-incrementing primary key
        public int attachmentId { get; set; }   // system generated - Primary key for the Attachment entity

        [Required]
        public int issueId { get; set; } // Foreign key - referencing the associated Issue entity

        [Required]
        public int uploadedById { get; set; }  // Foreign key - referencing the User who uploaded the attachment

        [Required]
        [StringLength(300)] // Maximum length constraint for the file URL
        public string fileUrl { get; set; } // user input - URL or path to the uploaded file

        [Required]
        public string fileType { get; set; } // user input - Type of the uploaded file

        [Required]
        public DateTime uploadedAt { get; set; } = DateTime.UtcNow; // system generated - Timestamp indicating when the attachment was uploaded, defaulting to the current UTC time


        // Navigation Properties

        [ForeignKey(nameof(issueId))] // Establishes a relationship with the Issue entity based on the issueId foreign key
        public Issue Issue { get; set; }  // Navigation property to access the associated Issue entity

        [ForeignKey(nameof(uploadedById))] // Establishes a relationship with the user entity based on the uploadedById foreign key 
        public User UploadedBy { get; set; } = null!; // Navigation property to access the User entity who uploaded the attachment
    }
}
        