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


    }
}
