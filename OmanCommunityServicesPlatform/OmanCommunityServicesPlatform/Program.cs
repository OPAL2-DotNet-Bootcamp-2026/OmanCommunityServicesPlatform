using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using OmanCommunityServicesPlatform.Repositories;
using OmanCommunityServicesPlatform.Services;
using Serilog;
using System.Text;
using System.Threading.RateLimiting;

namespace OmanCommunityServicesPlatform
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // Bootstrap logger — catches errors during startup, before full config loads
            Log.Logger = new LoggerConfiguration()
                .WriteTo.Console()
                .CreateBootstrapLogger();

            try
            {
                var builder = WebApplication.CreateBuilder(args);

                // Replace the default logging providers with Serilog,
                // reading configuration from appsettings.json
                builder.Host.UseSerilog((context, services, configuration) => configuration
                    .ReadFrom.Configuration(context.Configuration)
                    .ReadFrom.Services(services)
                    .Enrich.FromLogContext()
                    .Enrich.WithMachineName()
                    .Enrich.WithThreadId());

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
                var jwtKey = builder.Configuration["JwtSettings:SecretKey"];
                var jwtIssuer = builder.Configuration["JwtSettings:Issuer"];
                var jwtAudience = builder.Configuration["JwtSettings:Audience"];
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

                // Register Controllers
                builder.Services.AddControllers();

                // Register Rate Limiter 
                builder.Services.AddRateLimiter(options =>
                {
                    options.AddFixedWindowLimiter("CreatePolicy", limiterOptions =>
                    {
                        limiterOptions.PermitLimit = 2; 
                        limiterOptions.Window = TimeSpan.FromSeconds(30);

                        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
                        limiterOptions.QueueLimit = 0;
                    });

                    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                });

                // Swagger
                builder.Services.AddEndpointsApiExplorer();

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

                var app = builder.Build();

                // Global exception handling middleware
                app.UseExceptionHandler(errorApp =>
                {
                    errorApp.Run(async context =>
                    {
                        var exceptionHandlerPathFeature = context.Features.Get<IExceptionHandlerPathFeature>();
                        Log.Error(exceptionHandlerPathFeature?.Error, "Unhandled exception on {Path}", context.Request.Path);
                        context.Response.StatusCode = 500;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync("{\"message\":\"An unexpected error occurred.\"}");
                    });
                });

                // Log every HTTP request (method, path, status code, duration) automatically
                app.UseSerilogRequestLogging();

                // Configure the HTTP request pipeline.
                if (app.Environment.IsDevelopment())
                {
                    app.UseSwagger();
                    app.UseSwaggerUI();
                }

                app.UseHttpsRedirection();

                app.UseAuthentication();
                app.UseAuthorization();

                app.UseRateLimiter();

                app.MapControllers();

                Log.Information("Starting OCSP web host");
                app.Run();
            }
            catch (Exception ex)
            {
                Log.Fatal(ex, "OCSP host terminated unexpectedly");
            }
            finally
            {
                Log.CloseAndFlush();
            }
        }
    }
}
