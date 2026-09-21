using Serilog;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OmanCommunityServicesPlatform.Repositories;
using OmanCommunityServicesPlatform.Services;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using Microsoft.AspNetCore.HttpOverrides;
namespace OmanCommunityServicesPlatform
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            // Replaces the default logging providers. Services keep injecting
            // ILogger<T>; configuration lives in appsettings.json so levels can
            // change on a deployed server without a rebuild.
            builder.Host.UseSerilog((context, services, configuration) => configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext());
            // Register Problem Details so API errors use a standard format
            builder.Services.AddProblemDetails(options =>
            {
                options.CustomizeProblemDetails = context =>
                {
                    // Add a trace ID to help match API errors with server logs
                    context.ProblemDetails.Extensions["traceId"] =
                        context.HttpContext.TraceIdentifier;

            

                    // Add the endpoint where the error happened
                    context.ProblemDetails.Instance =
                        context.HttpContext.Request.Path;
                };
            });

            // Register the global exception handler
            builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

            // Add services to the container.

            builder.Services.AddDbContext<OCSPContext>(options =>
            options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Repositories
            builder.Services.AddScoped<UserRepo>();
            builder.Services.AddScoped<AttachmentRepo>();
            builder.Services.AddScoped<CategoryRepo>();
            builder.Services.AddScoped<DepartmentRepo>();
            builder.Services.AddScoped<IssueRepo>();
            builder.Services.AddScoped<NotificationRepo>();
            builder.Services.AddScoped<RatingRepo>();
            builder.Services.AddScoped<RegionRepo>();
            builder.Services.AddScoped<StatusUpdateRepo>();
            builder.Services.AddScoped<CommentRepo>();

            // Services
            builder.Services.AddScoped<UserService>();
            builder.Services.AddScoped<AttachmentService>();
            builder.Services.AddScoped<CategoryService>();
            builder.Services.AddScoped<DepartmentService>();
            builder.Services.AddScoped<IssueService>();
            builder.Services.AddScoped<NotificationService>();
            builder.Services.AddScoped<RatingService>();
            builder.Services.AddScoped<RegionService>();
            builder.Services.AddScoped<StatusUpdateService>();
            builder.Services.AddScoped<CommentService>();
            builder.Services.AddScoped<EmailService>();

            // Register AuthService 
            builder.Services.AddScoped<AuthService>();
            // Read JWT settings from appsettings.json 
            // Committed on purpose so the project runs with no setup. Mirrors the value
            // in appsettings.json - change both together.
            const string DevelopmentKey = "YourSuperSecretKeyThatIsAtLeast32CharactersLong!";

            var jwtKey = builder.Configuration["JwtSettings:SecretKey"];
            var jwtIssuer = builder.Configuration["JwtSettings:Issuer"];
            var jwtAudience = builder.Configuration["JwtSettings:Audience"];

            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
            {
                throw new InvalidOperationException(
                    "JwtSettings:SecretKey is missing or shorter than 32 characters. " +
                    "Set JwtSettings__SecretKey to a 32+ character random value.");
            }

            // The whole point of A05: a deployment must never run on the key that is
            // published in this repository.
            if (!builder.Environment.IsDevelopment() && jwtKey == DevelopmentKey)
            {
                throw new InvalidOperationException(
                    "The development JWT key cannot be used outside Development. " +
                    "Set JwtSettings__SecretKey to a real 32+ character random value.");
            }
            // Configure how incoming tokens are validated
            builder.Services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true, // reject expired tokens
                    ValidateIssuerSigningKey = true, // verify the signature
                    ValidIssuer = jwtIssuer,
                    ValidAudience = jwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtKey))
                };
            });
            builder.Services.AddAuthorization();
            // Use the real client IP when the application is behind a proxy
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders =
                    ForwardedHeaders.XForwardedFor |
                    ForwardedHeaders.XForwardedProto;
            });
            // Register Controllers
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

            // Register Rate Limiter
            builder.Services.AddRateLimiter(options =>
            {
              
                // Each authenticated user gets their own rate-limit bucket.
                // If the user is not authenticated, fall back to IP address.
                options.AddPolicy<string>("CreatePolicy", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: ResolvePartitionKey(context),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromSeconds(30),

                            // Do not queue extra requests
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst, QueueLimit = 0,
                            AutoReplenishment = true
                        }));

            
                // Login users do not have a JWT yet,
                // so the rate limit is based on IP address.
                options.AddPolicy<string>("LoginPolicy", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: $"ip:{GetClientIp(context)}",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            // Allow 5 login attempts every 5 minutes per IP
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(5),

                            QueueProcessingOrder =
                                QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,

                            AutoReplenishment = true
                        }));

                // Default HTTP status when a request is rejected
                options.RejectionStatusCode =
                    StatusCodes.Status429TooManyRequests;

                
                // Return the same Problem Details format used
                // by the rest of the API.
                options.OnRejected = async (context, cancellationToken) =>
                {
                    context.HttpContext.Response.StatusCode =
                        StatusCodes.Status429TooManyRequests;

                    int retryAfterSeconds;

                    // Try to get the real retry time from the Rate Limiter
                    if (context.Lease.TryGetMetadata(
                        MetadataName.RetryAfter,
                        out TimeSpan retryAfter))
                    {
                        retryAfterSeconds =
                            Math.Max(1,(int)Math.Ceiling(retryAfter.TotalSeconds));
                    }
                    else
                    {
                       
                        // LoginPolicy = 5 minutes
                        // CreatePolicy = 30 seconds
                        retryAfterSeconds =
                            context.HttpContext.Request.Path
                                .StartsWithSegments("/user/login")
                                ? 300
                                : 30;
                    }

                    // Tell the client how long to wait
                    context.HttpContext.Response.Headers["Retry-After"] =
                        retryAfterSeconds.ToString(
                            CultureInfo.InvariantCulture
                        );

                    // Log the rejected request on the server
                    var logger =
                        context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("RateLimiting");

                    logger.LogWarning(
                        "Rate limit exceeded on {Path} from {Partition}. TraceId: {TraceId}",
                        context.HttpContext.Request.Path,
                        ResolvePartitionKey(context.HttpContext),
                        context.HttpContext.TraceIdentifier
                    );

                    // Use the same Problem Details service from Part A
                    var problemDetailsService =
                        context.HttpContext.RequestServices
                            .GetRequiredService<IProblemDetailsService>();

                    var problemDetails = new ProblemDetails
                    {
                        Type = "https://tools.ietf.org/html/rfc9110#section-15.5.29",
                        Status = StatusCodes.Status429TooManyRequests,
                        Title = "Too many requests",
                        Detail =
                            $"Rate limit exceeded. Try again in {retryAfterSeconds} seconds."
                    };

                    await problemDetailsService.TryWriteAsync(
                        new ProblemDetailsContext
                        {
                            HttpContext = context.HttpContext,
                            ProblemDetails = problemDetails
                        });
                };
            });

            // Swagger
            builder.Services.AddEndpointsApiExplorer();
            //builder.Services.AddSwaggerGen();

            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your JWT token in the box below"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id   = "Bearer"
                            }
                        },
                        new List<string>()
                    }
                });
            });

            // Reports whether this instance can actually serve traffic. A
            // running process is not the same as a working one - the usual
            // failure is a process that is up but cannot reach its database.
            builder.Services.AddHealthChecks()
                .AddDbContextCheck<OCSPContext>("database");

            // CORS Allow requests from different origin (different port => e.g Frontend)
            var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? Array.Empty<string>();

            // An empty allowlist is not an error to CORS, it just blocks everything,
            // and the only symptom shows up in someone else's browser console.
            if (allowedOrigins.Length == 0)
            {
                throw new InvalidOperationException(
                    "AllowedOrigins is empty. Set at least one origin, e.g. http://localhost:4200, " +
                    "in appsettings.json or via AllowedOrigins__0 in production.");
            }

            // Same reason the JWT key is rejected outside Development: shipping
            // with the committed localhost default blocks the real frontend,
            // and nothing in the logs says so.
            if (!builder.Environment.IsDevelopment() &&
                allowedOrigins.Any(o => o.Contains("localhost", StringComparison.OrdinalIgnoreCase)
                                     || o.Contains("127.0.0.1")))
            {
                throw new InvalidOperationException(
                    "AllowedOrigins still contains a localhost origin. " +
                    "Set AllowedOrigins__0 to the deployed frontend's origin.");
            }

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            var app = builder.Build();
            // Read the real client IP and scheme when behind a proxy
            app.UseForwardedHeaders();
            // Handle unexpected exceptions globally
            app.UseExceptionHandler();

            // Convert empty error responses such as 401, 403 and 404
            // into Problem Details responses
            app.UseStatusCodePages();

            // Configure the HTTP request pipeline.

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            if (!app.Environment.IsDevelopment())
            {
                app.UseHsts();
                app.UseHttpsRedirection();
            }

            // Returns the id the framework already logs as RequestId - same name, so
            // a user quoting the header can be found by grepping for it. Not pushed
            // into the log context: it is already there.
            app.Use(async (context, next) =>
            {
                context.Response.Headers["X-Request-Id"] = context.TraceIdentifier;
                await next();
            });

            // One line per request: method, path, status, elapsed ms. Must sit
            // above the middleware it measures - below UseAuthentication it
            // would not count authentication time.
            app.UseSerilogRequestLogging();
            app.UseCors("AllowFrontend");

            app.UseAuthentication();
            app.UseRateLimiter();
            app.UseAuthorization();

           

            app.MapControllers();

            // Anonymous and deliberately terse: it answers Healthy or
            // Unhealthy and nothing else. Anything a monitor can read, an
            // attacker can read too.
            app.MapHealthChecks("/health");

            app.Run();
        }

        // Get a separate rate-limit bucket for each user
        private static string ResolvePartitionKey(HttpContext context)
        {
            if (context.User.Identity?.IsAuthenticated == true &&
                context.User.TryGetUserId(out int userId))
            {
                return $"user:{userId}";
            }

            return $"ip:{GetClientIp(context)}";
        }


        // Get the caller IP address
        private static string GetClientIp(HttpContext context)
        {
            return context.Connection.RemoteIpAddress?.ToString()
                   ?? "unknown";
        }
    }
}
