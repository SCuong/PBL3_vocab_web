using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Services
{
    public interface ILearningFlowService
    {
        LearningViewFlowResult BuildExercisePage(long userId, long topicId, string ids, string? mode);

        LearningViewFlowResult BuildStudyPage(long userId, long topicId, string? ids, int index);

        LearningViewFlowResult BuildMinitestPage(long userId, long topicId, string ids);

        LearningSubmitFlowResult SubmitMinitest(long userId, LearningMinitestViewModel model);

        LearningSubmitFlowResult SubmitExercise(long userId, LearningMinitestViewModel model);

        LearningViewFlowResult BuildResultPage(string? json, long topicId);
    }
}
