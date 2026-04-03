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
    public class UserVocabularyController : Controller
    {
        private readonly AdminDataService _adminDataService;

        public UserVocabularyController(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public IActionResult Index()
        {
            var items = _adminDataService.GetUserVocabularies();
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
        public IActionResult Create(UserVocabularyFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.CreateUserVocabulary(new UserVocabulary
            {
                UserId = model.UserId,
                VocabId = model.VocabId,
                Status = model.Status.Trim(),
                Note = model.Note.Trim(),
                FirstLearnedDate = model.FirstLearnedDate
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "User-vocabulary record could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "User-vocabulary record created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Edit(long userId, long vocabId)
        {
            var item = _adminDataService.GetUserVocabulary(userId, vocabId);

            if (item == null)
            {
                return NotFound();
            }

            return View(BuildFormModel(item));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(UserVocabularyFormViewModel model)
        {
            PopulateFormOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.UpdateUserVocabulary(
                model.OriginalUserId,
                model.OriginalVocabId,
                new UserVocabulary
                {
                    UserId = model.UserId,
                    VocabId = model.VocabId,
                    Status = model.Status.Trim(),
                    Note = model.Note.Trim(),
                    FirstLearnedDate = model.FirstLearnedDate
                });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "User-vocabulary record could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "User-vocabulary record updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Delete(long userId, long vocabId)
        {
            var item = _adminDataService.GetUserVocabulary(userId, vocabId);

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
            var isDeleted = _adminDataService.DeleteUserVocabulary(userId, vocabId);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "User-vocabulary record deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private UserVocabularyFormViewModel BuildFormModel()
        {
            var model = new UserVocabularyFormViewModel();
            PopulateFormOptions(model);
            return model;
        }

        private UserVocabularyFormViewModel BuildFormModel(UserVocabulary item)
        {
            var model = new UserVocabularyFormViewModel
            {
                OriginalUserId = item.UserId,
                OriginalVocabId = item.VocabId,
                UserId = item.UserId,
                VocabId = item.VocabId,
                Status = item.Status,
                Note = item.Note,
                FirstLearnedDate = item.FirstLearnedDate
            };

            PopulateFormOptions(model);
            return model;
        }

        private void PopulateFormOptions(UserVocabularyFormViewModel model)
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
