namespace VocabLearning.Services
{
    public interface IAdminLearningManagementService
    {
        Task<(bool Succeeded, string Message)> AdjustXpAsync(
            long adminUserId, long targetUserId, int amount, string reason, CancellationToken cancellationToken);

        Task<(bool Succeeded, string Message)> ResetProgressAsync(
            long adminUserId, long targetUserId, string scope, long? topicId, string reason, CancellationToken cancellationToken);

        Task<(bool Succeeded, string Message)> DeleteLearningDataAsync(
            long adminUserId, long targetUserId, string confirmationText, string reason, CancellationToken cancellationToken);

        Task<(bool Succeeded, string Message)> SetLeaderboardVisibilityAsync(
            long adminUserId, long targetUserId, bool hidden, string reason, CancellationToken cancellationToken);
    }
}
