using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.ViewModels.Dashboard;

namespace VocabLearning.Services
{
    public sealed class DashboardAnalyticsService : IDashboardAnalyticsService
    {
        private const int HeatmapDays = 28;
        private const int DefaultAnalyticsDays = 30;
        private const int XpPerWord = 10;
        private const int XpPerCorrectExercise = 5;
        private const int XpPerLevel = 1000;

        private readonly AppDbContext _context;

        public DashboardAnalyticsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<LearnerDashboardApiResponse> GetLearnerDashboardAsync(long userId, CancellationToken cancellationToken)
        {
            var now = DateTime.Now;
            var today = now.Date;
            var tomorrow = today.AddDays(1);
            var weekEndExclusive = today.AddDays(7);
            var heatmapStart = today.AddDays(-(HeatmapDays - 1));

            var logRows = await _context.LearningLogs
                .AsNoTracking()
                .Where(log => log.UserId == userId && log.Date >= heatmapStart)
                .Select(log => new HeatmapLogRow
                {
                    Date = log.Date.Date,
                    SessionId = log.SessionId,
                    ActivityType = log.ActivityType ?? string.Empty,
                    WordsStudied = log.WordsStudied,
                    Score = (double)log.Score
                })
                .ToListAsync(cancellationToken);

            var allActivityDates = await _context.LearningLogs
                .AsNoTracking()
                .Where(log => log.UserId == userId)
                .Select(log => log.Date.Date)
                .Distinct()
                .OrderBy(date => date)
                .ToListAsync(cancellationToken);

            var learnedQuery = _context.UserVocabularies
                .AsNoTracking()
                .Where(item => item.UserId == userId);

            var learnedWords = await learnedQuery.CountAsync(cancellationToken);
            var masteredWords = await learnedQuery
                .CountAsync(item => item.Status == UserVocabularyStatuses.Mastered, cancellationToken);
            var totalWords = await _context.Vocabularies
                .AsNoTracking()
                .CountAsync(cancellationToken);

            var reviewWords = await _context.Progresses
                .AsNoTracking()
                .CountAsync(progress =>
                    progress.UserId == userId
                    && progress.NextReviewDate.HasValue
                    && progress.NextReviewDate.Value < tomorrow,
                    cancellationToken);

            var dueToday = await CountDueReviewsAsync(userId, today, tomorrow, cancellationToken);
            var dueTomorrow = await CountDueReviewsAsync(userId, tomorrow, tomorrow.AddDays(1), cancellationToken);
            var dueThisWeek = await CountDueReviewsAsync(userId, today, weekEndExclusive, cancellationToken);

            var correctExercises = await _context.ExerciseResults
                .AsNoTracking()
                .CountAsync(result => result.UserId == userId && result.IsCorrect, cancellationToken);
            var totalWordsStudied = await _context.LearningLogs
                .AsNoTracking()
                .Where(log => log.UserId == userId)
                .SumAsync(log => (int?)log.WordsStudied, cancellationToken) ?? 0;
            var totalXp = Math.Max(0, totalWordsStudied * XpPerWord + correctExercises * XpPerCorrectExercise);

            var recentActivity = await GetRecentActivityAsync(userId, cancellationToken);
            var continueLearning = await GetContinueLearningAsync(userId, today, cancellationToken);

            return new LearnerDashboardApiResponse
            {
                Succeeded = true,
                Streak = CalculateStreak(allActivityDates, today),
                Heatmap = BuildHeatmap(logRows, heatmapStart, today),
                MasteryProgress = new DashboardMasteryProgressViewModel
                {
                    TotalWords = totalWords,
                    LearnedWords = learnedWords,
                    MasteredWords = masteredWords,
                    ReviewWords = reviewWords,
                    LearnedPercent = Percent(learnedWords, totalWords),
                    MasteredPercent = Percent(masteredWords, totalWords)
                },
                ReviewForecast = new DashboardReviewForecastViewModel
                {
                    DueToday = dueToday,
                    DueTomorrow = dueTomorrow,
                    DueThisWeek = dueThisWeek,
                    GeneratedAt = now
                },
                Xp = BuildXp(totalXp),
                RecentActivity = recentActivity,
                Badges = BuildBadges(allActivityDates, learnedWords, masteredWords, totalXp),
                ContinueLearning = continueLearning
            };
        }

