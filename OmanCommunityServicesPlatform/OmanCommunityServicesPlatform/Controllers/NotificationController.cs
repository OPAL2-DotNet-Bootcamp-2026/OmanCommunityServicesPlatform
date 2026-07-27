using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("notification")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
    }
}
