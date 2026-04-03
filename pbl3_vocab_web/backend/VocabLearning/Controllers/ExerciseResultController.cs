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
    public class ExerciseResultController : Controller
    {
        private readonly AdminDataService _adminDataService;

        public ExerciseResultController(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public IActionResult Index()
        {
            var items = _adminDataService.GetExerciseResults();
            PopulateLookupViewData();
            return View(items);
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View(BuildFormModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(ExerciseResultFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.CreateExerciseResult(new ExerciseResult
            {
                ExerciseId = model.ExerciseId,
                UserId = model.UserId,
                IsCorrect = model.IsCorrect,
                AnsweredAt = model.AnsweredAt
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Exercise result could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Exercise result created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Edit(long id)
        {
            var item = _adminDataService.GetExerciseResultById(id);

            if (item == null)
            {
                return NotFound();
            }

            return View(BuildFormModel(item));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(ExerciseResultFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.UpdateExerciseResult(new ExerciseResult
            {
                ResultId = model.ResultId,
                ExerciseId = model.ExerciseId,
                UserId = model.UserId,
                IsCorrect = model.IsCorrect,
                AnsweredAt = model.AnsweredAt
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Exercise result could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Exercise result updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Delete(long id)
        {
            var item = _adminDataService.GetExerciseResultById(id);

            if (item == null)
            {
                return NotFound();
            }

            PopulateLookupViewData();
            return View(item);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long id)
        {
            var isDeleted = _adminDataService.DeleteExerciseResult(id);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "Exercise result deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private ExerciseResultFormViewModel BuildFormModel()
        {
            var model = new ExerciseResultFormViewModel
            {
                AnsweredAt = DateTime.Now
            };

            PopulateFormOptions(model);
            return model;
        }

        private ExerciseResultFormViewModel BuildFormModel(ExerciseResult item)
        {
            var model = new ExerciseResultFormViewModel
            {
                ResultId = item.ResultId,
                ExerciseId = item.ExerciseId,
                UserId = item.UserId,
                IsCorrect = item.IsCorrect,
                AnsweredAt = item.AnsweredAt
            };

            PopulateFormOptions(model);
            return model;
        }

        private void PopulateFormOptions(ExerciseResultFormViewModel model)
        {
            model.ExerciseOptions = _adminDataService.GetExercises()
                .Select(exercise => new SelectListItem($"#{exercise.ExerciseId} - {exercise.Type}", exercise.ExerciseId.ToString(), model.ExerciseId == exercise.ExerciseId))
                .ToList();

            model.UserOptions = _adminDataService.GetUsers()
                .Select(user => new SelectListItem(user.Username, user.UserId.ToString(), model.UserId == user.UserId))
                .ToList();
        }

        private void PopulateLookupViewData()
        {
            ViewBag.UserNames = _adminDataService.GetUsers()
                .ToDictionary(user => user.UserId, user => user.Username);

            ViewBag.ExerciseNames = _adminDataService.GetExercises()
                .ToDictionary(exercise => exercise.ExerciseId, exercise => exercise.Type);
        }
    }
}
