using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Services;
using VocabLearning.ViewModels.Dashboard;

namespace VocabLearning.Controllers
{
    [Authorize(Roles = UserRoles.Admin)]
    [ApiController]
    [Route("api/admin/analytics")]
    public sealed class AdminAnalyticsController : ControllerBase
    {
        private readonly IDashboardAnalyticsService _analyticsService;

        public AdminAnalyticsController(IDashboardAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet("retention")]
        public async Task<ActionResult<RetentionAnalyticsResponse>> GetRetention(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            return Ok(await _analyticsService.GetRetentionAsync(fromDate, toDate, cancellationToken));
        }

        [HttpGet("review-completion")]
        public async Task<ActionResult<ReviewCompletionAnalyticsResponse>> GetReviewCompletion(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            return Ok(await _analyticsService.GetReviewCompletionAsync(fromDate, toDate, cancellationToken));
        }

        [HttpGet("vocabulary-difficulty")]
        public async Task<ActionResult<VocabularyDifficultyAnalyticsResponse>> GetVocabularyDifficulty(
            int limit = 10,
            CancellationToken cancellationToken = default)
        {
            return Ok(await _analyticsService.GetVocabularyDifficultyAsync(limit, cancellationToken));
        }

        [HttpGet("exercise-failures")]
        public async Task<ActionResult<ExerciseFailureAnalyticsResponse>> GetExerciseFailures(
            int limit = 10,
            CancellationToken cancellationToken = default)
        {
            return Ok(await _analyticsService.GetExerciseFailuresAsync(limit, cancellationToken));
        }

        [HttpGet("daily-trends")]
        public async Task<ActionResult<DailyLearningTrendsResponse>> GetDailyTrends(
            DateTime? fromDate = null,
            DateTime? toDate = null,
            CancellationToken cancellationToken = default)
        {
            return Ok(await _analyticsService.GetDailyTrendsAsync(fromDate, toDate, cancellationToken));
        }
    }
}
