using VocabLearning.ViewModels.Dashboard;

namespace VocabLearning.Services
{
    public interface IDashboardAnalyticsService
    {
        Task<LearnerDashboardApiResponse> GetLearnerDashboardAsync(long userId, CancellationToken cancellationToken);

        Task<RetentionAnalyticsResponse> GetRetentionAsync(
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken cancellationToken);

        Task<ReviewCompletionAnalyticsResponse> GetReviewCompletionAsync(
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken cancellationToken);

        Task<VocabularyDifficultyAnalyticsResponse> GetVocabularyDifficultyAsync(
            int limit,
            CancellationToken cancellationToken);

        Task<ExerciseFailureAnalyticsResponse> GetExerciseFailuresAsync(
            int limit,
            CancellationToken cancellationToken);

        Task<DailyLearningTrendsResponse> GetDailyTrendsAsync(
            DateTime? fromDate,
            DateTime? toDate,
            CancellationToken cancellationToken);
    }
}
