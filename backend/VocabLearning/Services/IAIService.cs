using VocabLearning.ViewModels.AI;

namespace VocabLearning.Services
{
    public interface IAIService
    {
        Task<VocabularyExplanationViewModel> ExplainVocabularyAsync(string word, string? context = null);
    }
}
