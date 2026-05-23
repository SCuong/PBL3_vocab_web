using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    // Covers the write-layer gap: completing a learner LearningSession must persist
    // exercise_session + learning_log so DashboardAnalyticsService / LeaderboardService
    // (which read those tables) reflect real study activity.
    public class LearningActivityPersistenceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly LearningService _service;

        public LearningActivityPersistenceTests()
        {
            _context = TestDbContextFactory.Create();
            _service = new LearningService(_context);
        }

        public void Dispose() => _context.Dispose();

        private async Task<long> SeedInProgressSessionAsync(long userId, long topicId, int wordCount)
        {
            _context.Users.Add(new Users
            {
                UserId = userId,
                Username = $"learner{userId}",
                Email = $"learner{userId}@example.com",
                PasswordHash = "hash",
                Role = UserRoles.Learner,
                Status = UserStatuses.Active,
                CreatedAt = DateTime.UtcNow,
            });
            _context.Topics.Add(new Topic { TopicId = topicId, Name = $"Topic{topicId}", Description = "" });

            var session = new LearningSession
            {
                UserId = userId,
                TopicId = topicId,
                Mode = LearningSessionModes.Study,
                Status = LearningSessionStatuses.InProgress,
                CurrentIndex = 0,
                StartedAt = DateTime.UtcNow.AddMinutes(-5),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-5),
            };
            for (var i = 0; i < wordCount; i++)
            {
                _context.Vocabularies.Add(new Vocabulary
                {
                    VocabId = topicId * 100 + i + 1,
                    Word = $"word{i}",
                    Level = "A1",
                    MeaningVi = "nghĩa",
                    TopicId = topicId,
                });
                session.Items.Add(new LearningSessionItem
                {
                    VocabId = topicId * 100 + i + 1,
                    OrderIndex = i,
                    IsAnswered = true,
                    Quality = 5,
                    AnsweredAt = DateTime.UtcNow,
                });
            }

            _context.LearningSessions.Add(session);
            await _context.SaveChangesAsync();
            return session.SessionId;
        }

        [Fact]
        public async Task CompleteSession_CreatesLearningLogAndExerciseSession()
        {
            var sessionId = await SeedInProgressSessionAsync(userId: 1, topicId: 1, wordCount: 3);

            await _service.CompleteSessionAsync(1, sessionId, CancellationToken.None);

            var logs = await _context.LearningLogs.Where(l => l.UserId == 1).ToListAsync();
            logs.Should().ContainSingle();
            logs[0].WordsStudied.Should().Be(3);
            logs[0].ActivityType.Should().Be(LearningActivityTypes.Learn);

            var sessions = await _context.ExerciseSessions.Where(s => s.UserId == 1).ToListAsync();
            sessions.Should().ContainSingle();
            sessions[0].TotalQuestions.Should().Be(3);
            sessions[0].CorrectCount.Should().Be(3); // quality 5 >= 3
            logs[0].SessionId.Should().Be(sessions[0].SessionId);
        }

        [Fact]
        public async Task CompleteSession_Twice_DoesNotDuplicateLog()
        {
            var sessionId = await SeedInProgressSessionAsync(userId: 1, topicId: 1, wordCount: 2);

            await _service.CompleteSessionAsync(1, sessionId, CancellationToken.None);

            // Second completion is rejected by the in-progress status guard.
            var act = async () => await _service.CompleteSessionAsync(1, sessionId, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>();

            var logs = await _context.LearningLogs.Where(l => l.UserId == 1).CountAsync();
            logs.Should().Be(1);
        }

        [Fact]
        public async Task CompleteSession_DashboardReflectsStreakAndXp()
        {
            var sessionId = await SeedInProgressSessionAsync(userId: 1, topicId: 1, wordCount: 4);

            await _service.CompleteSessionAsync(1, sessionId, CancellationToken.None);

            var dashboard = new DashboardAnalyticsService(_context);
            var result = await dashboard.GetLearnerDashboardAsync(1, CancellationToken.None);

            result.Xp.TotalXp.Should().Be(40); // 4 words * 10, no correct exercises
            result.Streak.Should().BeGreaterThanOrEqualTo(1);
        }

        [Fact]
        public async Task CompleteSession_LeaderboardReflectsXp()
        {
            var sessionId = await SeedInProgressSessionAsync(userId: 1, topicId: 1, wordCount: 4);

            await _service.CompleteSessionAsync(1, sessionId, CancellationToken.None);

            var leaderboard = new LeaderboardService(_context);
            var result = await leaderboard.GetLeaderboardAsync(1, 20, CancellationToken.None);

            var entry = result.Entries.Single(e => e.UserId == 1);
            entry.TotalXp.Should().Be(40);
        }
    }
}
