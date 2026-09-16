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

namespace OmanCommunityServicesPlatform
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
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
            builder.Services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });

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

            // CORS Allow requests from different origin (different port => e.g Frontend)
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            var app = builder.Build();

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
                app.UseHttpsRedirection();
            }

            app.UseCors("AllowFrontend");

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseRateLimiter();

            app.MapControllers();

            app.Run();
        }
    }
}
