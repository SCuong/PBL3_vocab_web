using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using VocabLearning.Data;

namespace VocabLearning.Tests.Integration
{
    public class LearningControllerIntegrationTests
    {
        public static bool IsSqlIntegrationConfigured => PostgreSqlIntegrationWebAppFactory.IsConfigured;

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LearningIndex_Unauthenticated_ShouldRedirectToLogin()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var response = await client.GetAsync("/Learning");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().StartWith("/Account/Login");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task LoginApi_WithAntiforgery_ShouldAuthenticateUser_AndAllowLearningRequests()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            var meResponse = await client.GetAsync("/api/auth/me");
            var learningResponse = await client.GetAsync("/Learning");

            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            meResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            learningResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            await using var stream = await meResponse.Content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);

            document.RootElement.GetProperty("succeeded").GetBoolean().Should().BeTrue();
            document.RootElement.GetProperty("user").GetProperty("email").GetString().Should().Be(PostgreSqlIntegrationWebAppFactory.LearnerEmail);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task MarkWordsLearnedApi_Authenticated_ShouldPersistProgressInSqlServer()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var antiforgeryToken = await client.GetAntiforgeryTokenAsync();
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/learning/progress/learn")
            {
                Content = JsonContent.Create(new
                {
                    topicId = PostgreSqlIntegrationWebAppFactory.ChildTopicId,
                    wordIds = new[] { PostgreSqlIntegrationWebAppFactory.FirstVocabularyId }
                })
            };
            request.Headers.Add("X-XSRF-TOKEN", antiforgeryToken);

            var response = await client.SendAsync(request);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var learner = dbContext.Users.Single(user => user.Email == PostgreSqlIntegrationWebAppFactory.LearnerEmail);
            dbContext.UserVocabularies.Should().Contain(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId);

