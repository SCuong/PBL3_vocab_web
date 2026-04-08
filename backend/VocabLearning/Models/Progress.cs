namespace VocabLearning.Models
{
    public class Progress
    {
        public long UserId { get; set; }

        public long VocabId { get; set; }

        public double EaseFactor { get; set; } = 2.5d;

        public int IntervalDays { get; set; } = 1;

        public int Repetitions { get; set; }

        public DateTime? LastReviewDate { get; set; }

        public DateTime? NextReviewDate { get; set; }
    }
}
