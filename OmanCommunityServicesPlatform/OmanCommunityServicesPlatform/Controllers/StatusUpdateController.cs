using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.Services;
using OmanCommunityServicesPlatform;
namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // Authenticated only. Roles are declared per action, because multiple
    // [Authorize] attributes are ANDed rather than overridden - a class-level
    // role list cannot be widened by one on a method, so putting
    // "Admin,Staff" here made the Citizen route below unreachable.
    [Authorize]
    public class StatusUpdateController : ControllerBase
    {
        private readonly StatusUpdateService _statusUpdateService;

        public StatusUpdateController(StatusUpdateService statusUpdateService)
        {
            _statusUpdateService = statusUpdateService;
        }

        // GET: api/StatusUpdate
        [HttpGet]
        [Authorize(Roles = "Admin,Staff")]
        public IActionResult GetAll()
        {
            var updates = _statusUpdateService.GetAll();
            return Ok(updates);
        }

        // GET: api/StatusUpdate/5
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public IActionResult GetById(int id)
        {
            var update = _statusUpdateService.GetById(id);
            if (update == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Status update not found",
                    detail: $"Status update with ID {id} was not found."
                );
            }
            return Ok(update);
        }

        // GET: api/StatusUpdate/issue/5
        // Staff and Admin see the full history. A Citizen may see the history
        // of their OWN issue, with the staff-internal fields stripped by the
        // service - previously they could not see it at all, so the activity
        // timeline was empty for the person who reported the issue.
        [HttpGet("issue/{issueId}")]
        [Authorize(Roles = "Admin,Staff,Citizen")]
        public IActionResult GetByIssueId(int issueId)
        {
            if (User.IsInRole("Citizen"))
            {
                // Get the current citizen ID from the JWT token
                if (!User.TryGetUserId(out int reporterId))
                {
                    return Unauthorized();
                }

                var own = _statusUpdateService.GetByIssueIdForReporter(issueId, reporterId);

                // Same answer whether the issue is missing or simply not
                // theirs, so this cannot be used to probe for issue ids.
                if (own == null)
                {
                    return Problem(
                        statusCode: StatusCodes.Status404NotFound,
                        title: "Issue not found",
                        detail: $"Issue with ID {issueId} was not found."
                    );
                }

                return Ok(own);
            }

            var updates = _statusUpdateService.GetByIssueId(issueId);
            return Ok(updates);
        }

        // DELETE: api/StatusUpdate/5
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")] // Restrict deletion to Admin only
        public IActionResult Delete(int id)
        {
            bool deleted = _statusUpdateService.Delete(id);
            if (!deleted)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Status update not found",
                    detail: $"Status update with ID {id} was not found."
                );
            }
            return NoContent();
        }
    }
}