        public async Task<RetentionAnalyticsResponse> GetRetentionAsync(
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken cancellationToken)
        {
            var (from, toExclusive) = NormalizeWindow(fromDate, toDate);
            var rows = await _context.LearningLogs
                .AsNoTracking()
                .Where(log => log.Date >= from && log.Date < toExclusive)
                .Select(log => new { Date = log.Date.Date, log.UserId })
                .ToListAsync(cancellationToken);

            var activeLearners = rows.Select(row => row.UserId).Distinct().Count();
            var returningLearners = rows
                .GroupBy(row => row.UserId)
                .Count(group => group.Select(row => row.Date).Distinct().Count() >= 2);

            var cohorts = FillDays(from, toExclusive.AddDays(-1))
                .Select(date =>
                {
                    var dayRows = rows.Where(row => row.Date == date).ToList();
                    var active = dayRows.Select(row => row.UserId).Distinct().Count();
                    var returning = dayRows
                        .Select(row => row.UserId)
                        .Distinct()
                        .Count(userId => rows.Any(row => row.UserId == userId && row.Date < date));
                    return new RetentionCohortViewModel
                    {
                        Date = date,
                        ActiveLearners = active,
                        ReturningLearners = returning,
                        RetentionRate = Percent(returning, active)
                    };
                })
                .ToList();

            return new RetentionAnalyticsResponse
            {
                Succeeded = true,
                FromDate = from,
                ToDate = toExclusive.AddDays(-1),
                ActiveLearners = activeLearners,
                ReturningLearners = returningLearners,
                RetentionRate = Percent(returningLearners, activeLearners),
                Cohorts = cohorts
            };
        }

        public async Task<ReviewCompletionAnalyticsResponse> GetReviewCompletionAsync(
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken cancellationToken)
        {
            var (from, toExclusive) = NormalizeWindow(fromDate, toDate);
            var rows = await _context.ExerciseResults
                .AsNoTracking()
                .Where(result => result.AnsweredAt >= from && result.AnsweredAt < toExclusive)
                .Select(result => new
                {
                    Date = result.AnsweredAt.Date,
                    result.IsCorrect,
                    result.Quality
                })
                .ToListAsync(cancellationToken);

            var dueReviews = await _context.Progresses
                .AsNoTracking()
                .CountAsync(progress =>
                    progress.NextReviewDate.HasValue
                    && progress.NextReviewDate.Value >= from
                    && progress.NextReviewDate.Value < toExclusive,
                    cancellationToken);

            var attempts = rows.Count;
            var successful = rows.Count(row => row.IsCorrect || row.Quality >= 3);
            var daily = FillDays(from, toExclusive.AddDays(-1))
                .Select(date =>
                {
                    var dayRows = rows.Where(row => row.Date == date).ToList();
                    var daySuccess = dayRows.Count(row => row.IsCorrect || row.Quality >= 3);
                    return new DailyReviewCompletionViewModel
                    {
                        Date = date,
                        Attempts = dayRows.Count,
                        Successful = daySuccess,
                        SuccessRate = Percent(daySuccess, dayRows.Count)
                    };
                })
                .ToList();

            return new ReviewCompletionAnalyticsResponse
            {
                Succeeded = true,
                FromDate = from,
                ToDate = toExclusive.AddDays(-1),
                ReviewAttempts = attempts,
                SuccessfulReviews = successful,
                DueReviews = dueReviews,
                CompletionRate = Percent(attempts, Math.Max(dueReviews, attempts)),
                SuccessRate = Percent(successful, attempts),
                Daily = daily
            };
        }

