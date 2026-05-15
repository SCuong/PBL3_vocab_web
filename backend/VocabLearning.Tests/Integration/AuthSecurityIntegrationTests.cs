using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace VocabLearning.Tests.Integration
{
    public class AuthSecurityIntegrationTests
    {
        public static bool IsSqlIntegrationConfigured => PostgreSqlIntegrationWebAppFactory.IsConfigured;

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LoginApi_FailedCredentials_ShouldReturnUnauthorized_AndNotAuthenticateSession()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsync(
                PostgreSqlIntegrationWebAppFactory.LearnerEmail,
                "wrong-password");
            var meResponse = await client.GetAsync("/api/auth/me");

            loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            meResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            loginResponse.GetAuthCookies().Should().BeEmpty();
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task ProtectedMvcEndpoints_Unauthenticated_ShouldRedirectToLogin()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var profileResponse = await client.GetAsync("/Account/Profile");
            var adminResponse = await client.GetAsync("/Admin");

            profileResponse.StatusCode.Should().Be(HttpStatusCode.Redirect);
            profileResponse.Headers.Location.Should().NotBeNull();
            profileResponse.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
            profileResponse.Headers.Location!.OriginalString.Should().Contain("ReturnUrl=%2FAccount%2FProfile");

            adminResponse.StatusCode.Should().Be(HttpStatusCode.Redirect);
            adminResponse.Headers.Location.Should().NotBeNull();
            adminResponse.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
            adminResponse.Headers.Location!.OriginalString.Should().Contain("ReturnUrl=%2FAdmin");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task AdminEndpoint_LearnerUser_ShouldRedirectToAccessDeniedPath()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync("/Admin");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
            response.Headers.Location!.OriginalString.Should().Contain("ReturnUrl=%2FAdmin");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LoginApi_WithoutXsrfToken_ShouldRejectRequest()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                usernameOrEmail = PostgreSqlIntegrationWebAppFactory.LearnerEmail,
                password = PostgreSqlIntegrationWebAppFactory.LearnerPassword,
                rememberMe = false
            });

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            response.GetAuthCookies().Should().BeEmpty();
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LogoutApi_WithoutXsrfToken_ShouldRejectRequest_AndKeepSessionAuthenticated()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var logoutResponse = await client.PostAsJsonAsync("/api/auth/logout", new { });
            var meResponse = await client.GetAsync("/api/auth/me");

            logoutResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            meResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            await using var stream = await meResponse.Content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);
            document.RootElement.GetProperty("succeeded").GetBoolean().Should().BeTrue();
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LogoutApi_ShouldInvalidateAuthCookie_AndBlockProtectedEndpoints()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var authCookie = loginResponse.GetAuthCookies().Should().ContainSingle().Subject;

            var token = await client.GetAntiforgeryTokenAsync();
            using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
            logoutRequest.Headers.Add("X-XSRF-TOKEN", token);

            var logoutResponse = await client.SendAsync(logoutRequest);
            var meResponse = await client.GetAsync("/api/auth/me");
            var learningResponse = await client.GetAsync("/Learning");

            logoutResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            logoutResponse.GetAuthCookies().Should().ContainSingle(cookie =>
                cookie.StartsWith(GetCookieName(authCookie), StringComparison.Ordinal) &&
                (cookie.Contains("expires=", StringComparison.OrdinalIgnoreCase)
                    || cookie.Contains("max-age=0", StringComparison.OrdinalIgnoreCase)));

            meResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            learningResponse.StatusCode.Should().Be(HttpStatusCode.Redirect);
            learningResponse.Headers.Location.Should().NotBeNull();
            learningResponse.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
        }

        private static string GetCookieName(string setCookieHeader)
        {
            var separatorIndex = setCookieHeader.IndexOf('=');
            separatorIndex.Should().BeGreaterThan(0);
            return setCookieHeader[..separatorIndex];
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LogoutApi_RealRoute_WithoutXsrfToken_ShouldRejectRequest()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var logoutResponse = await client.PostAsJsonAsync("/api/auth/logout", new { });

            logoutResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LogoutApi_RealRoute_WithXsrfToken_ShouldSucceed()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var token = await client.GetAntiforgeryTokenAsync();
            using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
            logoutRequest.Headers.Add("X-XSRF-TOKEN", token);

            var logoutResponse = await client.SendAsync(logoutRequest);

            logoutResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task ChangePasswordApi_WithoutXsrfToken_ShouldRejectRequest()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostAsJsonAsync("/api/account/change-password", new
            {
                currentPassword = PostgreSqlIntegrationWebAppFactory.LearnerPassword,
                newPassword = "BrandNewSecret#2026",
                confirmNewPassword = "BrandNewSecret#2026"
            });

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    internal static class AuthSecurityIntegrationTestHttpResponseExtensions
    {
        public static List<string> GetAuthCookies(this HttpResponseMessage response)
        {
            if (!response.Headers.TryGetValues("Set-Cookie", out var values))
            {
                return [];
            }

            return values
                .Where(value => !value.Contains("Antiforgery", StringComparison.OrdinalIgnoreCase))
                .Where(value => !value.Contains(".External", StringComparison.OrdinalIgnoreCase))
                .ToList();
        }
    }
}
