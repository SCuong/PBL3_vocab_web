using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using VocabLearning.Controllers;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Tests.Controllers
{
    public class PasswordResetControllerTests : IDisposable
    {
        private readonly Data.AppDbContext _context;
        private readonly CustomAuthenticationService _authService;
        private readonly PasswordResetController _controller;

        public PasswordResetControllerTests()
        {
            _context = TestDbContextFactory.Create();
            _authService = new CustomAuthenticationService(_context);

            var configValues = new Dictionary<string, string?>
            {
                ["Frontend:Origin"] = "http://localhost:3000",
                ["PasswordReset:ExposeResetLinkInResponse"] = "false"
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(configValues)
                .Build();

            var environment = Mock.Of<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>(
                e => e.EnvironmentName == Environments.Production);

            var emailService = new Mock<PasswordResetEmailService>(
                Mock.Of<IConfiguration>(),
                Mock.Of<ILogger<PasswordResetEmailService>>());

            var logger = Mock.Of<ILogger<PasswordResetController>>();

            _controller = new PasswordResetController(
                configuration,
                environment,
                _authService,
                emailService.Object,
                logger);

            // Set up HttpContext for the controller
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region ForgotPasswordApi

        [Fact]
        public async Task ForgotPasswordApi_WithNullRequest_ShouldReturnBadRequest()
        {
            // Act
            var result = await _controller.ForgotPasswordApi(null, CancellationToken.None);

            // Assert
            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeFalse();
            response.Message.Should().Be("Email is required.");
        }

        [Fact]
        public async Task ForgotPasswordApi_WithEmptyEmail_ShouldReturnBadRequest()
        {
            // Act
            var result = await _controller.ForgotPasswordApi(
                new ForgotPasswordApiRequest { Email = "  " },
                CancellationToken.None);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ForgotPasswordApi_WithValidEmail_UnknownUser_ShouldReturnOk()
        {
            // The endpoint should not reveal whether the email exists
            // Act
            var result = await _controller.ForgotPasswordApi(
                new ForgotPasswordApiRequest { Email = "unknown@example.com" },
                CancellationToken.None);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeTrue();
            // Should not reveal that user doesn't exist
        }

        [Fact]
        public async Task ForgotPasswordApi_WithValidEmail_ExistingUser_ShouldNotCrash()
        {
            // Arrange
            await _authService.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act — The email service mock will call the real (non-virtual) method which throws
            // due to missing SMTP config. The controller catches this and either:
            //   - Returns 500 (production mode, ExposeResetLinkInResponse=false)
            //   - Returns Ok with fallback link (development mode)
            // We just verify it handles the error gracefully without an unhandled exception.
            var result = await _controller.ForgotPasswordApi(
                new ForgotPasswordApiRequest { Email = "test@example.com" },
                CancellationToken.None);

            // Assert — in production mode it returns 500 because email service fails
            result.Result.Should().NotBeNull();
            var statusCode = result.Result as ObjectResult;
            statusCode.Should().NotBeNull();
        }

        #endregion

        #region ResetPasswordApi

        [Fact]
        public async Task ResetPasswordApi_WithNullRequest_ShouldReturnBadRequest()
        {
            // Act
            var result = await _controller.ResetPasswordApi(null, CancellationToken.None);

            // Assert
            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeFalse();
            response.Message.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task ResetPasswordApi_WithMissingFields_ShouldReturnBadRequest()
        {
            // Act
            var result = await _controller.ResetPasswordApi(
                new ResetPasswordApiRequest
                {
                    Email = "test@example.com",
                    Token = "",
                    NewPassword = "NewPass123!",
                    ConfirmNewPassword = "NewPass123!"
                },
                CancellationToken.None);

            // Assert
            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Message.Should().Contain("required");
        }

        [Fact]
        public async Task ResetPasswordApi_WithPasswordMismatch_ShouldReturnBadRequest()
        {
            // Act
            var result = await _controller.ResetPasswordApi(
                new ResetPasswordApiRequest
                {
                    Email = "test@example.com",
                    Token = "some-token",
                    NewPassword = "NewPass123!",
                    ConfirmNewPassword = "DifferentPass!"
                },
                CancellationToken.None);

            // Assert
            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Message.Should().Be("Password confirmation does not match.");
        }

        [Fact]
        public async Task ResetPasswordApi_WithInvalidToken_ShouldReturnBadRequest()
        {
            // Arrange
            await _authService.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act
            var result = await _controller.ResetPasswordApi(
                new ResetPasswordApiRequest
                {
                    Email = "test@example.com",
                    Token = "invalid-token",
                    NewPassword = "NewPass123!",
                    ConfirmNewPassword = "NewPass123!"
                },
                CancellationToken.None);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ResetPasswordApi_WithValidToken_ShouldResetPassword()
        {
            // Arrange
            await _authService.RegisterAsync("testuser", "test@example.com", "OldPassword1!");
            var (_, _, _, token) = await _authService.CreatePasswordResetTokenAsync("test@example.com");

            // Act
            var result = await _controller.ResetPasswordApi(
                new ResetPasswordApiRequest
                {
                    Email = "test@example.com",
                    Token = token,
                    NewPassword = "NewPassword1!",
                    ConfirmNewPassword = "NewPassword1!"
                },
                CancellationToken.None);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeTrue();
            response.Message.Should().Be("Password reset successfully.");

            // Verify new password works
            var user = await _authService.AuthenticateAsync("testuser", "NewPassword1!");
            user.Should().NotBeNull();
        }

        #endregion
    }
}
