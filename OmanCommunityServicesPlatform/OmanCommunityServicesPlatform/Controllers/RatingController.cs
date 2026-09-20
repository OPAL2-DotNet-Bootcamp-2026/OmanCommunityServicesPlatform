using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;
using System.Security.Claims;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("rating")]
    // All endpoints require authentication.
    // Ratings inherit the visibility of their parent Issue.
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

        // Citizens can view Ratings for their own Issues.
        // Staff and Admin users can view all Ratings.
        [HttpGet("GetAll")]
        public IActionResult GetAllRatings()
        {
            // Read the authenticated User ID from the JWT token.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }

            bool canReadAll =
                User.IsInRole("Admin") || User.IsInRole("Staff");

            // Ask the Service to return Ratings visible to this User.
            List<ResponseRatingDto> ratings =
                ratingService.GetAllRatings(
                    userId.Value,
                    canReadAll
                );

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

        // The Rating must belong to an Issue visible to the User.
        [HttpGet("GetById/{ratingId}")]
        public IActionResult GetRatingById(
            [FromRoute] int ratingId
        )
        {
            // Read the authenticated User ID from the JWT token.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }

            bool canReadAll =
                User.IsInRole("Admin") || User.IsInRole("Staff");

            // Ask the Service to find a Rating visible to this User.
            ResponseRatingDto? rating =
                ratingService.GetRatingById(
                    ratingId,
                    userId.Value,
                    canReadAll
                );

            // Use the same response for a missing or inaccessible Rating.
            if (rating == null)
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

        // The selected Issue must be visible to the User.
        [HttpGet("GetByIssueId/{issueId}")]
        public IActionResult GetRatingsByIssueId(
            [FromRoute] int issueId
        )
        {
            // Read the authenticated User ID from the JWT token.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }

            bool canReadAll =
                User.IsInRole("Admin") || User.IsInRole("Staff");

            // Ask the Service to return all Ratings
            // belonging to the selected Issue.
            List<ResponseRatingDto>? ratings =
                ratingService.GetRatingsByIssueId(
                    issueId,
                    userId.Value,
                    canReadAll
                );

            // Use the same response for a missing or inaccessible Issue.
            if (ratings == null)
            {
                return NotFound(new
                {
                    message = "Issue was not found."
                });
            }

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
            // Ask the Service to create the Rating.
            ResponseRatingDto? createdRating =
                ratingService.CreateRating(
                    dto,
                    userId.Value
                );
            if (createdRating == null)
            {
                return BadRequest(new
                {
                    message =
                        "The Rating could not be created. " +
                        "The Issue may not exist, " +
                        "may not be Resolved, " +
                        "or you may have already rated it."
                });
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
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
            // The Service checks:
            // 1. Whether the Rating exists.
            // 2. Whether it belongs to this User.
            bool updated = ratingService.UpdateRating(
                ratingId,
                userId.Value,
                dto
            );
            if (!updated)
            {
                return BadRequest(new
                {
                    message =
                        "The Rating could not be updated. " +
                        "It may not exist or it may belong " +
                        "to another User."
                });
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
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
            // The Service checks that the Rating exists
            // and belongs to this authenticated User.
            bool deleted = ratingService.DeleteRating(
                ratingId,
                userId.Value
            );

            if (!deleted)
            {
                return BadRequest(new
                {
                    message =
                        "The Rating could not be deleted. " +
                        "It may not exist or it may belong " +
                        "to another User."
                });
            }
            return Ok(new
            {
                message = "Rating deleted successfully."
            });
        }

        // --------------------------------------------------
        // GET AUTHENTICATED USER ID
        // --------------------------------------------------

        /// Reads the "userId" claim from the JWT token.
        //
        // AuthService.GenerateToken() stores the ID using:
        // new Claim("userId", ...)
        private int? GetAuthenticatedUserId()
        {
            // JWT claim values are stored as strings.
            string? userIdValue =
                User.FindFirstValue("userId");

            // Convert the claim value from string to int.
            bool converted = int.TryParse(
                userIdValue,
                out int userId
            );

            // Return null when the claim is missing
            // or does not contain a valid integer.
            if (!converted)
            {
                return null;
            }

            return userId;
        }
    }
}
    

