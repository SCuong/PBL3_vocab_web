using FluentAssertions;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    public class LeaderboardServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly LeaderboardService _service;

        public LeaderboardServiceTests()
        {
            _context = TestDbContextFactory.Create();
            _service = new LeaderboardService(_context);
        }

        public void Dispose() => _context.Dispose();

        private Users AddLearner(
            long id,
            string username,
            string status = UserStatuses.Active,
            bool isDeleted = false,
            bool isHiddenFromLeaderboard = false)
        {
            var user = new Users
            {
                UserId = id,
                Username = username,
                Email = $"{username}@example.com",
                PasswordHash = "hash",
                Role = UserRoles.Learner,
                Status = status,
                IsDeleted = isDeleted,
                IsHiddenFromLeaderboard = isHiddenFromLeaderboard,
                CreatedAt = DateTime.Now,
            };
            _context.Users.Add(user);
            return user;
        }

        private void AddLog(long userId, long sessionId, int wordsStudied, DateTime date)
        {
            _context.LearningLogs.Add(new LearningLog
            {
                UserId = userId,
                SessionId = sessionId,
                Date = date,
                ActivityType = "LEARN",
                WordsStudied = wordsStudied,
                Score = 0,
            });
        }

        [Fact]
        public async Task GetLeaderboardAsync_RanksByTotalXp_AndFlagsCurrentUser()
        {
            // XP = words*10 + correctExercises*5
            AddLearner(1, "Alpha");   // 16 words -> 160 xp
            AddLearner(2, "Bravo");   // 5 words (50) + 4 correct (20) -> 70 xp
            AddLearner(3, "Charlie"); // 10 words -> 100 xp  (current user)
            AddLearner(4, "Delta");   // no activity -> 0 xp

            var today = DateTime.Now.Date;
            AddLog(1, 1001, 8, today);
            AddLog(1, 1002, 8, today.AddDays(-1)); // 2-day streak
            AddLog(2, 1003, 5, today);
            AddLog(3, 1004, 10, today);

            // Bravo: 4 correct exercises (+20 xp)
            for (var i = 0; i < 4; i++)
            {
                _context.ExerciseResults.Add(new ExerciseResult
                {
                    SessionId = 1003,
                    ExerciseId = 1,
                    UserId = 2,
                    IsCorrect = true,
                    Quality = 5,
                    AnsweredAt = today,
                });
            }

            // Alpha: 2 mastered words
            _context.UserVocabularies.Add(new UserVocabulary { UserId = 1, VocabId = 1, Status = UserVocabularyStatuses.Mastered, Note = "" });
            _context.UserVocabularies.Add(new UserVocabulary { UserId = 1, VocabId = 2, Status = UserVocabularyStatuses.Mastered, Note = "" });
            await _context.SaveChangesAsync();

            var result = await _service.GetLeaderboardAsync(currentUserId: 3, topN: 20, CancellationToken.None);

            result.Succeeded.Should().BeTrue();
            result.Entries.Should().HaveCount(4); // Alpha, Bravo, Charlie, AdminGuy(as learner)

            var byRank = result.Entries.OrderBy(e => e.Rank).ToList();
            byRank[0].Username.Should().Be("Alpha");
            byRank[0].TotalXp.Should().Be(160);
            byRank[0].Rank.Should().Be(1);
            byRank[0].MasteredWords.Should().Be(2);
            byRank[0].Streak.Should().Be(2);
            byRank[0].Level.Should().Be(1); // 160/1000 + 1

            byRank[1].Username.Should().Be("Charlie");
            byRank[1].TotalXp.Should().Be(100);
            byRank[1].IsCurrentUser.Should().BeTrue();

            byRank[2].Username.Should().Be("Bravo");
            byRank[2].TotalXp.Should().Be(70); // 50 + 20 from correct exercises

            result.CurrentUser.Should().NotBeNull();
            result.CurrentUser!.UserId.Should().Be(3);
            result.CurrentUser.Rank.Should().Be(2);
            result.CurrentUser.IsCurrentUser.Should().BeTrue();
        }

        [Fact]
        public async Task GetLeaderboardAsync_ExcludesAdminInactiveAndDeleted()
        {
            AddLearner(1, "Learner1");
            AddLearner(2, "Inactive", UserStatuses.Inactive);
            AddLearner(3, "Deleted", isDeleted: true);
            _context.Users.Add(new Users
            {
                UserId = 4,
                Username = "Admin",
                Email = "admin@example.com",
                PasswordHash = "hash",
                Role = UserRoles.Admin,
                Status = UserStatuses.Active,
                CreatedAt = DateTime.Now,
            });
            AddLog(1, 2001, 5, DateTime.Now.Date);
            await _context.SaveChangesAsync();

            var result = await _service.GetLeaderboardAsync(currentUserId: 1, topN: 20, CancellationToken.None);

            result.Entries.Should().ContainSingle();
            result.Entries[0].Username.Should().Be("Learner1");
        }

        [Fact]
        public async Task GetLeaderboardAsync_CurrentUserOutsideTopN_StillReturned()
        {
            // 3 learners, request topN = 2; current user is the lowest-XP learner.
            AddLearner(1, "High");
            AddLearner(2, "Mid");
            AddLearner(3, "Low"); // current
            var today = DateTime.Now.Date;
            AddLog(1, 3001, 30, today);
            AddLog(2, 3002, 20, today);
            AddLog(3, 3003, 5, today);
            await _context.SaveChangesAsync();

            var result = await _service.GetLeaderboardAsync(currentUserId: 3, topN: 2, CancellationToken.None);

            result.Entries.Should().HaveCount(2); // only top 2
            result.Entries.Any(e => e.UserId == 3).Should().BeFalse();
            result.CurrentUser.Should().NotBeNull();
            result.CurrentUser!.UserId.Should().Be(3);
            result.CurrentUser.Rank.Should().Be(3);
            result.CurrentUser.IsCurrentUser.Should().BeTrue();
        }

        [Fact]
        public async Task GetLeaderboardAsync_AppliesXpAdjustments_AndClampsAtZero()
        {
            AddLearner(1, "AdjustedUp");
            AddLearner(2, "AdjustedDown");
            AddLog(1, 4001, 5, DateTime.Now.Date);
            AddLog(2, 4002, 5, DateTime.Now.Date);
            _context.XpAdjustments.AddRange(
                new XpAdjustment
                {
                    UserId = 1,
                    Amount = 100,
                    Reason = "Reward",
                    CreatedByAdminId = 99,
                    CreatedAt = DateTime.Now,
                },
                new XpAdjustment
                {
                    UserId = 2,
                    Amount = -100,
                    Reason = "Correction",
                    CreatedByAdminId = 99,
                    CreatedAt = DateTime.Now,
                });
            await _context.SaveChangesAsync();

            var result = await _service.GetLeaderboardAsync(currentUserId: 1, topN: 20, CancellationToken.None);

            result.Entries.Single(item => item.UserId == 1).TotalXp.Should().Be(150);
            result.Entries.Single(item => item.UserId == 2).TotalXp.Should().Be(0);
        }

        [Fact]
        public async Task GetLeaderboardAsync_ExcludesHiddenLearner_AndShowsAgainAfterUnhide()
        {
            var visible = AddLearner(1, "Visible");
            var hidden = AddLearner(2, "Hidden", isHiddenFromLeaderboard: true);
            await _context.SaveChangesAsync();

            var hiddenResult = await _service.GetLeaderboardAsync(currentUserId: visible.UserId, topN: 20, CancellationToken.None);
            hiddenResult.Entries.Select(item => item.UserId).Should().ContainSingle().Which.Should().Be(visible.UserId);

            hidden.IsHiddenFromLeaderboard = false;
            await _context.SaveChangesAsync();

            var shownResult = await _service.GetLeaderboardAsync(currentUserId: visible.UserId, topN: 20, CancellationToken.None);
            shownResult.Entries.Select(item => item.UserId).Should().BeEquivalentTo(new[] { visible.UserId, hidden.UserId });
        }
    }
}
