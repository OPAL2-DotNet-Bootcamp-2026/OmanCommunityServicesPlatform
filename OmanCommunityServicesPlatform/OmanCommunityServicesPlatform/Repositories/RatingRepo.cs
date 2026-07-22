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

        // Creates and saves a new rating.
        public Rating CreateRating(
            CreateRatingDto dto,
            int userId
        )
        {
            // Check that the issue exists.
            if (!IssueExists(dto.issueId))
            {
                throw new KeyNotFoundException(
                    "Issue was not found."
                );
            }

            // Check that the user exists.
            if (!UserExists(userId))
            {
                throw new KeyNotFoundException(
                    "User was not found."
                );
            }

            // Check that the user did not already rate this issue.
            if (UserAlreadyRated(dto.issueId, userId))
            {
                throw new InvalidOperationException(
                    "This user has already rated this issue."
                );
            }

            // Create the Rating entity.
            Rating rating = new Rating
            {
                // Issue being rated.
                issueId = dto.issueId,

                // User creating the rating.
                userId = userId,

                // Score from the DTO.
                score = dto.score,

                // Optional feedback from the DTO.
                feedback = dto.feedback,

                // System-generated creation time.
                ratedAt = DateTime.UtcNow
            };

            // Add the new entity to the Ratings table.
            context.Ratings.Add(rating);

            // Save it in SQL Server.
            context.SaveChanges();

            // Return the newly created Rating entity.
            return rating;
        }

        // Updates an existing rating.
        public bool UpdateRating(
            int ratingId,
            int userId,
            UpdateRatingDTO dto
        )
        {
            // Find the existing rating.
            Rating? rating = context.Ratings
                .FirstOrDefault(rating =>
                    rating.ratingId == ratingId
                );

            // Return false if the rating does not exist.
            if (rating == null)
            {
                return false;
            }

            // Make sure the rating belongs to the given user.
            if (rating.userId != userId)
            {
                throw new UnauthorizedAccessException(
                    "You cannot update another user's rating."
                );
            }

            // Update the score.
            rating.score = dto.score;

            // Update the optional feedback.
            rating.feedback = dto.feedback;

            // Save the modifications.
            context.SaveChanges();

            return true;
        }

        // Deletes an existing rating.
        public bool DeleteRating(
            int ratingId,
            int userId
        )
        {
            // Find the rating.
            Rating? rating = context.Ratings
                .FirstOrDefault(rating =>
                    rating.ratingId == ratingId
                );

            // Return false when the rating does not exist.
            if (rating == null)
            {
                return false;
            }

            // Make sure the rating belongs to the given user.
            if (rating.userId != userId)
            {
                throw new UnauthorizedAccessException(
                    "You cannot delete another user's rating."
                );
            }

            // Mark the rating for deletion.
            context.Ratings.Remove(rating);

            // Delete it from the database.
            context.SaveChanges();

            return true;


        }
    }
}

