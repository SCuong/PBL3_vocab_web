namespace VocabLearning.Models
{
    public class StickyNote
    {
        public long StickyNoteId { get; set; }

        public long UserId { get; set; }

        public string Content { get; set; } = string.Empty;

        public string Color { get; set; } = "yellow";

        public bool IsPinned { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }
    }
}
