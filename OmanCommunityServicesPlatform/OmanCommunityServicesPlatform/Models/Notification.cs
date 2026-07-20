using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

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
        public int notificationId { get; set; } 

        [ForeignKey(nameof(user))]
        public int userId { get; set; } 
        public User user { get; set; }

        [ForeignKey(nameof(issue))]
        public int? issueId { get; set; } 
        public Issue? issue { get; set; }

        [Required]
        [StringLength(300)]
        public string message { get; set; } 

        [Required]
        [StringLength(30)]
        public string type { get; set; } 

        public bool isRead { get; set; } = false; 

        [Required]
        public DateTime createdAt { get; set; } = DateTime.UtcNow;
        

    }
}
