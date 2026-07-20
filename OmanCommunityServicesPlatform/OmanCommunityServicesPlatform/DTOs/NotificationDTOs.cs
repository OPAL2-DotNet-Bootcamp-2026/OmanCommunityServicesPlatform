using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform
{

    public class NotificationDTOs
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
    }
}