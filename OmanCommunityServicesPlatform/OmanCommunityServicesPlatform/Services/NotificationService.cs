using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Services
{
    public class NotificationService
    {
        // Repository used for notification database operations.
        private readonly NotificationRepo notificationRepo;

        // Context used to check whether users and issues exist.
        private readonly OCSPContext context;

        public NotificationService(
            NotificationRepo notificationRepo,
            OCSPContext context
        )
        {
            // Store the repository inside the service.
            this.notificationRepo = notificationRepo;

            // Store the database context inside the service.
            this.context = context;
        }

        // --------------------------------------------------
        // GET ALL NOTIFICATIONS
        // --------------------------------------------------

        public List<Notification> GetAllNotifications()
        {
            return notificationRepo.GetAll();
        }

        // --------------------------------------------------
        // GET NOTIFICATION BY ID
        // --------------------------------------------------
        public Notification? GetNotificationById(
            int notificationId
        )
        {
            return notificationRepo.GetById(notificationId);
        }

        // --------------------------------------------------
        // GET NOTIFICATIONS BY USER ID
        // --------------------------------------------------

        public List<Notification> GetNotificationsByUserId(
            int userId
        )
        {
            // Check whether the selected user exists.
            bool userExists = context.Users.Any(user =>
                user.userId == userId
            );

            // Stop the operation if the user does not exist.
            if (!userExists)
            {
                throw new KeyNotFoundException(
                    "User was not found."
                );
            }

            return notificationRepo.GetByUserId(userId);
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

    }
    }
}
