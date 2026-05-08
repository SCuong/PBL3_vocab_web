using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    public class CustomAuthenticationServiceTests : IDisposable
    {
        private readonly Data.AppDbContext _context;
        private readonly CustomAuthenticationService _service;

        public CustomAuthenticationServiceTests()
        {
            _context = TestDbContextFactory.Create();
            _service = new CustomAuthenticationService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region RegisterAsync

        [Fact]
        public async Task RegisterAsync_WithValidData_ShouldCreateUser()
        {
            // Act
            var (succeeded, errorMessage, user) = await _service.RegisterAsync(
                "newuser", "newuser@example.com", "StrongPass123!");

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
            user.Should().NotBeNull();
            user!.Username.Should().Be("newuser");
            user.Email.Should().Be("newuser@example.com");
            user.Role.Should().Be(UserRoles.Learner);
            user.Status.Should().Be(UserStatuses.Active);
            user.PasswordHash.Should().StartWith("PBKDF2$");
        }

        [Fact]
        public async Task RegisterAsync_WithDuplicateUsername_ShouldFail()
        {
            // Arrange
            await _service.RegisterAsync("existinguser", "first@example.com", "Password123!");

            // Act
            var (succeeded, errorMessage, _) = await _service.RegisterAsync(
                "existinguser", "second@example.com", "Password123!");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("User already exists.");
        }

        [Fact]
        public async Task RegisterAsync_WithDuplicateEmail_ShouldFail()
        {
            // Arrange
            await _service.RegisterAsync("user1", "same@example.com", "Password123!");

            // Act
            var (succeeded, errorMessage, _) = await _service.RegisterAsync(
                "user2", "same@example.com", "Password123!");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Email is already registered.");
        }

        [Fact]
        public async Task RegisterAsync_ShouldTrimUsernameAndEmail()
        {
            // Act
            var (succeeded, _, user) = await _service.RegisterAsync(
                "  spaceduser  ", "  spaced@example.com  ", "Password123!");

            // Assert
            succeeded.Should().BeTrue();
            user!.Username.Should().Be("spaceduser");
            user.Email.Should().Be("spaced@example.com");
        }

        #endregion

        #region AuthenticateAsync

        [Fact]
        public async Task AuthenticateAsync_WithValidCredentials_ShouldReturnUser()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "MyPassword1!");

            // Act
            var user = await _service.AuthenticateAsync("testuser", "MyPassword1!");

            // Assert
            user.Should().NotBeNull();
            user!.Username.Should().Be("testuser");
        }

        [Fact]
        public async Task AuthenticateAsync_WithEmail_ShouldReturnUser()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "MyPassword1!");

            // Act
            var user = await _service.AuthenticateAsync("test@example.com", "MyPassword1!");

            // Assert
            user.Should().NotBeNull();
            user!.Username.Should().Be("testuser");
        }

        [Fact]
        public async Task AuthenticateAsync_WithWrongPassword_ShouldReturnNull()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "CorrectPassword1!");

            // Act
            var user = await _service.AuthenticateAsync("testuser", "WrongPassword1!");

            // Assert
            user.Should().BeNull();
        }

        [Fact]
        public async Task AuthenticateAsync_WithNonExistentUser_ShouldReturnNull()
        {
            // Act
            var user = await _service.AuthenticateAsync("nobody", "Password1!");

            // Assert
            user.Should().BeNull();
        }

        [Fact]
        public async Task AuthenticateAsync_InactiveUser_ShouldReturnNull()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "MyPassword1!");
            var user = await _context.Users.SingleAsync(u => u.Username == "testuser");
            user.Status = UserStatuses.Inactive;
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.AuthenticateAsync("testuser", "MyPassword1!");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task AuthenticateAsync_DeletedUser_ShouldReturnNull()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "MyPassword1!");
            var user = await _context.Users.SingleAsync(u => u.Username == "testuser");
            user.IsDeleted = true;
            await _context.SaveChangesAsync();

            // Act
            var result = await _service.AuthenticateAsync("testuser", "MyPassword1!");

            // Assert
            result.Should().BeNull();
        }

        #endregion

        #region ChangePasswordAsync

        [Fact]
        public async Task ChangePasswordAsync_WithCorrectCurrentPassword_ShouldSucceed()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("testuser", "test@example.com", "OldPassword1!");

            // Act
            var (succeeded, errorMessage) = await _service.ChangePasswordAsync(
                user!.UserId, "OldPassword1!", "NewPassword1!");

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();

            // Verify new password works
            var authenticated = await _service.AuthenticateAsync("testuser", "NewPassword1!");
            authenticated.Should().NotBeNull();
        }

        [Fact]
        public async Task ChangePasswordAsync_WithWrongCurrentPassword_ShouldFail()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("testuser", "test@example.com", "OldPassword1!");

            // Act
            var (succeeded, errorMessage) = await _service.ChangePasswordAsync(
                user!.UserId, "WrongPassword!", "NewPassword1!");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Current password is incorrect.");
        }

        [Fact]
        public async Task ChangePasswordAsync_WithNonExistentUser_ShouldFail()
        {
            // Act
            var (succeeded, errorMessage) = await _service.ChangePasswordAsync(
                999, "OldPass!", "NewPass!");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("User account was not found.");
        }

        #endregion

        #region ValidatePasswordAsync

        [Fact]
        public async Task ValidatePasswordAsync_WithMatchingPassword_ShouldReturnTrue()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("testuser", "test@example.com", "TestPass123!");

            // Act
            var result = _service.ValidatePasswordAsync(user!.PasswordHash, "TestPass123!");

            // Assert
            result.Should().BeTrue();
        }

        [Fact]
        public async Task ValidatePasswordAsync_WithWrongPassword_ShouldReturnFalse()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("testuser", "test@example.com", "TestPass123!");

            // Act
            var result = _service.ValidatePasswordAsync(user!.PasswordHash, "WrongPass!");

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void ValidatePasswordAsync_WithEmptyHash_ShouldReturnFalse()
        {
            // Act
            var result = _service.ValidatePasswordAsync(string.Empty, "AnyPassword!");

            // Assert
            result.Should().BeFalse();
        }

        #endregion

        #region Password Hashing Security

        [Fact]
        public async Task PasswordHash_ShouldUsePBKDF2Format()
        {
            // Arrange & Act
            var (_, _, user) = await _service.RegisterAsync("testuser", "test@example.com", "Password123!");

            // Assert — format: PBKDF2$120000$<base64-salt>$<base64-hash>
            var parts = user!.PasswordHash.Split('$');
            parts.Should().HaveCount(4);
            parts[0].Should().Be("PBKDF2");
            parts[1].Should().Be("120000");

            // Salt should be 16 bytes → base64 length ~24
            var salt = Convert.FromBase64String(parts[2]);
            salt.Should().HaveCount(16);

            // Hash should be 32 bytes → base64 length ~44
            var hash = Convert.FromBase64String(parts[3]);
            hash.Should().HaveCount(32);
        }

        [Fact]
        public async Task PasswordHash_SamePassword_ShouldProduceDifferentHashes()
        {
            // Arrange & Act
            var (_, _, user1) = await _service.RegisterAsync("user1", "user1@example.com", "SamePassword!");
            var (_, _, user2) = await _service.RegisterAsync("user2", "user2@example.com", "SamePassword!");

            // Assert — different salts produce different hashes
            user1!.PasswordHash.Should().NotBe(user2!.PasswordHash);
        }

        #endregion

        #region UpdateProfileAsync

        [Fact]
        public async Task UpdateProfileAsync_WithValidData_ShouldSucceed()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("oldname", "old@example.com", "Password1!");

            // Act
            var (succeeded, _, updatedUser) = await _service.UpdateProfileAsync(
                user!.UserId, "newname", "new@example.com");

            // Assert
            succeeded.Should().BeTrue();
            updatedUser!.Username.Should().Be("newname");
            updatedUser.Email.Should().Be("new@example.com");
        }

        [Fact]
        public async Task UpdateProfileAsync_WithDuplicateUsername_ShouldFail()
        {
            // Arrange
            await _service.RegisterAsync("user1", "user1@example.com", "Password1!");
            var (_, _, user2) = await _service.RegisterAsync("user2", "user2@example.com", "Password1!");

            // Act
            var (succeeded, errorMessage, _) = await _service.UpdateProfileAsync(
                user2!.UserId, "user1", "user2@example.com");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Username is already taken.");
        }

        [Fact]
        public async Task UpdateProfileAsync_WithEmptyUsername_ShouldFail()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act
            var (succeeded, errorMessage, _) = await _service.UpdateProfileAsync(
                user!.UserId, "  ", "test@example.com");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Username is required.");
        }

        #endregion

        #region CreatePasswordResetTokenAsync

        [Fact]
        public async Task CreatePasswordResetTokenAsync_WithValidEmail_ShouldReturnToken()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act
            var (shouldSendEmail, email, username, token) =
                await _service.CreatePasswordResetTokenAsync("test@example.com");

            // Assert
            shouldSendEmail.Should().BeTrue();
            email.Should().Be("test@example.com");
            username.Should().Be("testuser");
            token.Should().NotBeNullOrWhiteSpace();
        }

        [Fact]
        public async Task CreatePasswordResetTokenAsync_WithUnknownEmail_ShouldNotSendEmail()
        {
            // Act
            var (shouldSendEmail, _, _, _) =
                await _service.CreatePasswordResetTokenAsync("unknown@example.com");

            // Assert
            shouldSendEmail.Should().BeFalse();
        }

        [Fact]
        public async Task CreatePasswordResetTokenAsync_WithEmptyEmail_ShouldNotSendEmail()
        {
            // Act
            var (shouldSendEmail, _, _, _) =
                await _service.CreatePasswordResetTokenAsync("  ");

            // Assert
            shouldSendEmail.Should().BeFalse();
        }

        [Fact]
        public async Task CreatePasswordResetTokenAsync_ShouldInvalidatePreviousTokens()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act — create two tokens
            await _service.CreatePasswordResetTokenAsync("test@example.com");
            await _service.CreatePasswordResetTokenAsync("test@example.com");

            // Assert — only one active token remains
            var activeTokens = await _context.PasswordResetTokens
                .Where(t => t.UsedAt == null)
                .CountAsync();

            activeTokens.Should().Be(1);
        }

        #endregion

        #region ResetPasswordWithTokenAsync

        [Fact]
        public async Task ResetPasswordWithTokenAsync_WithValidToken_ShouldSucceed()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "OldPassword1!");
            var (_, _, _, token) = await _service.CreatePasswordResetTokenAsync("test@example.com");

            // Act
            var (succeeded, errorMessage) = await _service.ResetPasswordWithTokenAsync(
                "test@example.com", token, "NewPassword1!", "127.0.0.1");

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();

            // Verify new password works
            var user = await _service.AuthenticateAsync("testuser", "NewPassword1!");
            user.Should().NotBeNull();
        }

        [Fact]
        public async Task ResetPasswordWithTokenAsync_WithInvalidToken_ShouldFail()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "OldPassword1!");

            // Act
            var (succeeded, errorMessage) = await _service.ResetPasswordWithTokenAsync(
                "test@example.com", "invalid-token", "NewPassword1!", "127.0.0.1");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Contain("invalid or has expired");
        }

        [Fact]
        public async Task ResetPasswordWithTokenAsync_TokenUsedTwice_ShouldFailOnSecondUse()
        {
            // Arrange
            await _service.RegisterAsync("testuser", "test@example.com", "OldPassword1!");
            var (_, _, _, token) = await _service.CreatePasswordResetTokenAsync("test@example.com");

            // First use — succeeds
            await _service.ResetPasswordWithTokenAsync(
                "test@example.com", token, "NewPassword1!", "127.0.0.1");

            // Act — second use
            var (succeeded, errorMessage) = await _service.ResetPasswordWithTokenAsync(
                "test@example.com", token, "AnotherPassword!", "127.0.0.1");

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Contain("invalid or has expired");
        }

        [Fact]
        public async Task ResetPasswordWithTokenAsync_WithEmptyFields_ShouldFail()
        {
            // Act
            var (succeeded, errorMessage) = await _service.ResetPasswordWithTokenAsync(
                "", "", "", null);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Invalid password reset request.");
        }

        #endregion

        #region CreateUserAsync (Admin)

        [Fact]
        public async Task CreateUserAsync_WithValidData_ShouldCreateUser()
        {
            // Act
            var (succeeded, _, user) = await _service.CreateUserAsync(
                "adminuser", "admin@example.com", "Password1!", UserRoles.Admin, UserStatuses.Active);

            // Assert
            succeeded.Should().BeTrue();
            user!.Role.Should().Be(UserRoles.Admin);
            user.Status.Should().Be(UserStatuses.Active);
        }

        [Fact]
        public async Task CreateUserAsync_WithInvalidRole_ShouldFail()
        {
            // Act
            var (succeeded, errorMessage, _) = await _service.CreateUserAsync(
                "user", "user@example.com", "Password1!", "INVALID_ROLE", UserStatuses.Active);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Role is invalid.");
        }

        [Fact]
        public async Task CreateUserAsync_WithEmptyPassword_ShouldFail()
        {
            // Act
            var (succeeded, errorMessage, _) = await _service.CreateUserAsync(
                "user", "user@example.com", "  ", UserRoles.Learner, UserStatuses.Active);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Password is required.");
        }

        #endregion

        #region DeleteUserAsync

        [Fact]
        public async Task DeleteUserAsync_ShouldRemoveUserAndRelatedData()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("toDelete", "delete@example.com", "Password1!");

            // Also add an admin so deletion is allowed
            await _service.CreateUserAsync("admin", "admin@example.com", "Password1!", UserRoles.Admin, UserStatuses.Active);
            var admin = await _context.Users.SingleAsync(u => u.Username == "admin");

            // Act
            var (succeeded, _) = await _service.DeleteUserAsync(user!.UserId, admin.UserId);

            // Assert
            succeeded.Should().BeTrue();
            var deletedUser = await _context.Users.FindAsync(user.UserId);
            deletedUser.Should().BeNull();
        }

        [Fact]
        public async Task DeleteUserAsync_CannotDeleteSelf()
        {
            // Arrange
            var (_, _, user) = await _service.RegisterAsync("selfuser", "self@example.com", "Password1!");

            // Act
            var (succeeded, errorMessage) = await _service.DeleteUserAsync(user!.UserId, user.UserId);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("You cannot delete your own account.");
        }

        [Fact]
        public async Task DeleteUserAsync_LastAdmin_ShouldFail()
        {
            // Arrange
            await _service.CreateUserAsync("admin", "admin@example.com", "Password1!", UserRoles.Admin, UserStatuses.Active);
            var (_, _, learner) = await _service.RegisterAsync("learner", "learner@example.com", "Password1!");
            var admin = await _context.Users.SingleAsync(u => u.Username == "admin");

            // Act
            var (succeeded, errorMessage) = await _service.DeleteUserAsync(admin.UserId, learner!.UserId);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("At least one active admin account must remain.");
        }

        #endregion

        #region AuthenticateGoogleAsync

        [Fact]
        public async Task AuthenticateGoogleAsync_NewUser_ShouldCreateAccount()
        {
            // Act
            var (succeeded, _, user) = await _service.AuthenticateGoogleAsync(
                "google@example.com", "google-sub-123", "Google User");

            // Assert
            succeeded.Should().BeTrue();
            user.Should().NotBeNull();
            user!.GoogleSubject.Should().Be("google-sub-123");
            user.Role.Should().Be(UserRoles.Learner);
        }

        [Fact]
        public async Task AuthenticateGoogleAsync_ExistingGoogleUser_ShouldReturnUser()
        {
            // Arrange
            await _service.AuthenticateGoogleAsync("google@example.com", "google-sub-123", "Google User");

            // Act
            var (succeeded, _, user) = await _service.AuthenticateGoogleAsync(
                "google@example.com", "google-sub-123", "Google User");

            // Assert
            succeeded.Should().BeTrue();
            user.Should().NotBeNull();
        }

        [Fact]
        public async Task AuthenticateGoogleAsync_ExistingEmailUser_ShouldLinkGoogleAccount()
        {
            // Arrange — register with email/password first
            await _service.RegisterAsync("localuser", "shared@example.com", "Password1!");

            // Act — login with Google using same email
            var (succeeded, _, user) = await _service.AuthenticateGoogleAsync(
                "shared@example.com", "google-sub-456", "Local User");

            // Assert
            succeeded.Should().BeTrue();
            user!.GoogleSubject.Should().Be("google-sub-456");
            user.Username.Should().Be("localuser"); // keeps existing username
        }

        [Fact]
        public async Task AuthenticateGoogleAsync_WithEmptyData_ShouldFail()
        {
            // Act
            var (succeeded, errorMessage, _) = await _service.AuthenticateGoogleAsync("", "", null);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Contain("enough account information");
        }

        #endregion
    }
}
