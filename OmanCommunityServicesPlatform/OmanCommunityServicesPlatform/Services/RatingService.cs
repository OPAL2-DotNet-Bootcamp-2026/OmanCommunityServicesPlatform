using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform.Services
{
    // The RatingService contains the business logic
    // related to ratings.
    //
    // The controller calls the service.
    // The service calls the repository.
    public class RatingService
    {
        // Repository used for Rating database operations.
        private readonly RatingRepo ratingRepo;

        // Database context used here to check whether
        // the Issue and User exist.
        private readonly OCSPContext context;

        // Constructor Dependency Injection.
        public RatingService(
            RatingRepo ratingRepo,
            OCSPContext context
        )
        {
            this.ratingRepo = ratingRepo;
            this.context = context;
        }

        // --------------------------------------------------
        // GET ALL RATINGS
        // --------------------------------------------------

        // Returns all Rating entities from the database.
        public List<Rating> GetAllRatings()
        {
            // Get all Rating entities from RatingRepo.
            List<Rating> ratings = ratingRepo.GetAll();

            // Convert every Rating entity into a RatingDto.
            return ratings
                .Select(rating => MapToDto(rating))
                .ToList();

        }

        // --------------------------------------------------
        // GET ONE RATING
        // --------------------------------------------------

        // Returns one rating using its ID.
        // Returns null when the rating does not exist.
        public Rating? GetRatingById(int ratingId)
        {
            // Ask RatingRepo to find the Rating.
            Rating? rating = ratingRepo.GetById(ratingId);

            // The Rating does not exist.
            if (rating == null)
            {
                return null;
            }

            // Convert the Rating entity into RatingDto.
            return MapToDto(rating);
        }

        // --------------------------------------------------
        // GET RATINGS BY ISSUE
        // --------------------------------------------------

        // Returns all ratings belonging to one issue.
        public List<Rating> GetRatingsByIssueId(int issueId)
        {
            // Get Rating entities related to the selected Issue.
            List<Rating> ratings =
                ratingRepo.GetByIssueId(issueId);

            // Convert every Rating entity into RatingDto.
            return ratings
                .Select(rating => MapToDto(rating))
                .ToList();

        }

        // --------------------------------------------------
        // CREATE RATING
        // --------------------------------------------------

        // Creates a new rating.
        //
        // dto contains:
        // issueId
        // score
        // feedback
        //
        // userId is received separately because your DTO
        // does not contain userId.
        public Rating CreateRating(
            CreateRatingDto dto,
            int userId
        )
        {
            // Check whether the issue exists.
            Issue? issue = context.Issues.FirstOrDefault(
                issue => issue.issueId == dto.issueId
            );

            // Stop the operation when the issue does not exist.
            if (issue == null)
            {
                throw new KeyNotFoundException(
                    "Issue was not found."
                );
            }

            // Check whether this user already rated this issue.
            bool alreadyRated = ratingRepo.UserAlreadyRated(
                dto.issueId,
                userId
            );

            // Prevent duplicate ratings.
            if (alreadyRated)
            {
                throw new InvalidOperationException(
                    "This user has already rated this issue."
                );
            }

            // Create a Rating entity using the DTO values.
            Rating rating = new Rating
            {
                // Foreign key of the issue being rated.
                issueId = dto.issueId,

                // Foreign key of the user submitting the rating.
                userId = userId,

                // User-selected score from 1 to 5.
                score = dto.score,

                // Optional feedback written by the user.
                feedback = dto.feedback,

                // System-generated creation date.
                ratedAt = DateTime.UtcNow
            };


            // Send the Rating entity to the repository.
            // The repository saves it in the database.
            ratingRepo.Add(rating);

            // Return the newly created Rating.
            return rating;
        }

        // --------------------------------------------------
        // UPDATE RATING
        // --------------------------------------------------

        // Updates the score and feedback of an existing rating.
        //
        // userId is used to make sure a user can update
        // only their own rating.
        public bool UpdateRating(
            int ratingId,
            int userId,
            UpdateRatingDTO dto
        )
        {
            // Find the existing rating.
            Rating? rating = ratingRepo.GetById(ratingId);

            // Return false when the rating does not exist.
            if (rating == null)
            {
                return false;
            }

            // Check ownership.
            // The logged-in user must be the owner of the rating.
            if (rating.userId != userId)
            {
                throw new UnauthorizedAccessException(
                    "You cannot update another user's rating.");
            }
            // Update the score.
            rating.score = dto.score;

            // Update the optional feedback.
            rating.feedback = dto.feedback;

            // Save the changes.
            ratingRepo.Update();

            return true;

        }


        // --------------------------------------------------
        // DELETE RATING
        // --------------------------------------------------

        // Deletes one rating.
        //
        // userId is checked so that a user cannot delete
        // another user's rating.
        public bool DeleteRating(
            int ratingId,
            int userId
        )
        {
            // Search for the rating.
            Rating? rating = ratingRepo.GetById(ratingId);

            // Return false when the rating does not exist.
            if (rating == null)
            {
                return false;
            }

            // Check whether the rating belongs to this user.
            if (rating.userId != userId)
            {
                throw new UnauthorizedAccessException(
                    "You cannot delete another user's rating."
                );
            }
            // Delete the rating using the repository.
            ratingRepo.Delete(rating);

            return true;
        }

             // --------------------------------------------------
             // MAP RATING ENTITY TO DTO
             // --------------------------------------------------

            // Converts a Rating entity into RatingDto.
            //
            // This prevents the API from returning:
            // Rating.Issue
            // Rating.User
            // and other Entity Framework navigation data.
        private RatingDto MapToDto(Rating rating)
        {
            return new RatingDto
            {
                ratingId = rating.ratingId,
                issueId = rating.issueId,
                userId = rating.userId,
                score = rating.score,
                feedback = rating.feedback,
                ratedAt = rating.ratedAt
            };
        }
    }
}




         


        


