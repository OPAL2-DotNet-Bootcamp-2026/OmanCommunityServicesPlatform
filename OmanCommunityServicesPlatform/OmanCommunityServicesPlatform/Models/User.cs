using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Users")]
    [Index(nameof(email), IsUnique = true)]
    public class User
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int userId { get; set; }             // System Generated

        [Required]
        [MaxLength(100)]
        public string fullName { get; set; }        // User Input

        [Required]
        [MaxLength(150)]
        public string email { get; set; }           // User Input

        [Required]
        [MaxLength(256)]
        public string passwordHash { get; set; }        // Calculated

        [MaxLength(20)]
        public string? phoneNumber { get; set; }        // User Input

        [Required]
        public UserRole role { get; set; }      // From List

        [ForeignKey(nameof(Region))]
        public int? regionId { get; set; }      // Foreign Key
        public Region? Region { get; set; }     // Navigation Property

        [ForeignKey(nameof(Department))]
        public int? departmentId { get; set; }          // Foreign Key
        public Department? Department { get; set; }     // Navigation Property

        [Required]
        public DateTime registrationDate { get; set; } = DateTime.UtcNow;       // Default Value

        public bool isActive { get; set; } = true;      // Default Value

        public ICollection<Issue> Issues { get; set; }          // Navigation Property
        public ICollection<Comment> Comments { get; set; }      // Navigation Property
        public ICollection<Rating> Ratings { get; set; }        // Navigation Property
        public ICollection<Attachment> Attachments { get; set; }        // Navigation Property
        public ICollection<Notification> Notifications { get; set; }    // Navigation Property
        public ICollection<StatusUpdate> StatusUpdates { get; set; }    // Navigation Property
    }
}
