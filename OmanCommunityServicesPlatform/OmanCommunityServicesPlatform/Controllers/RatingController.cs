using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("api/rating")]
    public class RatingController : ControllerBase
    {
        // Service used for Rating business logic.
        private readonly RatingService ratingService;


        // Constructor Dependency Injection.
        // ASP.NET Core provides RatingService automatically.
        public RatingController(RatingService ratingService)
        {
            this.ratingService = ratingService;
        }

    }
}
