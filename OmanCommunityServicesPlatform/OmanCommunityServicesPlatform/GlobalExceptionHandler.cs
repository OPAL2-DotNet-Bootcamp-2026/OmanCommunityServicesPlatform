using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace OmanCommunityServicesPlatform
{
        // Handles all unexpected exceptions in one central place
        public class GlobalExceptionHandler : IExceptionHandler
        {
            private readonly ILogger<GlobalExceptionHandler> _logger;
            private readonly IProblemDetailsService _problemDetailsService;
            private readonly IHostEnvironment _environment;

            public GlobalExceptionHandler(
                ILogger<GlobalExceptionHandler> logger,
                IProblemDetailsService problemDetailsService,
                IHostEnvironment environment)
            {
                _logger = logger;
                _problemDetailsService = problemDetailsService;
                _environment = environment;
            }

            public async ValueTask<bool> TryHandleAsync(
                HttpContext httpContext,
                Exception exception,
                CancellationToken cancellationToken)
            {
                // Save the full exception in the server log
                _logger.LogError(
                    exception,
                    "Unhandled exception. TraceId: {TraceId}",
                    httpContext.TraceIdentifier);

                // Return HTTP 500
                httpContext.Response.StatusCode =
                    StatusCodes.Status500InternalServerError;

                var problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Internal Server Error",

                    // Show the exception message only in Development.
                    // Never expose internal details in Production.
                    Detail = _environment.IsDevelopment()
                        ? exception.Message
                        : "An unexpected error occurred."
                };

                // Return the error using the standard Problem Details format
                return await _problemDetailsService.TryWriteAsync(
                    new ProblemDetailsContext
                    {
                        HttpContext = httpContext,
                        ProblemDetails = problemDetails
                    });
            }
        }
    }


