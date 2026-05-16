using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Tests.Services
{
    public class LearningSessionServiceTests : IDisposable
    {
        private const long UserId = 2;
        private const long OtherUserId = 3;
        private const long TopicId = 10;

        private readonly AppDbContext _context;
        private readonly LearningService _service;

        public LearningSessionServiceTests()
        {
            _context = TestDbContextFactory.CreateWithSeedData();
            SeedSessionData(_context);
            _service = new LearningService(_context);
        }

        public void Dispose() => _context.Dispose();

        private static void SeedSessionData(AppDbContext context)
        {
            context.Topics.Add(new Topic
            {
                TopicId = TopicId,
                Name = "SessionTopic",
                ParentTopicId = 1,
                Description = "Topic for session tests"
            });

            context.Vocabularies.AddRange(
                new Vocabulary { VocabId = 100, Word = "alpha", Level = "A1", MeaningVi = "alpha-vi", TopicId = TopicId },
                new Vocabulary { VocabId = 101, Word = "beta", Level = "A1", MeaningVi = "beta-vi", TopicId = TopicId },
                new Vocabulary { VocabId = 102, Word = "gamma", Level = "A1", MeaningVi = "gamma-vi", TopicId = TopicId });

            context.SaveChanges();
        }

        private async Task<LearningSession> CreateInProgressSessionAsync(
            string mode = LearningSessionModes.Study,
            long ownerUserId = UserId)
        {
            var request = new StartLearningSessionRequest
            {
                Mode = mode,
                TopicId = TopicId,
                VocabIds = new List<long> { 100, 101, 102 }
            };
            var response = await _service.StartSessionAsync(ownerUserId, request, CancellationToken.None);
            return await _context.LearningSessions
                .Include(s => s.Items)
                .FirstAsync(s => s.SessionId == response.SessionId);
        }

        [Fact]
        public async Task StartSessionAsync_ValidRequest_CreatesInProgressSessionAndItems()
        {
            var response = await _service.StartSessionAsync(
                UserId,
                new StartLearningSessionRequest
                {
                    Mode = LearningSessionModes.Study,
                    TopicId = TopicId,
                    VocabIds = new List<long> { 100, 101, 102 }
                },
                CancellationToken.None);

            response.SessionId.Should().BeGreaterThan(0);
            response.Status.Should().Be(LearningSessionStatuses.InProgress);
            response.Mode.Should().Be(LearningSessionModes.Study);
            response.CurrentIndex.Should().Be(0);
            response.Items.Should().HaveCount(3);
            response.Items.Select(i => i.VocabId).Should().Equal(100, 101, 102);
            response.Items.Select(i => i.OrderIndex).Should().Equal(0, 1, 2);
            response.Items.Should().AllSatisfy(item =>
            {
                item.IsAnswered.Should().BeFalse();
                item.Quality.Should().BeNull();
                item.AnsweredAt.Should().BeNull();
                item.Word.Should().NotBeNullOrWhiteSpace();
            });

            var persisted = _context.LearningSessions.Include(s => s.Items).First();
            persisted.UserId.Should().Be(UserId);
            persisted.Status.Should().Be(LearningSessionStatuses.InProgress);
            persisted.Items.Should().HaveCount(3);
        }

        [Fact]
        public async Task StartSessionAsync_InvalidMode_Throws()
        {
            var act = () => _service.StartSessionAsync(
                UserId,
                new StartLearningSessionRequest
                {
                    Mode = "BOGUS",
                    TopicId = TopicId,
                    VocabIds = new List<long> { 100 }
                },
                CancellationToken.None);

            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task StartSessionAsync_EmptyVocabIds_Throws()
        {
            var act = () => _service.StartSessionAsync(
                UserId,
                new StartLearningSessionRequest
                {
                    Mode = LearningSessionModes.Study,
                    TopicId = TopicId,
                    VocabIds = new List<long>()
                },
                CancellationToken.None);

            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task StartSessionAsync_TopicNotFound_Throws()
        {
            var act = () => _service.StartSessionAsync(
                UserId,
                new StartLearningSessionRequest
                {
                    Mode = LearningSessionModes.Study,
                    TopicId = 9999,
                    VocabIds = new List<long> { 100 }
                },
                CancellationToken.None);

            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task StartSessionAsync_FiltersVocabsOutsideTopic()
        {
            // VocabId 1 belongs to TopicId 2 (Food), not TopicId 10 — should be filtered.
            var response = await _service.StartSessionAsync(
                UserId,
                new StartLearningSessionRequest
                {
                    Mode = LearningSessionModes.Study,
                    TopicId = TopicId,
                    VocabIds = new List<long> { 100, 1, 101 }
                },
                CancellationToken.None);

            response.Items.Select(i => i.VocabId).Should().Equal(100, 101);
        }

        [Fact]
        public async Task GetActiveSessionAsync_NoSession_ReturnsNull()
        {
            var result = await _service.GetActiveSessionAsync(
                UserId,
                LearningSessionModes.Study,
                TopicId,
                CancellationToken.None);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetActiveSessionAsync_ReturnsLatestInProgress()
        {
            var first = await CreateInProgressSessionAsync();
            await Task.Delay(15);
            var second = await CreateInProgressSessionAsync();

            var active = await _service.GetActiveSessionAsync(
                UserId,
                LearningSessionModes.Study,
                TopicId,
                CancellationToken.None);

            active.Should().NotBeNull();
            active!.SessionId.Should().Be(second.SessionId);
            active.SessionId.Should().NotBe(first.SessionId);
        }

        [Fact]
        public async Task SaveSessionAnswerAsync_UpdatesItemOnly_DoesNotTouchProgressOrUserVocabulary()
        {
            var session = await CreateInProgressSessionAsync();
            var progressBefore = _context.Progresses.Count(p => p.UserId == UserId);
            var userVocabBefore = _context.UserVocabularies.Count(uv => uv.UserId == UserId);

            var response = await _service.SaveSessionAnswerAsync(
                UserId,
                session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 5 },
                CancellationToken.None);

            response.CurrentIndex.Should().BeGreaterThanOrEqualTo(1);
            var savedItem = _context.LearningSessionItems.First(i => i.SessionId == session.SessionId && i.VocabId == 100);
            savedItem.IsAnswered.Should().BeTrue();
            savedItem.Quality.Should().Be(5);
            savedItem.AnsweredAt.Should().NotBeNull();

            _context.Progresses.Count(p => p.UserId == UserId).Should().Be(progressBefore);
            _context.UserVocabularies.Count(uv => uv.UserId == UserId).Should().Be(userVocabBefore);
            _context.Progresses.Any(p => p.UserId == UserId && p.VocabId == 100).Should().BeFalse();
            _context.UserVocabularies.Any(uv => uv.UserId == UserId && uv.VocabId == 100).Should().BeFalse();
        }

        [Fact]
        public async Task SaveSessionAnswerAsync_NotOwner_ThrowsUnauthorized()
        {
            var session = await CreateInProgressSessionAsync();

            var act = () => _service.SaveSessionAnswerAsync(
                OtherUserId,
                session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 3 },
                CancellationToken.None);

            await act.Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task SaveSessionAnswerAsync_InvalidQuality_Throws()
        {
            var session = await CreateInProgressSessionAsync();

            var act = () => _service.SaveSessionAnswerAsync(
                UserId,
                session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 9 },
                CancellationToken.None);

            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task SaveSessionAnswerAsync_VocabNotInSession_Throws()
        {
            var session = await CreateInProgressSessionAsync();

            var act = () => _service.SaveSessionAnswerAsync(
                UserId,
                session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 9999, Quality = 3 },
                CancellationToken.None);

            await act.Should().ThrowAsync<KeyNotFoundException>();
        }

        [Fact]
        public async Task SaveSessionAnswerAsync_OnAbandonedSession_Throws()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.AbandonSessionAsync(UserId, session.SessionId, CancellationToken.None);

            var act = () => _service.SaveSessionAnswerAsync(
                UserId,
                session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 3 },
                CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CompleteSessionAsync_CommitsProgressAndUserVocabulary()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 5 }, CancellationToken.None);
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 101, Quality = 3 }, CancellationToken.None);

            var response = await _service.CompleteSessionAsync(UserId, session.SessionId, CancellationToken.None);

            response.Status.Should().Be(LearningSessionStatuses.Completed);
            response.CommittedItemCount.Should().Be(2);

            var persistedSession = _context.LearningSessions.First(s => s.SessionId == session.SessionId);
            persistedSession.Status.Should().Be(LearningSessionStatuses.Completed);
            persistedSession.CompletedAt.Should().NotBeNull();

            var progress100 = _context.Progresses.FirstOrDefault(p => p.UserId == UserId && p.VocabId == 100);
            progress100.Should().NotBeNull();
            progress100!.Repetitions.Should().Be(1);
            progress100.NextReviewDate.Should().NotBeNull();

            var progress101 = _context.Progresses.FirstOrDefault(p => p.UserId == UserId && p.VocabId == 101);
            progress101.Should().NotBeNull();
            progress101!.LastReviewDate.Should().NotBeNull();

            var userVocab100 = _context.UserVocabularies.FirstOrDefault(uv => uv.UserId == UserId && uv.VocabId == 100);
            userVocab100.Should().NotBeNull();
            userVocab100!.Status.Should().BeOneOf(UserVocabularyStatuses.Learning, UserVocabularyStatuses.Mastered);

            // VocabId 102 was never answered — must NOT be committed.
            _context.Progresses.Any(p => p.UserId == UserId && p.VocabId == 102).Should().BeFalse();
            _context.UserVocabularies.Any(uv => uv.UserId == UserId && uv.VocabId == 102).Should().BeFalse();
        }

        [Fact]
        public async Task CompleteSessionAsync_NoAnsweredItems_Throws()
        {
            var session = await CreateInProgressSessionAsync();

            var act = () => _service.CompleteSessionAsync(UserId, session.SessionId, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CompleteSessionAsync_AlreadyCompleted_Throws()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 4 }, CancellationToken.None);
            await _service.CompleteSessionAsync(UserId, session.SessionId, CancellationToken.None);

            var act = () => _service.CompleteSessionAsync(UserId, session.SessionId, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CompleteSessionAsync_AbandonedSession_Throws()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 4 }, CancellationToken.None);
            await _service.AbandonSessionAsync(UserId, session.SessionId, CancellationToken.None);

            var act = () => _service.CompleteSessionAsync(UserId, session.SessionId, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }

        [Fact]
        public async Task CompleteSessionAsync_NotOwner_Throws()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 4 }, CancellationToken.None);

            var act = () => _service.CompleteSessionAsync(OtherUserId, session.SessionId, CancellationToken.None);

            await act.Should().ThrowAsync<UnauthorizedAccessException>();
        }

        [Fact]
        public async Task AbandonSessionAsync_DoesNotCommitProgress()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 5 }, CancellationToken.None);

            var progressBefore = _context.Progresses.Count(p => p.UserId == UserId);
            var userVocabBefore = _context.UserVocabularies.Count(uv => uv.UserId == UserId);

            var changed = await _service.AbandonSessionAsync(UserId, session.SessionId, CancellationToken.None);

            changed.Should().BeTrue();
            var persisted = _context.LearningSessions.First(s => s.SessionId == session.SessionId);
            persisted.Status.Should().Be(LearningSessionStatuses.Abandoned);
            persisted.AbandonedAt.Should().NotBeNull();

            _context.Progresses.Count(p => p.UserId == UserId).Should().Be(progressBefore);
            _context.UserVocabularies.Count(uv => uv.UserId == UserId).Should().Be(userVocabBefore);
            _context.Progresses.Any(p => p.UserId == UserId && p.VocabId == 100).Should().BeFalse();
            _context.UserVocabularies.Any(uv => uv.UserId == UserId && uv.VocabId == 100).Should().BeFalse();
        }

        [Fact]
        public async Task AbandonSessionAsync_AlreadyCompleted_ReturnsFalseAndPreservesStatus()
        {
            var session = await CreateInProgressSessionAsync();
            await _service.SaveSessionAnswerAsync(UserId, session.SessionId,
                new SaveLearningSessionAnswerRequest { VocabId = 100, Quality = 4 }, CancellationToken.None);
            await _service.CompleteSessionAsync(UserId, session.SessionId, CancellationToken.None);

            var changed = await _service.AbandonSessionAsync(UserId, session.SessionId, CancellationToken.None);

            changed.Should().BeFalse();
            var persisted = _context.LearningSessions.First(s => s.SessionId == session.SessionId);
            persisted.Status.Should().Be(LearningSessionStatuses.Completed);
            persisted.AbandonedAt.Should().BeNull();
        }

        [Fact]
        public async Task AbandonSessionAsync_NotOwner_Throws()
        {
            var session = await CreateInProgressSessionAsync();

            var act = () => _service.AbandonSessionAsync(OtherUserId, session.SessionId, CancellationToken.None);

            await act.Should().ThrowAsync<UnauthorizedAccessException>();
        }
    }
}
