using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("statusupdate")]
    [Authorize]
    public class StatusUpdateController:ControllerBase
    {
        private StatusUpdateService statusUpdateService;
        public StatusUpdateService (StatusUpdateService _statusUpdateService)
        {
            statusUpdateService = _statusUpdateService;
        }

    }
}
