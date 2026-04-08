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
    public class ExerciseController : Controller
    {
        private readonly AdminDataService _adminDataService;

        public ExerciseController(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public IActionResult Index()
        {
            var exercises = _adminDataService.GetExercises();
            ViewBag.VocabularyNames = _adminDataService.GetVocabularies()
                .ToDictionary(vocabulary => vocabulary.VocabId, vocabulary => vocabulary.Word);

            return View(exercises);
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View(BuildFormModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(ExerciseFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.CreateExercise(new Exercise
            {
                VocabId = model.VocabId,
                Type = model.Type.Trim(),
                MatchMode = model.MatchMode?.Trim(),
                CreatedAt = model.CreatedAt
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Exercise could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Exercise created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Edit(long id)
        {
            var exercise = _adminDataService.GetExerciseById(id);

            if (exercise == null)
            {
                return NotFound();
            }

            return View(BuildFormModel(exercise));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(ExerciseFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.UpdateExercise(new Exercise
            {
                ExerciseId = model.ExerciseId,
                VocabId = model.VocabId,
                Type = model.Type.Trim(),
                MatchMode = model.MatchMode?.Trim(),
                CreatedAt = model.CreatedAt
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Exercise could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Exercise updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Delete(long id)
        {
            var exercise = _adminDataService.GetExerciseById(id);

            if (exercise == null)
            {
                return NotFound();
            }

            ViewBag.VocabularyNames = _adminDataService.GetVocabularies()
                .ToDictionary(vocabulary => vocabulary.VocabId, vocabulary => vocabulary.Word);

            return View(exercise);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long id)
        {
            var isDeleted = _adminDataService.DeleteExercise(id);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "Exercise deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private ExerciseFormViewModel BuildFormModel()
        {
            var model = new ExerciseFormViewModel();
            PopulateFormOptions(model);
            return model;
        }

        private ExerciseFormViewModel BuildFormModel(Exercise exercise)
        {
            var model = new ExerciseFormViewModel
            {
                ExerciseId = exercise.ExerciseId,
                VocabId = exercise.VocabId,
                Type = exercise.Type,
                MatchMode = exercise.MatchMode,
                CreatedAt = exercise.CreatedAt
            };

            PopulateFormOptions(model);
            return model;
        }

        private void PopulateFormOptions(ExerciseFormViewModel model)
        {
            model.VocabularyOptions = new[]
            {
                new SelectListItem("Select vocabulary", string.Empty, model.VocabId <= 0)
            }.Concat(_adminDataService.GetVocabularies()
                .Select(vocabulary => new SelectListItem(
                    string.IsNullOrWhiteSpace(vocabulary.MeaningVi)
                        ? vocabulary.Word
                        : $"{vocabulary.Word} ({vocabulary.MeaningVi})",
                    vocabulary.VocabId.ToString(),
                    model.VocabId == vocabulary.VocabId)))
                .ToList();

            model.TypeOptions = _adminDataService.GetExerciseTypeSuggestions()
                .Select(type => new SelectListItem(type, type, string.Equals(model.Type, type, StringComparison.OrdinalIgnoreCase)))
                .ToList();

            model.MatchModeOptions = new[]
            {
                new SelectListItem("None", string.Empty, string.IsNullOrWhiteSpace(model.MatchMode))
            }.Concat(_adminDataService.GetExerciseMatchModeSuggestions()
                .Select(mode => new SelectListItem(mode, mode, string.Equals(model.MatchMode, mode, StringComparison.OrdinalIgnoreCase))))
                .ToList();
        }
    }
}
