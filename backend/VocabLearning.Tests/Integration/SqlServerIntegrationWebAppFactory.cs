using System.Data.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;

namespace VocabLearning.Tests.Integration
{
    public sealed class SqlServerIntegrationWebAppFactory : WebApplicationFactory<Program>, IAsyncDisposable
    {
        public const string ConnectionStringEnvironmentVariable = "VOCABLEARNING_TEST_SQL_CONNECTION_STRING";
        public const string AdminEmail = "admin.integration@example.com";
        public const string AdminPassword = "AdminPassw0rd!";
        public const string LearnerEmail = "learner.integration@example.com";
        public const string LearnerPassword = "Passw0rd!";
        public const long ParentTopicId = 100;
        public const long ChildTopicId = 101;
        public const long FirstVocabularyId = 1000;
        public const long SecondVocabularyId = 1001;

        private readonly string databaseName = $"VocabLearningIntegration_{Guid.NewGuid():N}";
        private bool initialized;

        public static bool IsConfigured =>
            !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable));

        public string ConnectionString
        {
            get
            {
                var builder = new SqlConnectionStringBuilder(GetBaseConnectionString())
                {
                    InitialCatalog = databaseName,
                    MultipleActiveResultSets = true
                };

                return builder.ConnectionString;
            }
        }

        protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = ConnectionString,
                    ["Cookie:SecurePolicy"] = "SameAsRequest",
                    ["Cookie:SameSite"] = "Lax",
                    ["Frontend:Origin"] = "http://localhost",
                    ["Database:AutoMigrate"] = "false",
                    ["Authentication:Google:ClientId"] = string.Empty,
                    ["Authentication:Google:ClientSecret"] = string.Empty
                });
            });

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options => options.UseSqlServer(ConnectionString));
            });
        }

        public async Task InitializeAsync()
        {
            if (initialized)
            {
                return;
            }

            await RecreateDatabaseAsync();

            _ = Services;

            await SeedAsync();
            initialized = true;
        }

        public override async ValueTask DisposeAsync()
        {
            try
            {
                await DropDatabaseAsync();
            }
            finally
            {
                await base.DisposeAsync();
            }
        }

        private async Task RecreateDatabaseAsync()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(ConnectionString)
                .Options;

            await using var dbContext = new AppDbContext(options);
            await dbContext.Database.EnsureDeletedAsync();
            await dbContext.Database.EnsureCreatedAsync();
        }

        private async Task SeedAsync()
        {
            using var scope = Services.CreateScope();
            var serviceProvider = scope.ServiceProvider;
            var authService = serviceProvider.GetRequiredService<ICustomAuthenticationService>();
            var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

            var learnerResult = await authService.CreateUserAsync(
                "learner.integration",
                LearnerEmail,
                LearnerPassword,
                UserRoles.Learner,
                UserStatuses.Active);

            if (!learnerResult.Succeeded || learnerResult.User is null)
            {
                throw new InvalidOperationException(learnerResult.ErrorMessage ?? "Could not seed learner.");
            }

            var adminResult = await authService.CreateUserAsync(
                "admin.integration",
                AdminEmail,
                AdminPassword,
                UserRoles.Admin,
                UserStatuses.Active);

            if (!adminResult.Succeeded || adminResult.User is null)
            {
                throw new InvalidOperationException(adminResult.ErrorMessage ?? "Could not seed admin.");
            }

            dbContext.Topics.AddRange(
                new Topic
                {
                    TopicId = ParentTopicId,
                    Name = "Integration Parent",
                    Description = "Parent topic for integration tests"
                },
                new Topic
                {
                    TopicId = ChildTopicId,
                    Name = "Integration Child",
                    Description = "Child topic for integration tests",
                    ParentTopicId = ParentTopicId
                });

            dbContext.Vocabularies.AddRange(
                new Vocabulary
                {
                    VocabId = FirstVocabularyId,
                    Word = "alpha",
                    Ipa = "/al.fa/",
                    Level = "A1",
                    MeaningVi = "nghia alpha",
                    TopicId = ChildTopicId
                },
                new Vocabulary
                {
                    VocabId = SecondVocabularyId,
                    Word = "beta",
                    Ipa = "/be.ta/",
                    Level = "A1",
                    MeaningVi = "nghia beta",
                    TopicId = ChildTopicId
                });

            dbContext.Examples.AddRange(
                new Example
                {
                    ExampleId = 5000,
                    VocabId = FirstVocabularyId,
                    ExampleEn = "Alpha example sentence.",
                    ExampleVi = "Vi du alpha."
                },
                new Example
                {
                    ExampleId = 5001,
                    VocabId = SecondVocabularyId,
                    ExampleEn = "Beta example sentence.",
                    ExampleVi = "Vi du beta."
                });

            await dbContext.SaveChangesAsync();
        }

        private async Task DropDatabaseAsync()
        {
            var builder = new SqlConnectionStringBuilder(ConnectionString)
            {
                InitialCatalog = "master"
            };

            await using DbConnection connection = new SqlConnection(builder.ConnectionString);
            await connection.OpenAsync();

            await using var command = connection.CreateCommand();
            command.CommandText =
                $"IF DB_ID(N'{databaseName}') IS NOT NULL " +
                $"BEGIN ALTER DATABASE [{databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{databaseName}]; END";
            await command.ExecuteNonQueryAsync();
        }

        private static string GetBaseConnectionString()
        {
            return Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable)
                ?? throw new InvalidOperationException(
                    $"Set {ConnectionStringEnvironmentVariable} to an admin-capable SQL Server connection string before running integration tests.");
        }
    }
}
