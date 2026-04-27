namespace VocabLearning.ViewModels.Admin
{
    public class AdminExerciseViewModel
    {
        public long ExerciseId { get; set; }

        public long VocabId { get; set; }

        public string Type { get; set; } = string.Empty;

        public string? MatchMode { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
