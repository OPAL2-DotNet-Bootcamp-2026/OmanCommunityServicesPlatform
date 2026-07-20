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

        // Used to return notification information from the API
        public class NotificationDTO
        {
            public int notificationId { get; set; }
            // System-generated notification ID

            public int userId { get; set; }
            // Foreign key of the user receiving the notification

            public string userName { get; set; } = string.Empty;
            // Name of the user receiving the notification

            public int? issueId { get; set; }
            // Optional foreign key of the related issue

            public string? issueTitle { get; set; }
            // Optional title of the related issue

            public string message { get; set; } = string.Empty;
            // Notification message

            public string type { get; set; } = string.Empty;
            // Notification type

            public bool isRead { get; set; }
            // Shows whether the notification has been read

            public DateTime createdAt { get; set; }
            // Date and time when the notification was created
        }
    }
}