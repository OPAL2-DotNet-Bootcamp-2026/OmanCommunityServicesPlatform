using System.Net;
using System.Net.Mail;

namespace OmanCommunityServicesPlatform.Services
{
    public class EmailService
    {
        private readonly IConfiguration config;

        public EmailService(IConfiguration _config)
        {
            config = _config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            string host = config["Smtp:Host"];
            int port = int.Parse(config["Smtp:Port"]);
            string user = config["Smtp:User"];
            string password = config["Smtp:Password"];
            string from = config["Smtp:From"];

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
        }
    }
}