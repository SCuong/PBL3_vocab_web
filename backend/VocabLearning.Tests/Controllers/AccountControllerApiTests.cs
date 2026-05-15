using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using VocabLearning.Constants;
using VocabLearning.Controllers;
using VocabLearning.Data;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;
using VocabLearning.ViewModels.Account;

namespace VocabLearning.Tests.Controllers
{
    public class AccountControllerApiTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly CustomAuthenticationService _authService;
        private readonly AccountController _controller;

        public AccountControllerApiTests()
        {
            _context = TestDbContextFactory.Create();
            _authService = new CustomAuthenticationService(_context);

            var configuration = new ConfigurationBuilder().AddInMemoryCollection().Build();
            var googleVerifier = new GoogleIdTokenVerifier(
                new HttpClient(),
                configuration,
                NullLogger<GoogleIdTokenVerifier>.Instance);
            var passwordResetEmailService = new PasswordResetEmailService(
                configuration,
                NullLogger<PasswordResetEmailService>.Instance);
            var environment = Mock.Of<IWebHostEnvironment>();

            _controller = new AccountController(
                _authService,
                _context,
                googleVerifier,
                passwordResetEmailService,
                configuration,
                environment,
                NullLogger<AccountController>.Instance);

            // Set up HttpContext with a mock IAuthenticationService so SignInAsync works
            var authServiceMock = new Mock<IAuthenticationService>();
            authServiceMock
                .Setup(a => a.SignInAsync(
                    It.IsAny<HttpContext>(),
                    It.IsAny<string>(),
                    It.IsAny<ClaimsPrincipal>(),
                    It.IsAny<AuthenticationProperties>()))
                .Returns(Task.CompletedTask);

            var serviceProvider = new ServiceCollection()
                .AddSingleton(authServiceMock.Object)
                .BuildServiceProvider();

            var httpContext = new DefaultHttpContext
            {
                RequestServices = serviceProvider
            };

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = httpContext
            };
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region LoginApi

        [Fact]
        public async Task LoginApi_WithNullRequest_ShouldReturnBadRequest()
        {
            var result = await _controller.LoginApi(null, CancellationToken.None);

            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeFalse();
            response.Message.Should().Be("Request body is required.");
        }

        [Fact]
        public async Task LoginApi_WithEmptyCredentials_ShouldReturnBadRequest()
        {
            var result = await _controller.LoginApi(
                new LoginApiRequest { UsernameOrEmail = "", Password = "" },
                CancellationToken.None);

            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Message.Should().Contain("required");
        }

        [Fact]
        public async Task LoginApi_WithWrongCredentials_ShouldReturnUnauthorized()
        {
            // Arrange
            await _authService.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act
            var result = await _controller.LoginApi(
                new LoginApiRequest { UsernameOrEmail = "testuser", Password = "WrongPass!" },
                CancellationToken.None);

            // Assert
            result.Result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task LoginApi_WithValidCredentials_ShouldReturnOkWithUser()
        {
            // Arrange
            await _authService.RegisterAsync("testuser", "test@example.com", "Password1!");

            // Act
            var result = await _controller.LoginApi(
                new LoginApiRequest { UsernameOrEmail = "testuser", Password = "Password1!" },
                CancellationToken.None);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeTrue();
            response.User.Should().NotBeNull();
            response.User!.Username.Should().Be("testuser");
            response.User.Role.Should().Be(UserRoles.Learner);
        }

        #endregion

        #region RegisterApi

        [Fact]
        public async Task RegisterApi_WithNullRequest_ShouldReturnBadRequest()
        {
            var result = await _controller.RegisterApi(null, CancellationToken.None);

            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task RegisterApi_WithEmptyFields_ShouldReturnBadRequest()
        {
            var result = await _controller.RegisterApi(
                new RegisterApiRequest { Name = "", Email = "", Password = "" },
                CancellationToken.None);

            var badRequest = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var response = badRequest.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Message.Should().Contain("required");
        }

        [Fact]
        public async Task RegisterApi_WithValidData_ShouldReturnOkWithUser()
        {
            var result = await _controller.RegisterApi(
                new RegisterApiRequest
                {
                    Name = "newuser",
                    Email = "new@example.com",
                    Password = "Password1!"
                },
                CancellationToken.None);

            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeTrue();
            response.User!.Username.Should().Be("newuser");
        }

        [Fact]
        public async Task RegisterApi_DuplicateUsername_ShouldReturnBadRequest()
        {
            // Arrange
            await _authService.RegisterAsync("existing", "first@example.com", "Password1!");

            // Act
            var result = await _controller.RegisterApi(
                new RegisterApiRequest
                {
                    Name = "existing",
                    Email = "second@example.com",
                    Password = "Password1!"
                },
                CancellationToken.None);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        #endregion

        #region GetCurrentUserApi

        [Fact]
        public async Task GetCurrentUserApi_Unauthenticated_ShouldReturnUnauthorized()
        {
            // HttpContext has no authenticated user by default
            var result = await _controller.GetCurrentUserApi(CancellationToken.None);

            result.Result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task GetCurrentUserApi_Authenticated_ShouldReturnUser()
        {
            // Arrange
            var (_, _, user) = await _authService.RegisterAsync("testuser", "test@example.com", "Password1!");

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user!.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email)
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);

            // Act
            var result = await _controller.GetCurrentUserApi(CancellationToken.None);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var response = okResult.Value.Should().BeOfType<AuthApiResponse>().Subject;
            response.Succeeded.Should().BeTrue();
            response.User!.Username.Should().Be("testuser");
        }

        #endregion
    }
}
