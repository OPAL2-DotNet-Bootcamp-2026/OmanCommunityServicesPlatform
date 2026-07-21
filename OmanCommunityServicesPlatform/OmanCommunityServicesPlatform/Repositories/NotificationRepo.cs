using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Models.Enums;

namespace OmanCommunityServicesPlatform
{
    public class NotificationRepo
    {
        // Stores the database context.
        // readonly means it can only be assigned in the constructor.
        private readonly OCSPContext context;

        // Constructor Dependency Injection.
        // ASP.NET Core provides CommunityServicesContext automatically.
        public NotificationRepo(OCSPContext context)
        {
            // Saves the received context inside the repository field.
            this.context = context;
        }

        // Returns all notifications from the database.
        public List<Notification> GetAll()
        {
            return context.Notifications

                // Loads the User who receives each notification.
                .Include(notification => notification.user)

                // Loads the related Issue.
                // The Issue may be null because issueId is optional.
                .Include(notification => notification.issue)

                // Sorts notifications from newest to oldest.
                .OrderByDescending(
                    notification => notification.createdAt
                )

                // Executes the query and returns a list.
                .ToList();
        }


        // Returns one notification using its primary key.
        // Notification? means the method may return null.
        public Notification? GetById(int notificationId)
        {
            return context.Notifications

                // Loads the related User.
                .Include(notification => notification.user)

                // Loads the optional related Issue.
                .Include(notification => notification.issue)

                // Returns the first matching notification,
                // or null when no notification is found.
                .FirstOrDefault(
                    notification =>
                        notification.notificationId == notificationId
                );
        }


    }

}
