using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    public sealed class AdminLearningManagementServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly AdminLearningManagementService _service;

        public AdminLearningManagementServiceTests()
        {
            _context = TestDbContextFactory.Create();
            _service = new AdminLearningManagementService(_context, new DashboardAnalyticsService(_context));
            _context.Users.AddRange(
                CreateUser(1, "admin", UserRoles.Admin),
                CreateUser(2, "learner", UserRoles.Learner),
                CreateUser(3, "otheradmin", UserRoles.Admin),
                CreateUser(4, "otherlearner", UserRoles.Learner));
            _context.SaveChanges();
        }

        public void Dispose() => _context.Dispose();

        [Fact]
        public async Task AdjustXpAsync_CreatesAdjustmentAndAuditLog()
        {
            var result = await _service.AdjustXpAsync(1, 2, 100, "Reward", CancellationToken.None);

            result.Succeeded.Should().BeTrue();
            var adjustment = await _context.XpAdjustments.SingleAsync();
            adjustment.UserId.Should().Be(2);
            adjustment.Amount.Should().Be(100);
            adjustment.CreatedByAdminId.Should().Be(1);
            adjustment.Reason.Should().Be("Reward");

            var audit = await _context.AdminAuditLogs.SingleAsync();
            audit.AdminUserId.Should().Be(1);
            audit.TargetUserId.Should().Be(2);
            audit.Action.Should().Be("XP_ADJUSTED");
            audit.Reason.Should().Be("Reward");
        }

        [Fact]
        public async Task SetLeaderboardVisibilityAsync_UpdatesLearnerAndCreatesAuditLog()
        {
            var result = await _service.SetLeaderboardVisibilityAsync(1, 2, true, "Demo account", CancellationToken.None);

            result.Succeeded.Should().BeTrue();
            (await _context.Users.SingleAsync(item => item.UserId == 2)).IsHiddenFromLeaderboard.Should().BeTrue();
            (await _context.AdminAuditLogs.SingleAsync()).Action.Should().Be("LEADERBOARD_HIDDEN");
        }

        [Fact]
        public async Task DangerousActions_BlockSelfAndAdminTargets()
        {
            var self = await _service.AdjustXpAsync(1, 1, 10, "Self", CancellationToken.None);
            var adminTarget = await _service.SetLeaderboardVisibilityAsync(1, 3, true, "Admin target", CancellationToken.None);

            self.Succeeded.Should().BeFalse();
            adminTarget.Succeeded.Should().BeFalse();
            _context.XpAdjustments.Should().BeEmpty();
            _context.AdminAuditLogs.Should().BeEmpty();
        }

        [Fact]
        public async Task DangerousActions_BlockNonAdminCaller()
        {
            var result = await _service.AdjustXpAsync(4, 2, 10, "Not allowed", CancellationToken.None);

            result.Succeeded.Should().BeFalse();
            _context.XpAdjustments.Should().BeEmpty();
            _context.AdminAuditLogs.Should().BeEmpty();
        }

        [Fact]
        public async Task DeleteLearningDataAsync_RequiresReasonAndMatchingConfirmation()
        {
            var missingReason = await _service.DeleteLearningDataAsync(1, 2, "learner", "", CancellationToken.None);
            var wrongConfirmation = await _service.DeleteLearningDataAsync(1, 2, "wrong", "Cleanup", CancellationToken.None);

            missingReason.Succeeded.Should().BeFalse();
            wrongConfirmation.Succeeded.Should().BeFalse();
            _context.AdminAuditLogs.Should().BeEmpty();
        }

        [Fact]
        public async Task AdjustXpAsync_ChangesDashboardXp_AndNegativeTotalClampsAtZero()
        {
            await _service.AdjustXpAsync(1, 2, 100, "Reward", CancellationToken.None);
            var dashboard = new DashboardAnalyticsService(_context);
            var increased = await dashboard.GetLearnerDashboardAsync(2, CancellationToken.None);
            increased.Xp.TotalXp.Should().Be(100);

            await _service.AdjustXpAsync(1, 2, -500, "Correction", CancellationToken.None);
            var clamped = await dashboard.GetLearnerDashboardAsync(2, CancellationToken.None);
            clamped.Xp.TotalXp.Should().Be(0);
            clamped.Xp.Level.Should().Be(1);
        }

        [Fact]
        public async Task SetXpTargetAsync_CreatesDeltaToReachDesiredTotalAndAuditLog()
        {
            await _service.AdjustXpAsync(1, 2, 170, "Initial XP", CancellationToken.None);

            var result = await _service.SetXpTargetAsync(1, 2, 500, "Set desired total", CancellationToken.None);

            result.Succeeded.Should().BeTrue();
            result.Message.Should().Be("Đã đặt XP người học.");
            var adjustments = await _context.XpAdjustments.OrderBy(item => item.AdjustmentId).ToListAsync();
            adjustments.Should().HaveCount(2);
            adjustments.Last().Amount.Should().Be(330);
            var dashboard = await new DashboardAnalyticsService(_context).GetLearnerDashboardAsync(2, CancellationToken.None);
            dashboard.Xp.TotalXp.Should().Be(500);
            var audit = await _context.AdminAuditLogs.OrderBy(item => item.AuditId).LastAsync();
            audit.Action.Should().Be("XP_TARGET_SET");
            audit.MetadataJson.Should().Contain("\"currentTotalXp\":170");
            audit.MetadataJson.Should().Contain("\"targetTotalXp\":500");
            audit.MetadataJson.Should().Contain("\"adjustmentAmount\":330");
        }

        [Fact]
        public async Task SetXpTargetAsync_LowerTargetCreatesNegativeDelta()
        {
            await _service.AdjustXpAsync(1, 2, 170, "Initial XP", CancellationToken.None);

            var result = await _service.SetXpTargetAsync(1, 2, 100, "Correct total", CancellationToken.None);

            result.Succeeded.Should().BeTrue();
            (await _context.XpAdjustments.OrderBy(item => item.AdjustmentId).LastAsync()).Amount.Should().Be(-70);
            var dashboard = await new DashboardAnalyticsService(_context).GetLearnerDashboardAsync(2, CancellationToken.None);
            dashboard.Xp.TotalXp.Should().Be(100);
        }

        [Fact]
        public async Task SetXpTargetAsync_SameTargetReturnsFriendlyMessageWithoutNewRows()
        {
            await _service.AdjustXpAsync(1, 2, 170, "Initial XP", CancellationToken.None);
            var adjustmentCount = await _context.XpAdjustments.CountAsync();
            var auditCount = await _context.AdminAuditLogs.CountAsync();

            var result = await _service.SetXpTargetAsync(1, 2, 170, "No change", CancellationToken.None);

            result.Succeeded.Should().BeTrue();
            result.Message.Should().Be("XP hiện tại đã bằng XP mong muốn.");
            (await _context.XpAdjustments.CountAsync()).Should().Be(adjustmentCount);
            (await _context.AdminAuditLogs.CountAsync()).Should().Be(auditCount);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(1_000_001)]
        public async Task SetXpTargetAsync_InvalidTargetFails(int targetTotalXp)
        {
            var result = await _service.SetXpTargetAsync(1, 2, targetTotalXp, "Invalid target", CancellationToken.None);

            result.Succeeded.Should().BeFalse();
            result.Message.Should().Be("Tổng XP mong muốn phải từ 0 đến 1.000.000.");
            _context.XpAdjustments.Should().BeEmpty();
            _context.AdminAuditLogs.Should().BeEmpty();
        }

        private static Users CreateUser(long id, string username, string role) => new()
        {
            UserId = id,
            Username = username,
            Email = $"{username}@example.com",
            PasswordHash = "hash",
            Role = role,
            Status = UserStatuses.Active,
            IsEmailVerified = true,
            CreatedAt = DateTime.Now,
        };
    }
}
