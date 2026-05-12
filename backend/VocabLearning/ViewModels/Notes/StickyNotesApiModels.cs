namespace VocabLearning.ViewModels.Notes
{
    public class StickyNoteViewModel
    {
        public long StickyNoteId { get; set; }
        public string Content { get; set; } = string.Empty;
        public string Color { get; set; } = "yellow";
        public bool IsPinned { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateStickyNoteRequest
    {
        public string? Content { get; set; }
        public string? Color { get; set; }
    }

    public class UpdateStickyNoteRequest
    {
        public string? Content { get; set; }
        public string? Color { get; set; }
        public bool? IsPinned { get; set; }
    }
}
