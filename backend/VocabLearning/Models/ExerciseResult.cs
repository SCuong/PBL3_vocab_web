namespace VocabLearning.Models
{
    public class ExerciseResult
    {
        public long ResultId { get; set; }

        public long SessionId { get; set; }

        public long ExerciseId { get; set; }

        public long UserId { get; set; }

        public bool IsCorrect { get; set; }

        public DateTime AnsweredAt { get; set; }
    }
}
