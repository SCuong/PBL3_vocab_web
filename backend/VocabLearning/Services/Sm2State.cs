namespace VocabLearning.Services
{
    public sealed record Sm2State(
        double EaseFactor,
        int IntervalDays,
        int Repetitions,
        System.DateTime? LastReviewDate,
        System.DateTime? NextReviewDate)
    {
        public static Sm2State Default { get; } = new(2.5d, 1, 0, null, null);
    }

    public sealed record Sm2Plan(Sm2State NewState, System.DateTime NextReviewDate, string Status);

    public sealed record Sm2Preview(int Days, System.DateTime NextReviewDate);
}
