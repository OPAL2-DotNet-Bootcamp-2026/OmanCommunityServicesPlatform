using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("rating")]

    public class RatingController : ControllerBase
    {
        // Service used for Rating business logic.
        private readonly RatingService ratingService;


        // Constructor Dependency Injection.
        public RatingController(RatingService ratingService)
        {
            this.ratingService = ratingService;
        }
        // --------------------------------------------------
        // GET ALL RATINGS
        // GET: /rating/GetAllRatings
        // --------------------------------------------------

        [HttpGet("GetAllRatings")]
        public IActionResult GetAllRatings()
        {
            // Ask the Service to return all Ratings.
            List<ResponseRatingDto> ratings =
                ratingService.GetAllRatings();

            // Karim's controller pattern returns NoContent
            // when the list contains no records.
            if (ratings.Count == 0)
            {
                return NoContent();
            }

            // Return HTTP 200 with the Rating DTOs.
            return Ok(ratings);
        }

        // --------------------------------------------------
        // GET RATING BY ID
        // GET: /rating/GetRatingById/5
        // --------------------------------------------------


        [HttpGet("GetRatingById/{ratingId}")]
        public IActionResult GetRatingById(
            [FromRoute] int ratingId
        )
        {
            // Ask the Service to find one Rating.
            ResponseRatingDto? rating =
                ratingService.GetRatingById(ratingId);

            // Service returns null when the Rating
            // does not exist.
            if (rating = null)
            {
                return NotFound(new
                {
                    message = "Rating was not found."
                });
            }
            // Return HTTP 200 with the Rating.
            return Ok(rating);
        }
        // --------------------------------------------------
        // GET RATINGS BY ISSUE
        // GET: /rating/GetRatingsByIssueId/10
        // --------------------------------------------------

        [HttpGet("GetRatingsByIssueId/{issueId}")]
        public IActionResult GetRatingsByIssueId(
            [FromRoute] int issueId
        )
        {
            // Ask the Service to return all Ratings
            // belonging to the selected Issue.
            List<ResponseRatingDto> ratings =
                ratingService.GetRatingsByIssueId(issueId);

            // No Ratings were found for the Issue.
            if (ratings.Count == 0)
            {
                return NoContent();
            }

            return Ok(ratings);
        }

        // --------------------------------------------------
        // CREATE RATING
        // POST: /rating/Create
        // --------------------------------------------------

        // [Authorize] is inherited from the controller,
        // so the User must send a valid JWT.
        [HttpPost("Create")]
        public IActionResult CreateRating(
            [FromBody] CreateRatingDto dto
        )
        {
            // Read the authenticated User ID
            // from the JWT token.
            int? userId = GetAuthenticatedUserId();

            // The token is valid, but it does not contain
            // a valid User ID claim.
            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
        }
    }
    
}
