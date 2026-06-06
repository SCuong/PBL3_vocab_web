namespace VocabLearning.ViewModels.AI
{
    public sealed class VocabularyExplanationViewModel
    {
        public string Summary { get; set; } = string.Empty;
        public string QuickUsage { get; set; } = string.Empty;
        public List<AiCollocationViewModel> Collocations { get; set; } = [];
        public List<AiConfusingWordViewModel> ConfusingWords { get; set; } = [];
        public List<AiCommonMistakeViewModel> CommonMistakes { get; set; } = [];
        public string Explanation { get; set; } = string.Empty;
        public bool IsFallback { get; set; }
    }

    public sealed class AiCollocationViewModel
    {
        public string Phrase { get; set; } = string.Empty;
        public string Meaning { get; set; } = string.Empty;
        public string Example { get; set; } = string.Empty;
    }

    public sealed class AiConfusingWordViewModel
    {
        public string Word { get; set; } = string.Empty;
        public string Difference { get; set; } = string.Empty;
    }

    public sealed class AiCommonMistakeViewModel
    {
        public string Wrong { get; set; } = string.Empty;
        public string Correct { get; set; } = string.Empty;
        public string Explanation { get; set; } = string.Empty;
    }
}
