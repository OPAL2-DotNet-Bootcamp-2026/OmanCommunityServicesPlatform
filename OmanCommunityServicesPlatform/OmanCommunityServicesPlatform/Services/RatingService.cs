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

        // Constructor Dependency Injection.
        // OCSPContext is not used directly in the Service.
        // Database operations should happen through repositories.
        public RatingService(
            RatingRepo ratingRepo,
            IssueRepo issueRepo
        )
        {
            this.ratingRepo = ratingRepo;
            this.issueRepo = issueRepo;
        }

        // --------------------------------------------------
        // GET ALL RATINGS
        // --------------------------------------------------

        // Returns Ratings whose parent Issues are visible to the User.
        public List<ResponseRatingDto> GetAllRatings(
            int userId,
            bool canReadAll
        )
        {
            // Filter Rating entities in the database before loading them.
            List<Rating> ratings = ratingRepo.GetAll(userId, canReadAll);

            // Convert every Rating entity into a RatingDto.
            return ratings
                .Select(rating => MapToDto(rating))
                .ToList();

        }

        // --------------------------------------------------
        // GET ONE RATING
        // --------------------------------------------------

        // Returns one rating using its ID.
        // Returns null when the Rating is missing or inaccessible.
        public ResponseRatingDto? GetRatingById(
            int ratingId,
            int userId,
            bool canReadAll
        )
        {
            // Ask RatingRepo to find the Rating.
            Rating? rating = ratingRepo.GetById(ratingId);

            // The Rating or its parent Issue does not exist.
            if (rating == null || rating.Issue == null)
            {
                return null;
            }

            // Citizens can read Ratings only for Issues they reported.
            if (!canReadAll && rating.Issue.reportedById != userId)
            {
                return null;
            }

            // Convert the Rating entity into RatingDto.
            return MapToDto(rating);
        }

        // --------------------------------------------------
        // GET RATINGS BY ISSUE
        // --------------------------------------------------

        // Returns all Ratings belonging to one visible Issue.
        // Returns null when the Issue is missing or inaccessible.
        public List<ResponseRatingDto>? GetRatingsByIssueId(
            int issueId,
            int userId,
            bool canReadAll
        )
        {
            Issue? issue = issueRepo.GetById(issueId);

            if (issue == null)
            {
                return null;
            }

            // The reporter owns access to the Issue and its Ratings.
            if (!canReadAll && issue.reportedById != userId)
            {
                return null;
            }

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
                return null;
            }

            // Business rule:
            // The User can only rate a resolved Issue.
            if (issue.currentStatus != IssueStatus.Resolved)
            {
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
                return false;
            }

            // Check ownership.
            // The logged-in user must be the owner of the rating.
            if (rating.userId != userId)
            {
                return false;
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
                return false;
               
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




         


        


