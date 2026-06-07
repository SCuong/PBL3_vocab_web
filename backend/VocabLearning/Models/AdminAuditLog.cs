namespace VocabLearning.Models
{
    public sealed class AdminAuditLog
    {
        public long AuditId { get; set; }
        public long AdminUserId { get; set; }
        public long? TargetUserId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public string? MetadataJson { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
