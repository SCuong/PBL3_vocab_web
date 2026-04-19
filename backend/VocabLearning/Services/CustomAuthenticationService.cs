using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;

namespace VocabLearning.Services
{
    public class CustomAuthenticationService
    {
        private const string CustomHashPrefix = "PBKDF2";
        private const int SaltSize = 16;
        private const int KeySize = 32;
        private const int Iterations = 120_000;
        private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;
        private static readonly PasswordHasher<Users> LegacyPasswordHasher = new();

        private readonly AppDbContext dbContext;

        public CustomAuthenticationService(AppDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public async Task<(bool Succeeded, string? ErrorMessage, Users? User)> RegisterAsync(
            string username,
            string email,
            string password,
            CancellationToken cancellationToken = default)
        {
            var cleanUsername = username.Trim();
            var cleanEmail = email.Trim();

            var usernameExists = await dbContext.Users
                .AnyAsync(user => user.Username == cleanUsername, cancellationToken);

            if (usernameExists)
            {
                return (false, "User already exists.", null);
            }

            var normalizedEmail = NormalizeEmail(cleanEmail);
            var emailExists = await dbContext.Users
                .AnyAsync(user => user.Email.ToUpper() == normalizedEmail, cancellationToken);

            if (emailExists)
            {
                return (false, "Email is already registered.", null);
            }

            var user = new Users
            {
                Username = cleanUsername,
                Email = cleanEmail,
                PasswordHash = HashPassword(password),
                Role = UserRoles.Learner,
                Status = UserStatuses.Active,
                CreatedAt = DateTime.Now
            };

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);

            return (true, null, user);
        }

        public async Task<Users?> AuthenticateAsync(
            string usernameOrEmail,
            string password,
            CancellationToken cancellationToken = default)
        {
            var input = usernameOrEmail.Trim();
            var normalizedInput = input.ToUpperInvariant();
            var user = await dbContext.Users
                .SingleOrDefaultAsync(
                    item => (item.Email.ToUpper() == normalizedInput || item.Username.ToUpper() == normalizedInput)
                        && item.Status.ToUpper() == UserStatuses.Active,
                    cancellationToken);

            if (user is null)
            {
                return null;
            }

            var (verified, needsRehash) = VerifyPassword(user, password);
            if (!verified)
            {
                return null;
            }

            if (needsRehash)
            {
                user.PasswordHash = HashPassword(password);
                await dbContext.SaveChangesAsync(cancellationToken);
            }

            return user;
        }

        public async Task<(bool Succeeded, string? ErrorMessage, Users? User)> AuthenticateGoogleAsync(
            string email,
            string googleSubject,
            string? displayName,
            CancellationToken cancellationToken = default)
        {
            var cleanEmail = email.Trim();
            var cleanGoogleSubject = googleSubject.Trim();

            if (string.IsNullOrWhiteSpace(cleanEmail) || string.IsNullOrWhiteSpace(cleanGoogleSubject))
            {
                return (false, "Google login did not return enough account information.", null);
            }

            var user = await dbContext.Users
                .SingleOrDefaultAsync(item => item.GoogleSubject == cleanGoogleSubject, cancellationToken);

            if (user is not null)
            {
                if (!IsUserActive(user))
                {
                    return (false, "This account is not active.", null);
                }

                return (true, null, user);
            }

            var normalizedEmail = NormalizeEmail(cleanEmail);
            user = await dbContext.Users
                .SingleOrDefaultAsync(item => item.Email.ToUpper() == normalizedEmail, cancellationToken);

            if (user is not null)
            {
                if (!IsUserActive(user))
                {
                    return (false, "This account is not active.", null);
                }

                user.GoogleSubject = cleanGoogleSubject;
                await dbContext.SaveChangesAsync(cancellationToken);
                return (true, null, user);
            }

            var generatedUsername = await GenerateUniqueUsernameAsync(displayName, cleanEmail, cancellationToken);
            user = new Users
            {
                Username = generatedUsername,
                Email = cleanEmail,
                PasswordHash = string.Empty,
                GoogleSubject = cleanGoogleSubject,
                Role = UserRoles.Learner,
                Status = UserStatuses.Active,
                CreatedAt = DateTime.Now
            };

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, null, user);
        }

