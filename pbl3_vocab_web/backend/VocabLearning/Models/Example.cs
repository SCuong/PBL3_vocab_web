using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("example")]
    public class Example
    {
        [Key]
        [Column("example_id")]
        public long ExampleId { get; set; }

        [Column("vocab_id")]
        public long VocabId { get; set; }

        [Column("sentence")]
        public string ExampleEn { get; set; } = string.Empty;

        [Column("translation")]
        public string ExampleVi { get; set; } = string.Empty;

        [Column("audio_url")]
        public string? AudioUrl { get; set; }

        public Vocabulary Vocabulary { get; set; } = null!;
    }
}
