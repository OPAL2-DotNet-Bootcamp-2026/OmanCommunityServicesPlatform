using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
using OmanCommunityServicesPlatform.Services;
using Microsoft.AspNetCore.RateLimiting;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("attachment")]
    [Authorize]
    public class AttachmentController : ControllerBase
    {
        private readonly AttachmentService attachmentService;
        public AttachmentController(AttachmentService _attachmentService)
        {
            attachmentService = _attachmentService;
        }
        // Citizen uploads an attachment to an issue

        [EnableRateLimiting("CreatePolicy")]
        [HttpPost("Create")]
        [Authorize(Roles = "Citizen")]
        public IActionResult Create([FromBody] CreateAttachmentDto dto)
        {
            // Get the logged-in Citizen ID from the JWT token
            var claim = User.FindFirst("userId");

            if (claim == null || !int.TryParse(claim.Value, out int uploadedById))
            {
                return Unauthorized();
            }

            AttachmentResponseDto? created = attachmentService.Create(dto, uploadedById);

            if (created == null)
            {
                return NotFound(new {message = $"Issue with ID {dto.issueId} was not found." });
            }
            return Ok(created);
        }

        // Get attachment by ID
        [HttpGet("{id}")]
        [Authorize(Roles = "Citizen,Staff,Admin")]
        public IActionResult GetById(int id)
        {
            AttachmentResponseDto? attachment = attachmentService.GetById(id);

            if (attachment == null)
            {
                return NotFound(new { message = $"Attachment with ID {id} was not found." });
            }

            return Ok(attachment);
        }
        // Get all attachments for an issue
        [HttpGet("Issue/{issueId}")]
        [Authorize(Roles = "Citizen,Staff,Admin")]
        public IActionResult GetByIssueId(int issueId)
        {
            List<AttachmentResponseDto> attachments = attachmentService.GetByIssueId(issueId);

            return Ok(attachments);
        }
        // Update attachment
        [HttpPut("Update/{id}")]
        [Authorize(Roles = "Citizen")]
        public IActionResult Update(int id, [FromBody] UpdateAttachmentDto dto)
        {
            // Get the logged-in Citizen ID from the JWT token
            var claim = User.FindFirst("userId");

            if (claim == null || !int.TryParse(claim.Value, out int uploadedById))
            {
                return Unauthorized();
            }

            AttachmentResponseDto? updated = attachmentService.Update(id,dto ,uploadedById);

            if (updated == null)
            {
                return NotFound(new{ message = $"Attachment with ID {id} was not found." });
            }

            return Ok(updated);
        }
        // Delete attachment
        [HttpDelete("Delete/{id}")]
        [Authorize(Roles = "Citizen,Admin")]
        public IActionResult Delete(int id)
        {
           // Get the logged-in user ID from the JWT token
            var claim = User.FindFirst("userId");
            // Get the logged-in user's role
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role);
            if (claim == null || roleClaim == null || !int.TryParse(claim.Value, out int uploadedById))
            {
                return Unauthorized();
            }
            // Get the role value
            string role = roleClaim.Value;

            bool deleted = attachmentService.Delete(id, uploadedById, role);

            if (!deleted)
            {
                return NotFound(new {  message = $"Attachment with ID {id} was not found." });
            }

            return Ok(new { message = "Attachment deleted successfully." });
        }

    } 
}
