using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;
using System.Security.Claims;

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

            // The Service checks ownership; Admins may view any notification.
            bool isAdmin = User.IsInRole("Admin");
            NotificationResponseDto? notification =
                notificationService.GetNotificationById(
                    notificationId,
                    authenticatedUserId.Value,
                    isAdmin
                );

            // Use the same 404 for missing and inaccessible notifications.
            if (notification == null)
            {
                return NotFound(new
                {
                    message = "Notification was not found."
                });
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
            // Get only unread Notifications for this User.
            List<NotificationResponseDto>? notifications =
                notificationService
                    .GetUnreadNotificationsByUserId(
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
        // CREATE NOTIFICATION
        // POST: /notification/user/5
        // --------------------------------------------------

        // Normally Notifications are created by the system
        // or an Admin, not manually by a Citizen.
        [Authorize(Roles = "Admin")]
        [HttpPost("user/{userId}")]
        public IActionResult CreateNotification(
            [FromRoute] int userId,
            [FromBody] CreateNotificationDTO dto
        )
        {
            // Ask the Service to create a Notification
            // for the User specified in the route.
            NotificationResponseDto? createdNotification =
                notificationService.CreateNotification(
                    dto,
                    userId
                );
            if (createdNotification == null)
            {
                return BadRequest(new
                {
                    message =
                        "The Notification could not be created. " +
                        "The User or Issue may not exist, " +
                        "or an identical Notification may already exist."
                });
            }
            // Return 201 Created with the created Notification.
            return CreatedAtAction(
                nameof(GetNotificationById),
                new
                {
                    notificationId =
                        createdNotification.notificationId
                },
                createdNotification
            );

        }

        // --------------------------------------------------
        // UPDATE NOTIFICATION MESSAGE AND TYPE
        // PUT: /notification/5
        // --------------------------------------------------

        // Changing the Notification message and type
        // should normally be restricted to Admin.
        [Authorize(Roles = "Admin")]
        [HttpPut("{notificationId}")]
        public IActionResult UpdateNotification(
            [FromRoute] int notificationId,
            [FromBody] UpdateNotificationDTO dto
        )
        {
            // Ask the Service to update the Notification.
            bool updated =
                notificationService.UpdateNotification(
                    notificationId,
                    dto
                );
            // False means:
            // 1. The Notification does not exist.
            // 2. The update would create a duplicate.
            if (!updated)
            {
                return BadRequest(new
                {
                    message =
                        "The Notification could not be updated. " +
                        "It may not exist, or another identical " +
                        "Notification may already exist."
                });
            }

            return Ok(new
            {
                message =
                    "Notification updated successfully."
            });
        }

        // --------------------------------------------------
        // UPDATE READ STATUS
        // PATCH: /notification/5/read-status
        // --------------------------------------------------

        [HttpPatch("{notificationId}/read-status")]
        public IActionResult UpdateNotificationReadStatus(
            [FromRoute] int notificationId,
            [FromBody] UpdateNotificationReadStatusDTO dto
        )
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
            // Update isRead using the value from the DTO.
            bool updated =
                notificationService
                    .UpdateNotificationReadStatus(
                        notificationId,
                        userId.Value,
                        dto
                    );

            if (!updated)
            {
                return NotFound(new
                {
                    message = "Notification was not found."
                });
            }
            return Ok(new
            {
                message =
                    "Notification read status updated successfully."
            });

        }
        // --------------------------------------------------
        // MARK NOTIFICATION AS READ
        // PATCH: /notification/5/read
        // --------------------------------------------------

        [HttpPatch("{notificationId}/read")]
        public IActionResult MarkNotificationAsRead(
            [FromRoute] int notificationId
        )
        {
            // Read the logged-in User ID.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }

            // Ask the Service to mark the Notification as read.
            bool markedAsRead =
                notificationService.MarkNotificationAsRead(
                    notificationId,
                    userId.Value
                );

            if (!markedAsRead)
            {
                return NotFound(new
                {
                    message = "Notification was not found."
                });
            }
            return Ok(new
            {
                message =
                   "Notification marked as read successfully."
            });

        }
        // --------------------------------------------------
        // DELETE NOTIFICATION
        // DELETE: /notification/5
        // --------------------------------------------------

        [HttpDelete("{notificationId}")]
        public IActionResult DeleteNotification(
            [FromRoute] int notificationId
        )
        {
            // Read the logged-in User's ID.
            int? userId = GetAuthenticatedUserId();

            if (userId == null)
            {
                return Unauthorized(new
                {
                    message =
                        "The authenticated User ID was not found."
                });
            }
            // The Service allows the recipient or an Admin to delete it.
            bool isAdmin = User.IsInRole("Admin");

            // Ask the Service to delete the Notification.
            bool deleted =
                notificationService.DeleteNotification(
                    notificationId,
                    userId.Value,
                    isAdmin
                );

            if (!deleted)
            {
                return NotFound(new
                {
                    message = "Notification was not found."
                });
            }
            return Ok(new
            {
                message =
                   "Notification deleted successfully."
            });
        }
        // --------------------------------------------------
        // GET AUTHENTICATED USER ID
        // --------------------------------------------------

        // Reads the "userId" claim from the JWT token.
        private int? GetAuthenticatedUserId()
        {
            // JWT claim values are stored as strings.
            string? userIdValue =
                User.FindFirstValue("userId");

            // Convert the claim from string to integer.
            bool converted = int.TryParse(
                userIdValue,
                out int userId
            );

            // Return null when the claim is missing
            // or does not contain a valid integer.
            if (!converted)
            {
                return null;
            }

            return userId;
        }
    }

}

    

