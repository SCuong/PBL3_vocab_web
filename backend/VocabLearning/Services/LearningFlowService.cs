using System;
using System.Linq;
using System.Text.Json;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Services
{
    public class LearningFlowService
    {
        private readonly LearningService _learningService;

        public LearningFlowService(LearningService learningService)
        {
            _learningService = learningService;
        }

        public LearningViewFlowResult BuildExercisePage(long userId, long topicId, string ids, string? mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
            {
                var selection = _learningService.GetExerciseSelection(userId, topicId, ids);
                if (selection == null)
                {
                    return BuildRedirectToIndex(
                        topicId,
                        "InfoMessage",
                        "The exercise could not be created for this topic.");
                }

                return LearningViewFlowResult.View("ExerciseMode", selection);
            }

            var model = _learningService.GetExercise(userId, topicId, ids, mode);
            if (model == null)
            {
                return LearningViewFlowResult.Redirect(
                    "Exercise",
                    new { topicId, ids },
                    "InfoMessage",
                    "The selected exercise mode is not available.");
            }

            return LearningViewFlowResult.View("Exercise", model);
        }

        public LearningViewFlowResult BuildStudyPage(long userId, long topicId, string? ids, int index)
        {
            var model = _learningService.GetStudySession(userId, topicId, ids, index);
            if (model == null)
            {
                return BuildRedirectToIndex(
                    topicId,
                    "InfoMessage",
                    "This topic has no available batch right now.");
            }

            return LearningViewFlowResult.View("Study", model);
        }

        public LearningViewFlowResult BuildMinitestPage(long userId, long topicId, string ids)
        {
            var model = _learningService.GetMinitest(userId, topicId, ids);
            if (model == null)
            {
                return BuildRedirectToIndex(
                    topicId,
                    "InfoMessage",
                    "The minitest could not be created for this topic.");
            }

            return LearningViewFlowResult.View("Minitest", model);
        }

        public LearningSubmitFlowResult SubmitMinitest(long userId, LearningMinitestViewModel model)
        {
            var submitResult = _learningService.SubmitMinitest(userId, model);
            if (!submitResult.Succeeded || submitResult.Result == null)
            {
                return LearningSubmitFlowResult.Failed(
                    "Minitest",
                    new { topicId = model.TopicId, ids = model.BatchVocabularyIds },
                    submitResult.ErrorMessage ?? "The minitest result could not be saved.");
            }

            return LearningSubmitFlowResult.Success(
                "Result",
                new { topicId = model.TopicId },
                submitResult.Result);
        }

        public LearningSubmitFlowResult SubmitExercise(long userId, LearningMinitestViewModel model)
        {
            var submitResult = _learningService.SubmitExercise(userId, model);
            if (!submitResult.Succeeded || submitResult.Result == null)
            {
                var mode = ResolveExerciseRetryMode(model);
                return LearningSubmitFlowResult.Failed(
                    "Exercise",
                    new { topicId = model.TopicId, ids = model.BatchVocabularyIds, mode },
                    submitResult.ErrorMessage ?? "The exercise result could not be saved.");
            }

            return LearningSubmitFlowResult.Success(
                "Result",
                new { topicId = model.TopicId },
                submitResult.Result);
        }

        public LearningViewFlowResult BuildResultPage(string? json, long topicId)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return BuildRedirectToIndex(
                    topicId,
                    "InfoMessage",
                    "There is no minitest result to show.");
            }

            var model = JsonSerializer.Deserialize<LearningMinitestResultViewModel>(json);
            if (model == null)
            {
                return BuildRedirectToIndex(
                    topicId,
                    "ErrorMessage",
                    "The minitest result could not be loaded.");
            }

            return LearningViewFlowResult.View("Result", model);
        }

        private LearningViewFlowResult BuildRedirectToIndex(long topicId, string messageKey, string message)
        {
            return LearningViewFlowResult.Redirect(
                "Index",
                new { parentTopicId = _learningService.GetParentTopicId(topicId) },
                messageKey,
                message);
        }

        private static string ResolveExerciseRetryMode(LearningMinitestViewModel model)
        {
            return model.Questions.All(item => string.Equals(item.ExerciseType, "MATCH_MEANING", StringComparison.OrdinalIgnoreCase))
                ? "matching"
                : "filling";
        }
    }

    public class LearningViewFlowResult
    {
        public bool ShouldRedirect { get; init; }

        public string? RedirectAction { get; init; }

        public object? RedirectRouteValues { get; init; }

        public string? TempDataMessageKey { get; init; }

        public string? TempDataMessage { get; init; }

        public string? ViewName { get; init; }

        public object? Model { get; init; }

        public static LearningViewFlowResult View(string viewName, object model)
        {
            return new LearningViewFlowResult
            {
                ViewName = viewName,
                Model = model
            };
        }

        public static LearningViewFlowResult Redirect(string action, object? routeValues, string messageKey, string message)
        {
            return new LearningViewFlowResult
            {
                ShouldRedirect = true,
                RedirectAction = action,
                RedirectRouteValues = routeValues,
                TempDataMessageKey = messageKey,
                TempDataMessage = message
            };
        }
    }

    public class LearningSubmitFlowResult
    {
        public bool Succeeded { get; init; }

        public string RedirectAction { get; init; } = string.Empty;

        public object? RedirectRouteValues { get; init; }

        public string? TempDataMessageKey { get; init; }

        public string? TempDataMessage { get; init; }

        public LearningMinitestResultViewModel? Result { get; init; }

        public static LearningSubmitFlowResult Success(string action, object? routeValues, LearningMinitestResultViewModel result)
        {
            return new LearningSubmitFlowResult
            {
                Succeeded = true,
                RedirectAction = action,
                RedirectRouteValues = routeValues,
                Result = result
            };
        }

        public static LearningSubmitFlowResult Failed(string action, object? routeValues, string message)
        {
            return new LearningSubmitFlowResult
            {
                Succeeded = false,
                RedirectAction = action,
                RedirectRouteValues = routeValues,
                TempDataMessageKey = "ErrorMessage",
                TempDataMessage = message
            };
        }
    }
}
