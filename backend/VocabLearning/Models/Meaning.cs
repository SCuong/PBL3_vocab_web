namespace VocabLearning.Models
{
    public class Meaning
    {
        public long MeaningId { get; set; }

        public long VocabId { get; set; }

        public string MeaningEn { get; set; } = string.Empty;

        public string MeaningVi { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public Vocabulary Vocabulary { get; set; } = null!;
    }
}