        public async Task<VocabularyDifficultyAnalyticsResponse> GetVocabularyDifficultyAsync(
            int limit,
            CancellationToken cancellationToken)
        {
            var safeLimit = Math.Clamp(limit, 1, 100);
            var aggregateRows = await (
                from result in _context.ExerciseResults.AsNoTracking()
                join exercise in _context.Exercises.AsNoTracking() on result.ExerciseId equals exercise.ExerciseId
                join vocabulary in _context.Vocabularies.AsNoTracking() on exercise.VocabId equals vocabulary.VocabId
                join topic in _context.Topics.AsNoTracking() on vocabulary.TopicId equals topic.TopicId into topicJoin
                from topic in topicJoin.DefaultIfEmpty()
                group result by new
                {
                    vocabulary.VocabId,
                    vocabulary.Word,
                    vocabulary.MeaningVi,
                    TopicName = topic == null ? "" : topic.Name
                }
                into grouped
                select new
                {
                    grouped.Key.VocabId,
                    grouped.Key.Word,
                    grouped.Key.MeaningVi,
                    grouped.Key.TopicName,
                    Attempts = grouped.Count(),
                    Failures = grouped.Count(result => !result.IsCorrect || result.Quality < 3),
                    AverageQuality = grouped.Average(result => (double)result.Quality)
                })
                .ToListAsync(cancellationToken);

            var items = aggregateRows
                .Select(row =>
                {
                    var failureRate = Percent(row.Failures, row.Attempts);
                    var difficultyScore = failureRate * 0.7d + Math.Max(0d, 100d - (row.AverageQuality / 5d * 100d)) * 0.3d;
                    return new VocabularyDifficultyViewModel
                    {
                        VocabId = row.VocabId,
                        Word = string.IsNullOrWhiteSpace(row.Word) ? $"Word {row.VocabId}" : row.Word!,
                        MeaningVi = row.MeaningVi ?? string.Empty,
                        TopicName = row.TopicName ?? string.Empty,
                        Attempts = row.Attempts,
                        Failures = row.Failures,
                        FailureRate = Math.Round(failureRate, 2),
                        AverageQuality = Math.Round(row.AverageQuality, 2),
                        DifficultyScore = Math.Round(difficultyScore, 2)
                    };
                })
                .OrderByDescending(item => item.DifficultyScore)
                .ThenByDescending(item => item.Attempts)
                .Take(safeLimit)
                .ToList();

            return new VocabularyDifficultyAnalyticsResponse { Succeeded = true, Items = items };
        }

        public async Task<ExerciseFailureAnalyticsResponse> GetExerciseFailuresAsync(
            int limit,
            CancellationToken cancellationToken)
        {
            var safeLimit = Math.Clamp(limit, 1, 100);
            var aggregateRows = await (
                from result in _context.ExerciseResults.AsNoTracking()
                join exercise in _context.Exercises.AsNoTracking() on result.ExerciseId equals exercise.ExerciseId
                join vocabulary in _context.Vocabularies.AsNoTracking() on exercise.VocabId equals vocabulary.VocabId
                group result by new
                {
                    exercise.ExerciseId,
                    exercise.VocabId,
                    exercise.Type,
                    exercise.MatchMode,
                    vocabulary.Word
                }
                into grouped
                select new
                {
                    grouped.Key.ExerciseId,
                    grouped.Key.VocabId,
                    grouped.Key.Type,
                    grouped.Key.MatchMode,
                    grouped.Key.Word,
                    Attempts = grouped.Count(),
                    Failures = grouped.Count(result => !result.IsCorrect || result.Quality < 3),
                    LastFailedAt = grouped
                        .Where(result => !result.IsCorrect || result.Quality < 3)
                        .Max(result => (DateTime?)result.AnsweredAt)
                })
                .ToListAsync(cancellationToken);

            var items = aggregateRows
                .Where(row => row.Failures > 0)
                .Select(row => new ExerciseFailureViewModel
                {
                    ExerciseId = row.ExerciseId,
                    VocabId = row.VocabId,
                    Word = string.IsNullOrWhiteSpace(row.Word) ? $"Word {row.VocabId}" : row.Word!,
                    ExerciseType = row.Type ?? string.Empty,
                    MatchMode = row.MatchMode,
                    Attempts = row.Attempts,
                    Failures = row.Failures,
                    FailureRate = Math.Round(Percent(row.Failures, row.Attempts), 2),
                    LastFailedAt = row.LastFailedAt
                })
                .OrderByDescending(item => item.FailureRate)
                .ThenByDescending(item => item.Failures)
                .Take(safeLimit)
                .ToList();

            return new ExerciseFailureAnalyticsResponse { Succeeded = true, Items = items };
        }