            dbContext.Progresses.Should().Contain(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId &&
                item.NextReviewDate.HasValue);

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);
            var topics = document.RootElement.GetProperty("topics");
            topics.GetArrayLength().Should().BeGreaterThan(0);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task MarkWordsLearnedApi_InvalidTopicId_ShouldReturnCurrentStateWithoutPersistence()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostLearningProgressAsync(
                "/api/learning/progress/learn",
                topicId: 999999,
                wordIds: [PostgreSqlIntegrationWebAppFactory.FirstVocabularyId]);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var learner = dbContext.Users.Single(user => user.Email == PostgreSqlIntegrationWebAppFactory.LearnerEmail);

            dbContext.UserVocabularies.Should().NotContain(item => item.UserId == learner.UserId);
            dbContext.Progresses.Should().NotContain(item => item.UserId == learner.UserId);

            var topics = await response.ReadTopicsAsync();
            topics.Should().BeEmpty();
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task MarkWordsLearnedApi_EmptyLearningBatch_ShouldReturnCurrentStateWithoutPersistence()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostLearningProgressAsync(
                "/api/learning/progress/learn",
                topicId: PostgreSqlIntegrationWebAppFactory.ChildTopicId,
                wordIds: []);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var learner = dbContext.Users.Single(user => user.Email == PostgreSqlIntegrationWebAppFactory.LearnerEmail);

            dbContext.UserVocabularies.Should().NotContain(item => item.UserId == learner.UserId);
            dbContext.Progresses.Should().NotContain(item => item.UserId == learner.UserId);

            var topics = await response.ReadTopicsAsync();
            topics.Should().BeEmpty();
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task Study_InvalidIndex_ShouldClampToAvailableWord()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync(
                $"/Learning/Study?topicId={PostgreSqlIntegrationWebAppFactory.ChildTopicId}&ids={PostgreSqlIntegrationWebAppFactory.FirstVocabularyId},{PostgreSqlIntegrationWebAppFactory.SecondVocabularyId}&index=999");

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var html = await response.Content.ReadAsStringAsync();
            html.Should().Contain("Word 2/2");
            html.Should().Contain(">beta<");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task MarkWordsLearnedApi_DuplicateIds_ShouldPersistSingleLearningRecord()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostLearningProgressAsync(
                "/api/learning/progress/learn",
                topicId: PostgreSqlIntegrationWebAppFactory.ChildTopicId,
                wordIds:
                [
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId,
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId,
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId
                ]);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var learner = dbContext.Users.Single(user => user.Email == PostgreSqlIntegrationWebAppFactory.LearnerEmail);

            dbContext.UserVocabularies.Count(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId).Should().Be(1);

            dbContext.Progresses.Count(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId).Should().Be(1);

            var topics = await response.ReadTopicsAsync();
            topics.Should().ContainSingle(topic => topic.TopicId == PostgreSqlIntegrationWebAppFactory.ChildTopicId);
            topics.Single(topic => topic.TopicId == PostgreSqlIntegrationWebAppFactory.ChildTopicId)
                .LearnedWordIds.Should().Equal(PostgreSqlIntegrationWebAppFactory.FirstVocabularyId);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task MarkWordsReviewedApi_DuplicateIds_ShouldPersistSingleReviewRecord()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostLearningProgressAsync(
                "/api/learning/progress/review",
                topicId: PostgreSqlIntegrationWebAppFactory.ChildTopicId,
                wordIds:
                [
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId,
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId,
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId
                ]);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var learner = dbContext.Users.Single(user => user.Email == PostgreSqlIntegrationWebAppFactory.LearnerEmail);

            dbContext.UserVocabularies.Count(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId).Should().Be(1);

            dbContext.Progresses.Count(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId).Should().Be(1);

            var progress = dbContext.Progresses.Single(item =>
                item.UserId == learner.UserId &&
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId);

            progress.NextReviewDate.Should().NotBeNull();
            progress.NextReviewDate.Should().BeAfter(DateTime.Now);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task MarkWordsLearnedApi_MixedValidAndInvalidIds_ShouldPersistOnlyValidWords()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.PostLearningProgressAsync(
                "/api/learning/progress/learn",
                topicId: PostgreSqlIntegrationWebAppFactory.ChildTopicId,
                wordIds:
                [
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId,
                    -5,
                    999999,
                    PostgreSqlIntegrationWebAppFactory.SecondVocabularyId
                ]);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var learner = dbContext.Users.Single(user => user.Email == PostgreSqlIntegrationWebAppFactory.LearnerEmail);

            dbContext.UserVocabularies.Count(item => item.UserId == learner.UserId).Should().Be(2);
            dbContext.Progresses.Count(item => item.UserId == learner.UserId).Should().Be(2);
            dbContext.UserVocabularies.Should().OnlyContain(item =>
                item.UserId != learner.UserId ||
                item.VocabId == PostgreSqlIntegrationWebAppFactory.FirstVocabularyId ||
                item.VocabId == PostgreSqlIntegrationWebAppFactory.SecondVocabularyId);

            var topics = await response.ReadTopicsAsync();
            topics.Should().ContainSingle(topic => topic.TopicId == PostgreSqlIntegrationWebAppFactory.ChildTopicId);
            topics.Single(topic => topic.TopicId == PostgreSqlIntegrationWebAppFactory.ChildTopicId)
                .LearnedWordIds.Should().Equal(
                    PostgreSqlIntegrationWebAppFactory.FirstVocabularyId,
                    PostgreSqlIntegrationWebAppFactory.SecondVocabularyId);
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task Study_InvalidTopicId_ShouldRedirectToIndex()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync("/Learning/Study?topicId=999999&ids=1000");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().Be("/Learning");
        }

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task Result_WithoutTempData_ShouldRedirectToIndex()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var loginResponse = await client.LoginAsSeededLearnerAsync();
            loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

            var response = await client.GetAsync($"/Learning/Result?topicId={PostgreSqlIntegrationWebAppFactory.ChildTopicId}");

            response.StatusCode.Should().Be(HttpStatusCode.Redirect);
            response.Headers.Location.Should().NotBeNull();
            response.Headers.Location!.OriginalString.Should().Be($"/Learning?parentTopicId={PostgreSqlIntegrationWebAppFactory.ParentTopicId}");
        }

    }

    internal static class LearningControllerIntegrationTestHttpClientExtensions
    {
        public static async Task<HttpResponseMessage> PostLearningProgressAsync(
            this HttpClient client,
            string path,
            long topicId,
            IReadOnlyCollection<long> wordIds)
        {
            var antiforgeryToken = await client.GetAntiforgeryTokenAsync();
            using var request = new HttpRequestMessage(HttpMethod.Post, path)
            {
                Content = JsonContent.Create(new
                {
                    topicId,
                    wordIds
                })
            };
            request.Headers.Add("X-XSRF-TOKEN", antiforgeryToken);
            return await client.SendAsync(request);
        }

        public static async Task<List<ProgressTopicResponse>> ReadTopicsAsync(this HttpResponseMessage response)
        {
            await using var stream = await response.Content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);
            return document.RootElement
                .GetProperty("topics")
                .Deserialize<List<ProgressTopicResponse>>(new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? [];
        }
    }

    internal sealed class ProgressTopicResponse
    {
        public long TopicId { get; set; }

        public List<long> LearnedWordIds { get; set; } = [];

        public List<long> ReviewWordIds { get; set; } = [];
    }
}
