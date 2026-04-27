using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Controllers
{
    [Authorize]
    public class LearningController : Controller
    {
        private const string ResultTempDataKey = "LearningMinitestResult";

        private readonly LearningService _learningService;
        private readonly LearningFlowService _learningFlowService;
        private readonly CustomAuthenticationService _authenticationService;

        public LearningController(
            LearningService learningService,
            LearningFlowService learningFlowService,
            CustomAuthenticationService authenticationService)
        {
            _learningService = learningService;
            _learningFlowService = learningFlowService;
            _authenticationService = authenticationService;
        }

        [HttpGet]
        public async Task<IActionResult> Index(long? parentTopicId = null, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var model = _learningService.GetDashboard(currentUser.UserId, parentTopicId);
            return View(model);
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
                return BadRequest(new
                {
                    succeeded = false,
                    message = exception.Message
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
                return BadRequest(new
                {
                    succeeded = false,
                    message = exception.Message
                });
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
                return BadRequest(new
                {
                    succeeded = false,
                    message = exception.Message
                });
            }
        }

        [HttpGet]
        public async Task<IActionResult> Exercise(long topicId, string ids, string? mode = null, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var flowResult = _learningFlowService.BuildExercisePage(currentUser.UserId, topicId, ids, mode);
            return ApplyViewFlowResult(flowResult);
        }

        [HttpGet]
        public async Task<IActionResult> Study(long topicId, string? ids = null, int index = 0, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var flowResult = _learningFlowService.BuildStudyPage(currentUser.UserId, topicId, ids, index);
            return ApplyViewFlowResult(flowResult);
        }

        [HttpGet]
        public async Task<IActionResult> Minitest(long topicId, string ids, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var flowResult = _learningFlowService.BuildMinitestPage(currentUser.UserId, topicId, ids);
            return ApplyViewFlowResult(flowResult);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Minitest(LearningMinitestViewModel model, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var flowResult = _learningFlowService.SubmitMinitest(currentUser.UserId, model);
            return ApplySubmitFlowResult(flowResult);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Exercise(LearningMinitestViewModel model, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var flowResult = _learningFlowService.SubmitExercise(currentUser.UserId, model);
            return ApplySubmitFlowResult(flowResult);
        }

        [HttpGet]
        public IActionResult Result(long topicId)
        {
            var json = TempData[ResultTempDataKey] as string;
            var flowResult = _learningFlowService.BuildResultPage(json, topicId);
            return ApplyViewFlowResult(flowResult);
        }

        private IActionResult ApplyViewFlowResult(LearningViewFlowResult flowResult)
        {
            if (!string.IsNullOrWhiteSpace(flowResult.TempDataMessageKey)
                && !string.IsNullOrWhiteSpace(flowResult.TempDataMessage))
            {
                TempData[flowResult.TempDataMessageKey] = flowResult.TempDataMessage;
            }

            if (flowResult.ShouldRedirect)
            {
                return RedirectToAction(flowResult.RedirectAction!, flowResult.RedirectRouteValues);
            }

            return View(flowResult.ViewName, flowResult.Model);
        }

        private IActionResult ApplySubmitFlowResult(LearningSubmitFlowResult flowResult)
        {
            if (!flowResult.Succeeded)
            {
                if (!string.IsNullOrWhiteSpace(flowResult.TempDataMessageKey)
                    && !string.IsNullOrWhiteSpace(flowResult.TempDataMessage))
                {
                    TempData[flowResult.TempDataMessageKey] = flowResult.TempDataMessage;
                }

                return RedirectToAction(flowResult.RedirectAction, flowResult.RedirectRouteValues);
            }

            TempData[ResultTempDataKey] = JsonSerializer.Serialize(flowResult.Result);
            return RedirectToAction(flowResult.RedirectAction, flowResult.RedirectRouteValues);
        }

        private Task<Users?> GetCurrentUserAsync(CancellationToken cancellationToken)
        {
            return _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
        }

        private async Task<IActionResult> RedirectToLoginAsync()
        {
            await _authenticationService.SignOutAsync(HttpContext);
            TempData["ErrorMessage"] = "Your session is no longer valid. Please sign in again.";
            var returnUrl = $"{Request.Path}{Request.QueryString}";
            return RedirectToAction("Login", "Account", new { returnUrl });
        }
    }
}
