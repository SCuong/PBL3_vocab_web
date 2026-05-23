using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.ViewModels.Leaderboard;

namespace VocabLearning.Services
{
    public sealed class LeaderboardService : ILeaderboardService
    {
        // XP formula mirrors DashboardAnalyticsService so the leaderboard and the
        // dashboard agree on totals/levels.
        private const int XpPerWord = 10;
        private const int XpPerCorrectExercise = 5;
        private const int XpPerLevel = 1000;

        private readonly AppDbContext _context;

        public LeaderboardService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LeaderboardApiResponse> GetLeaderboardAsync(
            long currentUserId,
            int topN,
            CancellationToken cancellationToken)
        {
            var safeTopN = Math.Clamp(topN, 1, 100);

            // Active learners only — exclude admins, inactive, and soft-deleted accounts.
            var users = await _context.Users
                .AsNoTracking()
                .Where(user => !user.IsDeleted
                    && user.Status == UserStatuses.Active
                    && user.Role == UserRoles.Learner)
                .Select(user => new { user.UserId, user.Username })
                .ToListAsync(cancellationToken);

            var wordsByUser = await _context.LearningLogs
                .AsNoTracking()
                .GroupBy(log => log.UserId)
                .Select(group => new { UserId = group.Key, Words = group.Sum(log => log.WordsStudied) })
                .ToDictionaryAsync(item => item.UserId, item => item.Words, cancellationToken);

            var correctByUser = await _context.ExerciseResults
                .AsNoTracking()
                .Where(result => result.IsCorrect)
                .GroupBy(result => result.UserId)
                .Select(group => new { UserId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(item => item.UserId, item => item.Count, cancellationToken);

            var masteredByUser = await _context.UserVocabularies
                .AsNoTracking()
                .Where(item => item.Status == UserVocabularyStatuses.Mastered)
                .GroupBy(item => item.UserId)
                .Select(group => new { UserId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(item => item.UserId, item => item.Count, cancellationToken);

            // Rank in memory: total XP desc, then username asc for a stable tie-break.
            var ranked = users
                .Select(user =>
                {
                    var words = wordsByUser.TryGetValue(user.UserId, out var w) ? w : 0;
                    var correct = correctByUser.TryGetValue(user.UserId, out var c) ? c : 0;
                    var totalXp = Math.Max(0, words * XpPerWord + correct * XpPerCorrectExercise);
                    return new
                    {
                        user.UserId,
                        user.Username,
                        TotalXp = totalXp,
                        Mastered = masteredByUser.TryGetValue(user.UserId, out var m) ? m : 0,
                    };
                })
                .OrderByDescending(item => item.TotalXp)
                .ThenBy(item => item.Username, StringComparer.OrdinalIgnoreCase)
                .Select((item, index) => new
                {
                    Rank = index + 1,
                    item.UserId,
                    item.Username,
                    item.TotalXp,
                    item.Mastered,
                })
                .ToList();

            var topEntries = ranked.Take(safeTopN).ToList();
            var currentEntry = ranked.FirstOrDefault(item => item.UserId == currentUserId);

            // Streaks only for the rows actually returned (top N + current user) — avoids
            // scanning every user's full learning_log history.
            var streakUserIds = topEntries.Select(item => item.UserId).ToHashSet();
            if (currentEntry != null)
            {
                streakUserIds.Add(currentEntry.UserId);
            }

            var streakByUser = await BuildStreaksAsync(streakUserIds, cancellationToken);

            LeaderboardEntryViewModel ToViewModel(dynamic item) => new LeaderboardEntryViewModel
            {
                Rank = item.Rank,
                UserId = item.UserId,
                Username = item.Username,
                TotalXp = item.TotalXp,
                Level = item.TotalXp / XpPerLevel + 1,
                Streak = streakByUser.TryGetValue((long)item.UserId, out int s) ? s : 0,
                MasteredWords = item.Mastered,
                IsCurrentUser = item.UserId == currentUserId,
            };

            return new LeaderboardApiResponse
            {
                Succeeded = true,
                Entries = topEntries.Select(item => ToViewModel(item)).ToList(),
                CurrentUser = currentEntry == null ? null : ToViewModel(currentEntry),
            };
        }

        private async Task<Dictionary<long, int>> BuildStreaksAsync(
            HashSet<long> userIds,
            CancellationToken cancellationToken)
        {
            if (userIds.Count == 0)
            {
                return new Dictionary<long, int>();
            }

            var logDates = await _context.LearningLogs
                .AsNoTracking()
                .Where(log => userIds.Contains(log.UserId))
                .Select(log => new { log.UserId, log.Date })
                .ToListAsync(cancellationToken);

            var today = DateTime.Now.Date;
            return logDates
                .GroupBy(item => item.UserId)
                .ToDictionary(
                    group => group.Key,
                    group => CalculateStreak(group.Select(item => item.Date.Date).ToHashSet(), today));
        }

        // Mirrors DashboardAnalyticsService.CalculateStreak: count consecutive active days
        // backward from today (or yesterday if not active today).
        private static int CalculateStreak(HashSet<DateTime> dates, DateTime today)
        {
            var cursor = dates.Contains(today) ? today : today.AddDays(-1);
            var streak = 0;
            while (dates.Contains(cursor))
            {
                streak += 1;
                cursor = cursor.AddDays(-1);
            }

            return streak;
        }
    }
}
