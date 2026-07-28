using System.Net;
using System.Net.Mail;

namespace OmanCommunityServicesPlatform.Services
{
    public class EmailService
    {
        private readonly IConfiguration config;
        private readonly ILogger<EmailService> logger;

        public EmailService(IConfiguration _config, ILogger<EmailService> _logger)
        {
            config = _config;
            logger = _logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                string? host = config["Smtp:Host"];
                string? user = config["Smtp:User"];
                string? password = config["Smtp:Password"];
                string? from = config["Smtp:From"] ?? user;

                // Safely parse port with default 587 fallback
                if (!int.TryParse(config["Smtp:Port"], out int port))
                {
                    port = 587;
                }

                // If configuration is missing completely, skip sending gracefully
                if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(password))
                {
                    logger.LogWarning("SMTP settings are missing or incomplete in appsettings. Skipping email delivery to {ToEmail}.", toEmail);
                    return;
                }

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(user, password),
                    EnableSsl = true
                };

                using var message = new MailMessage(from, toEmail, subject, body)
                {
                    IsBodyHtml = true
                };

                await client.SendMailAsync(message);
                logger.LogInformation("Email sent successfully to {ToEmail}.", toEmail);
            }
            catch (Exception ex)
            {
                // Log the exception but NEVER let an email failure break the API request
                logger.LogError(ex, "Failed to send email notification to {ToEmail}.", toEmail);
            }
        }
    }
}