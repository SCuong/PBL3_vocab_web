using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using VocabLearning.Data;

namespace VocabLearning.Tests.Integration
{
    public class AdminApiIntegrationTests
    {
        public static bool IsSqlIntegrationConfigured => PostgreSqlIntegrationWebAppFactory.IsConfigured;

        [Fact(SkipUnless = nameof(IsSqlIntegrationConfigured), Skip = "Set VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING to run PostgreSQL-backed integration tests.")]
        public async Task CreateTopic_AsAdmin_ShouldPersistTopic()
        {
            await using var factory = new PostgreSqlIntegrationWebAppFactory();
            await factory.InitializeAsync();
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            var login = await client.LoginAsSeededAdminAsync();
            login.StatusCode.Should().Be(HttpStatusCode.OK);
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/topics")
            {
                Content = JsonContent.Create(new
                {
                    name = "Review practice",
                    description = "Practice for the next review",
                    parentTopicId = PostgreSqlIntegrationWebAppFactory.ParentTopicId
                })
            };
            request.Headers.Add("X-XSRF-TOKEN", await client.GetAntiforgeryTokenAsync());

            var response = await client.SendAsync(request);
            response.StatusCode.Should().Be(HttpStatusCode.OK);

            using var scope = factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.Topics.Should().ContainSingle(topic =>
                topic.Name == "Review practice" &&
                topic.ParentTopicId == PostgreSqlIntegrationWebAppFactory.ParentTopicId);
        }
    }
}
