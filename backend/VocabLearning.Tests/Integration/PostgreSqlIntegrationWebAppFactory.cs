using System.Data.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;

namespace VocabLearning.Tests.Integration
{
    public sealed class PostgreSqlIntegrationWebAppFactory : WebApplicationFactory<Program>, IAsyncDisposable
    {
        public const string ConnectionStringEnvironmentVariable = "VOCABLEARNING_TEST_POSTGRES_CONNECTION_STRING";
        public const string AdminEmail = "admin.integration@example.com";
        public const string AdminPassword = "AdminPassw0rd!";
        public const string LearnerEmail = "learner.integration@example.com";
        public const string LearnerPassword = "Passw0rd!";
        public const long ParentTopicId = 100;
        public const long ChildTopicId = 101;
        public const long FirstVocabularyId = 1000;
        public const long SecondVocabularyId = 1001;

        private readonly string databaseName = $"vocablearning_int_{Guid.NewGuid():N}";
        private bool initialized;

        public static bool IsConfigured =>
            !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable));

        public string ConnectionString
        {
            get
            {
                var builder = new NpgsqlConnectionStringBuilder(GetBaseConnectionString())
                {
                    Database = databaseName
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
                services.AddDbContext<AppDbContext>(options => options.UseNpgsql(ConnectionString));
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
            await DropDatabaseAsync();
            await CreateDatabaseAsync();

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(ConnectionString)
                .Options;

            await using var dbContext = new AppDbContext(options);
            await dbContext.Database.EnsureCreatedAsync();
        }

        private async Task SeedAsync()
        {
            using var scope = Services.CreateScope();
            var serviceProvider = scope.ServiceProvider;
            var authService = serviceProvider.GetRequiredService<CustomAuthenticationService>();
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

        private async Task CreateDatabaseAsync()
        {
            await using DbConnection connection = new NpgsqlConnection(GetMaintenanceConnectionString());
            await connection.OpenAsync();

            await using var command = connection.CreateCommand();
            command.CommandText = $"CREATE DATABASE \"{databaseName}\"";
            await command.ExecuteNonQueryAsync();
        }

        private async Task DropDatabaseAsync()
        {
            await using DbConnection connection = new NpgsqlConnection(GetMaintenanceConnectionString());
            await connection.OpenAsync();

            await using (var terminate = connection.CreateCommand())
            {
                terminate.CommandText =
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity " +
                    $"WHERE datname = '{databaseName}' AND pid <> pg_backend_pid()";
                await terminate.ExecuteNonQueryAsync();
            }

            await using var drop = connection.CreateCommand();
            drop.CommandText = $"DROP DATABASE IF EXISTS \"{databaseName}\"";
            await drop.ExecuteNonQueryAsync();
        }

        private static string GetBaseConnectionString()
        {
            return Environment.GetEnvironmentVariable(ConnectionStringEnvironmentVariable)
                ?? throw new InvalidOperationException(
                    $"Set {ConnectionStringEnvironmentVariable} to a PostgreSQL connection string with CREATEDB privileges before running integration tests.");
        }

        private static string GetMaintenanceConnectionString()
        {
            var builder = new NpgsqlConnectionStringBuilder(GetBaseConnectionString())
            {
                Database = "postgres"
            };

            return builder.ConnectionString;
        }
    }
}
