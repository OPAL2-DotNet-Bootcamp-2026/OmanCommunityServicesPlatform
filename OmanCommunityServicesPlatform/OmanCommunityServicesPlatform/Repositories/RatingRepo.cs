using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;


namespace OmanCommunityServicesPlatform

{
    public class RatingRepo

    {
        // Stores the database context.
        // readonly means it can only be assigned in the constructor.
        private readonly OCSPContext context;


        // Constructor Dependency Injection.
        // ASP.NET Core sends CommunityServicesContext automatically
        // when it creates RatingRepository.
        public RatingRepo(OCSPContext context)
        {
            // this.context refers to the field above.
            // context refers to the object received in the constructor.
            this.context = context;
        }

        // Returns all ratings from the database.
        public List<Rating> GetAllRatings()
        {
            return context.Ratings

            // Loads the Issue connected to every rating.
            // This allows us to access values such as:
            // rating.issue.title
            .Include(rating => rating.issueId)

            // Loads the User who submitted every rating.
            // This allows us to access values such as:
            // rating.user.fullName
            .Include(rating => rating.userId)

            // Executes the database query
            // and converts the result into a List<Rating>.
            .ToList();


        }

        // Returns one rating using its primary key.
        // Rating? means the method may return null
        // if the rating does not exist.
        public Rating? GetRatingById(int ratingId)
        {
            return context.Ratings

            // Loads the related Issue entity.
            .Include(rating => rating.issueId)

            // Loads the related User entity.
            .Include(rating => rating.userId)

            // Searches for the first rating
            // whose ratingId matches the given parameter.
            // Returns null if no matching rating is found.
            .FirstOrDefault(
                rating => rating.ratingId == ratingId);


        }

        // Gets all ratings that belong to one issue.
        public List<Rating> GetRatingsByIssueId(int issueId)
        {
            return context.Ratings

                // Loads the related Issue.
                .Include(rating => rating.issueId)

                // Loads the user who submitted each rating.
                .Include(rating => rating.userId)

                // Returns only ratings connected to the given issue.
                .Where(rating =>
                    rating.issueId == issueId
                )

                // Executes the query.
                .ToList();
        }
        // Returns true when the issue exists.
        // Returns false when it does not exist.
        public bool IssueExists(int issueId)
        {
            return context.Issues.Any(issue =>
                issue.issueId == issueId
            );
        }

        // Returns true when the user exists.
        // Returns false when the user does not exist.
        public bool UserExists(int userId)
        {
            return context.Users.Any(user =>
                user.userId == userId
            );
        }
    }
}

