using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Services
{
    public interface ILearningService
    {
        LearningProgressStateViewModel GetLearningProgressState(long userId);

        LearningProgressStateViewModel MarkWordsLearned(long userId, long topicId, IReadOnlyCollection<long> wordIds);

        LearningProgressStateViewModel MarkWordsReviewed(long userId, long topicId, IReadOnlyCollection<long> wordIds);

        List<ReviewOptionsViewModel> GetBatchReviewOptions(long userId, IReadOnlyCollection<long> vocabIds, IReadOnlyCollection<long> repeatedVocabIds);

        LearningProgressStateViewModel SubmitSingleWordReview(long userId, long vocabId, long topicId, int quality, bool isRepeatedThisSession = false);
    }
}
