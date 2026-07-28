using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("comment")]
    [Authorize]
    public class CommentController : ControllerBase
    {
        private readonly CommentService commentService;
        private readonly IssueService issueService;

        public CommentController(CommentService _commentService, IssueService _issueService)
        {
            commentService = _commentService;
            issueService = _issueService;
        }

        // Any authenticated user can comment on an issue.
        // isStaffComment is derived server-side from the caller's role.
        [HttpPost("newComment")]
        public IActionResult Create([FromBody] CreateCommentDto dto)
        {
            var claim = User.FindFirst("userId");
            if (claim == null || !int.TryParse(claim.Value, out int userId))
            {
                return Unauthorized();
            }

            bool isStaff = User.IsInRole("Staff") || User.IsInRole("Admin");

            CommentResponseDto? created = commentService.Create(dto, userId, isStaff);

            if (created == null)
            {
                return BadRequest(new { message = $"Issue with ID {dto.issueId} was not found." });
            }

            return Ok(created);
        }

        // View all comments on a specific issue
        [HttpGet("issue/{issueId}")]
        public IActionResult GetByIssueId(int issueId)
        {
            List<CommentResponseDto> comments = commentService.GetByIssueId(issueId);

            if (comments.Count == 0)
            {
                return NoContent();
            }

            return Ok(comments);
        }

        // A user can only delete their own comment
        [HttpDelete("{commentId}")]
        public IActionResult Delete(int commentId)
        {
            var claim = User.FindFirst("userId");
            if (claim == null || !int.TryParse(claim.Value, out int userId))
            {
                return Unauthorized();
            }

            bool deleted = commentService.Delete(commentId, userId);

            if (!deleted)
            {
                return NotFound(new { message = $"Comment with ID {commentId} was not found or you do not have permission to delete it." });
            }

            return Ok(new { message = "Comment deleted successfully." });
        }
    }
}