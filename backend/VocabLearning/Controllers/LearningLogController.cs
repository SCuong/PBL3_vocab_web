using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Controllers
{
    [Authorize(Roles = UserRoles.Admin)]
    public class LearningLogController : Controller
    {
        private readonly AdminDataService _adminDataService;

        public LearningLogController(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public IActionResult Index()
        {
            var items = _adminDataService.GetLearningLogs();
            ViewBag.UserNames = _adminDataService.GetUsers()
                .ToDictionary(user => user.UserId, user => user.Username);
            ViewBag.SessionNames = _adminDataService.GetExerciseSessionLabels();

            return View(items);
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View(BuildFormModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(LearningLogFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.CreateLearningLog(new LearningLog
            {
                UserId = model.UserId,
                SessionId = model.SessionId,
                Date = model.Date,
                ActivityType = model.ActivityType.Trim(),
                WordsStudied = model.WordsStudied,
                Score = model.Score
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Learning log could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Learning log created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Edit(long id)
        {
            var item = _adminDataService.GetLearningLogById(id);

            if (item == null)
            {
                return NotFound();
            }

            return View(BuildFormModel(item));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(LearningLogFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.UpdateLearningLog(new LearningLog
            {
                LogId = model.LogId,
                UserId = model.UserId,
                SessionId = model.SessionId,
                Date = model.Date,
                ActivityType = model.ActivityType.Trim(),
                WordsStudied = model.WordsStudied,
                Score = model.Score
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Learning log could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Learning log updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Delete(long id)
        {
            var item = _adminDataService.GetLearningLogById(id);

            if (item == null)
            {
                return NotFound();
            }

            ViewBag.UserNames = _adminDataService.GetUsers()
                .ToDictionary(user => user.UserId, user => user.Username);
            ViewBag.SessionNames = _adminDataService.GetExerciseSessionLabels();

            return View(item);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long id)
        {
            var isDeleted = _adminDataService.DeleteLearningLog(id);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "Learning log deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private LearningLogFormViewModel BuildFormModel()
        {
            var model = new LearningLogFormViewModel();
            PopulateFormOptions(model);
            return model;
        }

        private LearningLogFormViewModel BuildFormModel(LearningLog item)
        {
            var model = new LearningLogFormViewModel
            {
                LogId = item.LogId,
                UserId = item.UserId,
                SessionId = item.SessionId,
                Date = item.Date,
                ActivityType = item.ActivityType,
                WordsStudied = item.WordsStudied,
                Score = item.Score
            };

            PopulateFormOptions(model);
            return model;
        }

        private void PopulateFormOptions(LearningLogFormViewModel model)
        {
            model.UserOptions = _adminDataService.GetUsers()
                .Select(user => new SelectListItem(user.Username, user.UserId.ToString(), model.UserId == user.UserId))
                .ToList();

            var sessionLabels = _adminDataService.GetExerciseSessionLabels();
            model.SessionOptions = _adminDataService.GetExerciseSessions()
                .Select(session => new SelectListItem(
                    sessionLabels.TryGetValue(session.SessionId, out var label) ? label : $"ID {session.SessionId}",
                    session.SessionId.ToString(),
                    model.SessionId == session.SessionId))
                .ToList();
        }
    }
}
