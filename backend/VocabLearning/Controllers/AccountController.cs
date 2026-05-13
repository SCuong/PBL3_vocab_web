using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Services;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Controllers
{
    [ApiController]
    public class AccountController : ControllerBase
    {
        private readonly CustomAuthenticationService customAuthenticationService;
        private readonly AppDbContext appDbContext;
        private readonly GoogleIdTokenVerifier googleIdTokenVerifier;
        private readonly PasswordResetEmailService passwordResetEmailService;
        private readonly IConfiguration configuration;
        private readonly IWebHostEnvironment environment;
        private readonly ILogger<AccountController> logger;

        public AccountController(
            CustomAuthenticationService customAuthenticationService,
            AppDbContext appDbContext,
            GoogleIdTokenVerifier googleIdTokenVerifier,
            PasswordResetEmailService passwordResetEmailService,
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<AccountController> logger)
        {
            this.customAuthenticationService = customAuthenticationService;
            this.appDbContext = appDbContext;
            this.googleIdTokenVerifier = googleIdTokenVerifier;
            this.passwordResetEmailService = passwordResetEmailService;
            this.configuration = configuration;
            this.environment = environment;
            this.logger = logger;
        }

        [HttpGet("/api/auth/me")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthApiResponse>> GetCurrentUserApi(CancellationToken cancellationToken)
        {
            var user = await customAuthenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Not authenticated."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                User = MapAuthenticatedUser(user)
            });
        }

        [HttpPost("/api/auth/login")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult<AuthApiResponse>> LoginApi(
            [FromBody] LoginApiRequest? request,
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

            var usernameOrEmail = request.UsernameOrEmail?.Trim() ?? string.Empty;
            var password = request.Password ?? string.Empty;

            if (string.IsNullOrWhiteSpace(usernameOrEmail) || string.IsNullOrWhiteSpace(password))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Username/email and password are required."
                });
            }

            var loginResult = await customAuthenticationService.AuthenticateForLoginAsync(usernameOrEmail, password, cancellationToken);
            if (loginResult.User is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = loginResult.ErrorMessage ?? "Username/email or password is incorrect."
                });
            }

            await customAuthenticationService.SignInAsync(HttpContext, loginResult.User, request.RememberMe);
            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                User = MapAuthenticatedUser(loginResult.User)
            });
        }

        [HttpPost("/api/auth/register")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult<AuthApiResponse>> RegisterApi(
            [FromBody] RegisterApiRequest? request,
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

            var name = request.Name?.Trim() ?? string.Empty;
            var email = request.Email?.Trim() ?? string.Empty;
            var password = request.Password ?? string.Empty;
            var confirmPassword = request.ConfirmPassword ?? string.Empty;

            if (string.IsNullOrWhiteSpace(name)
                || string.IsNullOrWhiteSpace(email)
                || string.IsNullOrWhiteSpace(password)
                || string.IsNullOrWhiteSpace(confirmPassword))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Name, email, password, and confirmation are required."
                });
            }

            if (!string.Equals(password, confirmPassword, StringComparison.Ordinal))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password confirmation does not match."
                });
            }

            var result = await customAuthenticationService.RegisterAsync(name, email, password, cancellationToken);
            if (!result.Succeeded || result.User is null)
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = result.ErrorMessage ?? "Registration failed."
                });
            }

            var deliveryResult = await IssueEmailVerificationAsync(result.User, cancellationToken);
            if (!deliveryResult.Succeeded)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Verification email service is temporarily unavailable. Please try again later."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = deliveryResult.Message,
                EmailSent = deliveryResult.EmailSent,
                UsedFallbackLink = deliveryResult.UsedFallbackLink,
                VerificationLink = deliveryResult.VerificationLink,
                InboxUrl = deliveryResult.InboxUrl
            });
        }

        [HttpPost("/api/auth/google")]
        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        public async Task<ActionResult<AuthApiResponse>> GoogleLoginApi(
            [FromBody] GoogleLoginApiRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.IdToken))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Google credential is required."
                });
            }

            var verifiedToken = await googleIdTokenVerifier.VerifyAsync(request.IdToken, cancellationToken);
            if (verifiedToken is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Google login could not be verified."
                });
            }

            var result = await customAuthenticationService.AuthenticateGoogleAsync(
                verifiedToken.Email,
                verifiedToken.Subject,
                verifiedToken.Name,
                cancellationToken);

            if (!result.Succeeded || result.User is null)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new AuthApiResponse
                {
                    Succeeded = false,
                    Message = result.ErrorMessage ?? "Google login is not available for this account."
                });
            }

            if (!string.Equals(result.User.Role, UserRoles.Learner, StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Google login is only available for learner accounts."
                });
            }

            await customAuthenticationService.SignInAsync(HttpContext, result.User, true, "Google");
            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                User = MapAuthenticatedUser(result.User)
            });
        }

        [HttpPost("/api/auth/verify-email")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthApiResponse>> VerifyEmailApi(
            [FromBody] VerifyEmailApiRequest? request,
            CancellationToken cancellationToken)
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Token))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Verification token is required."
                });
            }

            var result = await customAuthenticationService.VerifyEmailAsync(
                request.Token,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);

            if (!result.Succeeded)
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = result.ErrorMessage ?? "Verification token is invalid or expired."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = "Email verified successfully. You can now log in."
            });
        }

        [HttpPost("/api/auth/resend-verification")]
        [AllowAnonymous]
        [EnableRateLimiting("forgot-password")]
        public async Task<ActionResult<AuthApiResponse>> ResendVerificationApi(
            [FromBody] ResendVerificationApiRequest? request,
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

            var tokenResult = await customAuthenticationService.CreateEmailVerificationTokenForEmailAsync(
                request.Email,
                cancellationToken);

            if (!tokenResult.ShouldSendEmail)
            {
                return Ok(new AuthApiResponse
                {
                    Succeeded = true,
                    Message = "If this learner account needs verification, a new email has been sent."
                });
            }

            var deliveryResult = await SendEmailVerificationAsync(
                tokenResult.Email,
                tokenResult.Username,
                tokenResult.Token,
                cancellationToken);

            if (!deliveryResult.Succeeded)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Verification email service is temporarily unavailable. Please try again later."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = deliveryResult.Message,
                EmailSent = deliveryResult.EmailSent,
                UsedFallbackLink = deliveryResult.UsedFallbackLink,
                VerificationLink = deliveryResult.VerificationLink,
                InboxUrl = deliveryResult.InboxUrl
            });
        }

        [HttpPut("/api/account/profile")]
        [Authorize]
        public async Task<ActionResult<AuthApiResponse>> UpdateProfileApi(
            [FromBody] UpdateProfileApiRequest? request,
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

            var user = await customAuthenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Not authenticated."
                });
            }

            var result = await customAuthenticationService.UpdateProfileAsync(
                user.UserId,
                request.Username,
                request.Email,
                cancellationToken);

            if (!result.Succeeded || result.User is null)
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = result.ErrorMessage ?? "Profile could not be updated."
                });
            }

            var currentSession = await HttpContext.AuthenticateAsync(AuthenticationSchemeNames.Application);
            var authenticationMethod = User.FindFirstValue(ClaimTypes.AuthenticationMethod) ?? "Password";

            await customAuthenticationService.SignInAsync(
                HttpContext,
                result.User,
                currentSession.Properties?.IsPersistent ?? false,
                authenticationMethod,
                currentSession.Properties?.GetTokens());

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = "Profile updated successfully.",
                User = MapAuthenticatedUser(result.User)
            });
        }

        [HttpPost("/api/account/change-password")]
        [Authorize]
        public async Task<ActionResult<AuthApiResponse>> ChangePasswordApi(
            [FromBody] ChangePasswordApiRequest? request,
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

            if (string.IsNullOrWhiteSpace(request.CurrentPassword)
                || string.IsNullOrWhiteSpace(request.NewPassword)
                || string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Current password, new password, and confirmation are required."
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

            var user = await customAuthenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Not authenticated."
                });
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password is not available for this account."
                });
            }

            if (string.Equals(request.CurrentPassword, request.NewPassword, StringComparison.Ordinal))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "New password must be different from the current password."
                });
            }

            var result = await customAuthenticationService.ChangePasswordAsync(
                user.UserId,
                request.CurrentPassword,
                request.NewPassword,
                cancellationToken);

            if (!result.Succeeded)
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = result.ErrorMessage ?? "Password could not be changed."
                });
            }

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = "Password changed successfully."
            });
        }

        [HttpPost("/api/auth/logout")]
        [Authorize]
        public async Task<ActionResult<AuthApiResponse>> LogoutApi()
        {
            await customAuthenticationService.SignOutAsync(HttpContext);
            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = "Signed out successfully."
            });
        }

        [HttpDelete("/api/account/delete")]
        [Authorize]
        public async Task<ActionResult<AuthApiResponse>> DeleteAccountApi(
            [FromBody] DeleteAccountRequest? request,
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

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password is required to delete account."
                });
            }

            var user = await customAuthenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Not authenticated."
                });
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password is not available for this account."
                });
            }

            var isPasswordValid = customAuthenticationService.ValidatePasswordAsync(
                user.PasswordHash,
                request.Password);

            if (!isPasswordValid)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Password is incorrect."
                });
            }

            user.IsDeleted = true;
            user.DeletedAt = DateTime.UtcNow;

            appDbContext.Users.Update(user);
            await appDbContext.SaveChangesAsync(cancellationToken);

            await customAuthenticationService.SignOutAsync(HttpContext);

            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                Message = "Account deleted successfully."
            });
        }

        private async Task<EmailVerificationDeliveryResult> IssueEmailVerificationAsync(
            Models.Users user,
            CancellationToken cancellationToken)
        {
            var tokenResult = await customAuthenticationService.CreateEmailVerificationTokenAsync(
                user.UserId,
                cancellationToken);

            if (!tokenResult.ShouldSendEmail)
            {
                return new EmailVerificationDeliveryResult
                {
                    Succeeded = true,
                    Message = "Account created. Please verify your email before logging in."
                };
            }

            return await SendEmailVerificationAsync(
                tokenResult.Email,
                tokenResult.Username,
                tokenResult.Token,
                cancellationToken);
        }

        private async Task<EmailVerificationDeliveryResult> SendEmailVerificationAsync(
            string email,
            string username,
            string token,
            CancellationToken cancellationToken)
        {
            var verificationLink = BuildEmailVerificationLink(token);
            var inboxUrl = BuildInboxUrl(email);

            try
            {
                await passwordResetEmailService.SendEmailVerificationEmailAsync(
                    email,
                    username,
                    verificationLink,
                    cancellationToken);

                return new EmailVerificationDeliveryResult
                {
                    Succeeded = true,
                    Message = "Account created. Please check your email to verify your account before logging in.",
                    EmailSent = true,
                    InboxUrl = inboxUrl
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send verification email to {Email}.", email);

                if (ShouldExposeVerificationLinkFallback())
                {
                    return new EmailVerificationDeliveryResult
                    {
                        Succeeded = true,
                        Message = "Account created. Email service is not configured, so use the verification link below.",
                        UsedFallbackLink = true,
                        VerificationLink = verificationLink,
                        InboxUrl = inboxUrl
                    };
                }

                return new EmailVerificationDeliveryResult
                {
                    Succeeded = false,
                    Message = "Verification email service is temporarily unavailable. Please try again later."
                };
            }
        }

        private string BuildEmailVerificationLink(string token)
        {
            var frontendOrigin = configuration["Frontend:Origin"]?.Trim();
            var encodedToken = Uri.EscapeDataString(token);
            if (!string.IsNullOrWhiteSpace(frontendOrigin))
            {
                return $"{frontendOrigin.TrimEnd('/')}/verify-email?token={encodedToken}";
            }

            return $"{Request.Scheme}://{Request.Host}/verify-email?token={encodedToken}";
        }

        private bool ShouldExposeVerificationLinkFallback()
        {
            var configuredValue = configuration["EmailVerification:ExposeVerificationLinkInResponse"];
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

        private static AuthenticatedUserViewModel MapAuthenticatedUser(Models.Users user)
        {
            return new AuthenticatedUserViewModel
            {
                UserId = user.UserId,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                Status = user.Status,
                HasGoogleLogin = !string.IsNullOrWhiteSpace(user.GoogleSubject),
                HasLocalPassword = !string.IsNullOrWhiteSpace(user.PasswordHash),
                IsEmailVerified = user.IsEmailVerified,
                CreatedAt = user.CreatedAt
            };
        }

        private sealed class EmailVerificationDeliveryResult
        {
            public bool Succeeded { get; set; }

            public string Message { get; set; } = string.Empty;

            public bool EmailSent { get; set; }

            public bool UsedFallbackLink { get; set; }

            public string? VerificationLink { get; set; }

            public string? InboxUrl { get; set; }
        }
    }
}
