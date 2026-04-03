using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("user_vocabulary")]
    public class UserVocabulary
    {
        [Column("user_id")]
        public long UserId { get; set; }

        [Column("vocab_id")]
        public long VocabId { get; set; }

        [Column("status")]
        public string Status { get; set; } = string.Empty;

        [Column("note")]
        public string Note { get; set; } = string.Empty;

        [Column("first_learned_date")]
        public DateTime? FirstLearnedDate { get; set; }
    }
}
