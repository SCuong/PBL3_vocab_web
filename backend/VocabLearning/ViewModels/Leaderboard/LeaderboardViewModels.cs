namespace VocabLearning.ViewModels.Leaderboard
{
    public sealed class LeaderboardApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<LeaderboardEntryViewModel> Entries { get; set; } = Array.Empty<LeaderboardEntryViewModel>();

        // Current user's own row, included even when outside the returned top N. Null if the
        // current user is not an active learner (e.g. admin).
        public LeaderboardEntryViewModel? CurrentUser { get; set; }
    }

    public sealed class LeaderboardEntryViewModel
    {
        public int Rank { get; set; }
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public int TotalXp { get; set; }
        public int Level { get; set; }
        public int Streak { get; set; }
        public int MasteredWords { get; set; }
        public bool IsCurrentUser { get; set; }
    }
}
