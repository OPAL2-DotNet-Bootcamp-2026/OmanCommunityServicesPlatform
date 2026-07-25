using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform.DTOs
{

    // Used when creating a new notification
    public class CreateNotificationDTO
    {
        public int? issueId { get; set; }
        // Optional foreign key referencing the related issue

        [Required]
        [StringLength(
            300,
            ErrorMessage = "Message cannot exceed 300 characters."
        )]
        public string message { get; set; }
        // Notification message

        [Required(ErrorMessage ="Notification Type is Required")]
   
        public NotificationType type { get; set; } 
        // Notification type such as StatusChange, Comment, or Assignment
    }

    // Used when updating an existing notification
    public class UpdateNotificationDTO
    {
        [Required]
        [StringLength(
            300,
            ErrorMessage = "Message cannot exceed 300 characters."
        )]
        public string message { get; set; }

        [Required(ErrorMessage = "Notification Type is Required")]
        public NotificationType type { get; set; } 
    }
    // Used when marking one notification as read or unread
    public class UpdateNotificationReadStatusDTO
    {
        [Required]
        public bool isRead { get; set; }
    }

    // Used when returning notification data to the client
    public class NotificationResponseDto
    {
        public int notificationId { get; set; }
        public int userId { get; set; }
        public int? issueId { get; set; }
        public string message { get; set; } = string.Empty;
        public NotificationType type { get; set; }
        public bool isRead { get; set; }
        public DateTime createdAt { get; set; }
    }

}
