using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Controllers
{
    [Authorize]
    [ApiController]
    public class LearningController : ControllerBase
    {
        private readonly ILearningService _learningService;
        private readonly CustomAuthenticationService _authenticationService;
        private readonly ILogger<LearningController> _logger;

        public LearningController(
            ILearningService learningService,
            CustomAuthenticationService authenticationService,
            ILogger<LearningController> logger)
        {
            _learningService = learningService;
            _authenticationService = authenticationService;
            _logger = logger;
        }

        [HttpGet("/api/learning/progress")]
        public async Task<ActionResult<LearningProgressStateViewModel>> GetLearningProgressApi(CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new
                {
                    succeeded = false,
                    message = "Not authenticated."
                });
            }

            try
            {
                return Ok(_learningService.GetLearningProgressState(currentUser.UserId));
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to get learning progress for user {UserId}.", currentUser.UserId);
                return BadRequest(new
                {
                    succeeded = false,
                    message = "Could not get learning progress."
                });
            }
        }

        [HttpPost("/api/learning/progress/learn")]
        public async Task<ActionResult<LearningProgressStateViewModel>> MarkWordsLearnedApi(
            [FromBody] LearningProgressUpdateRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new
                {
                    succeeded = false,
                    message = "Not authenticated."
                });
            }

            if (request == null)
            {
                return BadRequest(new
                {
                    succeeded = false,
                    message = "Request body is required."
                });
            }

            var topicId = request.TopicId;
            var wordIds = request.WordIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            try
            {
                return Ok(_learningService.MarkWordsLearned(currentUser.UserId, topicId, wordIds));
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to mark words learned for user {UserId}, topic {TopicId}.", currentUser.UserId, topicId);
                return BadRequest(new
                {
                    succeeded = false,
                    message = "Could not mark words as learned."
                });
            }
        }

        [HttpPost("/api/learning/review-options/batch")]
        public async Task<ActionResult<List<ReviewOptionsViewModel>>> GetBatchReviewOptionsApi(
            [FromBody] BatchReviewOptionsRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            if (request == null || request.VocabIds.Count == 0)
            {
                return BadRequest(new { succeeded = false, message = "VocabIds required." });
            }

            var validIds = request.VocabIds.Where(id => id > 0).Distinct().ToList();
            var repeatedIds = request.RepeatedVocabIds.Where(id => id > 0).Distinct().ToList();
            return Ok(_learningService.GetBatchReviewOptions(currentUser.UserId, validIds, repeatedIds));
        }

        [HttpPost("/api/learning/words/review")]
        public async Task<ActionResult<LearningProgressStateViewModel>> SubmitSingleWordReviewApi(
            [FromBody] SingleWordReviewRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            if (request == null || request.VocabId <= 0)
            {
                return BadRequest(new { succeeded = false, message = "VocabId required." });
            }

            if (request.Quality is < 0 or > 5)
            {
                return BadRequest(new { succeeded = false, message = "Quality must be 0–5." });
            }

            try
            {
                return Ok(_learningService.SubmitSingleWordReview(
                    currentUser.UserId, request.VocabId, request.TopicId, request.Quality, request.IsRepeatedThisSession));
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to submit single-word review for user {UserId}, vocab {VocabId}.", currentUser.UserId, request.VocabId);
                return BadRequest(new { succeeded = false, message = "Could not submit review." });
            }
        }

        [HttpPost("/api/learning/progress/review")]
        public async Task<ActionResult<LearningProgressStateViewModel>> MarkWordsReviewedApi(
            [FromBody] LearningProgressUpdateRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new
                {
                    succeeded = false,
                    message = "Not authenticated."
                });
            }

            if (request == null)
            {
                return BadRequest(new
                {
                    succeeded = false,
                    message = "Request body is required."
                });
            }

            var topicId = request.TopicId;
            var wordIds = request.WordIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            try
            {
                return Ok(_learningService.MarkWordsReviewed(currentUser.UserId, topicId, wordIds));
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to mark words reviewed for user {UserId}, topic {TopicId}.", currentUser.UserId, topicId);
                return BadRequest(new
                {
                    succeeded = false,
                    message = "Could not mark words as reviewed."
                });
            }
        }

        private Task<Users?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            return _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
        }
    }
}
