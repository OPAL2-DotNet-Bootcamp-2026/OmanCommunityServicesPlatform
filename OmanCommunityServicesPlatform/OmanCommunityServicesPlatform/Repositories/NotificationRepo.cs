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

        // Returns all notifications that belong to one user.
        public List<Notification> GetByUserId(int userId)
        {
            return context.Notifications

                // Loads the optional Issue related to each notification.
                .Include(notification => notification.issue)

                // Filters notifications by userId.
                .Where(
                    notification => notification.userId == userId
                )

                // Shows the newest notifications first.
                .OrderByDescending(
                    notification => notification.createdAt
                )

                // Executes the query and returns a list.
                .ToList();
        }

        // Returns only unread notifications for one user.
        public List<Notification> GetUnreadByUserId(int userId)
        {
            return context.Notifications

                // Loads the optional related Issue.
                .Include(notification => notification.issue)

                // Applies two conditions:
                // 1. Notification belongs to the selected user.
                // 2. Notification has not been read.
                .Where(notification =>
                    notification.userId == userId &&
                    notification.isRead == false
                )

                // Shows newest unread notifications first.
                .OrderByDescending(
                    notification => notification.createdAt
                )

                // Executes the query and returns a list.
                .ToList();
        }

        // Checks whether the exact same notification already exists.
        public bool NotificationExists(
            int userId,
            int? issueId,
            NotificationType type,
            string message
        )
        {
            return context.Notifications.Any(notification =>
                notification.userId == userId &&
                notification.issueId == issueId &&
                notification.type == type &&
                notification.message == message
            );
            // Any() returns true when a matching notification exists.
            // It returns false when no matching notification exists.
        }

        // Adds a new notification to the database.
        public void Add(Notification notification)
        {
            // Marks the notification as a new record.
            context.Notifications.Add(notification);

            // Sends the INSERT command to SQL Server.
            context.SaveChanges();
        }

        // Saves changes made to an existing notification.
        public void Update()
        {
            // Entity Framework tracks the loaded notification.
            // SaveChanges sends the UPDATE command.
            context.SaveChanges();
        }

        // Deletes an existing notification.
        public void Delete(Notification notification)
        {
            // Marks the notification for deletion.
            context.Notifications.Remove(notification);

            // Sends the DELETE command to SQL Server.
            context.SaveChanges();
        }


    }
}
