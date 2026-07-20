using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace OmanCommunityServicesPlatform.Models
{
    [Table("Notifications")]
    [Index(
      nameof(userId),
      nameof(issueId),
      nameof(type),
      nameof(message),
      IsUnique = true
  )]
    public class Notification
    {

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int notificationId { get; set; } // System generated

        [ForeignKey(nameof(user))]
        public int userId { get; set; } // Foreign Key from User
        public User user { get; set; }

        [ForeignKey(nameof(issue))]
        public int? issueId { get; set; } // Optional Foreign Key from Issue  
        public Issue? issue { get; set; }

        [Required]
        public string message { get; set; } // System generated

        [Required]
        [StringLength(30)]
        public NotificationType type { get; set; } // Calculated 

        public bool isRead { get; set; } = false; // Default value set to false, indicating the notification is unread when created

        [Required]
        public DateTime createdAt { get; set; } = DateTime.UtcNow; // Default value set to the current UTC date and time when a new notification is created


    }
}
