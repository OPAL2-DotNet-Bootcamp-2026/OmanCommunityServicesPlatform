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


    }
}
