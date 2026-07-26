using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
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
        public IActionResult create([FromRoute] int reportedById, [FromBody] CreateIssueDto dto)
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
        // Admin views all reported issues
        [HttpGet("GetAllIssues")]
        [Authorize(Roles = "Admin")]
        public IActionResult GetAllIssues()
        {
            List<IssueResponseDto> issues = issueService.GetAll();
            if (issues.Count == 0)
                return NoContent();

            return Ok(issues);
        }
        // Admin or citizen views the details of one issue
        [HttpGet("GetIssueById/{id}")]
        [Authorize(Roles = "Citizen,Admin")]
        public IActionResult GetIssueById([FromRoute] int id)
        {
            IssueResponseDto issue = issueService.GetById(id);
            if (issue == null)
            {
                return NotFound(new { Message = $"Issue with ID {id} was not found." });
            }
            return Ok(issue);
        }
        // Admin changes the issue status
        [HttpPut("ChangeIssueStatus/{id}")]
        [Authorize(Roles = "Admin")]
        public IActionResult ChangeIssueStatus([FromRoute] int id, [FromBody] ChangeIssueStatusDto dto)
        {
            IssueResponseDto updated = issueService.ChangeStatus(id, dto);
            if (updated == null)
            {
                return NotFound(new { message = $"Issue with ID {id} was not found." });

            }

            return Ok(updated);
        }
        // Admin marks the issue as resolved
        [HttpPut("ResolveIssue/{id}")]
        [Authorize(Roles = "Admin")]
        public IActionResult ResolveIssue([FromRoute] int id)
        {
            bool resolved = issueService.ResolveIssue(id);

            if (!resolved)
            {
                return NotFound(new { message = $"Issue with ID {id} was not found." });
            }
            return Ok(new { message = "Issue resolved successfully." });
        }
    }
}