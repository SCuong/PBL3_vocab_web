using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Vocabulary;

namespace VocabLearning.Controllers
{
    public class VocabularyController : Controller
    {
        private readonly VocabularyService _service;

        public VocabularyController(VocabularyService service)
        {
            _service = service;
        }

        public IActionResult Index()
        {
            var list = _service.GetVocabularyList();
            return View(list);
        }

        public IActionResult Detail(long id)
        {
            var vocab = _service.GetVocabularyDetail(id);

            if (vocab == null)
            {
                return NotFound();
            }

            return View(vocab);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet]
        public IActionResult Create()
        {
            var model = new VocabularyFormViewModel();
            PopulateTopicOptions(model);
            PopulateLevelOptions(model);
            return View(model);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(VocabularyFormViewModel model)
        {
            PopulateTopicOptions(model);
            PopulateLevelOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _service.CreateVocabulary(new Vocabulary
            {
                Word = NormalizeValue(model.Word),
                Ipa = NormalizeValue(model.Ipa),
                AudioUrl = NormalizeValue(model.AudioUrl),
                Level = NormalizeValue(model.Level),
                MeaningVi = NormalizeValue(model.MeaningVi),
                TopicId = model.TopicId
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Vocabulary data is not valid.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Vocabulary created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet]
        public IActionResult Edit(long id)
        {
            var vocabulary = _service.GetVocabularyById(id);

            if (vocabulary == null)
            {
                return NotFound();
            }

            var model = new VocabularyFormViewModel
            {
                VocabId = vocabulary.VocabId,
                Word = vocabulary.Word,
                Ipa = vocabulary.Ipa,
                AudioUrl = vocabulary.AudioUrl,
                Level = vocabulary.Level,
                MeaningVi = vocabulary.MeaningVi,
                TopicId = vocabulary.TopicId
            };

            PopulateTopicOptions(model);
            PopulateLevelOptions(model);
            return View(model);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(VocabularyFormViewModel model)
        {
            PopulateTopicOptions(model);
            PopulateLevelOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _service.UpdateVocabulary(new Vocabulary
            {
                VocabId = model.VocabId,
                Word = NormalizeValue(model.Word),
                Ipa = NormalizeValue(model.Ipa),
                AudioUrl = NormalizeValue(model.AudioUrl),
                Level = NormalizeValue(model.Level),
                MeaningVi = NormalizeValue(model.MeaningVi),
                TopicId = model.TopicId
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Vocabulary could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Vocabulary updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet]
        public IActionResult Delete(long id)
        {
            var vocabulary = _service.GetVocabularyById(id);

            if (vocabulary == null)
            {
                return NotFound();
            }

            return View(vocabulary);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long id)
        {
            var isDeleted = _service.DeleteVocabulary(id);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "Vocabulary deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private static string NormalizeValue(string? value)
        {
            return value?.Trim() ?? string.Empty;
        }

        private void PopulateTopicOptions(VocabularyFormViewModel model)
        {
            var options = _service.GetTopics()
                .Select(topic => new SelectListItem(topic.Name, topic.TopicId.ToString(), model.TopicId == topic.TopicId))
                .ToList();

            options.Insert(0, new SelectListItem("No topic", string.Empty, !model.TopicId.HasValue));
            model.TopicOptions = options;
        }

        private static void PopulateLevelOptions(VocabularyFormViewModel model)
        {
            var levels = new[] { "A1", "A2", "B1", "B2", "C1", "C2" };

            model.LevelOptions = levels
                .Select(level => new SelectListItem(level, level, string.Equals(model.Level, level, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }
    }
}
