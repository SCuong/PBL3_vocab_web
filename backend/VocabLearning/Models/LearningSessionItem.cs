namespace VocabLearning.Models
{
    public class LearningSessionItem
    {
        public long SessionItemId { get; set; }

        public long SessionId { get; set; }

        public long VocabId { get; set; }

        public int OrderIndex { get; set; }

        public int? Quality { get; set; }

        public bool IsAnswered { get; set; }

        public DateTime? AnsweredAt { get; set; }

        public LearningSession Session { get; set; } = null!;

        public Vocabulary Vocabulary { get; set; } = null!;
    }
}
