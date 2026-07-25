using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Repositories;



namespace OmanCommunityServicesPlatform.Services
{
    public class NotificationService
    {
        // Repository used for notification database operations.
        private readonly NotificationRepo notificationRepo;

        // Used to check whether a User exists.
        private readonly UserRepo userRepo;

        // Used to check whether an Issue exists.
        private readonly IssueRepo issueRepo;


        public NotificationService(
            NotificationRepo notificationRepo,
            UserRepo userRepo,
            IssueRepo issueRepo
        )
        {
            // Store the repository inside the service.
            this.notificationRepo = notificationRepo;
            this.userRepo = userRepo;
            this.issueRepo = issueRepo;
        }

        // --------------------------------------------------
        // GET ALL NOTIFICATIONS
        // --------------------------------------------------

        public List<NotificationResponseDto> GetAllNotifications()
        {
            // Get all Notification entities.
            List<Notification> notifications =
                notificationRepo.GetAll();

            // Convert every entity into a response DTO.
            return notifications
                .Select(notification => MapToDto(notification))
                .ToList();
        }

        // --------------------------------------------------
        // GET NOTIFICATION BY ID
        // --------------------------------------------------
        public NotificationResponseDto? GetNotificationById(
            int notificationId
        )
        {
            // Find the Notification entity.
            Notification? notification =
                notificationRepo.GetById(notificationId);

            // Notification was not found.
            if (notification == null)
            {
                return null;
            }

            // Return a DTO instead of the raw entity.
            return MapToDto(notification);
        }

        // --------------------------------------------------
        // GET NOTIFICATIONS BY USER ID
        // --------------------------------------------------

        public List<NotificationResponseDto>? GetNotificationsByUserId(
            int userId
        )
        {
            // Ask UserRepo whether the User exists.
            if (!userRepo.Exists(userId))
            {
                return null;
            }

            // Get the User's Notification entities.
            List<Notification> notifications =
                notificationRepo.GetByUserId(userId);

            // Convert all entities into DTOs.
            return notifications
                .Select(notification => MapToDto(notification))
                .ToList();
        }

        // --------------------------------------------------
        // GET UNREAD NOTIFICATIONS BY USER ID
        // --------------------------------------------------

        // Returns only unread notifications for one user.
        //
        // Calls:
        // NotificationRepo.GetUnreadByUserId()
        public List<NotificationResponseDto>? GetUnreadNotificationsByUserId(
            int userId
        )
        {
            // Check whether the User exists.
            if (!userRepo.Exists(userId))
            {
                return null;
            }

            // Get unread Notification entities.
            List<Notification> notifications =
                notificationRepo.GetUnreadByUserId(userId);

            // Convert all entities into DTOs.
            return notifications
                .Select(notification => MapToDto(notification))
                .ToList();
        }

        // --------------------------------------------------
        // CREATE NOTIFICATION
        // --------------------------------------------------

        // Creates a new notification.
        //
        // The DTO contains:
        // issueId
        // message
        // type
        //
        // The userId is received separately because your
        // CreateNotificationDTO does not contain userId.
        //
        // Calls:
        // NotificationRepo.NotificationExists()
        // NotificationRepo.Add()
        public NotificationResponseDto? CreateNotification(
            CreateNotificationDTO dto,
            int userId
        )
        {

            // Check whether the receiving User exists.
            if (!userRepo.Exists(userId))
            {
                return null;
            }

            // issueId is optional.
            //
            // Only check IssueRepo when the DTO contains issueId.
            if (
                dto.issueId.HasValue &&
                !issueRepo.Exists(dto.issueId.Value)
            )
            {
                return null;
            }

            // Check whether the exact same Notification
            // already exists.
            bool duplicateExists =
                notificationRepo.NotificationExists(
                    userId,
                    dto.issueId,
                    dto.type,
                    dto.message
                );

            // Do not create a duplicate Notification.
            if (duplicateExists)
            {
                return null;
            }

            // Convert CreateNotificationDTO
            // into a Notification entity.
            Notification notification = new Notification
            {
                // User receiving the Notification.
                userId = userId,

                // Optional related Issue.
                issueId = dto.issueId,

                // Notification message.
                message = dto.message,

                // Notification category.
                type = dto.type,

                // New Notifications start as unread.
                isRead = false,

                // System-generated creation date and time.
                createdAt = DateTime.UtcNow
            };

            // Save the new Notification.
            notificationRepo.Add(notification);

            // notificationId is generated after SaveChanges().
            // Return a DTO instead of the raw entity.
            return MapToDto(notification);

            }


            

        // --------------------------------------------------
        // UPDATE NOTIFICATION
        // --------------------------------------------------

        // Updates the message and notification type.
        //
        // Calls:
        // NotificationRepo.GetById()
        // NotificationRepo.NotificationExists()
        // NotificationRepo.Update()
        public bool UpdateNotification(
            int notificationId,
            UpdateNotificationDTO dto
        )
        {
            // Find the existing notification.
            Notification? notification =
                notificationRepo.GetById(notificationId);


            // Return false when it does not exist.
            if (notification == null)
            {
                return false;
            }

            // Check whether another notification already has
            // the same unique combination.
            bool duplicateExists =
                notificationRepo.NotificationExists(
                    notification.userId,
                    notification.issueId,
                    dto.type,
                    dto.message
                );


            // Reject only when:
            // 1. The values are actually changing.
            // 2. Another identical Notification exists.
            if (valuesChanged && duplicateExists)
            {
                return false;
            }

            // Update the allowed properties.
            notification.message = dto.message;
            notification.type = dto.type;

            // Save the tracked changes.
            notificationRepo.Update();

            return true;


            ;
        }

        // --------------------------------------------------
        // UPDATE READ STATUS
        // --------------------------------------------------

        // Changes a notification to read or unread.
        //
        // Calls:
        // NotificationRepo.GetById()
        // NotificationRepo.Update()
        public bool UpdateNotificationReadStatus(
            int notificationId,
            UpdateNotificationReadStatusDTO dto
        )
        {
            // Find the notification.
            Notification? notification =
                notificationRepo.GetById(notificationId);


            // Return false when the notification does not exist.
            if (notification == null)
            {
                return false;
            }

            // Set the read status from the DTO.
            //
            // true  = read
            // false = unread
            notification.isRead = dto.isRead;


            // Save the change.
            notificationRepo.Update();


            return true;
        }

        // --------------------------------------------------
        // MARK AS READ
        // --------------------------------------------------
        public bool MarkNotificationAsRead(
            int notificationId
        )
        {
            return notificationRepo.MarkAsRead(notificationId);
        }
        // --------------------------------------------------
        // DELETE NOTIFICATION
        // --------------------------------------------------

        public bool DeleteNotification(
            int notificationId
        )
        {
            // Find the notification first.
            Notification? notification =
                notificationRepo.GetById(notificationId);


            // Return false when it does not exist.
            if (notification == null)
            {
                return false;
            }


            // Ask the repository to delete the entity.
            notificationRepo.Delete(notification);


            return true;
        }

            // --------------------------------------------------
            // MAP ENTITY TO RESPONSE DTO
            // --------------------------------------------------

            // Converts a Notification entity into
            // NotificationResponseDto.
            //
            // This prevents the API from returning User and Issue
            // navigation properties.
        private NotificationResponseDto MapToDto(
            Notification notification
        )
        {
            return new NotificationResponseDto
            {
                notificationId = notification.notificationId,
                userId = notification.userId,
                issueId = notification.issueId,
                message = notification.message,
                type = notification.type,
                isRead = notification.isRead,
                createdAt = notification.createdAt
            };
        }
    }


}

