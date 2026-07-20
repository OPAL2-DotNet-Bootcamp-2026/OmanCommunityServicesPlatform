using OmanCommunityServicesPlatform.Enums;
using System.ComponentModel.DataAnnotations;

namespace OmanCommunityServicesPlatform
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

        [Required]
        [StringLength(
            30,
            ErrorMessage = "Notification type cannot exceed 30 characters."
        )]
        public NotificationType type { get; set; } 
    }
    // Used when marking one notification as read or unread
    public class UpdateNotificationReadStatusDTO
    {
        [Required]
        public bool isRead { get; set; }
    }         
}
