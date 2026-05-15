using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VocabLearning.Services;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Controllers
{
    [ApiController]
    public class PasswordResetController : ControllerBase
    {
        private const string GenericForgotPasswordMessage = "Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.";
        private readonly IConfiguration configuration;
        private readonly IWebHostEnvironment environment;
        private readonly CustomAuthenticationService customAuthenticationService;
        private readonly IPasswordResetEmailService passwordResetEmailService;
        private readonly ILogger<PasswordResetController> logger;

        public PasswordResetController(
            IConfiguration configuration,
            IWebHostEnvironment environment,
            CustomAuthenticationService customAuthenticationService,
            IPasswordResetEmailService passwordResetEmailService,
            ILogger<PasswordResetController> logger)
        {
            this.configuration = configuration;
            this.environment = environment;
            this.customAuthenticationService = customAuthenticationService;
            this.passwordResetEmailService = passwordResetEmailService;
            this.logger = logger;
        }

        [HttpPost("/api/auth/forgot-password")]
        [AllowAnonymous]
        [EnableRateLimiting("forgot-password")]
        public async Task<ActionResult<AuthApiResponse>> ForgotPasswordApi(
            [FromBody] ForgotPasswordApiRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Email is required."
                });
            }

            var deliveryResult = await IssuePasswordResetAsync(request.Email, cancellationToken);
            if (!deliveryResult.Succeeded)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password reset email service is temporarily unavailable. Please try again later."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = deliveryResult.Message,
                EmailSent = deliveryResult.EmailSent,
                UsedFallbackLink = deliveryResult.UsedFallbackLink,
                ResetLink = deliveryResult.ResetLink,
                InboxUrl = deliveryResult.InboxUrl
            });
        }

        [HttpPost("/api/auth/reset-password")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthApiResponse>> ResetPasswordApi(
            [FromBody] ResetPasswordApiRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null)
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Request body is required."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Email)
                || string.IsNullOrWhiteSpace(request.Token)
                || string.IsNullOrWhiteSpace(request.NewPassword)
                || string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Email, token, new password, and confirmation are required."
                });
            }

            if (!string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password confirmation does not match."
                });
            }

            var result = await customAuthenticationService.ResetPasswordWithTokenAsync(
                request.Email,
                request.Token,
                request.NewPassword,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);

            if (!result.Succeeded)
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = result.ErrorMessage ?? "Password reset failed."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = "Password reset successfully."
            });
        }

        private async Task<PasswordResetDeliveryResult> IssuePasswordResetAsync(string email, CancellationToken cancellationToken)
        {
            var result = await customAuthenticationService.CreatePasswordResetTokenAsync(email, cancellationToken);
            if (!result.ShouldSendEmail)
            {
                return new PasswordResetDeliveryResult
                {
                    Succeeded = true,
                    Message = GenericForgotPasswordMessage
                };
            }

            var resetLink = BuildPasswordResetLink(result.Email, result.Token);
            var inboxUrl = BuildInboxUrl(result.Email);

            try
            {
                await passwordResetEmailService.SendPasswordResetEmailAsync(
                    result.Email,
                    result.Username,
                    resetLink,
                    cancellationToken);

                return new PasswordResetDeliveryResult
                {
                    Succeeded = true,
                    Message = GenericForgotPasswordMessage,
                    EmailSent = true,
                    InboxUrl = inboxUrl
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send password reset email to {Email}.", result.Email);

                if (ShouldExposeResetLinkFallback())
                {
                    return new PasswordResetDeliveryResult
                    {
                        Succeeded = true,
                        Message = "Môi trường hiện tại chưa cấu hình gửi email. Hãy dùng liên kết bên dưới để tiếp tục đặt lại mật khẩu.",
                        UsedFallbackLink = true,
                        ResetLink = resetLink,
                        InboxUrl = inboxUrl
                    };
                }

                return new PasswordResetDeliveryResult
                {
                    Succeeded = false,
                    Message = "Password reset email service is temporarily unavailable. Please try again later."
                };
            }
        }

        private string BuildPasswordResetLink(string email, string token)
        {
            var frontendOrigin = configuration["Frontend:Origin"]?.Trim();
            if (!string.IsNullOrWhiteSpace(frontendOrigin))
            {
                var encodedEmail = Uri.EscapeDataString(email);
                var encodedToken = Uri.EscapeDataString(token);
                return $"{frontendOrigin.TrimEnd('/')}/login?mode=reset&email={encodedEmail}&token={encodedToken}";
            }

            var fallbackEmail = Uri.EscapeDataString(email);
            var fallbackToken = Uri.EscapeDataString(token);
            return $"{Request.Scheme}://{Request.Host}/login?mode=reset&email={fallbackEmail}&token={fallbackToken}";
        }

        private bool ShouldExposeResetLinkFallback()
        {
            var configuredValue = configuration["PasswordReset:ExposeResetLinkInResponse"];
            if (bool.TryParse(configuredValue, out var explicitSetting))
            {
                return explicitSetting;
            }

            return environment.IsDevelopment();
        }

        private static string BuildInboxUrl(string email)
        {
            var normalizedEmail = email.Trim();
            var atIndex = normalizedEmail.LastIndexOf('@');
            if (atIndex < 0 || atIndex == normalizedEmail.Length - 1)
            {
                return "https://mail.google.com";
            }

            var domain = normalizedEmail[(atIndex + 1)..].ToLowerInvariant();
            return domain switch
            {
                "gmail.com" or "googlemail.com" => "https://mail.google.com",
                "outlook.com" or "hotmail.com" or "live.com" or "msn.com" => "https://outlook.live.com/mail/",
                "yahoo.com" or "yahoo.com.vn" => "https://mail.yahoo.com/",
                _ => "https://mail.google.com"
            };
        }

        private sealed class PasswordResetDeliveryResult
        {
            public bool Succeeded { get; set; }

            public string Message { get; set; } = GenericForgotPasswordMessage;

            public bool EmailSent { get; set; }

            public bool UsedFallbackLink { get; set; }

            public string? ResetLink { get; set; }

            public string? InboxUrl { get; set; }
        }
    }
}
