using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("exercise")]
    public class Exercise
    {
        [Key]
        [Column("exercise_id")]
        public long ExerciseId { get; set; }

        [Column("vocab_id")]
        public long VocabId { get; set; }

        [Column("exercise_type")]
        public string Type { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
