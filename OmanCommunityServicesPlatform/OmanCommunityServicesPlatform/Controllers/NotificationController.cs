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

            // Ask the Service to find the Notification.
            NotificationResponseDto? notification =
                notificationService.GetNotificationById(
                    notificationId
                );

            // Return 404 when the Notification does not exist.
            if (notification == null)
            {
                return NotFound(new
                {
                    message = "Notification was not found."
                });
            }
            // A User must not view another User's Notification.
            //
            // Admins may view any Notification.
            bool isAdmin = User.IsInRole("Admin");

            if (
                notification.userId != authenticatedUserId.Value &&
                !isAdmin
            )
            {
                return Forbid();
            }

            return Ok(notification);
        }

        // --------------------------------------------------
        // GET MY NOTIFICATIONS
        // GET: /notification/my
        // --------------------------------------------------

        [HttpGet("my")]
        public IActionResult GetMyNotifications()
        {
            // Read the logged-in User's ID from JWT.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
            // The Service may return null when the User
            // does not exist.
            List<NotificationResponseDto>? notifications =
                notificationService.GetNotificationsByUserId(
                    userId.Value
                );

            if (notifications == null)
            {
                return NotFound(new
                {
                    message = "User was not found."
                });
            }

            if (notifications.Count == 0)
            {
                return NoContent();
            }

            return Ok(notifications);
        }

        // --------------------------------------------------
        // GET MY UNREAD NOTIFICATIONS
        // GET: /notification/my/unread
        // --------------------------------------------------

        [HttpGet("my/unread")]
        public IActionResult GetMyUnreadNotifications()
        {
            // Read the logged-in User ID from JWT.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
        }
    }

    
}
