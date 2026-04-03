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
        private readonly CustomAuthenticationService _authenticationService;

        public LearningController(
            LearningService learningService,
            CustomAuthenticationService authenticationService)
        {
            _learningService = learningService;
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

        [HttpGet]
        public async Task<IActionResult> Study(long topicId, string? ids = null, int index = 0, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var model = _learningService.GetStudySession(currentUser.UserId, topicId, ids, index);
            if (model == null)
            {
                TempData["InfoMessage"] = "This topic has no available batch right now.";
                return RedirectToAction(nameof(Index), new { parentTopicId = _learningService.GetParentTopicId(topicId) });
            }

            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> Minitest(long topicId, string ids, CancellationToken cancellationToken = default)
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            if (currentUser == null)
            {
                return await RedirectToLoginAsync();
            }

            var model = _learningService.GetMinitest(currentUser.UserId, topicId, ids);
            if (model == null)
            {
                TempData["InfoMessage"] = "The minitest could not be created for this topic.";
                return RedirectToAction(nameof(Index), new { parentTopicId = _learningService.GetParentTopicId(topicId) });
            }

            return View(model);
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

            var submitResult = _learningService.SubmitMinitest(currentUser.UserId, model);
            if (!submitResult.Succeeded || submitResult.Result == null)
            {
                TempData["ErrorMessage"] = submitResult.ErrorMessage ?? "The minitest result could not be saved.";
                return RedirectToAction(nameof(Minitest), new { topicId = model.TopicId, ids = model.BatchVocabularyIds });
            }

            TempData[ResultTempDataKey] = JsonSerializer.Serialize(submitResult.Result);

            return RedirectToAction(nameof(Result), new { topicId = model.TopicId });
        }

        [HttpGet]
        public IActionResult Result(long topicId)
        {
            if (TempData[ResultTempDataKey] is not string json)
            {
                TempData["InfoMessage"] = "There is no minitest result to show.";
                return RedirectToAction(nameof(Index), new { parentTopicId = _learningService.GetParentTopicId(topicId) });
            }

            var model = JsonSerializer.Deserialize<LearningMinitestResultViewModel>(json);
            if (model == null)
            {
                TempData["ErrorMessage"] = "The minitest result could not be loaded.";
                return RedirectToAction(nameof(Index), new { parentTopicId = _learningService.GetParentTopicId(topicId) });
            }

            return View(model);
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
