using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Services;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Controllers
{
    public class AccountController : Controller
    {
        private readonly IConfiguration configuration;
        private readonly CustomAuthenticationService customAuthenticationService;

        public AccountController(
            IConfiguration configuration,
            CustomAuthenticationService customAuthenticationService)
        {
            this.configuration = configuration;
            this.customAuthenticationService = customAuthenticationService;
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
        public IActionResult VerifyEmail()
        {
            TempData["InfoMessage"] = "Forgot-password flow is disabled in the custom authentication version until email verification tokens are implemented.";
            return RedirectToAction(nameof(Login));
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public IActionResult VerifyEmail(VerifyEmailViewModel model)
        {
            TempData["InfoMessage"] = "Forgot-password flow is disabled in the custom authentication version until email verification tokens are implemented.";
            return RedirectToAction(nameof(Login));
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
    }
}
