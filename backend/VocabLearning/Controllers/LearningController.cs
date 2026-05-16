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
        private readonly ICustomAuthenticationService _authenticationService;
        private readonly ILogger<LearningController> _logger;

        public LearningController(
            ILearningService learningService,
            ICustomAuthenticationService authenticationService,
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

        [HttpPost("/api/learning/sessions/start")]
        public async Task<ActionResult<LearningSessionResponse>> StartLearningSessionApi(
            [FromBody] StartLearningSessionRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            if (request == null)
            {
                return BadRequest(new { succeeded = false, message = "Request body is required." });
            }

            try
            {
                var response = await _learningService.StartSessionAsync(currentUser.UserId, request, cancellationToken);
                return Ok(response);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { succeeded = false, message = exception.Message });
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { succeeded = false, message = exception.Message });
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to start learning session for user {UserId}.", currentUser.UserId);
                return BadRequest(new { succeeded = false, message = "Could not start session." });
            }
        }

        [HttpGet("/api/learning/sessions/active")]
        public async Task<ActionResult<LearningSessionResponse>> GetActiveLearningSessionApi(
            [FromQuery] string mode,
            [FromQuery] long? topicId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            try
            {
                var response = await _learningService.GetActiveSessionAsync(currentUser.UserId, mode, topicId, cancellationToken);
                if (response == null)
                {
                    return NoContent();
                }
                return Ok(response);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { succeeded = false, message = exception.Message });
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to load active learning session for user {UserId}.", currentUser.UserId);
                return BadRequest(new { succeeded = false, message = "Could not load active session." });
            }
        }

        [HttpPost("/api/learning/sessions/{sessionId:long}/answers")]
        public async Task<ActionResult<LearningSessionResponse>> SaveLearningSessionAnswerApi(
            long sessionId,
            [FromBody] SaveLearningSessionAnswerRequest? request,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            if (request == null)
            {
                return BadRequest(new { succeeded = false, message = "Request body is required." });
            }

            try
            {
                var response = await _learningService.SaveSessionAnswerAsync(currentUser.UserId, sessionId, request, cancellationToken);
                return Ok(response);
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { succeeded = false, message = exception.Message });
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { succeeded = false, message = exception.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new { succeeded = false, message = exception.Message });
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to save session answer (session={SessionId}, user={UserId}).", sessionId, currentUser.UserId);
                return BadRequest(new { succeeded = false, message = "Could not save session answer." });
            }
        }

        [HttpPost("/api/learning/sessions/{sessionId:long}/complete")]
        public async Task<ActionResult<CompleteLearningSessionResponse>> CompleteLearningSessionApi(
            long sessionId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            try
            {
                var response = await _learningService.CompleteSessionAsync(currentUser.UserId, sessionId, cancellationToken);
                return Ok(response);
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { succeeded = false, message = exception.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new { succeeded = false, message = exception.Message });
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to complete session (session={SessionId}, user={UserId}).", sessionId, currentUser.UserId);
                return BadRequest(new { succeeded = false, message = "Could not complete session." });
            }
        }

        [HttpPost("/api/learning/sessions/{sessionId:long}/abandon")]
        public async Task<IActionResult> AbandonLearningSessionApi(
            long sessionId,
            CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            try
            {
                var changed = await _learningService.AbandonSessionAsync(currentUser.UserId, sessionId, cancellationToken);
                return Ok(new { succeeded = true, changed });
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { succeeded = false, message = exception.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Failed to abandon session (session={SessionId}, user={UserId}).", sessionId, currentUser.UserId);
                return BadRequest(new { succeeded = false, message = "Could not abandon session." });
            }
        }

        private Task<Users?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            return _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
        }
    }
}
