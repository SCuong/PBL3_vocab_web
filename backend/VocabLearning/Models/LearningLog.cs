namespace VocabLearning.Models
{
    public class LearningLog
    {
        public long LogId { get; set; }

        public long UserId { get; set; }

        public long SessionId { get; set; }

        public DateTime Date { get; set; }

        public string ActivityType { get; set; } = string.Empty;

        public int WordsStudied { get; set; }

        public float Score { get; set; }
    }
}
