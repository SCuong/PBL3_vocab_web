using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;

namespace VocabLearning.Services
{
    public sealed class AdminLearningManagementService : IAdminLearningManagementService
    {
        private const int MaxAbsoluteAdjustment = 1_000_000;
        private const int MaxTargetTotalXp = 1_000_000;
        private readonly AppDbContext _context;
        private readonly IDashboardAnalyticsService _dashboardAnalyticsService;

        public AdminLearningManagementService(
            AppDbContext context,
            IDashboardAnalyticsService dashboardAnalyticsService)
        {
            _context = context;
            _dashboardAnalyticsService = dashboardAnalyticsService;
        }

        public async Task<(bool Succeeded, string Message)> AdjustXpAsync(
            long adminUserId, long targetUserId, int amount, string reason, CancellationToken cancellationToken)
        {
            var validation = await ValidateActionAsync(adminUserId, targetUserId, reason, cancellationToken);
            if (!validation.Succeeded) return (false, validation.Message);
            if (amount == 0 || Math.Abs((long)amount) > MaxAbsoluteAdjustment)
                return (false, "Mức điều chỉnh XP phải khác 0 và không vượt quá 1.000.000.");

            // Single SaveChanges is atomic on its own; no manual transaction needed
            // (a manual transaction would break the Npgsql retry execution strategy).
            _context.XpAdjustments.Add(new XpAdjustment
            {
                UserId = targetUserId,
                Amount = amount,
                Reason = reason.Trim(),
                CreatedByAdminId = adminUserId,
                CreatedAt = DateTime.Now,
            });
            AddAudit(adminUserId, targetUserId, "XP_ADJUSTED", reason, new { amount });
            await _context.SaveChangesAsync(cancellationToken);
            return (true, "Đã điều chỉnh XP.");
        }

        public async Task<(bool Succeeded, string Message)> SetXpTargetAsync(
            long adminUserId,
            long targetUserId,
            int targetTotalXp,
            string reason,
            CancellationToken cancellationToken)
        {
            var validation = await ValidateActionAsync(adminUserId, targetUserId, reason, cancellationToken);
            if (!validation.Succeeded) return (false, validation.Message);
            if (targetTotalXp < 0 || targetTotalXp > MaxTargetTotalXp)
                return (false, "Tổng XP mong muốn phải từ 0 đến 1.000.000.");

            var dashboard = await _dashboardAnalyticsService.GetLearnerDashboardAsync(targetUserId, cancellationToken);
            var currentTotalXp = dashboard.Xp.TotalXp;
            var adjustmentAmount = targetTotalXp - currentTotalXp;

            if (adjustmentAmount == 0)
                return (true, "XP hiện tại đã bằng XP mong muốn.");

            _context.XpAdjustments.Add(new XpAdjustment
            {
                UserId = targetUserId,
                Amount = adjustmentAmount,
                Reason = reason.Trim(),
                CreatedByAdminId = adminUserId,
                CreatedAt = DateTime.Now,
            });
            AddAudit(
                adminUserId,
                targetUserId,
                "XP_TARGET_SET",
                reason,
                new { currentTotalXp, targetTotalXp, adjustmentAmount });
            await _context.SaveChangesAsync(cancellationToken);
            return (true, "Đã đặt XP người học.");
        }

