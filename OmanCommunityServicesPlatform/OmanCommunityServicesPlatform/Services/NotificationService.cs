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
        public List<Notification> GetUnreadNotificationsByUserId(
            int userId
        )
        {
            // Check whether the user exists.
            bool userExists = context.Users.Any(user =>
                user.userId == userId
            );

            if (!userExists)
            {
                throw new KeyNotFoundException(
                    "User was not found."
                );
            }

            return notificationRepo.GetUnreadByUserId(userId);
        }

        / --------------------------------------------------
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
        public Notification CreateNotification(
            CreateNotificationDTO dto,
            int userId
        )
        {
            // Check whether the notification receiver exists.
            bool userExists = context.Users.Any(user =>
                user.userId == userId
            );

            if (!userExists)
            {
                throw new KeyNotFoundException(
                    "User was not found."
                );
            }


            // issueId is optional.
            //
            // We only check the Issues table when the DTO
            // contains an issueId.
            if (dto.issueId.HasValue)
            {
                bool issueExists = context.Issues.Any(issue =>
                    issue.issueId == dto.issueId.Value
                );

                if (!issueExists)
                {
                    throw new KeyNotFoundException(
                        "Issue was not found."
                    );
                }
            }
            // Check whether the exact same notification
            // already exists.
            bool duplicateExists =
                notificationRepo.NotificationExists(
                    userId,
                    dto.issueId,
                    dto.type,
                    dto.message
                );

            // Prevent duplicate notifications.
            if (duplicateExists)
            {
                throw new InvalidOperationException(
                    "This notification already exists."
                );
            }

            // Convert CreateNotificationDTO
            // into a Notification entity.
            Notification notification = new Notification
            {
                // User who will receive the notification.
                userId = userId,

                // Optional related issue.
                issueId = dto.issueId,

                // Notification message from the DTO.
                message = dto.message,

                // StatusChange, Comment, or Assignment.
                type = dto.type,

                // A new notification starts as unread.
                isRead = false,

                // Current system time.
                createdAt = DateTime.UtcNow
            };
            // Send the notification to the repository.
            // The repository saves it in SQL Server.
            notificationRepo.Add(notification);


            // Get the saved notification again.
            //
            // This loads the related User and optional Issue
            // because GetById uses Include().
            Notification? savedNotification =
                notificationRepo.GetById(
                    notification.notificationId
                );


            // This should not normally happen because the
            // notification was just saved.
            if (savedNotification == null)
            {
                throw new InvalidOperationException(
                    "The notification was saved but could not be retrieved."
                );
            }


            return savedNotification;
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


            // Only reject the duplicate when the values are
            // actually changing to another existing combination.
            bool valuesChanged =
                notification.message != dto.message ||
                notification.type != dto.type;


            if (duplicateExists && valuesChanged)
            {
                throw new InvalidOperationException(
                    "Another identical notification already exists."
                );
            }
            // Update the notification message.
            notification.message = dto.message;

            // Update the notification type.
            notification.type = dto.type;


            // Entity Framework tracks the loaded notification.
            // Update() calls SaveChanges().
            notificationRepo.Update();


            return true;
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

