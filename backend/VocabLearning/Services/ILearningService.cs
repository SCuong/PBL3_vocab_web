using System.Threading;
using System.Threading.Tasks;
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

        Task<LearningSessionResponse> StartSessionAsync(long userId, StartLearningSessionRequest request, CancellationToken cancellationToken);

        Task<LearningSessionResponse?> GetActiveSessionAsync(long userId, string mode, long? topicId, CancellationToken cancellationToken);

        Task<LearningSessionResponse> SaveSessionAnswerAsync(long userId, long sessionId, SaveLearningSessionAnswerRequest request, CancellationToken cancellationToken);

        Task<CompleteLearningSessionResponse> CompleteSessionAsync(long userId, long sessionId, CancellationToken cancellationToken);

        Task<bool> AbandonSessionAsync(long userId, long sessionId, CancellationToken cancellationToken);
    }
}
