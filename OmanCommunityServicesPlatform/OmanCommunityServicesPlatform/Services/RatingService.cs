using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Enums;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Repositories;

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

        // Used to retrieve and validate the Issue.
        private readonly IssueRepo issueRepo;

        private readonly ILogger<RatingService> logger;

        // Constructor Dependency Injection.
        // OCSPContext is not used directly in the Service.
        // Database operations should happen through repositories.
        public RatingService(
            RatingRepo ratingRepo,
            IssueRepo issueRepo,
            ILogger<RatingService> logger
        )
        {
            this.ratingRepo = ratingRepo;
            this.issueRepo = issueRepo;
            this.logger = logger;
        }

        // --------------------------------------------------
        // GET ALL RATINGS
        // --------------------------------------------------

        // Returns all Rating entities from the database.
        public List<ResponseRatingDto> GetAllRatings()
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
        public ResponseRatingDto? GetRatingById(int ratingId)
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
        public List<ResponseRatingDto> GetRatingsByIssueId(int issueId)
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
        public ResponseRatingDto? CreateRating(
            CreateRatingDto dto,
            int userId
        )
        {
            // Ask IssueRepo to find the Issue.
            //
            // RatingRepo cannot do this check because
            // no Rating record exists yet.
            Issue? issue = issueRepo.GetById(dto.issueId);

            // Return null when the Issue does not exist.
            if (issue == null)
            {
                logger.LogWarning("Rating creation failed: issue {IssueId} not found", dto.issueId);
                return null;
            }

            // Business rule:
            // The User can only rate a resolved Issue.
            if (issue.currentStatus != IssueStatus.Resolved)
            {
                logger.LogWarning("Rating creation rejected: issue {IssueId} is not in Resolved status (Status: {Status})", dto.issueId, issue.currentStatus);
                return null;
            }
            // Check whether this User already rated this Issue.
            bool alreadyRated =
                ratingRepo.UserAlreadyRated(
                     dto.issueId,
                    userId
                );

            // Prevent duplicate ratings.
            if (alreadyRated)
            {
                logger.LogWarning("Rating creation rejected: user {UserId} has already rated issue {IssueId}", userId, dto.issueId);
                return null;
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
            logger.LogInformation("Rating {RatingId} created for issue {IssueId} by user {UserId} with score {Score}", rating.ratingId, rating.issueId, rating.userId, rating.score);

            // Convert the created entity into RatingDto.
            return MapToDto(rating);
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
                logger.LogWarning("Rating update failed: rating {RatingId} not found", ratingId);
                return false;
            }

            // Check ownership.
            // The logged-in user must be the owner of the rating.
            if (rating.userId != userId)
            {
                logger.LogWarning("Rating update rejected: user {UserId} is not the owner of rating {RatingId}", userId, ratingId);
                return false;
            }
            // Update the score.
            rating.score = dto.score;

            // Update the optional feedback.
            rating.feedback = dto.feedback;

            // Save the changes.
            ratingRepo.Update();
            logger.LogInformation("Rating {RatingId} updated by user {UserId} with score {Score}", ratingId, userId, dto.score);

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
                logger.LogWarning("Rating deletion failed: rating {RatingId} not found", ratingId);
                return false;
            }

            // Check whether the rating belongs to this user.
            if (rating.userId != userId)
            {
                logger.LogWarning("Rating deletion rejected: user {UserId} is not the owner of rating {RatingId}", userId, ratingId);
                return false;
               
            }
            // Delete the rating using the repository.
            ratingRepo.Delete(rating);
            logger.LogInformation("Rating {RatingId} for issue {IssueId} deleted by user {UserId}", ratingId, rating.issueId, userId);

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
        private ResponseRatingDto MapToDto(Rating rating)
        {
            return new ResponseRatingDto
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




         


        


