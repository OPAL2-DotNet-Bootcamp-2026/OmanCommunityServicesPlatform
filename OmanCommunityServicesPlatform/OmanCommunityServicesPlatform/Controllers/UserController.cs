using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("user")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private UserService userService;

        public UserController(UserService _userService)
        {
            userService = _userService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterUserDto dto)
        {
            UserSummaryDto created = userService.RegisterUser(dto);

            if (created == null)
            {
                return BadRequest(new { message = "Email is already registered." });
            }

            return Ok(created);
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            LoginResponseDto result = userService.LoginUser(dto);

            if (result == null)
            {
                return Unauthorized();
            }

            return Ok(result);
        }

        [HttpPut("{id}/UpdateProfile")]
        public IActionResult UpdateProfile([FromRoute] int id, [FromBody] UpdateProfileDto dto)
        {
            UpdateProfileDto updated = userService.UpdateUserProfile(id, dto);

            if (updated == null)
            {
                return NotFound(new { message = $"User with ID {id} was not found."});
            }

            return Ok(updated);
        }

        // Admin Use this to change another user role
        [HttpPut("ChangeRole")]
        [Authorize(Roles = "Admin")]
        public IActionResult ChangeRole([FromBody] ChangeUserRoleDto dto)
        {
            UserSummaryDto changed = userService.ChangeUserRole(dto);

            if (changed == null)
            {
                return NotFound(new { message = $"User with ID {dto.userId} was not found."}); // User to change role in the DTO
            }

            return Ok(changed);
        }

        // Admin use only — deactivates another user's account
        [HttpPatch("deactivate")]
        [Authorize(Roles = "Admin")]
        public IActionResult Deactivate([FromBody] int userId)
        {
            // Get admin ID from the token to make sure does not deactivate himself
            var claim = User.FindFirst("userId");
            if (claim == null || !int.TryParse(claim.Value, out int requestingAdminId))
            {
                return Unauthorized();
            }

            bool deactivated = userService.DeactivateUser(userId, requestingAdminId);

            if (!deactivated)
            {
                return BadRequest(new { message = $"Unable to deactivate user with ID {userId}." });
            }

            return Ok(new { message = $"User with ID {userId} has been deactivated." });
        }
    }
}
