using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("statusupdate")]
    [Authorize]
    public class StatusUpdateController:ControllerBase
    {
        private readonly StatusUpdateService statusUpdateService;
        public StatusUpdateController(StatusUpdateService _statusUpdateService)
        {
            statusUpdateService = _statusUpdateService;
        }
        // Admin and Staff change the status of an issue
        [HttpPost("Create")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Create([FromBody] CreateStatusUpdateDto dto)
        {
            // Get the logged-in Admin or Staff ID from the JWT token
            var claim = User.FindFirst("userId");

            if (claim == null || !int.TryParse(claim.Value, out int updatedById))
            {
                return Unauthorized();
            }

            StatusUpdateResponseDto? created = await statusUpdateService.Create(dto, updatedById);

            if (created == null)
            {
                return NotFound(new {message = $"Issue with ID {dto.issueId} was not found."
                });
            }

            return Ok(created);
        }
    }

}

