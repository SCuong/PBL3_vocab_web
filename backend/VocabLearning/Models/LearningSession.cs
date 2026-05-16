namespace VocabLearning.Models
{
    public class LearningSession
    {
        public long SessionId { get; set; }

        public long UserId { get; set; }

        public long? TopicId { get; set; }

        public string Mode { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public int CurrentIndex { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime? AbandonedAt { get; set; }

        public Users User { get; set; } = null!;

        public Topic? Topic { get; set; }

        public ICollection<LearningSessionItem> Items { get; set; } = new List<LearningSessionItem>();
    }
}
