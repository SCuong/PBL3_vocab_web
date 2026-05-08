using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Services
{
    public interface ILearningService
    {
        LearningDashboardViewModel GetDashboard(long userId, long? selectedParentTopicId = null);

        LearningStudyViewModel? GetStudySession(long userId, long topicId, string? batchVocabularyIds, int index);

        LearningMinitestViewModel? GetMinitest(long userId, long topicId, string batchVocabularyIds);

        LearningMinitestViewModel? GetExercise(long userId, long topicId, string batchVocabularyIds);

        LearningProgressStateViewModel GetLearningProgressState(long userId);

        LearningProgressStateViewModel MarkWordsLearned(long userId, long topicId, IReadOnlyCollection<long> wordIds);

        LearningProgressStateViewModel MarkWordsReviewed(long userId, long topicId, IReadOnlyCollection<long> wordIds);

        LearningExerciseSelectionViewModel? GetExerciseSelection(long userId, long topicId, string batchVocabularyIds);

        LearningMinitestViewModel? GetExercise(long userId, long topicId, string batchVocabularyIds, string? mode);

        (bool Succeeded, string? ErrorMessage, LearningMinitestResultViewModel? Result) SubmitMinitest(
            long userId,
            LearningMinitestViewModel model);

        (bool Succeeded, string? ErrorMessage, LearningMinitestResultViewModel? Result) SubmitExercise(
            long userId,
            LearningMinitestViewModel model);

        long? GetParentTopicId(long topicId);
    }
}
