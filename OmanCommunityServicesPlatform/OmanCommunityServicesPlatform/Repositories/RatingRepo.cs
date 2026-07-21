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
        public List<Rating> GetAll()
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
        public Rating? GetById(int ratingId)
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
    }
}

