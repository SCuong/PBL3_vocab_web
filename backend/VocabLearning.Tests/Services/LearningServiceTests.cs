using FluentAssertions;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    public class LearningServiceTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly LearningService _service;

        public LearningServiceTests()
        {
            _context = TestDbContextFactory.CreateWithSeedData();
            SeedLearningData(_context);
            _service = new LearningService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region SeedLearningData Helper

        private static void SeedLearningData(AppDbContext context)
        {
            // Add parent topic (Animals) - TopicId 1 already exists
            // Add child topic with ParentTopicId=1
            context.Topics.Add(new Topic
            {
                TopicId = 10,
                Name = "TestTopic",
                ParentTopicId = 1,
                Description = "Test topic with parent"
            });

            // Add 5 vocabularies with TopicId=10 (VocabIds 10-14)
            context.Vocabularies.AddRange(
                new Vocabulary
                {
                    VocabId = 10,
                    Word = "dog",
                    Ipa = "/dɒɡ/",
                    Level = "A1",
                    MeaningVi = "con chó",
                    TopicId = 10
                },
                new Vocabulary
                {
                    VocabId = 11,
                    Word = "bird",
                    Ipa = "/bɜːrd/",
                    Level = "A1",
                    MeaningVi = "con chim",
                    TopicId = 10
                },
                new Vocabulary
                {
                    VocabId = 12,
                    Word = "fish",
                    Ipa = "/fɪʃ/",
                    Level = "A1",
                    MeaningVi = "con cá",
                    TopicId = 10
                },
                new Vocabulary
                {
                    VocabId = 13,
                    Word = "elephant",
                    Ipa = "/ˈel.ɪ.fənt/",
                    Level = "A2",
                    MeaningVi = "con voi",
                    TopicId = 10
                },
                new Vocabulary
                {
                    VocabId = 14,
                    Word = "zebra",
                    Ipa = "/ˈzeb.rə/",
                    Level = "A2",
                    MeaningVi = "con ngựa vằn",
                    TopicId = 10
                });

            // Add some UserVocabulary records for user 2
            context.UserVocabularies.AddRange(
                new UserVocabulary
                {
                    UserId = 2,
                    VocabId = 10,
                    Status = UserVocabularyStatuses.Learning,
                    FirstLearnedDate = DateTime.Now.AddDays(-5)
                },
                new UserVocabulary
                {
                    UserId = 2,
                    VocabId = 11,
                    Status = UserVocabularyStatuses.Mastered,
                    FirstLearnedDate = DateTime.Now.AddDays(-10)
                },
                new UserVocabulary
                {
                    UserId = 2,
                    VocabId = 12,
                    Status = UserVocabularyStatuses.Learning,
                    FirstLearnedDate = DateTime.Now.AddDays(-3)
                });

            // Add some Progress records for user 2
            context.Progresses.AddRange(
                new Progress
                {
                    UserId = 2,
                    VocabId = 10,
                    EaseFactor = 2.5d,
                    IntervalDays = 1,
                    Repetitions = 1,
                    LastReviewDate = DateTime.Now.AddDays(-5),
                    NextReviewDate = DateTime.Now.AddDays(1)
                },
                new Progress
                {
                    UserId = 2,
                    VocabId = 11,
                    EaseFactor = 2.8d,
                    IntervalDays = 3,
                    Repetitions = 4,
                    LastReviewDate = DateTime.Now.AddDays(-1),
                    NextReviewDate = DateTime.Now.AddDays(2)
                },
                new Progress
                {
                    UserId = 2,
                    VocabId = 12,
                    EaseFactor = 2.6d,
                    IntervalDays = 1,
                    Repetitions = 0,
                    LastReviewDate = DateTime.Now.AddDays(-3),
                    NextReviewDate = DateTime.Now.AddDays(-1)
                });

            context.SaveChanges();
        }

        #endregion

        #region GetLearningProgressState Tests

        [Fact]
        public void GetLearningProgressState_NoData_ShouldReturnEmptyTopicsList()
        {
            // Act
            var result = _service.GetLearningProgressState(999);

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().BeEmpty();
        }

        [Fact]
        public void GetLearningProgressState_WithUserVocabularyRecords_ShouldReturnCorrectLearningWordIds()
        {
            // Act
            var result = _service.GetLearningProgressState(2);

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().NotBeEmpty();

            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            topic10!.LearnedWordIds.Should().Contain(new long[] { 10, 11, 12 });
            topic10.LearnedWordIds.Should().HaveCount(3);
        }

        [Fact]
        public void GetLearningProgressState_WithProgressRecords_ShouldReturnReviewWordIds()
        {
            // Act
            var result = _service.GetLearningProgressState(2);

            // Assert
            result.Should().NotBeNull();
            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            // Only vocab 12 has NextReviewDate in the past
            topic10!.ReviewWordIds.Should().Contain(12);
        }

        [Fact]
        public void GetLearningProgressState_WithReviewDueLaterToday_ShouldReturnReviewWordIds()
        {
            // Arrange
            var progress = _context.Progresses.First(p => p.UserId == 2 && p.VocabId == 10);
            progress.Repetitions = 0;
            progress.NextReviewDate = DateTime.Now.Date.AddDays(1).AddTicks(-1);
            _context.SaveChanges();

            // Act
            var result = _service.GetLearningProgressState(2);

            // Assert
            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            topic10!.ReviewWordIds.Should().Contain(10);
        }

        [Fact]
        public void GetLearningProgressState_ShouldHaveLearnedWordIdsSorted()
        {
            // Act
            var result = _service.GetLearningProgressState(2);

            // Assert
            result.Should().NotBeNull();
            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            topic10!.LearnedWordIds.Should().BeInAscendingOrder();
        }

        #endregion

        #region MarkWordsLearned Tests

        [Fact]
        public void MarkWordsLearned_ValidTopicAndWordIds_ShouldCreateUserVocabularyAndProgress()
        {
            // Act
            var result = _service.MarkWordsLearned(2, 10, new[] { 13L, 14L });

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().NotBeEmpty();

            var userVocabs = _context.UserVocabularies
                .Where(uv => uv.UserId == 2 && new[] { 13L, 14L }.Contains(uv.VocabId))
                .ToList();

            userVocabs.Should().HaveCount(2);
            userVocabs.Should().AllSatisfy(uv =>
            {
                uv.Status.Should().Be(UserVocabularyStatuses.Learning);
                uv.FirstLearnedDate.Should().NotBeNull();
            });

            var progresses = _context.Progresses
                .Where(p => p.UserId == 2 && new[] { 13L, 14L }.Contains(p.VocabId))
                .ToList();

            progresses.Should().HaveCount(2);
            progresses.Should().AllSatisfy(p =>
            {
                p.LastReviewDate.Should().NotBeNull();
                p.NextReviewDate.Should().NotBeNull();
                p.NextReviewDate!.Value.Should().BeOnOrAfter(DateTime.Now.AddDays(1).AddMinutes(-1));
            });
        }

        [Fact]
        public void MarkWordsLearned_InvalidTopicId_ShouldReturnCurrentStateWithoutChanges()
        {
            // Act
            var resultBefore = _service.GetLearningProgressState(2);
            var result = _service.MarkWordsLearned(2, 0, new[] { 13L, 14L });

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().HaveCount(resultBefore.Topics.Count);
        }

        [Fact]
        public void MarkWordsLearned_EmptyWordIds_ShouldReturnCurrentStateWithoutChanges()
        {
            // Act
            var resultBefore = _service.GetLearningProgressState(2);
            var result = _service.MarkWordsLearned(2, 10, new long[] { });

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().HaveCount(resultBefore.Topics.Count);
        }

        [Fact]
        public void MarkWordsLearned_NonExistentVocabIds_ShouldNotCreateRecords()
        {
            // Act
            var result = _service.MarkWordsLearned(2, 10, new[] { 999L, 998L });

            // Assert
            result.Should().NotBeNull();
            var userVocabs = _context.UserVocabularies
                .Where(uv => uv.UserId == 2 && new[] { 999L, 998L }.Contains(uv.VocabId))
                .ToList();
            userVocabs.Should().BeEmpty();
        }

        [Fact]
        public void MarkWordsLearned_AlreadyLearnedWords_ShouldUpdateExistingRecords()
        {
            // Act
            var resultBefore = _service.GetLearningProgressState(2);
            var wordIdsBefore = resultBefore.Topics.FirstOrDefault(t => t.TopicId == 10)?.LearnedWordIds.Count ?? 0;

            var result = _service.MarkWordsLearned(2, 10, new[] { 10L });

            // Assert
            result.Should().NotBeNull();
            var wordIdsAfter = result.Topics.FirstOrDefault(t => t.TopicId == 10)?.LearnedWordIds.Count;
            wordIdsAfter.Should().Be(wordIdsBefore); // Should not increase count

            var userVocab = _context.UserVocabularies.FirstOrDefault(uv => uv.UserId == 2 && uv.VocabId == 10);
            userVocab.Should().NotBeNull();
            userVocab!.Status.Should().Be(UserVocabularyStatuses.Learning);
        }

        [Fact]
        public void MarkWordsLearned_ShouldReturnUpdatedProgressState()
        {
            // Act
            var result = _service.MarkWordsLearned(2, 10, new[] { 13L });

            // Assert
            result.Should().NotBeNull();
            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            topic10!.LearnedWordIds.Should().Contain(13);
        }

        #endregion

        #region MarkWordsReviewed Tests

        [Fact]
        public void MarkWordsReviewed_ValidTopicAndWordIds_ShouldUpdateProgressRecords()
        {
            // Act
            var result = _service.MarkWordsReviewed(2, 10, new[] { 13L, 14L });

            // Assert
            result.Should().NotBeNull();
            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            topic10!.LearnedWordIds.Should().Contain(new long[] { 13, 14 });
        }

        [Fact]
        public void MarkWordsReviewed_InvalidTopicId_ShouldReturnCurrentState()
        {
            // Act
            var resultBefore = _service.GetLearningProgressState(2);
            var result = _service.MarkWordsReviewed(2, 0, new[] { 13L });

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().HaveCount(resultBefore.Topics.Count);
        }

        [Fact]
        public void MarkWordsReviewed_EmptyWordIds_ShouldReturnCurrentState()
        {
            // Act
            var resultBefore = _service.GetLearningProgressState(2);
            var result = _service.MarkWordsReviewed(2, 10, new long[] { });

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().HaveCount(resultBefore.Topics.Count);
        }

        [Fact]
        public void MarkWordsReviewed_ShouldUpdateNextReviewDateAndStatus()
        {
            // Act
            var result = _service.MarkWordsReviewed(2, 10, new[] { 13L });

            // Assert
            result.Should().NotBeNull();
            var progress = _context.Progresses.FirstOrDefault(p => p.UserId == 2 && p.VocabId == 13);
            progress.Should().NotBeNull();
            progress!.LastReviewDate.Should().NotBeNull();
            progress.NextReviewDate.Should().NotBeNull();
            progress.NextReviewDate!.Value.Should().BeAfter(DateTime.Now);
        }

        [Fact]
        public void MarkWordsReviewed_ShouldCreateProgressIfNotExists()
        {
            // Act
            var result = _service.MarkWordsReviewed(2, 10, new[] { 13L });

            // Assert
            var progresses = _context.Progresses
                .Where(p => p.UserId == 2 && p.VocabId == 13)
                .ToList();
            progresses.Should().HaveCount(1);
        }

        #endregion

        #region Edge Cases and Integration Tests

        [Fact]
        public void MultipleMarkWordsLearned_ShouldCumulateLearnedWords()
        {
            // Arrange
            _service.MarkWordsLearned(2, 10, new[] { 13L });

            // Act
            var result = _service.MarkWordsLearned(2, 10, new[] { 14L });

            // Assert
            result.Should().NotBeNull();
            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10.Should().NotBeNull();
            topic10!.LearnedWordIds.Should().Contain(new long[] { 13, 14 });
        }

        [Fact]
        public void GetBatchReviewOptions_FirstExposure_ShouldReturnImmediateImmediateOneDay()
        {
            // Act
            var result = _service.GetBatchReviewOptions(2, new[] { 13L }, Array.Empty<long>());

            // Assert
            result.Should().ContainSingle();
            result[0].VocabId.Should().Be(13);
            result[0].Options.Should().HaveCount(3);
            result[0].Options.Should().ContainSingle(o => o.Quality == 0 && o.Days == 0);
            result[0].Options.Should().ContainSingle(o => o.Quality == 3 && o.Days == 0);
            result[0].Options.Should().ContainSingle(o => o.Quality == 5 && o.Days == 1);
        }

        [Fact]
        public void GetBatchReviewOptions_RepeatedThisSession_ShouldReturnOneDayOneDayOneDay()
        {
            // Act
            var result = _service.GetBatchReviewOptions(2, new[] { 10L }, new[] { 10L });

            // Assert
            result.Should().ContainSingle();
            result[0].VocabId.Should().Be(10);
            result[0].Options.Should().HaveCount(3);
            result[0].Options.Should().ContainSingle(o => o.Quality == 0 && o.Days == 1);
            result[0].Options.Should().ContainSingle(o => o.Quality == 3 && o.Days == 1);
            result[0].Options.Should().ContainSingle(o => o.Quality == 5 && o.Days == 1);
        }

        [Fact]
        public void SubmitSingleWordReview_RepeatedThisSessionForgot_ShouldScheduleTomorrow()
        {
            // Arrange
            _service.SubmitSingleWordReview(2, 13, 10, 0);

            // Act
            _service.SubmitSingleWordReview(2, 13, 10, 0, isRepeatedThisSession: true);

            // Assert
            var progress = _context.Progresses.First(p => p.UserId == 2 && p.VocabId == 13);
            progress.NextReviewDate.Should().NotBeNull();
            progress.NextReviewDate!.Value.Date.Should().Be(DateTime.Now.Date.AddDays(1));
        }

        [Fact]
        public void GetBatchReviewOptions_FutureDayReview_ShouldKeepDynamicSm2Preview()
        {
            // Act
            var result = _service.GetBatchReviewOptions(2, new[] { 10L }, Array.Empty<long>());

            // Assert
            result.Should().ContainSingle();
            result[0].VocabId.Should().Be(10);
            result[0].Options.Should().HaveCount(3);
            result[0].Options.Should().ContainSingle(o => o.Quality == 0 && o.Days == 0);
            result[0].Options.Should().ContainSingle(o => o.Quality == 3 && o.Days == 2);
            result[0].Options.Should().ContainSingle(o => o.Quality == 5 && o.Days == 6);
        }

        [Fact]
        public void GetBatchReviewOptions_DueReview_ShouldUseRealReviewPreview()
        {
            // Arrange
            var progress = _context.Progresses.First(p => p.UserId == 2 && p.VocabId == 10);
            progress.Repetitions = 1;
            progress.IntervalDays = 2;
            progress.EaseFactor = 2.5d;
            progress.NextReviewDate = DateTime.Now.AddMinutes(-5);
            _context.SaveChanges();

            // Act
            var result = _service.GetBatchReviewOptions(2, new[] { 10L }, Array.Empty<long>());

            // Assert
            result.Should().ContainSingle();
            result[0].Options.Should().ContainSingle(o => o.Quality == 0 && o.Days == 1);
            result[0].Options.Should().ContainSingle(o => o.Quality == 3 && o.Days == 2);
            result[0].Options.Should().ContainSingle(o => o.Quality == 5 && o.Days == 7);
        }

        [Fact]
        public void GetBatchReviewOptions_DueReview_ShouldBeatRepeatedSessionFlag()
        {
            // Arrange
            var progress = _context.Progresses.First(p => p.UserId == 2 && p.VocabId == 10);
            progress.Repetitions = 1;
            progress.IntervalDays = 2;
            progress.EaseFactor = 2.5d;
            progress.NextReviewDate = DateTime.Now.AddMinutes(-5);
            _context.SaveChanges();

            // Act
            var result = _service.GetBatchReviewOptions(2, new[] { 10L }, new[] { 10L });

            // Assert
            result.Should().ContainSingle();
            result[0].Options.Should().ContainSingle(o => o.Quality == 0 && o.Days == 1);
            result[0].Options.Should().ContainSingle(o => o.Quality == 3 && o.Days == 2);
            result[0].Options.Should().ContainSingle(o => o.Quality == 5 && o.Days == 7);
        }

        [Fact]
        public void SubmitSingleWordReview_DueReviewUnsure_ShouldAdvanceRepAndGrowNextPreview()
        {
            // Arrange
            var progress = _context.Progresses.First(p => p.UserId == 2 && p.VocabId == 10);
            progress.Repetitions = 1;
            progress.IntervalDays = 1;
            progress.EaseFactor = 2.5d;
            progress.NextReviewDate = DateTime.Now.AddMinutes(-5);
            _context.SaveChanges();

            // Act
            _service.SubmitSingleWordReview(2, 10, 10, 3);

            // Assert saved state after rep1 + q3
            progress.Repetitions.Should().Be(2);
            progress.IntervalDays.Should().Be(2);
            progress.EaseFactor.Should().BeApproximately(2.36d, 0.001d);
            progress.NextReviewDate!.Value.Date.Should().Be(DateTime.Now.Date.AddDays(2));

            // Simulate the word becoming due again two days later.
            progress.NextReviewDate = DateTime.Now.AddMinutes(-5);
            _context.SaveChanges();

            var preview = _service.GetBatchReviewOptions(2, new[] { 10L }, Array.Empty<long>());

            preview.Should().ContainSingle();
            preview[0].Options.Should().ContainSingle(o => o.Quality == 0 && o.Days == 1);
            preview[0].Options.Should().ContainSingle(o => o.Quality == 3 && o.Days == 3);
            preview[0].Options.Should().ContainSingle(o => o.Quality == 5 && o.Days == 6);
        }

        [Fact]
        public void SubmitSingleWordReview_FirstExposureRememberClearly_ShouldScheduleReviewForTomorrow()
        {
            // Act
            var result = _service.SubmitSingleWordReview(2, 13, 10, 5);

            // Assert
            var progress = _context.Progresses.FirstOrDefault(p => p.UserId == 2 && p.VocabId == 13);
            progress.Should().NotBeNull();
            progress!.Repetitions.Should().Be(1);
            progress.IntervalDays.Should().Be(1);
            progress.NextReviewDate.Should().NotBeNull();
            progress.NextReviewDate!.Value.Date.Should().Be(DateTime.Now.Date.AddDays(1));

            var topic10 = result.Topics.FirstOrDefault(t => t.TopicId == 10);
            topic10?.ReviewWordIds.Should().NotContain(13);
        }

        // GetStudySession_WithAllVocabIds_ShouldReturnAll + GetMinitest_ShouldIncludeAllBatchVocabularyIds
        // removed: LearningService no longer exposes GetStudySession / GetMinitest. Reinstate
        // when an equivalent surface returns to the service.

        [Fact]
        public void MarkWordsLearned_WithMixedValidAndInvalidIds_ShouldOnlyMarkValid()
        {
            // Act
            var result = _service.MarkWordsLearned(2, 10, new[] { 10L, 999L, 11L, 998L });

            // Assert
            result.Should().NotBeNull();
            var userVocabs = _context.UserVocabularies
                .Where(uv => uv.UserId == 2 && (uv.VocabId == 10 || uv.VocabId == 11))
                .ToList();
            userVocabs.Should().HaveCount(2);
        }

        [Fact]
        public void GetLearningProgressState_MultipleTopics_ShouldReturnAll()
        {
            // Act
            _context.Vocabularies.Add(new Vocabulary
            {
                VocabId = 20,
                Word = "bread",
                Ipa = "/bred/",
                Level = "A1",
                MeaningVi = "bánh mì",
                TopicId = 2
            });
            _context.UserVocabularies.Add(new UserVocabulary
            {
                UserId = 2,
                VocabId = 20,
                Status = UserVocabularyStatuses.Learning,
                FirstLearnedDate = DateTime.Now
            });
            _context.SaveChanges();

            var result = _service.GetLearningProgressState(2);

            // Assert
            result.Should().NotBeNull();
            result.Topics.Should().HaveCountGreaterThan(1);
            result.Topics.Select(t => t.TopicId).Should().Contain(new[] { 2L, 10L });
        }

        #endregion
    }
}
