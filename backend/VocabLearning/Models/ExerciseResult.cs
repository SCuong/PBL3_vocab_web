using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("exercise_result")]
    public class ExerciseResult
    {
        [Key]
        [Column("result_id")]
        public long ResultId { get; set; }

        [Column("exercise_id")]
        public long ExerciseId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("is_correct")]
        public bool IsCorrect { get; set; }

        [Column("answered_at")]
        public DateTime AnsweredAt { get; set; }
    }
}