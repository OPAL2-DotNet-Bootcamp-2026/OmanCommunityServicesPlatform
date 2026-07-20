using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform
{

    // Used when creating a new notification
    public class CreateNotificationDTO
    {
        [Required]
        public int userId { get; set; }
        // Foreign key referencing the user who will receive the notification

        public int? issueId { get; set; }
        // Optional foreign key referencing the related issue

        [Required]
        [StringLength(
            300,
            ErrorMessage = "Message cannot exceed 300 characters."
        )]
        public string message { get; set; } = string.Empty;
        // Notification message

        [Required]
        [StringLength(
            30,
            ErrorMessage = "Notification type cannot exceed 30 characters."
        )]
        public string type { get; set; } = string.Empty;
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
        public string message { get; set; } = string.Empty;

        [Required]
        [StringLength(
            30,
            ErrorMessage = "Notification type cannot exceed 30 characters."
        )]
        public string type { get; set; } = string.Empty;
    }
    // Used when marking one notification as read or unread
    public class UpdateNotificationReadStatusDTO
    {
        [Required]
        public bool isRead { get; set; }
    }         
}
