namespace VocabLearning.Models
{
    public class ExerciseSession
    {
        public long SessionId { get; set; }

        public long UserId { get; set; }

        public long TopicId { get; set; }

        public string SessionType { get; set; } = string.Empty;

        public DateTime StartedAt { get; set; }

        public DateTime? FinishedAt { get; set; }

        public int TotalQuestions { get; set; }

        public int CorrectCount { get; set; }

        public float Score { get; set; }
    }
}
