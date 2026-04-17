namespace VocabLearning.Models
{
    public class Exercise
    {
        public long ExerciseId { get; set; }

        public long VocabId { get; set; }

        public string Type { get; set; } = string.Empty;

        public string? MatchMode { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
