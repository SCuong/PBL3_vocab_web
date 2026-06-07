namespace VocabLearning.Models
{
    public sealed class XpAdjustment
    {
        public long AdjustmentId { get; set; }
        public long UserId { get; set; }
        public int Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public long CreatedByAdminId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
