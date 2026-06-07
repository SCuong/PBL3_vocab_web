using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using System.Text.Json;

namespace VocabLearning.Services
{
    public class PasswordResetEmailService : IPasswordResetEmailService
    {
        private const string ResendEndpoint = "https://api.resend.com/emails";
        private const string BrandLogoUrl = "https://vocablearning.online/logo.png";

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
                "Đặt lại mật khẩu VocabLearning",
                BuildPasswordResetHtmlBody(username, resetLink),
                BuildPasswordResetTextBody(username, resetLink),
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
                "Xác minh email VocabLearning",
                BuildEmailVerificationHtmlBody(username, toEmail, verificationLink),
                BuildEmailVerificationTextBody(username, toEmail, verificationLink),
                "Email verification",
                cancellationToken);
        }

        // Provider router: prefer Resend's HTTPS API (works on hosts that block outbound SMTP
        // ports, e.g. Render Free). Falls back to SMTP when no Resend API key is configured.
        private async Task SendEmailAsync(
            string toEmail,
            string subject,
            string htmlBody,
            string? textBody,
            string logAction,
            CancellationToken cancellationToken)
        {
            var resendApiKey = configuration["Resend:ApiKey"];
            if (!string.IsNullOrWhiteSpace(resendApiKey))
            {
                await SendViaResendAsync(resendApiKey, toEmail, subject, htmlBody, textBody, logAction, cancellationToken);
                return;
            }

            await SendViaSmtpAsync(toEmail, subject, htmlBody, textBody, logAction, cancellationToken);
        }

        private async Task SendViaResendAsync(
            string apiKey,
            string toEmail,
            string subject,
            string htmlBody,
            string? textBody,
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
            var payload = new Dictionary<string, object>
            {
                ["from"] = fromHeader,
                ["to"] = new[] { toEmail },
                ["subject"] = subject,
                ["html"] = htmlBody
            };

            if (!string.IsNullOrWhiteSpace(textBody))
            {
                payload["text"] = textBody;
            }

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
            string? textBody,
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
                SubjectEncoding = Encoding.UTF8,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true,
                Body = htmlBody
            };

            message.To.Add(toEmail);

            if (!string.IsNullOrWhiteSpace(textBody))
            {
                message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
                    textBody,
                    Encoding.UTF8,
                    MediaTypeNames.Text.Plain));
                message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
                    htmlBody,
                    Encoding.UTF8,
                    MediaTypeNames.Text.Html));
            }

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
            var displayName = string.IsNullOrWhiteSpace(username) ? "bạn" : WebUtility.HtmlEncode(username);
            var safeLink = WebUtility.HtmlEncode(resetLink);

            return $@"<!doctype html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"">
  <title>Đặt lại mật khẩu VocabLearning</title>
