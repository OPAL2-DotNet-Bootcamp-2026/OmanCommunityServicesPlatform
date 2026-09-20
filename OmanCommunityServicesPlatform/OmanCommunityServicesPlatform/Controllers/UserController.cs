using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;
using OmanCommunityServicesPlatform;
using Microsoft.AspNetCore.RateLimiting;

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
        public async Task<IActionResult> Register([FromBody] RegisterUserDto dto)
        {
            UserSummaryDto? created = await userService.RegisterUser(dto);

            if (created == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Registration failed",
                    detail: "Email is already registered."
                );
            }

            return Ok(created);
        }

        [AllowAnonymous]
        [EnableRateLimiting("LoginPolicy")]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            LoginResponseDto? result = await userService.LoginUser(dto);

            if (result == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status401Unauthorized,
                    title: "Authentication failed",
                    detail: "Invalid email or password."
                );
            }

            return Ok(result);
        }

        [Authorize]
        [HttpPatch("{id}/update-profile")]
        public IActionResult UpdateProfile([FromRoute] int id, [FromBody] UpdateProfileDto dto)
        {
            // Get the current user ID from the JWT token
            if (!User.TryGetUserId(out int requestingUserId))
            {
                return Unauthorized();
            }
            // A user can only update their own profile
            if (id != requestingUserId)
            {
                return Forbid();
            }

            UpdateProfileDto? updated = userService.UpdateUserProfile(id, dto);

            if (updated == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "User not found",
                    detail: $"User with ID {id} was not found."
                );
            }

            return Ok(updated);
        }

        // Admin Use this to change another user role
        [HttpPatch("change-role")]
        [Authorize(Roles = "Admin")]
        public IActionResult ChangeRole([FromBody] ChangeUserRoleDto dto)
        {
            UserSummaryDto changed = userService.ChangeUserRole(dto);

            if (changed == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "User not found",
                    detail: $"User with ID {dto.userId} was not found."
                );
            }

            return Ok(changed);
        }

        // Admin uses this to assign a Staff/Admin user to a department
        [HttpPatch("assign-department")]
        [Authorize(Roles = "Admin")]
        public IActionResult AssignDepartment([FromBody] AssignDepartmentDto dto)
        {
            AssignDepartmentResponseDto response = userService.AssignDepartment(dto);

            if (response == null)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Unable to assign department",
                    detail: "Check that the user exists, the department exists, and the user is Staff or Admin."
                );
            }

            return Ok(response);
        }

        // Admin use only — deactivates another user's account
        [HttpPatch("{userId}/deactivate")]
        [Authorize(Roles = "Admin")]
        public IActionResult Deactivate([FromRoute] int userId)
        {
            // Get the current admin ID from the JWT token
            if (!User.TryGetUserId(out int requestingAdminId))
            {
                return Unauthorized();
            }

            bool deactivated = userService.DeactivateUser(userId, requestingAdminId);

            if (!deactivated)
            {
                // Return a standard Problem Details response
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Unable to deactivate user",
                    detail: $"Unable to deactivate user with ID {userId}."
                );
            }

            return Ok(new { message = $"User with ID {userId} has been deactivated." });
        }
    }
}
