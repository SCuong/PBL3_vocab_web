namespace VocabLearning.Models
{
    public class UserVocabulary
    {
        public long UserId { get; set; }

        public long VocabId { get; set; }

        public string Status { get; set; } = string.Empty;

        public string Note { get; set; } = string.Empty;

        public DateTime? FirstLearnedDate { get; set; }
    }
}
