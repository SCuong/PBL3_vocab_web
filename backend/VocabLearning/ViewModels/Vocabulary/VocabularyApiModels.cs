namespace VocabLearning.ViewModels.Vocabulary
{
    public sealed class VocabularyListItemViewModel
    {
        public long Id { get; set; }

        public string Word { get; set; } = string.Empty;

        public string Ipa { get; set; } = string.Empty;

        public string Meaning { get; set; } = string.Empty;

        public string Cefr { get; set; } = string.Empty;

        public long? TopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public string AudioUrl { get; set; } = string.Empty;
    }

    public sealed class VocabularyExampleViewModel
    {
        public long Id { get; set; }

        public string ExampleEn { get; set; } = string.Empty;

        public string ExampleVi { get; set; } = string.Empty;

        public string AudioUrl { get; set; } = string.Empty;
    }

    public sealed class VocabularyDetailViewModel
    {
        public long Id { get; set; }

        public string Word { get; set; } = string.Empty;

        public string Ipa { get; set; } = string.Empty;

        public string Meaning { get; set; } = string.Empty;

        public string Cefr { get; set; } = string.Empty;

        public long? TopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public string AudioUrl { get; set; } = string.Empty;

        public List<VocabularyExampleViewModel> Examples { get; set; } = new();
    }

    public sealed class VocabularyTopicFilterItemViewModel
    {
        public long TopicId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public long? ParentTopicId { get; set; }
    }

    public sealed class VocabularyLearningItemViewModel
    {
        public long Id { get; set; }

        public string Word { get; set; } = string.Empty;

        public string Ipa { get; set; } = string.Empty;

        public string Meaning { get; set; } = string.Empty;

        public string Cefr { get; set; } = string.Empty;

        public long? TopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public string AudioUrl { get; set; } = string.Empty;

        public string Example { get; set; } = string.Empty;

        public string ExampleAudioUrl { get; set; } = string.Empty;
    }
}
