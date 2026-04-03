using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("progress")]
    public class Progress
    {
        [Column("user_id")]
        public long UserId { get; set; }

        [Column("vocab_id")]
        public long VocabId { get; set; }

        [Column("last_review_date")]
        public DateTime? LastReviewDate { get; set; }

        [Column("next_review_date")]
        public DateTime? NextReviewDate { get; set; }
    }
}