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

    }
}
