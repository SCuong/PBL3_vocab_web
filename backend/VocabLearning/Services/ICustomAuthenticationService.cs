using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using VocabLearning.Models;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Services
{
    public interface ICustomAuthenticationService
    {
        Task<(bool Succeeded, string? ErrorMessage, Users? User)> RegisterAsync(
            string username, string email, string password,
            CancellationToken cancellationToken = default);

        Task<Users?> AuthenticateAsync(
            string usernameOrEmail, string password,
            CancellationToken cancellationToken = default);

        Task<(Users? User, string? ErrorMessage)> AuthenticateForLoginAsync(
            string usernameOrEmail, string password,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage, Users? User)> AuthenticateGoogleAsync(
            string email, string googleSubject, string? displayName,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> ChangePasswordAsync(
            long userId, string? currentPassword, string newPassword,
            CancellationToken cancellationToken = default);

        bool ValidatePasswordAsync(string passwordHash, string password);

        Task<(bool ShouldSendEmail, string Email, string Username, string Token)> CreatePasswordResetTokenAsync(
            string email, CancellationToken cancellationToken = default);

        Task<(bool ShouldSendEmail, string Email, string Username, string Token)> CreateEmailVerificationTokenAsync(
            long userId, CancellationToken cancellationToken = default);

        Task<(bool ShouldSendEmail, string Email, string Username, string Token)> CreateEmailVerificationTokenForEmailAsync(
            string email, CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> VerifyEmailAsync(
            string token, string? consumedByIp,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> ResetPasswordWithTokenAsync(
            string email, string token, string newPassword, string? consumedByIp,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage, Users? User)> UpdateProfileAsync(
            long userId, string username, string email,
            CancellationToken cancellationToken = default);

        Task<List<Users>> GetUsersAsync(CancellationToken cancellationToken = default);

        Task<Users?> GetUserByIdAsync(long userId, CancellationToken cancellationToken = default);

        Task<Users?> ResolveAuthenticatedUserAsync(
            ClaimsPrincipal principal, CancellationToken cancellationToken = default);

        Task<AuthenticatedUserViewModel?> ResolveAuthenticatedUserViewAsync(
            ClaimsPrincipal principal, CancellationToken cancellationToken = default);

        Task<long?> ResolveAuthenticatedUserIdAsync(
            ClaimsPrincipal principal, CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage, Users? User)> CreateUserAsync(
            string username, string email, string password, string role, string status,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> UpdateUserAsync(
            long userId, string username, string email, string? password,
            string role, string status, long currentUserId,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> DeleteUserAsync(
            long userId, long currentUserId,
            CancellationToken cancellationToken = default);

        Task SignInAsync(
            HttpContext httpContext, Users user, bool isPersistent,
            string authenticationMethod = "Password",
            IEnumerable<AuthenticationToken>? tokens = null);

        Task SignOutAsync(HttpContext httpContext);
    }
}
