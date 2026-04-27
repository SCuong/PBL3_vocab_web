using System.Net;
using System.Net.Mail;
namespace VocabLearning.Services
{
    public class PasswordResetEmailService
    {
        private readonly IConfiguration configuration;
        private readonly ILogger<PasswordResetEmailService> logger;

        public PasswordResetEmailService(
            IConfiguration configuration,
            ILogger<PasswordResetEmailService> logger)
        {
            this.configuration = configuration;
            this.logger = logger;
        }

        public async Task SendPasswordResetEmailAsync(
            string toEmail,
            string username,
            string resetLink,
            CancellationToken cancellationToken = default)
        {
            var host = configuration["Smtp:Host"];
            var portText = configuration["Smtp:Port"];
            var fromEmail = configuration["Smtp:FromEmail"];
            var fromName = configuration["Smtp:FromName"];
            var user = configuration["Smtp:Username"];
            var password = configuration["Smtp:Password"];
            var enableSslText = configuration["Smtp:EnableSsl"];

            var missingConfigurations = new List<string>();

            if (string.IsNullOrWhiteSpace(host))
            {
                missingConfigurations.Add("Smtp:Host");
            }

            var parsedPort = 0;
            var hasValidPort = !string.IsNullOrWhiteSpace(portText) && int.TryParse(portText, out parsedPort);
            if (!hasValidPort)
            {
                missingConfigurations.Add("Smtp:Port");
            }

            if (string.IsNullOrWhiteSpace(fromEmail))
            {
                missingConfigurations.Add("Smtp:FromEmail");
            }

            if (string.IsNullOrWhiteSpace(user))
            {
                missingConfigurations.Add("Smtp:Username");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                missingConfigurations.Add("Smtp:Password");
            }

            if (missingConfigurations.Count > 0)
            {
                throw new InvalidOperationException(
                    $"SMTP configuration is incomplete. Missing settings: {string.Join(", ", missingConfigurations)}.");
            }

            var enableSsl = !string.IsNullOrWhiteSpace(enableSslText)
                && bool.TryParse(enableSslText, out var parsedEnableSsl)
                && parsedEnableSsl;

            var smtpPort = parsedPort;
            var smtpFromEmail = fromEmail!;

            using var message = new MailMessage
            {
                From = new MailAddress(smtpFromEmail, string.IsNullOrWhiteSpace(fromName) ? "VocabLearning" : fromName),
                Subject = "Đặt lại mật khẩu VocabLearning",
                IsBodyHtml = true,
                Body = BuildHtmlBody(username, resetLink)
            };

            message.To.Add(toEmail);

            using var smtpClient = new SmtpClient(host, smtpPort)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            smtpClient.Credentials = new NetworkCredential(user, password);

            cancellationToken.ThrowIfCancellationRequested();
            await smtpClient.SendMailAsync(message);
            cancellationToken.ThrowIfCancellationRequested();

            logger.LogInformation("Password reset email sent successfully to {Email}.", toEmail);
        }

        private static string BuildHtmlBody(string username, string resetLink)
        {
            var displayName = string.IsNullOrWhiteSpace(username) ? "bạn" : WebUtility.HtmlEncode(username);
            var safeLink = WebUtility.HtmlEncode(resetLink);

            return $@"<p>Chào {displayName},</p>
<p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản VocabLearning của bạn.</p>
<p>Hãy nhấn vào liên kết dưới đây để tạo mật khẩu mới. Liên kết này có hiệu lực trong 30 phút:</p>
<p><a href=""{safeLink}"">Đặt lại mật khẩu</a></p>
<p>Nếu bạn không yêu cầu thao tác này, bạn có thể bỏ qua email.</p>";
        }
    }
}