        public async Task<(bool Succeeded, string? ErrorMessage)> ChangePasswordAsync(
            long userId,
            string currentPassword,
            string newPassword,
            CancellationToken cancellationToken = default)
        {
            var user = await dbContext.Users
                .SingleOrDefaultAsync(
                    item => item.UserId == userId && item.Status.ToUpper() == UserStatuses.Active,
                    cancellationToken);

            if (user is null)
            {
                return (false, "User account was not found.");
            }

            var (verified, _) = VerifyPassword(user, currentPassword);
            if (!verified)
            {
                return (false, "Current password is incorrect.");
            }

            user.PasswordHash = HashPassword(newPassword);

            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, null);
        }

        public async Task<(bool Succeeded, string? ErrorMessage, Users? User)> UpdateProfileAsync(
            long userId,
            string username,
            string email,
            CancellationToken cancellationToken = default)
        {
            var cleanUsername = username.Trim();
            var cleanEmail = email.Trim();

            if (string.IsNullOrWhiteSpace(cleanUsername))
            {
                return (false, "Username is required.", null);
            }

            if (string.IsNullOrWhiteSpace(cleanEmail))
            {
                return (false, "Email is required.", null);
            }

            var user = await dbContext.Users
                .SingleOrDefaultAsync(
                    item => item.UserId == userId && item.Status.ToUpper() == UserStatuses.Active,
                    cancellationToken);

            if (user is null)
            {
                return (false, "User account was not found.", null);
            }

            var usernameExists = await dbContext.Users
                .AnyAsync(item => item.UserId != userId && item.Username == cleanUsername, cancellationToken);

            if (usernameExists)
            {
                return (false, "Username is already taken.", null);
            }

            var normalizedEmail = NormalizeEmail(cleanEmail);
            var emailExists = await dbContext.Users
                .AnyAsync(item => item.UserId != userId && item.Email.ToUpper() == normalizedEmail, cancellationToken);

            if (emailExists)
            {
                return (false, "Email is already registered.", null);
            }

            user.Username = cleanUsername;
            user.Email = cleanEmail;

            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, null, user);
        }

        public Task<List<Users>> GetUsersAsync(CancellationToken cancellationToken = default)
        {
            return dbContext.Users
                .OrderBy(user => user.Username)
                .ToListAsync(cancellationToken);
        }

        public Task<Users?> GetUserByIdAsync(long userId, CancellationToken cancellationToken = default)
        {
            return dbContext.Users
                .SingleOrDefaultAsync(user => user.UserId == userId, cancellationToken);
        }

        public async Task<Users?> ResolveAuthenticatedUserAsync(
            ClaimsPrincipal principal,
            CancellationToken cancellationToken = default)
        {
            if (principal.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            var userIdClaim = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            if (long.TryParse(userIdClaim, out var userId))
            {
                var userById = await dbContext.Users
                    .SingleOrDefaultAsync(user => user.UserId == userId, cancellationToken);

                if (userById is not null && IsUserActive(userById))
                {
                    return userById;
                }
            }

            var email = principal.FindFirstValue(ClaimTypes.Email)?.Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            var normalizedEmail = NormalizeEmail(email);
            var userByEmail = await dbContext.Users
                .SingleOrDefaultAsync(user => user.Email.ToUpper() == normalizedEmail, cancellationToken);

            return userByEmail is not null && IsUserActive(userByEmail)
                ? userByEmail
                : null;
        }

        public async Task<long?> ResolveAuthenticatedUserIdAsync(
            ClaimsPrincipal principal,
            CancellationToken cancellationToken = default)
        {
            var user = await ResolveAuthenticatedUserAsync(principal, cancellationToken);
            return user?.UserId;
        }

        public async Task<(bool Succeeded, string? ErrorMessage, Users? User)> CreateUserAsync(
            string username,
            string email,
            string password,
            string role,
            string status,
            CancellationToken cancellationToken = default)
        {
            var cleanUsername = username.Trim();
            var cleanEmail = email.Trim();
            var normalizedRole = NormalizeRole(role);
            var normalizedStatus = NormalizeStatus(status);

            if (normalizedRole is null)
            {
                return (false, "Role is invalid.", null);
            }

            if (normalizedStatus is null)
            {
                return (false, "Status is invalid.", null);
            }

            if (string.IsNullOrWhiteSpace(cleanUsername))
            {
                return (false, "Username is required.", null);
            }

            if (string.IsNullOrWhiteSpace(cleanEmail))
            {
                return (false, "Email is required.", null);
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                return (false, "Password is required.", null);
            }

            var usernameExists = await dbContext.Users
                .AnyAsync(user => user.Username == cleanUsername, cancellationToken);

            if (usernameExists)
            {
                return (false, "Username is already taken.", null);
            }

            var normalizedEmail = NormalizeEmail(cleanEmail);
            var emailExists = await dbContext.Users
                .AnyAsync(user => user.Email.ToUpper() == normalizedEmail, cancellationToken);

            if (emailExists)
            {
                return (false, "Email is already registered.", null);
            }

            var user = new Users
            {
                Username = cleanUsername,
                Email = cleanEmail,
                PasswordHash = HashPassword(password),
                Role = normalizedRole,
                Status = normalizedStatus,
                CreatedAt = DateTime.Now
            };

            dbContext.Users.Add(user);
            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, null, user);
        }

        public async Task<(bool Succeeded, string? ErrorMessage)> UpdateUserAsync(
            long userId,
            string username,
            string email,
            string? password,
            string role,
            string status,
            long currentUserId,
            CancellationToken cancellationToken = default)
        {
            var cleanUsername = username.Trim();
            var cleanEmail = email.Trim();
            var normalizedRole = NormalizeRole(role);
            var normalizedStatus = NormalizeStatus(status);

            if (normalizedRole is null)
            {
                return (false, "Role is invalid.");
            }

            if (normalizedStatus is null)
            {
                return (false, "Status is invalid.");
            }

            var user = await GetUserByIdAsync(userId, cancellationToken);
            if (user is null)
            {
                return (false, "User account was not found.");
            }

            var usernameExists = await dbContext.Users
                .AnyAsync(item => item.UserId != userId && item.Username == cleanUsername, cancellationToken);

            if (usernameExists)
            {
                return (false, "Username is already taken.");
            }

            var normalizedEmail = NormalizeEmail(cleanEmail);
            var emailExists = await dbContext.Users
                .AnyAsync(item => item.UserId != userId && item.Email.ToUpper() == normalizedEmail, cancellationToken);

            if (emailExists)
            {
                return (false, "Email is already registered.");
            }

            var isRemovingAdminPrivilege = string.Equals(user.Role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)
                && normalizedRole != UserRoles.Admin;
            var isDeactivatingAdmin = string.Equals(user.Role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)
                && normalizedStatus != UserStatuses.Active;

            if (user.UserId == currentUserId && normalizedRole != UserRoles.Admin)
            {
                return (false, "You cannot remove your own admin role.");
            }

            if (user.UserId == currentUserId && normalizedStatus != UserStatuses.Active)
            {
                return (false, "You cannot deactivate your own account.");
            }

            if (isRemovingAdminPrivilege || isDeactivatingAdmin)
            {
                var adminCount = await dbContext.Users
                    .CountAsync(
                        item => item.Role.ToUpper() == UserRoles.Admin
                            && item.Status.ToUpper() == UserStatuses.Active,
                        cancellationToken);

                if (adminCount <= 1)
                {
                    return (false, "At least one active admin account must remain.");
                }
            }

            user.Username = cleanUsername;
            user.Email = cleanEmail;
            user.Role = normalizedRole;
            user.Status = normalizedStatus;

            if (!string.IsNullOrWhiteSpace(password))
            {
                user.PasswordHash = HashPassword(password);
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, null);
        }

        public async Task<(bool Succeeded, string? ErrorMessage)> DeleteUserAsync(
            long userId,
            long currentUserId,
            CancellationToken cancellationToken = default)
        {
            var user = await GetUserByIdAsync(userId, cancellationToken);
            if (user is null)
            {
                return (false, "User account was not found.");
            }

            if (user.UserId == currentUserId)
            {
                return (false, "You cannot delete your own account.");
            }

            var isActiveAdmin = string.Equals(user.Role, UserRoles.Admin, StringComparison.OrdinalIgnoreCase)
                && string.Equals(user.Status, UserStatuses.Active, StringComparison.OrdinalIgnoreCase);

            if (isActiveAdmin)
            {
                var adminCount = await dbContext.Users
                    .CountAsync(
                        item => item.Role.ToUpper() == UserRoles.Admin
                            && item.Status.ToUpper() == UserStatuses.Active,
                        cancellationToken);

                if (adminCount <= 1)
                {
                    return (false, "At least one active admin account must remain.");
                }
            }

            var userVocabularies = await dbContext.UserVocabularies
                .Where(item => item.UserId == userId)
                .ToListAsync(cancellationToken);

            var progresses = await dbContext.Progresses
                .Where(item => item.UserId == userId)
                .ToListAsync(cancellationToken);

            var exerciseResults = await dbContext.ExerciseResults
                .Where(item => item.UserId == userId)
                .ToListAsync(cancellationToken);

            dbContext.UserVocabularies.RemoveRange(userVocabularies);
            dbContext.Progresses.RemoveRange(progresses);
            dbContext.ExerciseResults.RemoveRange(exerciseResults);
            dbContext.Users.Remove(user);

            await dbContext.SaveChangesAsync(cancellationToken);
            return (true, null);
        }

        public Task SignInAsync(
            HttpContext httpContext,
            Users user,
            bool isPersistent,
            string authenticationMethod = "Password",
            IEnumerable<AuthenticationToken>? tokens = null)
        {
            var principal = CreatePrincipal(user, authenticationMethod);
            var properties = new AuthenticationProperties
            {
                IsPersistent = isPersistent,
                AllowRefresh = true,
                ExpiresUtc = isPersistent ? DateTimeOffset.UtcNow.AddDays(14) : null
            };

            var authTokens = tokens?.ToArray();
            if (authTokens is { Length: > 0 })
            {
                properties.StoreTokens(authTokens);
            }

            return httpContext.SignInAsync(
                AuthenticationSchemeNames.Application,
                principal,
                properties);
        }

        public async Task SignOutAsync(HttpContext httpContext)
        {
            await httpContext.SignOutAsync(AuthenticationSchemeNames.Application);
            await httpContext.SignOutAsync(AuthenticationSchemeNames.External);
        }

        private static ClaimsPrincipal CreatePrincipal(Users user, string authenticationMethod)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString(CultureInfo.InvariantCulture)),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.AuthenticationMethod, authenticationMethod),
                new Claim(CustomClaimTypes.HasLocalPassword, HasLocalPassword(user) ? "true" : "false")
            };

            var identity = new ClaimsIdentity(claims, AuthenticationSchemeNames.Application);
            return new ClaimsPrincipal(identity);
        }

        private static string NormalizeEmail(string email)
        {
            return email.Trim().ToUpperInvariant();
        }

        private async Task<string> GenerateUniqueUsernameAsync(
            string? displayName,
            string email,
            CancellationToken cancellationToken)
        {
            var emailPrefix = email.Split('@', 2)[0];
            var baseUsername = SanitizeUsername(displayName);
            if (string.IsNullOrWhiteSpace(baseUsername))
            {
                baseUsername = SanitizeUsername(emailPrefix);
            }

            if (string.IsNullOrWhiteSpace(baseUsername))
            {
                baseUsername = "googleuser";
            }

            baseUsername = baseUsername[..Math.Min(baseUsername.Length, 40)];
            var candidate = baseUsername;
            var suffix = 1;

            while (await dbContext.Users.AnyAsync(user => user.Username == candidate, cancellationToken))
            {
                var suffixText = suffix.ToString(CultureInfo.InvariantCulture);
                var prefixLength = Math.Min(baseUsername.Length, 50 - suffixText.Length - 1);
                var trimmedBase = baseUsername[..prefixLength];
                candidate = $"{trimmedBase}_{suffixText}";
                suffix++;
            }

            return candidate;
        }

        private static string HashPassword(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, Algorithm, KeySize);
            return string.Create(
                CultureInfo.InvariantCulture,
                $"{CustomHashPrefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}");
        }

        private static (bool Verified, bool NeedsRehash) VerifyPassword(Users user, string password)
        {
            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                return (false, false);
            }

            if (user.PasswordHash.StartsWith($"{CustomHashPrefix}$", StringComparison.Ordinal))
            {
                return (TryVerifyCustomHash(password, user.PasswordHash), false);
            }

            try
            {
                var result = LegacyPasswordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
                return result == PasswordVerificationResult.Success
                    || result == PasswordVerificationResult.SuccessRehashNeeded
                    ? (true, true)
                    : (false, false);
            }
            catch (FormatException)
            {
                return (false, false);
            }
            catch (ArgumentException)
            {
                return (false, false);
            }
        }

        private static bool TryVerifyCustomHash(string password, string storedHash)
        {
            var parts = storedHash.Split('$', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length != 4 || !string.Equals(parts[0], CustomHashPrefix, StringComparison.Ordinal))
            {
                return false;
            }

            if (!int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var iterations))
            {
                return false;
            }

            try
            {
                var salt = Convert.FromBase64String(parts[2]);
                var expectedHash = Convert.FromBase64String(parts[3]);
                var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, Algorithm, expectedHash.Length);
                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }
            catch (FormatException)
            {
                return false;
            }
        }

        private static bool HasLocalPassword(Users user)
        {
            return !string.IsNullOrWhiteSpace(user.PasswordHash);
        }

        private static bool IsUserActive(Users user)
        {
            return string.Equals(user.Status?.Trim(), UserStatuses.Active, StringComparison.OrdinalIgnoreCase);
        }

        private static string? NormalizeRole(string role)
        {
            var normalizedRole = role.Trim().ToUpperInvariant();
            return normalizedRole is UserRoles.Admin or UserRoles.Learner
                ? normalizedRole
                : null;
        }

        private static string? NormalizeStatus(string status)
        {
            var normalizedStatus = status.Trim().ToUpperInvariant();
            return normalizedStatus is UserStatuses.Active or UserStatuses.Inactive
                ? normalizedStatus
                : null;
        }

        private static string SanitizeUsername(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var builder = new StringBuilder(value.Length);
            var lastWasSeparator = false;

            foreach (var character in value.Trim())
            {
                if (char.IsLetterOrDigit(character))
                {
                    builder.Append(char.ToLowerInvariant(character));
                    lastWasSeparator = false;
                    continue;
                }

                if ((character == ' ' || character == '_' || character == '-' || character == '.')
                    && !lastWasSeparator
                    && builder.Length > 0)
                {
                    builder.Append('_');
                    lastWasSeparator = true;
                }
            }

            return builder.ToString().Trim('_');
        }
    }
}
