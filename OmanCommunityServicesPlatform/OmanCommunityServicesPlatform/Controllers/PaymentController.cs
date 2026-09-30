using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OmanCommunityServicesPlatform.DTOs;
using OmanCommunityServicesPlatform.Services;

namespace OmanCommunityServicesPlatform.Controllers
{
    [ApiController]
    [Route("payment")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly PaymentService paymentService;

        public PaymentController(PaymentService _paymentService)
        {
            paymentService = _paymentService;
        }

        // Step 1 CREATE (#137): open a checkout session, return Thawani's pay URL.
        [HttpPost("checkout")]
        [Authorize(Roles = "Citizen")]
        [EnableRateLimiting("CreatePolicy")]
        public IActionResult Checkout([FromBody] CreateCheckoutDto dto)
        {
            return NotBuiltYet("Step 1 CREATE — issue #137");
        }

        // Step 3 CONFIRM (#139): the payment's status, confirmed with Thawani.
        [HttpGet("{paymentId}")]
        [Authorize(Roles = "Citizen")]
        public IActionResult GetStatus([FromRoute] int paymentId)
        {
            return NotBuiltYet("Step 3 CONFIRM — issue #139");
        }

        // Step 4 WEBHOOK (#140): Thawani calls this directly, so it can't need a
        // token. Never trust the body — confirm with Thawani via ConfirmAsync.
        [HttpPost("webhook")]
        [AllowAnonymous]
        public IActionResult Webhook()
        {
            return NotBuiltYet("Step 4 WEBHOOK — issue #140");
        }

        private IActionResult NotBuiltYet(string step)
        {
            return Problem(
                statusCode: StatusCodes.Status501NotImplemented,
                title: "Not built yet",
                detail: step
            );
        }
    }
}
