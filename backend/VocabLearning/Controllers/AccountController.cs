using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Services;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Controllers
{
    public class AccountController : Controller
    {
        private const string GenericForgotPasswordMessage = "Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.";
        private readonly IConfiguration configuration;
        private readonly IWebHostEnvironment environment;
        private readonly CustomAuthenticationService customAuthenticationService;
        private readonly AppDbContext appDbContext;
        private readonly PasswordResetEmailService passwordResetEmailService;
        private readonly ILogger<AccountController> logger;

        public AccountController(
            IConfiguration configuration,
            IWebHostEnvironment environment,
            CustomAuthenticationService customAuthenticationService,
            AppDbContext appDbContext,
            PasswordResetEmailService passwordResetEmailService,
            ILogger<AccountController> logger)
        {
            this.configuration = configuration;
            this.environment = environment;
            this.customAuthenticationService = customAuthenticationService;
            this.appDbContext = appDbContext;
            this.passwordResetEmailService = passwordResetEmailService;
            this.logger = logger;
        }

        [AllowAnonymous]
        public IActionResult Login(string? returnUrl = null)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToLocal(returnUrl);
            }

            PopulateLoginViewData(returnUrl);
            return View(new LoginViewModel());
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

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model, string? returnUrl = null)
        {
            PopulateLoginViewData(returnUrl);

            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToLocal(returnUrl);
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var user = await customAuthenticationService.AuthenticateAsync(model.UsernameOrEmail, model.Password);
            if (user is null)
            {
                ModelState.AddModelError(string.Empty, "Username/email or password is incorrect.");
                return View(model);
            }

            await customAuthenticationService.SignInAsync(HttpContext, user, model.RememberMe);
            return RedirectToLocal(returnUrl);
        }

        [HttpPost("/api/auth/login")]
        [AllowAnonymous]
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

            var user = await customAuthenticationService.AuthenticateAsync(usernameOrEmail, password, cancellationToken);
            if (user is null)
            {
                return Unauthorized(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Username/email or password is incorrect."
                });
            }

            await customAuthenticationService.SignInAsync(HttpContext, user, request.RememberMe);
            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                User = MapAuthenticatedUser(user)
            });
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public IActionResult GoogleLogin(string? returnUrl = null, string? source = null)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToLocal(returnUrl);
            }

            if (!IsGoogleLoginEnabled())
            {
                TempData["ErrorMessage"] = "Google sign-in is not configured yet. Please add ClientId and ClientSecret first.";
                return RedirectToSource(source, returnUrl);
            }

            var redirectUrl = Url.Action(nameof(GoogleResponse), values: new { returnUrl, source }) ?? Url.Action(nameof(Login), values: new { returnUrl })!;
            var properties = new AuthenticationProperties
            {
                RedirectUri = redirectUrl
            };

            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        [AllowAnonymous]
        public async Task<IActionResult> GoogleResponse(string? returnUrl = null, string? source = null, string? remoteError = null)
        {
            if (!string.IsNullOrWhiteSpace(remoteError))
            {
                TempData["ErrorMessage"] = $"Google sign-in failed: {remoteError}";
                return RedirectToSource(source, returnUrl);
            }

            var externalResult = await HttpContext.AuthenticateAsync(AuthenticationSchemeNames.External);
            if (!externalResult.Succeeded || externalResult.Principal is null)
            {
                TempData["ErrorMessage"] = "Google sign-in could not be completed.";
                return RedirectToSource(source, returnUrl);
            }

            try
            {
                var externalPrincipal = externalResult.Principal;
                var email = externalPrincipal.FindFirstValue(ClaimTypes.Email);
                var googleSubject = externalPrincipal.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? externalPrincipal.FindFirstValue("sub");
                var displayName = externalPrincipal.FindFirstValue(ClaimTypes.Name);

                var result = await customAuthenticationService.AuthenticateGoogleAsync(
                    email ?? string.Empty,
                    googleSubject ?? string.Empty,
                    displayName);

                if (!result.Succeeded || result.User is null)
                {
                    TempData["ErrorMessage"] = result.ErrorMessage ?? "Google sign-in could not be completed.";
                    return RedirectToSource(source, returnUrl);
                }

                await customAuthenticationService.SignInAsync(
                    HttpContext,
                    result.User,
                    false,
                    GoogleDefaults.AuthenticationScheme,
                    externalResult.Properties?.GetTokens());

                return RedirectToLocal(returnUrl);
            }
            finally
            {
                await HttpContext.SignOutAsync(AuthenticationSchemeNames.External);
            }
        }

        [AllowAnonymous]
        public IActionResult Register()
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToAction("Index", "Home");
            }

            PopulateExternalAuthViewData();
            return View(new RegisterViewModel());
        }

        [HttpPost("/api/auth/register")]
        [AllowAnonymous]
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

            if (string.IsNullOrWhiteSpace(name)
                || string.IsNullOrWhiteSpace(email)
                || string.IsNullOrWhiteSpace(password))
            {
                return BadRequest(new AuthApiResponse
                {
                    Succeeded = false,
                    Message = "Name, email, and password are required."
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

            await customAuthenticationService.SignInAsync(HttpContext, result.User, false);
            return Ok(new AuthApiResponse
            {
                Succeeded = true,
                User = MapAuthenticatedUser(result.User)
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

        [HttpPost("/api/auth/forgot-password")]
        [AllowAnonymous]
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

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            PopulateExternalAuthViewData();

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = await customAuthenticationService.RegisterAsync(model.Name, model.Email, model.Password);
            if (!result.Succeeded || result.User is null)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Registration failed.");
                return View(model);
            }

            await customAuthenticationService.SignInAsync(HttpContext, result.User, false);
            return RedirectToAction("Index", "Home");
        }

        [AllowAnonymous]
        public IActionResult VerifyEmail(string? returnUrl = null)
        {
            ViewData["ReturnUrl"] = returnUrl;
            return View(new VerifyEmailViewModel());
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> VerifyEmail(VerifyEmailViewModel model, string? returnUrl = null, CancellationToken cancellationToken = default)
        {
            ViewData["ReturnUrl"] = returnUrl;

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var deliveryResult = await IssuePasswordResetAsync(model.Email, cancellationToken);
            if (!deliveryResult.Succeeded)
            {
                ModelState.AddModelError(string.Empty, "Email service is temporarily unavailable. Please try again later.");
                return View(model);
            }

            TempData["InfoMessage"] = deliveryResult.Message;
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        [AllowAnonymous]
        public IActionResult ResetPassword(string? email = null, string? token = null)
        {
            return View(new ResetPasswordViewModel
            {
                Email = email?.Trim() ?? string.Empty,
                Token = token?.Trim() ?? string.Empty
            });
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model, CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = await customAuthenticationService.ResetPasswordWithTokenAsync(
                model.Email,
                model.Token,
                model.NewPassword,
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Password reset failed.");
                return View(model);
            }

            TempData["InfoMessage"] = "Password reset successfully. Please sign in.";
            return RedirectToAction(nameof(Login));
        }

        [Authorize]
        public async Task<IActionResult> Profile(CancellationToken cancellationToken)
        {
            var user = await customAuthenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user is null)
            {
                return await RedirectToLoginAsync();
            }

            return View(await BuildProfileViewModelAsync(user, cancellationToken));
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Profile(ProfileViewModel model, CancellationToken cancellationToken)
        {
            var user = await customAuthenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user is null)
            {
                return await RedirectToLoginAsync();
            }

            if (!ModelState.IsValid)
            {
                await PopulateProfileMetadataAsync(model, user, cancellationToken);
                return View(model);
            }

            var result = await customAuthenticationService.UpdateProfileAsync(
                user.UserId,
                model.Username,
                model.Email,
                cancellationToken);

            if (!result.Succeeded || result.User is null)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Profile could not be updated.");
                await PopulateProfileMetadataAsync(model, user, cancellationToken);
                return View(model);
            }

            var currentSession = await HttpContext.AuthenticateAsync(AuthenticationSchemeNames.Application);
            var authenticationMethod = User.FindFirstValue(ClaimTypes.AuthenticationMethod) ?? "Password";

            await customAuthenticationService.SignInAsync(
                HttpContext,
                result.User,
                currentSession.Properties?.IsPersistent ?? false,
                authenticationMethod,
                currentSession.Properties?.GetTokens());

            TempData["SuccessMessage"] = "Profile updated successfully.";
            return RedirectToAction(nameof(Profile));
        }

        [Authorize]
        public async Task<IActionResult> LearningLog(CancellationToken cancellationToken)
        {
            var userId = await customAuthenticationService.ResolveAuthenticatedUserIdAsync(User);
            if (!userId.HasValue)
            {
                return await RedirectToLoginAsync();
            }

            var items = await appDbContext.LearningLogs
                .Where(log => log.UserId == userId.Value)
                .OrderByDescending(log => log.Date)
                .Take(100)
                .ToListAsync(cancellationToken);

            return View(items);
        }

        [Authorize]
        public IActionResult ChangePassword()
        {
            return View(new ChangePasswordViewModel
            {
                Email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty
            });
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ChangePassword(ChangePasswordViewModel model)
        {
            model.Email = User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var userId = await customAuthenticationService.ResolveAuthenticatedUserIdAsync(User);
            if (!userId.HasValue)
            {
                return await RedirectToLoginAsync();
            }

            var result = await customAuthenticationService.ChangePasswordAsync(userId.Value, model.CurrentPassword, model.NewPassword);
            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Password could not be changed.");
                return View(model);
            }

            await customAuthenticationService.SignOutAsync(HttpContext);
            TempData["InfoMessage"] = "Password changed successfully. Please sign in again.";
            return RedirectToAction(nameof(Login));
        }

        [HttpPost]
        [Authorize]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Logout()
        {
            await customAuthenticationService.SignOutAsync(HttpContext);
            return RedirectToAction("Index", "Home");
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

        private IActionResult RedirectToLocal(string? returnUrl)
        {
            if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }

            return RedirectToAction("Index", "Home");
        }

        private bool IsGoogleLoginEnabled()
        {
            return !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientId"])
                && !string.IsNullOrWhiteSpace(configuration["Authentication:Google:ClientSecret"]);
        }

        private void PopulateLoginViewData(string? returnUrl)
        {
            ViewData["ReturnUrl"] = returnUrl;
            ViewData["GoogleLoginEnabled"] = IsGoogleLoginEnabled();
        }

        private void PopulateExternalAuthViewData()
        {
            ViewData["GoogleLoginEnabled"] = IsGoogleLoginEnabled();
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
                return $"{frontendOrigin.TrimEnd('/')}/?mode=reset&email={encodedEmail}&token={encodedToken}";
            }

            var resetPath = Url.Action(
                nameof(ResetPassword),
                "Account",
                new { email, token },
                protocol: Request.Scheme,
                host: Request.Host.ToString());

            if (!string.IsNullOrWhiteSpace(resetPath))
            {
                return resetPath;
            }

            var fallbackEmail = Uri.EscapeDataString(email);
            var fallbackToken = Uri.EscapeDataString(token);
            return $"{Request.Scheme}://{Request.Host}/Account/ResetPassword?email={fallbackEmail}&token={fallbackToken}";
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

        private async Task<IActionResult> RedirectToLoginAsync()
        {
            await customAuthenticationService.SignOutAsync(HttpContext);
            TempData["ErrorMessage"] = "Your session is no longer valid. Please sign in again.";
            var returnUrl = $"{Request.Path}{Request.QueryString}";
            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        private IActionResult RedirectToSource(string? source, string? returnUrl)
        {
            if (string.Equals(source, nameof(Register), StringComparison.OrdinalIgnoreCase))
            {
                return RedirectToAction(nameof(Register));
            }

            return RedirectToAction(nameof(Login), new { returnUrl });
        }

        private async Task<ProfileViewModel> BuildProfileViewModelAsync(Models.Users user, CancellationToken cancellationToken)
        {
            var model = new ProfileViewModel
            {
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                Status = user.Status,
                CreatedAt = user.CreatedAt,
                HasGoogleLogin = !string.IsNullOrWhiteSpace(user.GoogleSubject),
                HasLocalPassword = !string.IsNullOrWhiteSpace(user.PasswordHash),
                DisplayName = user.Username,
                AvatarText = BuildAvatarText(user.Username)
            };

            await PopulateLearningSnapshotAsync(model, user.UserId, cancellationToken);
            return model;
        }

        private async Task PopulateProfileMetadataAsync(ProfileViewModel model, Models.Users user, CancellationToken cancellationToken)
        {
            model.Role = user.Role;
            model.Status = user.Status;
            model.CreatedAt = user.CreatedAt;
            model.HasGoogleLogin = !string.IsNullOrWhiteSpace(user.GoogleSubject);
            model.HasLocalPassword = !string.IsNullOrWhiteSpace(user.PasswordHash);
            model.DisplayName = user.Username;
            model.AvatarText = BuildAvatarText(user.Username);

            await PopulateLearningSnapshotAsync(model, user.UserId, cancellationToken);
        }

        private async Task PopulateLearningSnapshotAsync(ProfileViewModel model, long userId, CancellationToken cancellationToken)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var todayStart = today.ToDateTime(TimeOnly.MinValue);
            var todayEnd = today.ToDateTime(TimeOnly.MaxValue);

            model.TotalLearnedWords = await appDbContext.UserVocabularies
                .Where(item => item.UserId == userId)
                .Select(item => item.VocabId)
                .Distinct()
                .CountAsync(cancellationToken);

            model.DueReviewTodayCount = await appDbContext.Progresses
                .Where(item =>
                    item.UserId == userId
                    && item.NextReviewDate.HasValue
                    && item.NextReviewDate.Value <= todayEnd)
                .CountAsync(cancellationToken);

            model.LastStudiedAt = await appDbContext.LearningLogs
                .Where(log => log.UserId == userId)
                .Select(log => (DateTime?)log.Date)
                .MaxAsync(cancellationToken);

            var streakDates = await appDbContext.LearningLogs
                .Where(log => log.UserId == userId)
                .OrderByDescending(log => log.Date)
                .Select(log => log.Date)
                .ToListAsync(cancellationToken);

            model.LearningStreakDays = CalculateLearningStreak(streakDates, today);

            var fromLast7Days = todayStart.AddDays(-6);
            var sevenDaySessions = await appDbContext.ExerciseSessions
                .Where(session => session.UserId == userId && session.StartedAt >= fromLast7Days)
                .Select(session => new { session.TotalQuestions, session.CorrectCount })
                .ToListAsync(cancellationToken);

            var totalQuestions = sevenDaySessions.Sum(item => Math.Max(0, item.TotalQuestions));
            var correctAnswers = sevenDaySessions.Sum(item => Math.Max(0, item.CorrectCount));
            model.AccuracyLast7Days = totalQuestions == 0
                ? 0
                : (float)Math.Round(correctAnswers * 100d / totalQuestions, 1);

            var fromLast30Days = todayStart.AddDays(-29);
            var logs = await appDbContext.LearningLogs
                .Where(log => log.UserId == userId && log.Date >= fromLast30Days)
                .Select(log => new LearningLogSnapshotItem
                {
                    Date = log.Date,
                    ActivityType = log.ActivityType,
                    WordsStudied = log.WordsStudied
                })
                .ToListAsync(cancellationToken);

            model.Chart7Days = BuildLearningChartPoints(logs, today, 7);
            model.Chart30Days = BuildLearningChartPoints(logs, today, 30);
        }

        private static int CalculateLearningStreak(IEnumerable<DateTime> dateTimes, DateOnly today)
        {
            var activeDays = dateTimes
                .Select(DateOnly.FromDateTime)
                .ToHashSet();

            if (!activeDays.Any())
            {
                return 0;
            }

            var current = activeDays.Contains(today)
                ? today
                : today.AddDays(-1);

            if (!activeDays.Contains(current))
            {
                return 0;
            }

            var streak = 0;
            while (activeDays.Contains(current))
            {
                streak += 1;
                current = current.AddDays(-1);
            }

            return streak;
        }

        private static List<ProfileLearningChartPointViewModel> BuildLearningChartPoints(
            IEnumerable<LearningLogSnapshotItem> logs,
            DateOnly today,
            int days)
        {
            var fromDate = today.AddDays(-(days - 1));

            var grouped = logs
                .Select(log => new
                {
                    Date = DateOnly.FromDateTime(log.Date),
                    log.ActivityType,
                    log.WordsStudied
                })
                .Where(item => item.Date >= fromDate)
                .GroupBy(item => item.Date)
                .ToDictionary(
                    group => group.Key,
                    group => new
                    {
                        LearnedWords = group
                            .Where(item => string.Equals(item.ActivityType, LearningActivityTypes.Learn, StringComparison.OrdinalIgnoreCase))
                            .Sum(item => Math.Max(0, item.WordsStudied)),
                        ReviewedWords = group
                            .Where(item => string.Equals(item.ActivityType, LearningActivityTypes.Review, StringComparison.OrdinalIgnoreCase))
                            .Sum(item => Math.Max(0, item.WordsStudied))
                    });

            var chart = new List<ProfileLearningChartPointViewModel>();
            for (var dayOffset = days - 1; dayOffset >= 0; dayOffset--)
            {
                var date = today.AddDays(-dayOffset);
                grouped.TryGetValue(date, out var value);

                chart.Add(new ProfileLearningChartPointViewModel
                {
                    Date = date,
                    Label = date.ToString("MM/dd"),
                    LearnedWords = value?.LearnedWords ?? 0,
                    ReviewedWords = value?.ReviewedWords ?? 0
                });
            }

            return chart;
        }

        private static string BuildAvatarText(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return "U";
            }

            var parts = username
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            if (parts.Length >= 2)
            {
                return string.Concat(parts[0][0], parts[1][0]).ToUpperInvariant();
            }

            return username.Trim()[0].ToString().ToUpperInvariant();
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
                CreatedAt = user.CreatedAt
            };
        }

        private sealed class LearningLogSnapshotItem
        {
            public DateTime Date { get; set; }

            public string ActivityType { get; set; } = string.Empty;

            public int WordsStudied { get; set; }
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
