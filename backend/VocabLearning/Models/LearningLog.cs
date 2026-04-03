using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("learning_log")]
    public class LearningLog
    {
        [Key]
        [Column("log_id")]
        public long LogId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("date")]
        public DateTime Date { get; set; }

        [Column("activity_type")]
        public string ActivityType { get; set; } = string.Empty;

        [Column("score")]
        public int? Score { get; set; }
    }
}
