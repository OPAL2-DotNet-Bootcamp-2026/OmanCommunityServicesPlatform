using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("issue")]
    [Authorize]
    public class IssueController : ControllerBase
    {
        private IssueService issueService;
        public IssueController(IssueService _issueService) 
        {
            issueService = _issueService;
        }

        // POST issue/CreateIssue
        // Citizen reports a new issue
        [HttpPost("CreateIssue")]
        [Authorize(Roles = "Citizen")]
        public IActionResult create([FromRoute] int reportedById , [FromBody] CreateIssueDto dto)
        {
            IssueResponseDto created = issueService.Create(dto, reportedById);

            if (created == null)
            {
                return BadRequest(new { message = "The selected category or region does not exist." });
            }
            return Ok(created); //200, issue created

        }

        // Citizen views all issues they reported
        [HttpGet("GetMyIssues/{reportedById}")]
        [Authorize(Roles = "Citizen")]
        public IActionResult GetMyIssues([FromRoute] int reportedById)
        {
            List<IssueResponseDto> issues = issueService.GetByReportedById(reportedById);
            if (issues.Count == 0)
                return NoContent();
            return Ok(issues);


        }
    }
}
