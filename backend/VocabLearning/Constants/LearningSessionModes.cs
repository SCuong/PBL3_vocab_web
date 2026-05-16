namespace VocabLearning.Constants
{
    public static class LearningSessionModes
    {
        public const string Study = "STUDY";
        public const string Review = "REVIEW";

        public static bool IsValid(string? value) => value is Study or Review;
    }
}
