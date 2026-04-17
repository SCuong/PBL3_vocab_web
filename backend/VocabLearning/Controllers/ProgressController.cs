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
    public class ProgressController : Controller
    {
        private readonly AdminDataService _adminDataService;

        public ProgressController(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public IActionResult Index()
        {
            var items = _adminDataService.GetProgresses();
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
        public IActionResult Create(ProgressFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.CreateProgress(new Progress
            {
                UserId = model.UserId,
                VocabId = model.VocabId,
                LastReviewDate = model.LastReviewDate,
                NextReviewDate = model.NextReviewDate
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Progress record could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Progress record created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Edit(long userId, long vocabId)
        {
            var item = _adminDataService.GetProgress(userId, vocabId);

            if (item == null)
            {
                return NotFound();
            }

            return View(BuildFormModel(item));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(ProgressFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.UpdateProgress(
                model.OriginalUserId,
                model.OriginalVocabId,
                new Progress
                {
                    UserId = model.UserId,
                    VocabId = model.VocabId,
                    LastReviewDate = model.LastReviewDate,
                    NextReviewDate = model.NextReviewDate
                });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Progress record could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Progress record updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Delete(long userId, long vocabId)
        {
            var item = _adminDataService.GetProgress(userId, vocabId);

            if (item == null)
            {
                return NotFound();
            }

            PopulateLookupViewData();
            return View(item);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long userId, long vocabId)
        {
            var isDeleted = _adminDataService.DeleteProgress(userId, vocabId);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "Progress record deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private ProgressFormViewModel BuildFormModel()
        {
            var model = new ProgressFormViewModel();
            PopulateFormOptions(model);
            return model;
        }

        private ProgressFormViewModel BuildFormModel(Progress item)
        {
            var model = new ProgressFormViewModel
            {
                OriginalUserId = item.UserId,
                OriginalVocabId = item.VocabId,
                UserId = item.UserId,
                VocabId = item.VocabId,
                LastReviewDate = item.LastReviewDate,
                NextReviewDate = item.NextReviewDate
            };

            PopulateFormOptions(model);
            return model;
        }

        private void PopulateFormOptions(ProgressFormViewModel model)
        {
            model.UserOptions = _adminDataService.GetUsers()
                .Select(user => new SelectListItem(user.Username, user.UserId.ToString(), model.UserId == user.UserId))
                .ToList();

            model.VocabularyOptions = _adminDataService.GetVocabularies()
                .Select(vocabulary => new SelectListItem(vocabulary.Word, vocabulary.VocabId.ToString(), model.VocabId == vocabulary.VocabId))
                .ToList();
        }

        private void PopulateLookupViewData()
        {
            ViewBag.UserNames = _adminDataService.GetUsers()
                .ToDictionary(user => user.UserId, user => user.Username);

            ViewBag.VocabularyNames = _adminDataService.GetVocabularies()
                .ToDictionary(vocabulary => vocabulary.VocabId, vocabulary => vocabulary.Word);
        }
    }
}
