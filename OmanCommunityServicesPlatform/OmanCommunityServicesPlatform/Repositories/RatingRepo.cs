using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;


namespace OmanCommunityServicesPlatform.Repositories

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
            .Include(rating => rating.Issue)

            // Loads the User who submitted every rating.
            // This allows us to access values such as:
            // rating.user.fullName
            .Include(rating => rating.User)

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
            .Include(rating => rating.Issue)

            // Loads the related User entity.
            .Include(rating => rating.User)

            // Searches for the first rating
            // whose ratingId matches the given parameter.
            // Returns null if no matching rating is found.
            .FirstOrDefault(
                rating => rating.ratingId == ratingId);


        }

        // Gets all ratings that belong to one issue.
        public List<Rating> GetByIssueId(int issueId)
        {
            return context.Ratings

                // Loads the related Issue.
                .Include(rating => rating.Issue)

                // Loads the user who submitted each rating.
                .Include(rating => rating.User)

                // Returns only ratings connected to the given issue.
                .Where(rating =>
                    rating.issueId == issueId
                )

                // Executes the query.
                .ToList();
        }

        // Checks whether the same user has already rated
        // the same issue.
        public bool UserAlreadyRated(
            int issueId,
            int userId
        )
        {
            return context.Ratings.Any(rating =>
                rating.issueId == issueId &&
                rating.userId == userId
            );
        }

        // Adds a new rating to the Ratings table.
        public void Add(Rating rating)
        {
            // Marks the Rating entity as new.
            context.Ratings.Add(rating);

            // Sends the INSERT command to the database.
            context.SaveChanges();
        }

        // Saves changes made to an existing tracked rating.
        public void Update()
        {
            // Entity Framework tracks changes made
            // to a rating loaded from the database.
            context.SaveChanges();
        }


        // Deletes an existing rating.
        public void Delete(Rating rating)
        {
            // Marks the Rating entity for deletion.
            context.Ratings.Remove(rating);

            // Sends the DELETE command to the database.
            context.SaveChanges();



        }
    }
}

