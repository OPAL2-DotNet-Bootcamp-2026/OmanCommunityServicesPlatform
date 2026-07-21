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

    }
}

