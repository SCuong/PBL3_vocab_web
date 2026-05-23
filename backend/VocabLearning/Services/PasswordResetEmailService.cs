using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

namespace VocabLearning.Services
{
    public class PasswordResetEmailService : IPasswordResetEmailService
    {
        private const string ResendEndpoint = "https://api.resend.com/emails";

        private readonly IConfiguration configuration;
        private readonly ILogger<PasswordResetEmailService> logger;
        private readonly IHttpClientFactory httpClientFactory;

        public PasswordResetEmailService(
            IConfiguration configuration,
            ILogger<PasswordResetEmailService> logger,
            IHttpClientFactory httpClientFactory)
        {
            this.configuration = configuration;
            this.logger = logger;
            this.httpClientFactory = httpClientFactory;
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

        // Provider router: prefer Resend's HTTPS API (works on hosts that block outbound SMTP
        // ports, e.g. Render Free). Falls back to SMTP when no Resend API key is configured.
        private async Task SendEmailAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string logAction,
            CancellationToken cancellationToken)
        {
            var resendApiKey = configuration["Resend:ApiKey"];
            if (!string.IsNullOrWhiteSpace(resendApiKey))
            {
                await SendViaResendAsync(resendApiKey, toEmail, subject, htmlBody, logAction, cancellationToken);
                return;
            }

            await SendViaSmtpAsync(toEmail, subject, htmlBody, logAction, cancellationToken);
        }

        private async Task SendViaResendAsync(
            string apiKey,
            string toEmail,
            string subject,
            string htmlBody,
            string logAction,
            CancellationToken cancellationToken)
        {
            var fromEmail = configuration["Resend:FromEmail"]
                ?? configuration["Email:FromEmail"]
                ?? configuration["Smtp:FromEmail"];
            var fromName = configuration["Resend:FromName"]
                ?? configuration["Email:FromName"]
                ?? configuration["Smtp:FromName"];
            if (string.IsNullOrWhiteSpace(fromName))
            {
                fromName = "VocabLearning";
            }

            if (string.IsNullOrWhiteSpace(fromEmail))
            {
                throw new InvalidOperationException(
                    "Email sender address is not configured (Resend:FromEmail / Email:FromEmail / Smtp:FromEmail).");
            }

            var timeoutSeconds = ResolveTimeoutSeconds();
            logger.LogInformation(
                "{Action} using Resend HTTP API (fromConfigured={FromConfigured}, timeoutSec={TimeoutSeconds}) to {Email}.",
                logAction,
                !string.IsNullOrWhiteSpace(fromEmail),
                timeoutSeconds,
                toEmail);

            // Resend "from" format: "Display Name <sender@your-verified-domain>".
            var fromHeader = $"{fromName} <{fromEmail}>";
            var payload = new
            {
                from = fromHeader,
                to = new[] { toEmail },
                subject,
                html = htmlBody,
            };
            var json = JsonSerializer.Serialize(payload);

            using var request = new HttpRequestMessage(HttpMethod.Post, ResendEndpoint);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(timeoutSeconds);

            logger.LogInformation("{Action} Resend send started to {Email}.", logAction, toEmail);
            var stopwatch = Stopwatch.StartNew();

            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogError(
                    "{Action} Resend send failed: HTTP {StatusCode} to {Email}. Detail: {Detail}",
                    logAction,
                    (int)response.StatusCode,
                    toEmail,
                    Truncate(body, 500));
                throw new InvalidOperationException($"Resend API returned HTTP {(int)response.StatusCode}.");
            }

            logger.LogInformation(
                "{Action} email sent via Resend to {Email} in {ElapsedMs}ms.",
                logAction,
                toEmail,
                stopwatch.ElapsedMilliseconds);
        }

        private async Task SendViaSmtpAsync(
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
                    $"Email is not configured. Set Resend:ApiKey, or complete SMTP settings. Missing: {string.Join(", ", missingConfigurations)}.");
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

            var timeoutSeconds = ResolveTimeoutSeconds();

            using var smtpClient = new SmtpClient(host, parsedPort)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(user, password),
                Timeout = timeoutSeconds * 1000
            };

            logger.LogInformation(
                "{Action} using SMTP (hostConfigured={HostConfigured}, port={Port}, ssl={Ssl}, usernameConfigured={UsernameConfigured}, fromEmailConfigured={FromEmailConfigured}, passwordConfigured={PasswordConfigured}, timeoutSec={TimeoutSeconds}) to {Email}.",
                logAction,
                !string.IsNullOrWhiteSpace(host),
                parsedPort,
                enableSsl,
                !string.IsNullOrWhiteSpace(user),
                !string.IsNullOrWhiteSpace(fromEmail),
                !string.IsNullOrWhiteSpace(password),
                timeoutSeconds,
                toEmail);

            if (parsedPort == 587 && !enableSsl)
            {
                logger.LogWarning(
                    "{Action} SMTP config uses port 587 with ssl=false. Gmail requires port 587 with ssl=true.",
                    logAction);
            }

            if (!string.Equals(fromEmail, user, StringComparison.OrdinalIgnoreCase))
            {
                logger.LogWarning(
                    "{Action} SMTP FromEmail differs from Username. Gmail may reject send unless the sender address is allowed.",
                    logAction);
            }

            logger.LogInformation("{Action} SMTP send started to {Email}.", logAction, toEmail);

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
                "{Action} email sent via SMTP to {Email} in {ElapsedMs}ms.",
                logAction, toEmail, stopwatch.ElapsedMilliseconds);
        }

        private int ResolveTimeoutSeconds()
        {
            var timeoutSeconds = 30;
            var timeoutText = configuration["Email:TimeoutSeconds"] ?? configuration["Smtp:TimeoutSeconds"];
            if (!string.IsNullOrWhiteSpace(timeoutText)
                && int.TryParse(timeoutText, out var parsedTimeout)
                && parsedTimeout > 0)
            {
                timeoutSeconds = parsedTimeout;
            }

            return timeoutSeconds;
        }

        private static string Truncate(string value, int maxLength)
        {
            if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
            {
                return value;
            }

            return value[..maxLength];
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
