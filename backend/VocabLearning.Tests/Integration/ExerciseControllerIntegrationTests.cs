using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using VocabLearning.Data;

namespace VocabLearning.Tests.Integration
{
    public class ExerciseControllerIntegrationTests
    {
        public static bool IsSqlIntegrationConfigured => SqlServerIntegrationWebAppFactory.IsConfigured;

        private const string SkipMessage =
            "Set VOCABLEARNING_TEST_SQL_CONNECTION_STRING to run SQL-backed integration tests.";

        #region Authorization

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseIndex_Unauthenticated_ShouldRedirectToLogin()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var response = await client.GetAsync("/Exercise");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_Unauthenticated_ShouldRedirectToLogin()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var response = await client.GetAsync("/Exercise/Create");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseIndex_LearnerAuthenticated_ShouldRedirectToAccessDenied()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync("/Exercise");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_LearnerAuthenticated_ShouldRedirectToAccessDenied()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync("/Exercise/Create");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
        }

        #endregion

        #region Create — invalid inputs

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_InvalidModelState_ShouldReturnFormView()
        {
            // VocabId=0 fails [Range(1, long.MaxValue)] and empty Type fails [Required] → ModelState invalid
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Create", new Dictionary<string, string>
            {
                ["VocabId"] = "0",
                ["Type"] = ""
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_NonExistentVocabId_ShouldReturnFormWithServiceError()
        {
            // VocabId=999999 passes model validation but vocab is absent → service returns failure
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Create", new Dictionary<string, string>
            {
                ["VocabId"] = "999999",
                ["Type"] = "FILLING"
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var html = await response.Content.ReadAsStringAsync();
            html.Should().Contain("Vocabulary does not exist");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_UnsupportedExerciseType_ShouldReturnFormWithServiceError()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Create", new Dictionary<string, string>
            {
                ["VocabId"] = SqlServerIntegrationWebAppFactory.FirstVocabularyId.ToString(),
                ["Type"] = "BOGUS_TYPE"
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var html = await response.Content.ReadAsStringAsync();
            html.Should().Contain("Exercise type is invalid");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_MatchMeaningWithUnsupportedMatchMode_ShouldReturnFormWithServiceError()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Create", new Dictionary<string, string>
            {
                ["VocabId"] = SqlServerIntegrationWebAppFactory.FirstVocabularyId.ToString(),
                ["Type"] = "MATCH_MEANING",
                ["MatchMode"] = "BOGUS_MODE"
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var html = await response.Content.ReadAsStringAsync();
            html.Should().Contain("Match mode is invalid");
        }

        #endregion

        #region Create — happy path

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseCreate_ValidFillingExercise_ShouldPersistAndRedirectToIndex()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Create", new Dictionary<string, string>
            {
                ["VocabId"] = SqlServerIntegrationWebAppFactory.FirstVocabularyId.ToString(),
                ["Type"] = "FILLING"
            });

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().Contain("/Exercise");

            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Exercises.Should().Contain(exercise =>
                exercise.VocabId == SqlServerIntegrationWebAppFactory.FirstVocabularyId &&
                exercise.Type == "FILLING");
        }

        #endregion

        #region Edit

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseEdit_NonExistentId_ShouldReturnNotFound()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync("/Exercise/Edit?id=999999");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseEdit_PostNonExistentExerciseId_ShouldReturnFormWithServiceError()
        {
            // ExerciseId=999999 passes model validation; service UpdateExercise returns failure (not found)
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Edit", new Dictionary<string, string>
            {
                ["ExerciseId"] = "999999",
                ["VocabId"] = SqlServerIntegrationWebAppFactory.FirstVocabularyId.ToString(),
                ["Type"] = "FILLING"
            });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var html = await response.Content.ReadAsStringAsync();
            html.Should().Contain("Exercise or vocabulary was not found");
        }

        #endregion

        #region Delete

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseDelete_NonExistentId_ShouldReturnNotFound()
        {
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync("/Exercise/Delete?id=999999");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = SkipMessage)]
        public async Task ExerciseDeleteConfirmed_NonExistentId_ShouldReturnNotFound()
        {
            // POST /Exercise/Delete with id=999999 → DeleteConfirmed → service returns false → NotFound
            await using var factory = new SqlServerIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededAdminAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostExerciseFormAsync("/Exercise/Delete", new Dictionary<string, string>
            {
                ["id"] = "999999"
            });

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        #endregion
    }

    internal static class ExerciseControllerIntegrationTestHttpClientExtensions
    {
        public static async Task<HttpResponseMessage> PostExerciseFormAsync(
            this HttpClient client,
            string path,
            Dictionary<string, string> formFields)
        {
            var token = await client.GetAntiforgeryTokenAsync();
            using var request = new HttpRequestMessage(HttpMethod.Post, path)
            {
                Content = new FormUrlEncodedContent(formFields)
            };
            request.Headers.Add("X-XSRF-TOKEN", token);
            return await client.SendAsync(request);
        }
    }
}
