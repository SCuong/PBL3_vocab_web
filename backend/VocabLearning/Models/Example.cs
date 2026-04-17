namespace VocabLearning.Models
{
    public class Example
    {
        public long ExampleId { get; set; }

        public long VocabId { get; set; }

        public string ExampleEn { get; set; } = string.Empty;

        public string ExampleVi { get; set; } = string.Empty;

        public string? AudioUrl { get; set; }

        public Vocabulary Vocabulary { get; set; } = null!;
    }
}