        public async Task<(bool Succeeded, string Message)> ResetProgressAsync(
            long adminUserId, long targetUserId, string scope, long? topicId, string reason, CancellationToken cancellationToken)
        {
            var validation = await ValidateActionAsync(adminUserId, targetUserId, reason, cancellationToken);
            if (!validation.Succeeded) return (false, validation.Message);

            var normalizedScope = scope.Trim().ToLowerInvariant();
            if (normalizedScope is not ("all" or "topic"))
                return (false, "Phạm vi reset không hợp lệ.");
            if (normalizedScope == "topic" && !topicId.HasValue)
                return (false, "Vui lòng chọn chủ đề cần reset.");
            if (topicId.HasValue && !await _context.Topics.AnyAsync(item => item.TopicId == topicId.Value, cancellationToken))
                return (false, "Không tìm thấy chủ đề.");

            // Multiple ExecuteDelete statements must be atomic AND retriable -> run the
            // whole transaction through the Npgsql execution strategy.
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                await ClearLearningDataAsync(targetUserId, normalizedScope == "topic" ? topicId : null, false, cancellationToken);
                AddAudit(adminUserId, targetUserId, "PROGRESS_RESET", reason, new { scope = normalizedScope, topicId });
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return (true, "Đã reset tiến độ học tập.");
            });
        }

        public async Task<(bool Succeeded, string Message)> DeleteLearningDataAsync(
            long adminUserId, long targetUserId, string confirmationText, string reason, CancellationToken cancellationToken)
        {
            var validation = await ValidateActionAsync(adminUserId, targetUserId, reason, cancellationToken);
            if (!validation.Succeeded) return (false, validation.Message);
            var target = validation.Target!;
            var confirmed = string.Equals(confirmationText.Trim(), target.Username, StringComparison.OrdinalIgnoreCase)
                || string.Equals(confirmationText.Trim(), target.Email, StringComparison.OrdinalIgnoreCase);
            if (!confirmed)
                return (false, "Nội dung xác nhận không khớp tên đăng nhập hoặc email.");

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                await ClearLearningDataAsync(targetUserId, null, true, cancellationToken);
                AddAudit(adminUserId, targetUserId, "LEARNING_DATA_DELETED", reason, new { confirmation = "matched" });
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
                return (true, "Đã xóa dữ liệu học tập.");
            });
        }

        public async Task<(bool Succeeded, string Message)> SetLeaderboardVisibilityAsync(
            long adminUserId, long targetUserId, bool hidden, string reason, CancellationToken cancellationToken)
        {
            var validation = await ValidateActionAsync(adminUserId, targetUserId, reason, cancellationToken);
            if (!validation.Succeeded) return (false, validation.Message);

            // Single SaveChanges is atomic; no manual transaction (would break retry strategy).
            validation.Target!.IsHiddenFromLeaderboard = hidden;
            AddAudit(adminUserId, targetUserId, hidden ? "LEADERBOARD_HIDDEN" : "LEADERBOARD_SHOWN", reason, new { hidden });
            await _context.SaveChangesAsync(cancellationToken);
            return (true, hidden ? "Đã ẩn người học khỏi bảng xếp hạng." : "Đã hiện người học trên bảng xếp hạng.");
        }

        private async Task<(bool Succeeded, string Message, Users? Target)> ValidateActionAsync(
            long adminUserId, long targetUserId, string reason, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(reason))
                return (false, "Vui lòng nhập lý do.", null);
            if (adminUserId == targetUserId)
                return (false, "Không thể thực hiện thao tác này trên chính bạn.", null);

            var admin = await _context.Users.FirstOrDefaultAsync(item => item.UserId == adminUserId, cancellationToken);
            if (admin is null || admin.IsDeleted || admin.Status != UserStatuses.Active || admin.Role != UserRoles.Admin)
                return (false, "Phiên quản trị không hợp lệ.", null);

            var target = await _context.Users.FirstOrDefaultAsync(item => item.UserId == targetUserId, cancellationToken);
            if (target is null || target.IsDeleted)
                return (false, "Không tìm thấy người dùng.", null);
            if (target.Role != UserRoles.Learner)
                return (false, "Không thể thực hiện thao tác này trên tài khoản quản trị.", null);

            return (true, string.Empty, target);
        }

        private async Task ClearLearningDataAsync(
            long userId, long? topicId, bool removeXpAdjustments, CancellationToken cancellationToken)
        {
            var vocabIds = topicId.HasValue
                ? await _context.Vocabularies.Where(item => item.TopicId == topicId).Select(item => item.VocabId).ToListAsync(cancellationToken)
                : null;

            var learningSessionIds = await _context.LearningSessions
                .Where(item => item.UserId == userId && (!topicId.HasValue || item.TopicId == topicId))
                .Select(item => item.SessionId)
                .ToListAsync(cancellationToken);
            var exerciseSessionIds = await _context.ExerciseSessions
                .Where(item => item.UserId == userId && (!topicId.HasValue || item.TopicId == topicId))
                .Select(item => item.SessionId)
                .ToListAsync(cancellationToken);

            await _context.LearningSessionItems.Where(item => learningSessionIds.Contains(item.SessionId)).ExecuteDeleteAsync(cancellationToken);
            await _context.LearningSessions.Where(item => learningSessionIds.Contains(item.SessionId)).ExecuteDeleteAsync(cancellationToken);
            await _context.LearningLogs.Where(item => exerciseSessionIds.Contains(item.SessionId)).ExecuteDeleteAsync(cancellationToken);
            await _context.ExerciseResults.Where(item => exerciseSessionIds.Contains(item.SessionId) || (item.UserId == userId && !topicId.HasValue)).ExecuteDeleteAsync(cancellationToken);
            await _context.ExerciseSessions.Where(item => exerciseSessionIds.Contains(item.SessionId)).ExecuteDeleteAsync(cancellationToken);

            if (vocabIds is null)
            {
                await _context.Progresses.Where(item => item.UserId == userId).ExecuteDeleteAsync(cancellationToken);
                await _context.UserVocabularies.Where(item => item.UserId == userId).ExecuteDeleteAsync(cancellationToken);
            }
            else
            {
                await _context.Progresses.Where(item => item.UserId == userId && vocabIds.Contains(item.VocabId)).ExecuteDeleteAsync(cancellationToken);
                await _context.UserVocabularies.Where(item => item.UserId == userId && vocabIds.Contains(item.VocabId)).ExecuteDeleteAsync(cancellationToken);
            }

            if (removeXpAdjustments)
                await _context.XpAdjustments.Where(item => item.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        }

        private void AddAudit(long adminUserId, long targetUserId, string action, string reason, object metadata)
        {
            _context.AdminAuditLogs.Add(new AdminAuditLog
            {
                AdminUserId = adminUserId,
                TargetUserId = targetUserId,
                Action = action,
                Reason = reason.Trim(),
                MetadataJson = JsonSerializer.Serialize(metadata),
                CreatedAt = DateTime.Now,
            });
        }
    }
}
