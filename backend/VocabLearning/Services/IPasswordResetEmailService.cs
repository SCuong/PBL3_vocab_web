namespace VocabLearning.Services
{
    public interface IPasswordResetEmailService
    {
        Task SendPasswordResetEmailAsync(
            string toEmail,
            string username,
            string resetLink,
            CancellationToken cancellationToken = default);
    }
}
