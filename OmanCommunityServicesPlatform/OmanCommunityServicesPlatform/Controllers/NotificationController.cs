using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    }
}
