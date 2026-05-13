using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using VocabLearning.Models;

namespace VocabLearning.Services
{
    public interface ICustomAuthenticationService
    {
        Task<(bool Succeeded, string? ErrorMessage, User? User)> RegisterAsync(
            string username, string email, string password,
            CancellationToken cancellationToken = default);

        Task<User?> AuthenticateAsync(
            string usernameOrEmail, string password,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage, User? User)> AuthenticateGoogleAsync(
            string email, string googleSubject, string? displayName,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> ChangePasswordAsync(
            long userId, string? currentPassword, string newPassword,
            CancellationToken cancellationToken = default);

        bool ValidatePasswordAsync(string passwordHash, string password);

        Task<(bool ShouldSendEmail, string Email, string Username, string Token)> CreatePasswordResetTokenAsync(
            string email, CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage)> ResetPasswordWithTokenAsync(
            string email, string token, string newPassword, string? consumedByIp,
            CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage, User? User)> UpdateProfileAsync(
            long userId, string username, string email,
            CancellationToken cancellationToken = default);

        Task<List<User>> GetUsersAsync(CancellationToken cancellationToken = default);

        Task<User?> GetUserByIdAsync(long userId, CancellationToken cancellationToken = default);

        Task<User?> ResolveAuthenticatedUserAsync(
            ClaimsPrincipal principal, CancellationToken cancellationToken = default);

        Task<long?> ResolveAuthenticatedUserIdAsync(
            ClaimsPrincipal principal, CancellationToken cancellationToken = default);

        Task<(bool Succeeded, string? ErrorMessage, User? User)> CreateUserAsync(
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
            HttpContext httpContext, User user, bool isPersistent,
            string authenticationMethod = "Password",
            IEnumerable<AuthenticationToken>? tokens = null);

        Task SignOutAsync(HttpContext httpContext);
    }
}
