using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("notification")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        // Service responsible for Notification business logic.
        private readonly NotificationService notificationService;


        // Constructor Dependency Injection
        // ASP.NET Core automatically provides NotificationService
        // when it creates NotificationController.
        public NotificationController(
            NotificationService notificationService
        )
        {
            this.notificationService = notificationService;
        }
    


        // --------------------------------------------------
        // GET ALL NOTIFICATIONS
        // GET: /notification
        // --------------------------------------------------

        // Only an Admin should be able to view
        // every User's Notifications.
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public IActionResult GetAllNotifications()
        {
            // Ask the Service to return all Notifications
            // as NotificationResponseDto objects.
            List<NotificationResponseDto> notifications =
                notificationService.GetAllNotifications();

            // Return 204 when no Notifications exist.
            if (notifications.Count == 0)
            {
                return NoContent();
            }

            // Return 200 with the Notifications.
            return Ok(notifications);
        }

        // --------------------------------------------------
        // GET ONE NOTIFICATION BY ID
        // GET: /notification/5
        // --------------------------------------------------

        [HttpGet("{notificationId}")]
        public IActionResult GetNotificationById(
            [FromRoute] int notificationId
        )
        {
            // Get the authenticated User ID from the JWT token.
            int? authenticatedUserId =
                GetAuthenticatedUserId();

            if (authenticatedUserId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
        }
}
