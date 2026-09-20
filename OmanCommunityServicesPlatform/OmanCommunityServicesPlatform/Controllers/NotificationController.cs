using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Models;
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
            // Get the authenticated user ID from the JWT token
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }

            // Ask the Service to find the Notification.
            NotificationResponseDto? notification =
                notificationService.GetNotificationById(
                    notificationId
                );

            // Return 404 when the Notification does not exist.
            if (notification == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Notification not found",
                    detail: "Notification was not found."
                );
            }
            // A User must not view another User's Notification.
            //
            // Admins may view any Notification.
            bool isAdmin = User.IsInRole("Admin");

            if (notification.userId != userId && !isAdmin)
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
            // Get the authenticated user ID from the JWT token
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
            // The Service may return null when the User
            // does not exist.
            List<NotificationResponseDto>? notifications =
                notificationService.GetNotificationsByUserId(
                    userId
                );

            if (notifications == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "User not found",
                    detail: "User was not found."
                );
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
            // Get the authenticated user ID from the JWT token
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
            // Get only unread Notifications for this User.
            List<NotificationResponseDto>? notifications =
                notificationService.GetUnreadNotificationsByUserId(
                        userId);
            if (notifications == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "User not found",
                    detail: "User was not found."
                );
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
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Notification creation failed",
                    detail:
                        "The Notification could not be created. " +
                        "The User or Issue may not exist, " +
                        "or an identical Notification may already exist."
                );
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
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Notification update failed",
                    detail:
                        "The Notification could not be updated. " +
                        "It may not exist, or another identical " +
                        "Notification may already exist."
                );
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
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }

            // Find the Notification first so the Controller
            // can verify ownership.
            NotificationResponseDto? notification =
                notificationService.GetNotificationById(
                    notificationId
                );

            if (notification == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Notification not found",
                    detail: "Notification was not found."
                );
            }

            // A User can change only their own
            // Notification's read status.
            if (notification.userId != userId)
            {
                return Forbid();
            }
            // Update isRead using the value from the DTO.
            bool updated =
                notificationService
                    .UpdateNotificationReadStatus(
                        notificationId,
                        dto
                    );
            if (!updated)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Notification update failed",
                    detail: "The Notification read status could not be updated."
                );
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
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
        

            // Find the Notification before changing it.
            NotificationResponseDto? notification =
                notificationService.GetNotificationById(
                    notificationId
                );

            if (notification == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Notification not found",
                    detail: "Notification was not found."
                );
            }
            // Prevent a User from marking another User's
            // Notification as read.
            if (notification.userId != userId)
            {
                return Forbid();
            }

            // Ask the Service to mark the Notification as read.
            bool markedAsRead =
                notificationService.MarkNotificationAsRead(
                    notificationId
                );

            if (!markedAsRead)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Notification update failed",
                    detail: "The Notification could not be marked as read."
                );
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
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized();
            }
            // Find the Notification first.
            NotificationResponseDto? notification =
                notificationService.GetNotificationById(
                    notificationId
                );

            if (notification == null)
            {
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Notification not found",
                    detail: "Notification was not found."
                );
            }
        
            // The owner or an Admin can delete
            // the Notification.
            bool isAdmin = User.IsInRole("Admin");

            if (
                notification.userId != userId &&
                !isAdmin
            )
            {
                return Forbid();
            }

            // Ask the Service to delete the Notification.
            bool deleted =
                notificationService.DeleteNotification(
                    notificationId
                );

            if (!deleted)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Notification deletion failed",
                    detail: "The Notification could not be deleted."
                );
            }
            return Ok(new
            {
                message =
                   "Notification deleted successfully."
            });
        }
      
    }

}

    

