namespace VocabLearning.Models
{
    public class PasswordResetToken
    {
        public long PasswordResetTokenId { get; set; }

        public long UserId { get; set; }

        public string TokenHash { get; set; } = string.Empty;

        public DateTime ExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UsedAt { get; set; }

        public string? ConsumedByIp { get; set; }

        public Users? User { get; set; }
    }
}
