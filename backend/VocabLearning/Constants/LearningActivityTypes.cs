namespace VocabLearning.Constants
{
    public static class LearningActivityTypes
    {
        public const string Learn = "LEARN";
        public const string Review = "REVIEW";
        public const string Test = "TEST";

        public static IReadOnlyList<string> All { get; } = new[]
        {
            Learn,
            Review,
            Test
        };
    }
}
