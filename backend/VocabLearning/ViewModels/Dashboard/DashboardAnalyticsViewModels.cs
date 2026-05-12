namespace VocabLearning.ViewModels.Dashboard
{
    public sealed class LearnerDashboardApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public int Streak { get; set; }
        public IReadOnlyList<DashboardHeatmapDayViewModel> Heatmap { get; set; } = Array.Empty<DashboardHeatmapDayViewModel>();
        public DashboardMasteryProgressViewModel MasteryProgress { get; set; } = new();
        public DashboardReviewForecastViewModel ReviewForecast { get; set; } = new();
        public DashboardXpLevelViewModel Xp { get; set; } = new();
        public IReadOnlyList<DashboardActivityViewModel> RecentActivity { get; set; } = Array.Empty<DashboardActivityViewModel>();
        public IReadOnlyList<DashboardBadgeViewModel> Badges { get; set; } = Array.Empty<DashboardBadgeViewModel>();
        public DashboardContinueLearningViewModel? ContinueLearning { get; set; }
    }

    public sealed class DashboardHeatmapDayViewModel
    {
        public DateTime Date { get; set; }
        public int WordsStudied { get; set; }
        public int SessionCount { get; set; }
        public double Score { get; set; }
        public int Intensity { get; set; }
    }

    public sealed class DashboardMasteryProgressViewModel
    {
        public int TotalWords { get; set; }
        public int LearnedWords { get; set; }
        public int MasteredWords { get; set; }
        public int ReviewWords { get; set; }
        public double LearnedPercent { get; set; }
        public double MasteredPercent { get; set; }
    }

    public sealed class DashboardReviewForecastViewModel
    {
        public int DueToday { get; set; }
        public int DueTomorrow { get; set; }
        public int DueThisWeek { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public sealed class DashboardXpLevelViewModel
    {
        public int TotalXp { get; set; }
        public int Level { get; set; }
        public int CurrentLevelXp { get; set; }
        public int NextLevelXp { get; set; }
        public double LevelProgressPercent { get; set; }
    }

    public sealed class DashboardActivityViewModel
    {
        public long? SessionId { get; set; }
        public DateTime Date { get; set; }
        public string ActivityType { get; set; } = string.Empty;
        public string TopicName { get; set; } = string.Empty;
        public int WordsStudied { get; set; }
        public double Score { get; set; }
    }

    public sealed class DashboardBadgeViewModel
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool Unlocked { get; set; }
        public DateTime? UnlockedAt { get; set; }
    }

    public sealed class DashboardContinueLearningViewModel
    {
        public string Mode { get; set; } = string.Empty;
        public long? TopicId { get; set; }
        public string TopicName { get; set; } = string.Empty;
        public long? VocabId { get; set; }
        public string Word { get; set; } = string.Empty;
        public int AvailableWords { get; set; }
        public DateTime? DueAt { get; set; }
    }

    public sealed class RetentionAnalyticsResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int ActiveLearners { get; set; }
        public int ReturningLearners { get; set; }
        public double RetentionRate { get; set; }
        public IReadOnlyList<RetentionCohortViewModel> Cohorts { get; set; } = Array.Empty<RetentionCohortViewModel>();
    }

    public sealed class RetentionCohortViewModel
    {
        public DateTime Date { get; set; }
        public int ActiveLearners { get; set; }
        public int ReturningLearners { get; set; }
        public double RetentionRate { get; set; }
    }

    public sealed class ReviewCompletionAnalyticsResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public int ReviewAttempts { get; set; }
        public int SuccessfulReviews { get; set; }
        public int DueReviews { get; set; }
        public double CompletionRate { get; set; }
        public double SuccessRate { get; set; }
        public IReadOnlyList<DailyReviewCompletionViewModel> Daily { get; set; } = Array.Empty<DailyReviewCompletionViewModel>();
    }

    public sealed class DailyReviewCompletionViewModel
    {
        public DateTime Date { get; set; }
        public int Attempts { get; set; }
        public int Successful { get; set; }
        public double SuccessRate { get; set; }
    }

    public sealed class VocabularyDifficultyAnalyticsResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<VocabularyDifficultyViewModel> Items { get; set; } = Array.Empty<VocabularyDifficultyViewModel>();
    }

    public sealed class VocabularyDifficultyViewModel
    {
        public long VocabId { get; set; }
        public string Word { get; set; } = string.Empty;
        public string MeaningVi { get; set; } = string.Empty;
        public string TopicName { get; set; } = string.Empty;
        public int Attempts { get; set; }
        public int Failures { get; set; }
        public double FailureRate { get; set; }
        public double AverageQuality { get; set; }
        public double DifficultyScore { get; set; }
    }

    public sealed class ExerciseFailureAnalyticsResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<ExerciseFailureViewModel> Items { get; set; } = Array.Empty<ExerciseFailureViewModel>();
    }

    public sealed class ExerciseFailureViewModel
    {
        public long ExerciseId { get; set; }
        public long VocabId { get; set; }
        public string Word { get; set; } = string.Empty;
        public string ExerciseType { get; set; } = string.Empty;
        public string? MatchMode { get; set; }
        public int Attempts { get; set; }
        public int Failures { get; set; }
        public double FailureRate { get; set; }
        public DateTime? LastFailedAt { get; set; }
    }

    public sealed class DailyLearningTrendsResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public IReadOnlyList<DailyLearningTrendViewModel> Items { get; set; } = Array.Empty<DailyLearningTrendViewModel>();
    }

    public sealed class DailyLearningTrendViewModel
    {
        public DateTime Date { get; set; }
        public int ActiveLearners { get; set; }
        public int SessionCount { get; set; }
        public int WordsStudied { get; set; }
        public double AverageScore { get; set; }
    }
}
