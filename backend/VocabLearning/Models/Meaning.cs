using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("meaning")]
    public class Meaning
    {
        [Key]
        [Column("meaning_id")]
        public long MeaningId { get; set; }

        [Column("vocab_id")]
        public long VocabId { get; set; }

        [Column("meaning_en")]
        public string MeaningEn { get; set; } = string.Empty;

        [Column("meaning_vi")]
        public string MeaningVi { get; set; } = string.Empty;

        [Column("type")]
        public string Type { get; set; } = string.Empty;

        public Vocabulary Vocabulary { get; set; } = null!;
    }
}
