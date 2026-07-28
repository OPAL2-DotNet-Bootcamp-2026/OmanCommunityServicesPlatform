using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Staff")]
    public class StatusUpdateController : ControllerBase
    {
        private readonly StatusUpdateService _statusUpdateService;

        public StatusUpdateController(StatusUpdateService statusUpdateService)
        {
            _statusUpdateService = statusUpdateService;
        }

        // GET: api/StatusUpdate
        [HttpGet]
        public IActionResult GetAll()
        {
            var updates = _statusUpdateService.GetAll();
            return Ok(updates);
        }

        // GET: api/StatusUpdate/5
        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var update = _statusUpdateService.GetById(id);
            if (update == null)
                return NotFound(new { message = $"Status update with ID {id} not found." });

            return Ok(update);
        }

        // GET: api/StatusUpdate/issue/5
        [HttpGet("issue/{issueId}")]
        public IActionResult GetByIssueId(int issueId)
        {
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
                return NotFound(new { message = $"Status update with ID {id} not found." });

            return NoContent();
        }
    }
}