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

        public AccountController(
            CustomAuthenticationService customAuthenticationService,
            AppDbContext appDbContext)
        {
            this.customAuthenticationService = customAuthenticationService;
            this.appDbContext = appDbContext;
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
    }
}
