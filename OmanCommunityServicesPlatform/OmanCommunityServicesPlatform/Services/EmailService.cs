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
                string? portStr = config["Smtp:Port"];
                string? user = config["Smtp:User"];
                string? password = config["Smtp:Password"];
                string? from = config["Smtp:From"];

                if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(portStr) || string.IsNullOrEmpty(from))
                {
                    logger.LogWarning("SMTP configuration is missing. Skipping email send to {ToEmail} with subject {Subject}", toEmail, subject);
                    return;
                }

                int port = int.Parse(portStr);

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
                logger.LogInformation("Email sent successfully to {ToEmail} with subject {Subject}", toEmail, subject);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send email to {ToEmail} with subject {Subject}", toEmail, subject);
            }
        }
    }
}