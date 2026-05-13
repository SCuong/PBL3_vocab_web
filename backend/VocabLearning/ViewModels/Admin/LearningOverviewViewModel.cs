namespace VocabLearning.ViewModels.Admin
{
    public class LearningOverviewRowViewModel
    {
        public long UserId { get; set; }

        public string Username { get; set; } = string.Empty;

        public long TopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public int SessionCount { get; set; }

        public int WordsStudied { get; set; }

        public double ActiveMinutes { get; set; }

        public DateTime FirstActivityAt { get; set; }

        public DateTime LastActivityAt { get; set; }
    }
}
