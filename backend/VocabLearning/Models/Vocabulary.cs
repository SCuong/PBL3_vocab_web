namespace VocabLearning.Models
{
    public class Vocabulary
    {
        public long VocabId { get; set; }

        public string? Word { get; set; } = string.Empty;

        public string? Ipa { get; set; } = string.Empty;

        public string? AudioUrl { get; set; } = string.Empty;

        public string? Level { get; set; } = string.Empty;

        public string? MeaningVi { get; set; } = string.Empty;

        public long? TopicId { get; set; }

        public Topic? Topic { get; set; }

        public ICollection<Example> Examples { get; set; } = new List<Example>();
    }
}
