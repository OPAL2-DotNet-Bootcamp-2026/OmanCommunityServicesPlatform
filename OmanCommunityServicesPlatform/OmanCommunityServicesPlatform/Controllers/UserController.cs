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

        [HttpPut("UpdateProfile/{id}")]
        public IActionResult UpdateProfile(int id, UpdateProfileDto dto)
        {
            UpdateProfileDto updated = userService.UpdateUserProfile(id, dto);

            if (updated == null)
            {
                return NotFound(new { message = $"User with ID {id} was not found."});
            }

            return Ok(updated);
        }

        // Admin Use this to chnage another user role
        [HttpPut("ChangeRole")]
        [Authorize(Roles = "Admin")]
        public IActionResult ChangeRole(ChangeUserRoleDto dto)
        {
            UserSummaryDto changed = userService.ChangeUserRole(dto);

            if (changed == null)
            {
                return NotFound(new { message = $"User with ID {dto.userId} was not found."}); // User to change role in the DTO
            }

            return Ok(changed);
        }
    }
}
