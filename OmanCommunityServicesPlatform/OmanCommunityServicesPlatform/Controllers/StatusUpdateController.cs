using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StatusUpdateController : ControllerBase
    {
        private readonly StatusUpdateService _statusUpdateService;

        public StatusUpdateController(StatusUpdateService statusUpdateService)
        {
            _statusUpdateService = statusUpdateService;
        }

        // GET /api/StatusUpdate/issue/5 -> Get the full history of status changes for issue 5
        [HttpGet("issue/{issueId}")]
        public IActionResult GetByIssueId(int issueId)
        {
            var updates = _statusUpdateService.GetByIssueId(issueId);
            return Ok(updates);
        }
    }
}