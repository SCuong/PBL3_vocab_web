using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Example;

namespace VocabLearning.Controllers
{
    [Authorize(Roles = UserRoles.Admin)]
    public class ExampleController : Controller
    {
        private readonly VocabularyService _service;

        public ExampleController(VocabularyService service)
        {
            _service = service;
        }

        [HttpGet]
        public IActionResult Create(long vocabId)
        {
            if (!_service.VocabularyExists(vocabId))
            {
                return NotFound();
            }

            return View(new ExampleFormViewModel
            {
                VocabId = vocabId
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(ExampleFormViewModel model)
        {
            if (!_service.VocabularyExists(model.VocabId))
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var isCreated = _service.CreateExample(new Example
            {
                VocabId = model.VocabId,
                ExampleEn = NormalizeValue(model.ExampleEn),
                ExampleVi = NormalizeValue(model.ExampleVi),
                AudioUrl = NormalizeAudioUrl(model.AudioUrl)
            });

            if (!isCreated)
            {
                ModelState.AddModelError(string.Empty, "Example data is not valid.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Example created successfully.";
            return RedirectToAction("Detail", "Vocabulary", new { id = model.VocabId });
        }

        [HttpGet]
        public IActionResult Edit(long id)
        {
            var example = _service.GetExampleById(id);

            if (example == null)
            {
                return NotFound();
            }

            return View(new ExampleFormViewModel
            {
                ExampleId = example.ExampleId,
                VocabId = example.VocabId,
                ExampleEn = example.ExampleEn,
                ExampleVi = example.ExampleVi,
                AudioUrl = example.AudioUrl
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(ExampleFormViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var isUpdated = _service.UpdateExample(new Example
            {
                ExampleId = model.ExampleId,
                VocabId = model.VocabId,
                ExampleEn = NormalizeValue(model.ExampleEn),
                ExampleVi = NormalizeValue(model.ExampleVi),
                AudioUrl = NormalizeAudioUrl(model.AudioUrl)
            });

            if (!isUpdated)
            {
                ModelState.AddModelError(string.Empty, "Example could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Example updated successfully.";
            return RedirectToAction("Detail", "Vocabulary", new { id = model.VocabId });
        }

        [HttpGet]
        public IActionResult Delete(long id)
        {
            var example = _service.GetExampleById(id);

            if (example == null)
            {
                return NotFound();
            }

            return View(example);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long id)
        {
            var example = _service.GetExampleById(id);

            if (example == null)
            {
                return NotFound();
            }

            var vocabId = example.VocabId;
            _service.DeleteExample(id);

            TempData["SuccessMessage"] = "Example deleted successfully.";
            return RedirectToAction("Detail", "Vocabulary", new { id = vocabId });
        }

        private static string NormalizeValue(string? value)
        {
            return value?.Trim() ?? string.Empty;
        }

        private static string NormalizeAudioUrl(string? value)
        {
            var normalized = value?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(normalized))
            {
                return string.Empty;
            }

            normalized = normalized.Replace('\\', '/');
            normalized = normalized.Replace("&amp;", "&", StringComparison.OrdinalIgnoreCase);

            if (normalized.Contains("translate_tts?", StringComparison.OrdinalIgnoreCase)
                && normalized.Contains("and", StringComparison.OrdinalIgnoreCase)
                && !normalized.Contains("&", StringComparison.Ordinal))
            {
                normalized = normalized
                    .Replace("andclient=", "&client=", StringComparison.OrdinalIgnoreCase)
                    .Replace("andtl=", "&tl=", StringComparison.OrdinalIgnoreCase)
                    .Replace("andq=", "&q=", StringComparison.OrdinalIgnoreCase);
            }

            if (normalized.Contains("translate.google.com/translate_tts", StringComparison.OrdinalIgnoreCase))
            {
                normalized = normalized.Replace(
                    "translate.google.com/translate_tts",
                    "translate.googleapis.com/translate_tts",
                    StringComparison.OrdinalIgnoreCase);
            }

            return normalized;
        }
    }
}
