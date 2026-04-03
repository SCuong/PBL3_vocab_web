using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("vocabulary")]
    public class Vocabulary
    {
        [Key]
        [Column("vocab_id")]
        public long VocabId { get; set; }

        [Column("word")]
        public string? Word { get; set; } = string.Empty;

        [Column("ipa")]
        public string? Ipa { get; set; } = string.Empty;

        [Column("audio_url")]
        public string? AudioUrl { get; set; } = string.Empty;

        [Column("level")]
        public string? Level { get; set; } = string.Empty;

        [Column("meaning_vi")]
        public string? MeaningVi { get; set; } = string.Empty;

        [Column("topic_id")]
        public long? TopicId { get; set; }

        public Topic? Topic { get; set; }

        public ICollection<Example> Examples { get; set; } = new List<Example>();
    }
}
