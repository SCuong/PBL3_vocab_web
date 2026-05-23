using System.Diagnostics;
using System.Net;
using System.Net.Mail;

namespace VocabLearning.Services
{
    public class PasswordResetEmailService : IPasswordResetEmailService
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

            var parsedEnableSsl = false;
            var enableSslConfigured = !string.IsNullOrWhiteSpace(enableSslText)
                && bool.TryParse(enableSslText, out parsedEnableSsl);
            var enableSsl = enableSslConfigured
                ? parsedEnableSsl
                : parsedPort == 587;

            using var message = new MailMessage
            {
                From = new MailAddress(fromEmail!, string.IsNullOrWhiteSpace(fromName) ? "VocabLearning" : fromName),
                Subject = subject,
                IsBodyHtml = true,
                Body = htmlBody
            };

            message.To.Add(toEmail);

            var timeoutSeconds = 30;
            var timeoutText = configuration["Smtp:TimeoutSeconds"];
            if (!string.IsNullOrWhiteSpace(timeoutText)
                && int.TryParse(timeoutText, out var parsedTimeout)
                && parsedTimeout > 0)
            {
                timeoutSeconds = parsedTimeout;
            }

            using var smtpClient = new SmtpClient(host, parsedPort)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(user, password),
                Timeout = timeoutSeconds * 1000
            };

            logger.LogInformation(
                "{Action} SMTP config checked (hostConfigured={HostConfigured}, port={Port}, ssl={Ssl}, usernameConfigured={UsernameConfigured}, fromEmailConfigured={FromEmailConfigured}, passwordConfigured={PasswordConfigured}, timeoutSec={TimeoutSeconds}) to {Email}.",
                logAction,
                !string.IsNullOrWhiteSpace(host),
                parsedPort,
                enableSsl,
                !string.IsNullOrWhiteSpace(user),
                !string.IsNullOrWhiteSpace(fromEmail),
                !string.IsNullOrWhiteSpace(password),
                timeoutSeconds,
                toEmail);

            if (!enableSslConfigured && parsedPort == 587)
            {
                logger.LogWarning(
                    "{Action} SMTP EnableSsl was not configured; defaulting to true for port 587.",
                    logAction);
            }

            if (parsedPort == 587 && !enableSsl)
            {
                logger.LogWarning(
                    "{Action} SMTP config uses port 587 with ssl=false. Gmail requires port 587 with ssl=true.",
                    logAction);
            }

            if (IsGmailSmtpHost(host!) && (parsedPort != 587 || !enableSsl))
            {
                logger.LogWarning(
                    "{Action} Gmail SMTP config should use port 587 with ssl=true.",
                    logAction);
            }

            if (!string.Equals(fromEmail, user, StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning(
                    "{Action} SMTP FromEmail differs from Username. Gmail may reject send unless the sender address is allowed.",
                    logAction);
            }

            logger.LogInformation(
                "{Action} SMTP send started to {Email}.",
                logAction,
                toEmail);

            var stopwatch = Stopwatch.StartNew();
            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
            try
            {
                await smtpClient.SendMailAsync(message, linkedCts.Token);
            }
            catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
            {
                logger.LogError("{Action} email timed out after {TimeoutSeconds}s to {Email}.", logAction, timeoutSeconds, toEmail);
                throw new TimeoutException($"SMTP send timed out after {timeoutSeconds}s.");
            }

            logger.LogInformation(
                "{Action} email sent successfully to {Email} in {ElapsedMs}ms.",
                logAction, toEmail, stopwatch.ElapsedMilliseconds);
        }

        private static bool IsGmailSmtpHost(string host)
        {
            return host.Equals("smtp.gmail.com", StringComparison.OrdinalIgnoreCase)
                || host.EndsWith(".gmail.com", StringComparison.OrdinalIgnoreCase);
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
