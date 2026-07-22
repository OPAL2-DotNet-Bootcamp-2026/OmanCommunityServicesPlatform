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

    }
}