        public async Task<DailyLearningTrendsResponse> GetDailyTrendsAsync(
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken cancellationToken)
        {
            var (from, toExclusive) = NormalizeWindow(fromDate, toDate);
            var rows = await _context.LearningLogs
                .AsNoTracking()
                .Where(log => log.Date >= from && log.Date < toExclusive)
                .Select(log => new
                {
                    Date = log.Date.Date,
                    log.UserId,
                    log.SessionId,
                    log.WordsStudied,
                    Score = (double)log.Score
                })
                .ToListAsync(cancellationToken);

            var items = FillDays(from, toExclusive.AddDays(-1))
                .Select(date =>
                {
                    var dayRows = rows.Where(row => row.Date == date).ToList();
                    return new DailyLearningTrendViewModel
                    {
                        Date = date,
                        ActiveLearners = dayRows.Select(row => row.UserId).Distinct().Count(),
                        SessionCount = dayRows.Select(row => row.SessionId).Distinct().Count(),
                        WordsStudied = dayRows.Sum(row => Math.Max(0, row.WordsStudied)),
                        AverageScore = dayRows.Count == 0 ? 0d : Math.Round(dayRows.Average(row => row.Score), 2)
                    };
                })
                .ToList();

            return new DailyLearningTrendsResponse
            {
                Succeeded = true,
                FromDate = from,
                ToDate = toExclusive.AddDays(-1),
                Items = items
            };
        }

        private async Task<int> CountDueReviewsAsync(long userId, DateTime fromInclusive, DateTime toExclusive, CancellationToken cancellationToken)
        {
            return await _context.Progresses
                .AsNoTracking()
                .CountAsync(progress =>
                    progress.UserId == userId
                    && progress.NextReviewDate.HasValue
                    && progress.NextReviewDate.Value >= fromInclusive
                    && progress.NextReviewDate.Value < toExclusive,
                    cancellationToken);
        }

        private async Task<IReadOnlyList<DashboardActivityViewModel>> GetRecentActivityAsync(long userId, CancellationToken cancellationToken)
        {
            return await (
                from log in _context.LearningLogs.AsNoTracking()
                join session in _context.ExerciseSessions.AsNoTracking() on log.SessionId equals session.SessionId into sessionJoin
                from session in sessionJoin.DefaultIfEmpty()
                join topic in _context.Topics.AsNoTracking() on session.TopicId equals topic.TopicId into topicJoin
                from topic in topicJoin.DefaultIfEmpty()
                where log.UserId == userId
                orderby log.Date descending, log.LogId descending
                select new DashboardActivityViewModel
                {
                    SessionId = log.SessionId,
                    Date = log.Date,
                    ActivityType = log.ActivityType ?? string.Empty,
                    TopicName = topic == null ? string.Empty : topic.Name,
                    WordsStudied = log.WordsStudied,
                    Score = log.Score
                })
                .Take(10)
                .ToListAsync(cancellationToken);
        }

