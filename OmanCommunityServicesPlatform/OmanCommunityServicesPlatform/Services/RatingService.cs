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
        // Stores the Rating repository.
        // The repository communicates with the database.
        private readonly OCSPContext ratingRepo;


        // Constructor Dependency Injection.
        // ASP.NET Core provides RatingRepo automatically.
        public RatingService(OCSPContext ratingRepo)
        {
            // Stores the received repository in the field.
            this.ratingRepo = ratingRepo;
        }
    }
}
