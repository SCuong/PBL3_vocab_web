namespace VocabLearning.Services
{
    public interface IAIService
    {
        Task<string> ExplainVocabularyAsync(string word, string? context = null);
    }
}
