namespace VocabLearning.Constants
{
    public static class ExerciseMatchModes
    {
        public const string MatchIpa = "MATCH_IPA";
        public const string MatchMeaning = "MATCH_MEANING";

        public static IReadOnlyList<string> All { get; } = new[]
        {
            MatchIpa,
            MatchMeaning
        };
    }
}