        private async Task<DashboardContinueLearningViewModel?> GetContinueLearningAsync(long userId, DateTime today, CancellationToken cancellationToken)
        {
            var dueBefore = today.AddDays(1);
            var dueItem = await (
                from progress in _context.Progresses.AsNoTracking()
                join vocabulary in _context.Vocabularies.AsNoTracking() on progress.VocabId equals vocabulary.VocabId
                join topic in _context.Topics.AsNoTracking() on vocabulary.TopicId equals topic.TopicId into topicJoin
                from topic in topicJoin.DefaultIfEmpty()
                where progress.UserId == userId
                    && progress.NextReviewDate.HasValue
                    && progress.NextReviewDate.Value < dueBefore
                orderby progress.NextReviewDate, vocabulary.Word
                select new
                {
                    vocabulary.VocabId,
                    vocabulary.Word,
                    vocabulary.TopicId,
                    TopicName = topic == null ? string.Empty : topic.Name,
                    progress.NextReviewDate
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (dueItem != null)
            {
                var available = await _context.Progresses
                    .AsNoTracking()
                    .Join(
                        _context.Vocabularies.AsNoTracking(),
                        progress => progress.VocabId,
                        vocabulary => vocabulary.VocabId,
                        (progress, vocabulary) => new { progress, vocabulary })
                    .CountAsync(item =>
                        item.progress.UserId == userId
                        && item.vocabulary.TopicId == dueItem.TopicId
                        && item.progress.NextReviewDate.HasValue
                        && item.progress.NextReviewDate.Value < dueBefore,
                        cancellationToken);

                return new DashboardContinueLearningViewModel
                {
                    Mode = "review",
                    TopicId = dueItem.TopicId,
                    TopicName = dueItem.TopicName,
                    VocabId = dueItem.VocabId,
                    Word = dueItem.Word ?? string.Empty,
                    AvailableWords = available,
                    DueAt = dueItem.NextReviewDate
                };
            }

            var newTopic = await (
                from vocabulary in _context.Vocabularies.AsNoTracking()
                join topic in _context.Topics.AsNoTracking() on vocabulary.TopicId equals topic.TopicId
                where vocabulary.TopicId.HasValue
                    && !_context.UserVocabularies
                        .AsNoTracking()
                        .Any(item => item.UserId == userId && item.VocabId == vocabulary.VocabId)
                group vocabulary by new { vocabulary.TopicId, topic.Name } into grouped
                orderby grouped.Count() descending, grouped.Key.Name
                select new
                {
                    TopicId = grouped.Key.TopicId,
                    TopicName = grouped.Key.Name,
                    AvailableWords = grouped.Count()
                })
                .FirstOrDefaultAsync(cancellationToken);

            return newTopic == null
                ? null
                : new DashboardContinueLearningViewModel
                {
                    Mode = "new",
                    TopicId = newTopic.TopicId,
                    TopicName = newTopic.TopicName,
                    AvailableWords = newTopic.AvailableWords
                };
        }

        private static IReadOnlyList<DashboardHeatmapDayViewModel> BuildHeatmap(
            IReadOnlyList<HeatmapLogRow> logRows,
            DateTime from,
            DateTime to)
        {
            var grouped = logRows
                .GroupBy(row => row.Date)
                .ToDictionary(
                    group => group.Key,
                    group => new
                    {
                        WordsStudied = group.Sum(row => Math.Max(0, row.WordsStudied)),
                        SessionCount = group.Select(row => row.SessionId).Distinct().Count(),
                        Score = group.Any() ? group.Average(row => row.Score) : 0d
                    });

            var maxWords = Math.Max(1, grouped.Values.Select(value => value.WordsStudied).DefaultIfEmpty(0).Max());

            return FillDays(from, to)
                .Select(date =>
                {
                    grouped.TryGetValue(date, out var value);
                    var words = value?.WordsStudied ?? 0;
                    return new DashboardHeatmapDayViewModel
                    {
                        Date = date,
                        WordsStudied = words,
                        SessionCount = value?.SessionCount ?? 0,
                        Score = value == null ? 0d : Math.Round(value.Score, 2),
                        Intensity = words == 0 ? 0 : Math.Clamp((int)Math.Ceiling(words / (double)maxWords * 4), 1, 4)
                    };
                })
                .ToList();
        }

        private static DashboardXpLevelViewModel BuildXp(int totalXp)
        {
            var level = totalXp / XpPerLevel + 1;
            var current = totalXp % XpPerLevel;
            return new DashboardXpLevelViewModel
            {
                TotalXp = totalXp,
                Level = level,
                CurrentLevelXp = current,
                NextLevelXp = XpPerLevel,
                LevelProgressPercent = Percent(current, XpPerLevel)
            };
        }

        private static IReadOnlyList<DashboardBadgeViewModel> BuildBadges(
            IReadOnlyList<DateTime> activityDates,
            int learnedWords,
            int masteredWords,
            int totalXp)
        {
            var firstActivity = activityDates.Count > 0 ? activityDates[0] : (DateTime?)null;
            return new[]
            {
                new DashboardBadgeViewModel
                {
                    Key = "first-session",
                    Label = "First session",
                    Description = "Complete one learning session.",
                    Unlocked = activityDates.Count > 0,
                    UnlockedAt = firstActivity
                },
                new DashboardBadgeViewModel
                {
                    Key = "week-streak",
                    Label = "7-day streak",
                    Description = "Study on 7 consecutive days.",
                    Unlocked = HasConsecutiveRun(activityDates, 7),
                    UnlockedAt = activityDates.LastOrDefault()
                },
                new DashboardBadgeViewModel
                {
                    Key = "hundred-words",
                    Label = "100 words",
                    Description = "Learn 100 vocabulary items.",
                    Unlocked = learnedWords >= 100
                },
                new DashboardBadgeViewModel
                {
                    Key = "mastery",
                    Label = "Mastery builder",
                    Description = "Master 25 vocabulary items.",
                    Unlocked = masteredWords >= 25
                },
                new DashboardBadgeViewModel
                {
                    Key = "xp-1000",
                    Label = "1,000 XP",
                    Description = "Earn 1,000 XP.",
                    Unlocked = totalXp >= 1000
                }
            };
        }

        private static int CalculateStreak(IReadOnlyList<DateTime> dates, DateTime today)
        {
            var set = dates.Select(date => date.Date).ToHashSet();
            var cursor = set.Contains(today) ? today : today.AddDays(-1);
            var streak = 0;
            while (set.Contains(cursor))
            {
                streak += 1;
                cursor = cursor.AddDays(-1);
            }

            return streak;
        }

        private static bool HasConsecutiveRun(IReadOnlyList<DateTime> dates, int targetDays)
        {
            var ordered = dates.Select(date => date.Date).Distinct().OrderBy(date => date).ToList();
            var run = 0;
            DateTime? previous = null;
            foreach (var date in ordered)
            {
                run = previous.HasValue && previous.Value.AddDays(1) == date ? run + 1 : 1;
                if (run >= targetDays) return true;
                previous = date;
            }

            return false;
        }

        private static (DateTime From, DateTime ToExclusive) NormalizeWindow(DateTime? fromDate, DateTime? toDate)
        {
            var to = (toDate?.Date ?? DateTime.Now.Date).AddDays(1);
            var from = fromDate?.Date ?? to.AddDays(-DefaultAnalyticsDays);
            if (from >= to)
            {
                from = to.AddDays(-DefaultAnalyticsDays);
            }

            return (from, to);
        }

        private static IReadOnlyList<DateTime> FillDays(DateTime from, DateTime toInclusive)
        {
            var days = new List<DateTime>();
            for (var date = from.Date; date <= toInclusive.Date; date = date.AddDays(1))
            {
                days.Add(date);
            }

            return days;
        }

        private static double Percent(double numerator, double denominator)
        {
            return denominator <= 0 ? 0d : Math.Round(numerator / denominator * 100d, 2);
        }

        private sealed class HeatmapLogRow
        {
            public DateTime Date { get; set; }
            public long SessionId { get; set; }
            public string ActivityType { get; set; } = string.Empty;
            public int WordsStudied { get; set; }
            public double Score { get; set; }
        }
    }
}
