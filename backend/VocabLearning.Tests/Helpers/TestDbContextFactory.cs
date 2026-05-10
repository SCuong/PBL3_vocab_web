using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;

namespace VocabLearning.Tests.Helpers
{
    /// <summary>
    /// Factory for creating in-memory AppDbContext instances for unit tests.
    /// Each call creates a unique database to ensure test isolation.
    /// </summary>
    public static class TestDbContextFactory
    {
        public static AppDbContext Create(string? databaseName = null)
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName ?? Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        /// <summary>
        /// Creates a context pre-seeded with common test data.
        /// </summary>
        public static AppDbContext CreateWithSeedData(string? databaseName = null)
        {
            var context = Create(databaseName);

            context.Users.AddRange(
                new Users
                {
                    UserId = 1,
                    Username = "admin",
                    Email = "admin@example.com",
                    PasswordHash = string.Empty,
                    Role = UserRoles.Admin,
                    Status = UserStatuses.Active,
                    CreatedAt = DateTime.Now
                },
                new Users
                {
                    UserId = 2,
                    Username = "learner1",
                    Email = "learner1@example.com",
                    PasswordHash = string.Empty,
                    Role = UserRoles.Learner,
                    Status = UserStatuses.Active,
                    CreatedAt = DateTime.Now
                },
                new Users
                {
                    UserId = 3,
                    Username = "inactive_user",
                    Email = "inactive@example.com",
                    PasswordHash = string.Empty,
                    Role = UserRoles.Learner,
                    Status = UserStatuses.Inactive,
                    CreatedAt = DateTime.Now
                });

            context.Topics.AddRange(
                new Topic { TopicId = 1, Name = "Animals", Description = "Words about animals" },
                new Topic { TopicId = 2, Name = "Food", Description = "Words about food" });

            context.Vocabularies.AddRange(
                new Vocabulary
                {
                    VocabId = 1,
                    Word = "apple",
                    Ipa = "/ˈæp.əl/",
                    Level = "A1",
                    MeaningVi = "quả táo",
                    TopicId = 2
                },
                new Vocabulary
                {
                    VocabId = 2,
                    Word = "cat",
                    Ipa = "/kæt/",
                    Level = "A1",
                    MeaningVi = "con mèo",
                    TopicId = 1
                });

            context.Examples.Add(new Example
            {
                ExampleId = 1,
                VocabId = 1,
                ExampleEn = "I eat an apple every day.",
                ExampleVi = "Tôi ăn một quả táo mỗi ngày."
            });

            context.SaveChanges();
            return context;
        }
    }
}
