using Microsoft.EntityFrameworkCore;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Models.Enums;

namespace OmanCommunityServicesPlatform
{
    public class NotificationRepo
    {
        // Stores the database context.
        // readonly means it can only be assigned in the constructor.
        private readonly OCSPContext context;

        // Constructor Dependency Injection.
        // ASP.NET Core provides CommunityServicesContext automatically.
        public NotificationRepo(OCSPContext context)
        {
            // Saves the received context inside the repository field.
            this.context = context;
        }

  

    }
    
}
