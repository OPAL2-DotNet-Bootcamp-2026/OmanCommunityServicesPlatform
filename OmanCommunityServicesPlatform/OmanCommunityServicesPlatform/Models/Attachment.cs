using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Attachments")]
    [Index(nameof(issueId), nameof(fileUrl), IsUnique = true)]
    public class Attachment
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)] // Auto-incrementing primary key
        public int attachmentId { get; set; }   // system generated - Primary key for the Attachment entity

        [ForeignKey(nameof(issue))] // Establishes a relationship with the Issue entity based on the issueId foreign key
        public int issueId { get; set; } // Foreign key - referencing the associated Issue entity
        public Issue issue { get; set; }  // Navigation property to access the associated Issue entity

        [ForeignKey(nameof(uploadedBy))] // Establishes a relationship with the user entity based on the uploadedById foreign key 
        public int uploadedById { get; set; }  // Foreign key - referencing the User who uploaded the attachment
        public User uploadedBy { get; set; } = null!; // Navigation property to access the User entity who uploaded the attachment


        [Required]
        [StringLength(300)] // Maximum length constraint for the file URL
        public string fileUrl { get; set; } // user input - URL or path to the uploaded file

        [Required]
        public string fileType { get; set; } // user input - Type of the uploaded file

        [Required]
        public DateTime uploadedAt { get; set; } = DateTime.UtcNow; // system generated - Timestamp indicating when the attachment was uploaded, defaulting to the current UTC time

    }
}
        