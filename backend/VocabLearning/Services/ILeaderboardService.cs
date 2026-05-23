using VocabLearning.ViewModels.Leaderboard;

namespace VocabLearning.Services
{
    public interface ILeaderboardService
    {
        Task<LeaderboardApiResponse> GetLeaderboardAsync(
            long currentUserId,
            int topN,
            CancellationToken cancellationToken);
    }
}
