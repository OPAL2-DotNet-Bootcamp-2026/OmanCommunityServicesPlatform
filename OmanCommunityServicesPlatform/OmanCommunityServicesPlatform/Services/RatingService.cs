using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;

namespace OmanCommunityServicesPlatform
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
            return ratingRepo.GetAll();
        }

        // --------------------------------------------------
        // GET ONE RATING
        // --------------------------------------------------

        // Returns one rating using its ID.
        // Returns null when the rating does not exist.
        public Rating? GetRatingById(int ratingId)
        {
            return ratingRepo.GetById(ratingId);
        }

        // --------------------------------------------------
        // GET RATINGS BY ISSUE
        // --------------------------------------------------

        // Returns all ratings belonging to one issue.
        public List<Rating> GetRatingsByIssueId(int issueId)
        {
            return ratingRepo.GetByIssueId(issueId);
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


        }
    }
}
