namespace VocabLearning.Constants
{
    public static class ExerciseTypes
    {
        public const string MatchMeaning = "MATCH_MEANING";
        public const string Filling = "FILLING";

        public static IReadOnlyList<string> All { get; } = new[]
        {
            MatchMeaning,
            Filling
        };
    }
}
