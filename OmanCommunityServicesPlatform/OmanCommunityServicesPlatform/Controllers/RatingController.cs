using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("rating")]
    // All endpoints require authentication by default.
    // Public endpoints are marked with [AllowAnonymous].
    [Authorize]
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

        // Anyone can view all Ratings without logging in.
        [AllowAnonymous]
        [HttpGet("GetAll")]
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

        // Anyone can view one Rating without logging in.
        [AllowAnonymous]
        [HttpGet("GetById/{ratingId}")]
        public IActionResult GetRatingById(
            [FromRoute] int ratingId
        )
        {
            // Ask the Service to find one Rating.
            ResponseRatingDto? rating =
                ratingService.GetRatingById(ratingId);

            // Service returns null when the Rating
            // does not exist.
            if (rating == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Rating not found",
                    detail: "Rating was not found."
                );
            }
            // Return HTTP 200 with the Rating.
            return Ok(rating);
        }
        // --------------------------------------------------
        // GET RATINGS BY ISSUE
        // GET: /rating/GetRatingsByIssueId/10
        // --------------------------------------------------

        // Anyone can view Ratings for an Issue.
        [AllowAnonymous]
        [HttpGet("GetByIssueId/{issueId}")]
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
        [EnableRateLimiting("CreatePolicy")]
        [HttpPost("Create")]
        public IActionResult CreateRating(
            [FromBody] CreateRatingDto dto
        )
        {
            // Read the authenticated User ID
            // from the JWT token.
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
            // Ask the Service to create the Rating.
            ResponseRatingDto? createdRating =
                ratingService.CreateRating(
                    dto,
                    userId
                );
            if (createdRating == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Rating creation failed",
                    detail:
                        "The Rating could not be created. " +
                        "The Issue may not exist, " +
                        "may not be Resolved, " +
                        "or you may have already rated it."
                );
            }

            // Karim's controller examples commonly return Ok()
            // after creating a record.
            return Ok(new
            {
                message = "Rating created successfully.",
                rating = createdRating
            });
        }

        // --------------------------------------------------
        // UPDATE RATING
        // PUT: /rating/Update/5
        // --------------------------------------------------

        [HttpPut("Update/{ratingId}")]
        public IActionResult UpdateRating(
            [FromRoute] int ratingId,
            [FromBody] UpdateRatingDTO dto
        )
        {
            // Read the logged-in User ID from JWT.
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
            // The Service checks:
            // 1. Whether the Rating exists.
            // 2. Whether it belongs to this User.
            bool updated = ratingService.UpdateRating(
                ratingId,
                userId,
                dto
            );
            if (!updated)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Rating update failed",
                    detail:
                        "The Rating could not be updated. " +
                        "It may not exist or it may belong " +
                        "to another User."
                );
            }
            return Ok(new
            {
                message = "Rating updated successfully."
            });

        }
        // --------------------------------------------------
        // DELETE RATING
        // DELETE: /rating/Delete/5
        // --------------------------------------------------

        [HttpDelete("Delete/{ratingId}")]
        public IActionResult DeleteRating(
            [FromRoute] int ratingId
        )
        {
            // Read the logged-in User ID from JWT.
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
            // The Service checks that the Rating exists
            // and belongs to this authenticated User.
            bool deleted = ratingService.DeleteRating(
                ratingId,
                userId
            );

            if (!deleted)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Rating deletion failed",
                    detail:
                        "The Rating could not be deleted. " +
                        "It may not exist or it may belong " +
                        "to another User."
                );
            }
            return Ok(new
            {
                message = "Rating deleted successfully."
            });
        }

       
    }
}
    

