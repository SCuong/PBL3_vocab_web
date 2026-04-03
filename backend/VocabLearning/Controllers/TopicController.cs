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
    public class TopicController : Controller
    {
        private readonly AdminDataService _adminDataService;

        public TopicController(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public IActionResult Index()
        {
            var topics = _adminDataService.GetTopics();
            return View(topics);
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View(BuildFormModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Create(TopicFormViewModel model)
        {
            PopulateParentTopicOptions(model);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = _adminDataService.CreateTopic(new Topic
            {
                Name = model.Name.Trim(),
                Description = model.Description.Trim(),
                ParentTopicId = model.ParentTopicId
            });

            if (!result.Succeeded)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Topic could not be created.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Topic created successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Edit(long id)
        {
            var topic = _adminDataService.GetTopicById(id);

            if (topic == null)
            {
                return NotFound();
            }

            return View(BuildFormModel(topic));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Edit(TopicFormViewModel model)
        {
            PopulateParentTopicOptions(model, model.TopicId);

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var isUpdated = _adminDataService.UpdateTopic(new Topic
            {
                TopicId = model.TopicId,
                Name = model.Name.Trim(),
                Description = model.Description.Trim(),
                ParentTopicId = model.ParentTopicId
            });

            if (!isUpdated)
            {
                ModelState.AddModelError(string.Empty, "Topic could not be updated.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Topic updated successfully.";
            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public IActionResult Delete(long id)
        {
            var topic = _adminDataService.GetTopicById(id);

            if (topic == null)
            {
                return NotFound();
            }

            return View(topic);
        }

        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public IActionResult DeleteConfirmed(long id)
        {
            var isDeleted = _adminDataService.DeleteTopic(id);

            if (!isDeleted)
            {
                return NotFound();
            }

            TempData["SuccessMessage"] = "Topic deleted successfully.";
            return RedirectToAction(nameof(Index));
        }

        private TopicFormViewModel BuildFormModel()
        {
            var model = new TopicFormViewModel();
            PopulateParentTopicOptions(model);
            return model;
        }

        private TopicFormViewModel BuildFormModel(Topic topic)
        {
            var model = new TopicFormViewModel
            {
                TopicId = topic.TopicId,
                Name = topic.Name,
                Description = topic.Description,
                ParentTopicId = topic.ParentTopicId
            };

            PopulateParentTopicOptions(model, topic.TopicId);
            return model;
        }

        private void PopulateParentTopicOptions(TopicFormViewModel model, long? currentTopicId = null)
        {
            var topicOptions = _adminDataService.GetTopics()
                .Where(topic => currentTopicId != topic.TopicId)
                .Select(topic => new SelectListItem(topic.Name, topic.TopicId.ToString(), model.ParentTopicId == topic.TopicId))
                .ToList();

            topicOptions.Insert(0, new SelectListItem("No parent topic", string.Empty, !model.ParentTopicId.HasValue));
            model.ParentTopicOptions = topicOptions;
        }
    }
}