</head>
<body style=""margin:0;padding:0;background:#f5f7fb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#172033;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""background:#f5f7fb;margin:0;padding:32px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""width:100%;max-width:600px;background:#ffffff;border:1px solid #e6eaf2;border-radius:20px;overflow:hidden;box-shadow:0 18px 44px rgba(23,32,51,0.08);"">
          <tr>
            <td style=""padding:32px 36px 20px 36px;"">
              <table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" width=""100%"">
                <tr>
                  <td style=""vertical-align:middle;"">
                    <img src=""{BrandLogoUrl}"" width=""48"" height=""32"" alt=""VocabLearning"" style=""display:inline-block;width:48px;height:32px;object-fit:contain;vertical-align:middle;border:0;outline:none;text-decoration:none;"">
                    <span style=""display:inline-block;margin-left:10px;color:#172033;font-size:18px;font-weight:700;vertical-align:middle;"">VocabLearning</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style=""padding:4px 36px 0 36px;"">
              <h1 style=""margin:0;color:#172033;font-size:28px;line-height:1.25;font-weight:700;"">Đặt lại mật khẩu VocabLearning</h1>
              <p style=""margin:18px 0 0 0;color:#4b587c;font-size:16px;line-height:1.65;"">Chào {displayName},</p>
              <p style=""margin:18px 0 0 0;color:#4b587c;font-size:16px;line-height:1.65;"">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản VocabLearning của bạn. Hãy nhấn nút bên dưới để tạo mật khẩu mới.</p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:28px 36px 20px 36px;"">
              <a href=""{safeLink}"" style=""display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:700;line-height:1;"">Đặt lại mật khẩu</a>
            </td>
          </tr>
          <tr>
            <td style=""padding:0 36px 28px 36px;"">
              <div style=""margin:0;padding:14px 16px;border-radius:14px;background:#f8fafc;border:1px solid #e6eaf2;"">
                <p style=""margin:0;color:#4b587c;font-size:14px;line-height:1.55;"">Liên kết này có hiệu lực trong 30 phút và chỉ dùng được một lần.</p>
              </div>
              <p style=""margin:18px 0 6px 0;color:#6b7694;font-size:13px;line-height:1.6;"">Nếu nút không hoạt động, hãy mở liên kết sau:</p>
              <a href=""{safeLink}"" style=""display:block;color:#4f46e5;font-size:12px;line-height:1.6;word-break:break-all;"">{safeLink}</a>
              <p style=""margin:18px 0 0 0;color:#6b7694;font-size:13px;line-height:1.6;"">Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:22px 36px;background:#f8fafc;border-top:1px solid #e6eaf2;text-align:center;"">
              <p style=""margin:0;color:#8a94ad;font-size:12px;line-height:1.5;"">VocabLearning / PBL3 Project</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
        }

        private static string BuildPasswordResetTextBody(string username, string resetLink)
        {
            var displayName = string.IsNullOrWhiteSpace(username) ? "bạn" : username.Trim();

            return $@"VocabLearning

Đặt lại mật khẩu VocabLearning

Chào {displayName},

Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản VocabLearning của bạn. Hãy mở liên kết bên dưới để tạo mật khẩu mới.

Đặt lại mật khẩu:
{resetLink}

Liên kết này có hiệu lực trong 30 phút và chỉ dùng được một lần.

Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.

VocabLearning / PBL3 Project";
        }

        private static string BuildEmailVerificationHtmlBody(string username, string email, string verificationLink)
        {
            var displayName = string.IsNullOrWhiteSpace(username) ? "bạn" : WebUtility.HtmlEncode(username);
            var safeEmail = string.IsNullOrWhiteSpace(email) ? string.Empty : WebUtility.HtmlEncode(email.Trim());
            var safeLink = WebUtility.HtmlEncode(verificationLink);

            return $@"<!doctype html>
<html lang=""vi"">
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1"">
  <title>Xác minh email VocabLearning</title>
</head>
<body style=""margin:0;padding:0;background:#f5f7fb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#172033;"">
  <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""background:#f5f7fb;margin:0;padding:32px 16px;"">
    <tr>
      <td align=""center"">
        <table role=""presentation"" width=""100%"" cellspacing=""0"" cellpadding=""0"" border=""0"" style=""width:100%;max-width:600px;background:#ffffff;border:1px solid #e6eaf2;border-radius:20px;overflow:hidden;box-shadow:0 18px 44px rgba(23,32,51,0.08);"">
          <tr>
            <td style=""padding:32px 36px 20px 36px;"">
              <table role=""presentation"" cellspacing=""0"" cellpadding=""0"" border=""0"" width=""100%"">
                <tr>
                  <td style=""vertical-align:middle;"">
                    <img src=""{BrandLogoUrl}"" width=""48"" height=""32"" alt=""VocabLearning"" style=""display:inline-block;width:48px;height:32px;object-fit:contain;vertical-align:middle;border:0;outline:none;text-decoration:none;"">
                    <span style=""display:inline-block;margin-left:10px;color:#172033;font-size:18px;font-weight:700;vertical-align:middle;"">VocabLearning</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style=""padding:4px 36px 0 36px;"">
              <h1 style=""margin:0;color:#172033;font-size:28px;line-height:1.25;font-weight:700;"">Xác minh email VocabLearning</h1>
              <p style=""margin:18px 0 0 0;color:#4b587c;font-size:16px;line-height:1.65;"">Chào {displayName},</p>
              {(string.IsNullOrWhiteSpace(safeEmail) ? string.Empty : $@"<p style=""margin:8px 0 0 0;color:#4b587c;font-size:14px;line-height:1.5;"">Email đăng ký: <strong style=""color:#172033;"">{safeEmail}</strong></p>")}
              <p style=""margin:18px 0 0 0;color:#4b587c;font-size:16px;line-height:1.65;"">Cảm ơn bạn đã đăng ký VocabLearning. Hãy nhấn nút bên dưới để xác minh email.</p>
            </td>
          </tr>
          <tr>
            <td align=""center"" style=""padding:28px 36px 20px 36px;"">
              <a href=""{safeLink}"" style=""display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:700;line-height:1;"">Xác minh email</a>
            </td>
          </tr>
          <tr>
            <td style=""padding:0 36px 28px 36px;"">
              <div style=""margin:0;padding:14px 16px;border-radius:14px;background:#f8fafc;border:1px solid #e6eaf2;"">
                <p style=""margin:0;color:#4b587c;font-size:14px;line-height:1.55;"">Liên kết này có hiệu lực trong 24 giờ và chỉ dùng được một lần.</p>
              </div>
              <p style=""margin:18px 0 0 0;color:#6b7694;font-size:13px;line-height:1.6;"">Nếu bạn không tạo tài khoản này, bạn có thể bỏ qua email.</p>
            </td>
          </tr>
          <tr>
            <td style=""padding:22px 36px;background:#f8fafc;border-top:1px solid #e6eaf2;text-align:center;"">
              <p style=""margin:0;color:#8a94ad;font-size:12px;line-height:1.5;"">VocabLearning / PBL3 Project</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
        }

        private static string BuildEmailVerificationTextBody(string username, string email, string verificationLink)
        {
            var displayName = string.IsNullOrWhiteSpace(username) ? "bạn" : username.Trim();
            var cleanEmail = string.IsNullOrWhiteSpace(email) ? string.Empty : email.Trim();

            var emailLine = string.IsNullOrWhiteSpace(cleanEmail)
                ? string.Empty
                : $"{Environment.NewLine}Email đăng ký: {cleanEmail}{Environment.NewLine}";

            return $@"VL VocabLearning

Xác minh email VocabLearning

Chào {displayName},{emailLine}
Cảm ơn bạn đã đăng ký VocabLearning. Hãy nhấn liên kết bên dưới để xác minh email.

Xác minh email:
{verificationLink}

Liên kết này có hiệu lực trong 24 giờ và chỉ dùng được một lần.

Nếu bạn không tạo tài khoản này, bạn có thể bỏ qua email.

VocabLearning / PBL3 Project";
        }
    }
}
