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
            await SendEmailAsync(
                toEmail,
                "Dat lai mat khau VocabLearning",
                BuildPasswordResetHtmlBody(username, resetLink),
                "Password reset",
                cancellationToken);
        }

        public async Task SendEmailVerificationEmailAsync(
            string toEmail,
            string username,
            string verificationLink,
            CancellationToken cancellationToken = default)
        {
            await SendEmailAsync(
                toEmail,
                "Xac minh email VocabLearning",
                BuildEmailVerificationHtmlBody(username, verificationLink),
                "Email verification",
                cancellationToken);
        }

        private async Task SendEmailAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string logAction,
            CancellationToken cancellationToken)
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

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail!, string.IsNullOrWhiteSpace(fromName) ? "VocabLearning" : fromName),
                Subject = subject,
                IsBodyHtml = true,
                Body = htmlBody
            };

            message.To.Add(toEmail);

            using var smtpClient = new SmtpClient(host, parsedPort)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(user, password)
            };

            cancellationToken.ThrowIfCancellationRequested();
            await smtpClient.SendMailAsync(message);
            cancellationToken.ThrowIfCancellationRequested();

            logger.LogInformation("{Action} email sent successfully to {Email}.", logAction, toEmail);
        }

        private static string BuildPasswordResetHtmlBody(string username, string resetLink)
        {
            var displayName = string.IsNullOrWhiteSpace(username) ? "ban" : WebUtility.HtmlEncode(username);
            var safeLink = WebUtility.HtmlEncode(resetLink);

            return $@"<p>Chao {displayName},</p>
<p>Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan VocabLearning cua ban.</p>
<p>Hay nhan vao lien ket duoi day de tao mat khau moi. Lien ket nay co hieu luc trong 30 phut:</p>
<p><a href=""{safeLink}"">Dat lai mat khau</a></p>
<p>Neu ban khong yeu cau thao tac nay, ban co the bo qua email.</p>";
        }

        private static string BuildEmailVerificationHtmlBody(string username, string verificationLink)
        {
            var displayName = string.IsNullOrWhiteSpace(username) ? "ban" : WebUtility.HtmlEncode(username);
            var safeLink = WebUtility.HtmlEncode(verificationLink);

            return $@"<p>Chao {displayName},</p>
<p>Cam on ban da dang ky VocabLearning.</p>
<p>Hay nhan vao lien ket duoi day de xac minh email. Lien ket nay co hieu luc trong 24 gio va chi dung duoc mot lan:</p>
<p><a href=""{safeLink}"">Xac minh email</a></p>
<p>Neu ban khong tao tai khoan nay, hay bo qua email.</p>";
        }
    }
}
