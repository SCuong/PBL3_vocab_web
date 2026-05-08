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

        #region GetParentTopicId Tests

        [Fact]
        public void GetParentTopicId_ExistingTopicWithParent_ShouldReturnParentTopicId()
        {
            // Act
            var result = _service.GetParentTopicId(10);

            // Assert
            result.Should().Be(1);
        }

        [Fact]
        public void GetParentTopicId_ExistingTopicWithoutParent_ShouldReturnNull()
        {
            // Act
            var result = _service.GetParentTopicId(1);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetParentTopicId_NonExistentTopic_ShouldReturnNull()
        {
            // Act
            var result = _service.GetParentTopicId(999);

            // Assert
            result.Should().BeNull();
        }

        #endregion

        #region GetStudySession Tests

        [Fact]
        public void GetStudySession_NonExistentTopic_ShouldReturnNull()
        {
            // Act
            var result = _service.GetStudySession(2, 999, "10,11", 0);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetStudySession_ValidBatchVocabularyIds_ShouldReturnLearningStudyViewModel()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "10,11,12", 0);

            // Assert
            result.Should().NotBeNull();
            result!.TopicId.Should().Be(10);
            result.TopicName.Should().Be("TestTopic");
            result.CurrentIndex.Should().Be(0);
            result.TotalWords.Should().Be(3);
            result.CurrentWord.Should().NotBeNull();
            result.CurrentWord.VocabId.Should().Be(10);
            result.BatchVocabularyIds.Should().Contain("10");
        }

        [Fact]
        public void GetStudySession_EmptyBatchVocabularyIds_ShouldUseAutoSelection()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "", 0);

            // Assert
            result.Should().NotBeNull();
            result!.TopicId.Should().Be(10);
            result.TotalWords.Should().BeGreaterThan(0);
        }

        [Fact]
        public void GetStudySession_NullBatchVocabularyIds_ShouldUseAutoSelection()
        {
            // Act
            var result = _service.GetStudySession(2, 10, null, 0);

            // Assert
            result.Should().NotBeNull();
            result!.TopicId.Should().Be(10);
            result.TotalWords.Should().BeGreaterThan(0);
        }

        [Fact]
        public void GetStudySession_IndexOutOfRange_ShouldClampToValidRange()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "10,11,12", 100);

            // Assert
            result.Should().NotBeNull();
            result!.CurrentIndex.Should().Be(2); // Should be clamped to TotalWords - 1
        }

        [Fact]
        public void GetStudySession_NegativeIndex_ShouldClampToZero()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "10,11,12", -5);

            // Assert
            result.Should().NotBeNull();
            result!.CurrentIndex.Should().Be(0);
        }

        [Fact]
        public void GetStudySession_ValidIndex_ShouldReturnCorrectWord()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "10,11,12", 1);

            // Assert
            result.Should().NotBeNull();
            result!.CurrentIndex.Should().Be(1);
            result.CurrentWord.VocabId.Should().Be(11);
            result.CurrentWord.Word.Should().Be("bird");
        }

        [Fact]
        public void GetStudySession_NoVocabularyForTopic_ShouldReturnNull()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "999,998", 0);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetStudySession_SessionModeLearn_WhenNewVocabulary()
        {
            // Act - User 2 has not learned vocab 13 and 14
            var result = _service.GetStudySession(2, 10, "13,14", 0);

            // Assert
            result.Should().NotBeNull();
            result!.SessionMode.Should().Be(LearningActivityTypes.Learn);
        }

        [Fact]
        public void GetStudySession_SessionModeReview_WhenAllVocabularyLearned()
        {
            // Act - User 2 has learned vocab 10, 11, 12
            var result = _service.GetStudySession(2, 10, "10,11,12", 0);

            // Assert
            result.Should().NotBeNull();
            result!.SessionMode.Should().Be(LearningActivityTypes.Review);
        }

        #endregion

        #region GetMinitest Tests

        [Fact]
        public void GetMinitest_NonExistentTopic_ShouldReturnNull()
        {
            // Act
            var result = _service.GetMinitest(2, 999, "10,11");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetMinitest_EmptyBatchVocabularyIds_ShouldReturnNull()
        {
            // Act
            var result = _service.GetMinitest(2, 10, "");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetMinitest_ValidBatchVocabularyIds_ShouldReturnMinitestViewModel()
        {
            // Act
            var result = _service.GetMinitest(2, 10, "10,11,12");

            // Assert
            result.Should().NotBeNull();
            result!.TopicId.Should().Be(10);
            result.TopicName.Should().Be("TestTopic");
            result.Questions.Should().HaveCount(3);
            result.SessionMode.Should().Be(LearningActivityTypes.Review);
        }

        [Fact]
        public void GetMinitest_Questions_ShouldHaveMatchingExerciseType()
        {
            // Act
            var result = _service.GetMinitest(2, 10, "10,11");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().AllSatisfy(q =>
            {
                q.ExerciseType.Should().Be(ExerciseTypes.MatchMeaning);
                q.MatchMode.Should().Be(ExerciseMatchModes.MatchMeaning);
            });
        }

        [Fact]
        public void GetMinitest_Questions_ShouldHaveMeaningNormalized()
        {
            // Act
            var result = _service.GetMinitest(2, 10, "10");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().HaveCount(1);
            result.Questions[0].Meaning.Should().NotBeEmpty();
        }

        [Fact]
        public void GetMinitest_InvalidVocabularyIds_ShouldReturnNull()
        {
            // Act
            var result = _service.GetMinitest(2, 10, "999,998,997");

            // Assert
            result.Should().BeNull();
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

        #region GetExerciseSelection Tests

        [Fact]
        public void GetExerciseSelection_NonExistentTopic_ShouldReturnNull()
        {
            // Act
            var result = _service.GetExerciseSelection(2, 999, "10,11");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExerciseSelection_EmptyBatchVocabularyIds_ShouldReturnNull()
        {
            // Act
            var result = _service.GetExerciseSelection(2, 10, "");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExerciseSelection_ValidBatch_ShouldReturnExerciseSelection()
        {
            // Act
            var result = _service.GetExerciseSelection(2, 10, "10,11,12");

            // Assert
            result.Should().NotBeNull();
            result!.TopicId.Should().Be(10);
            result.TopicName.Should().Be("TestTopic");
            result.WordCount.Should().Be(3);
            result.LearnedWordsCount.Should().Be(3);
        }

        [Fact]
        public void GetExerciseSelection_ShouldReturnCorrectLearnedWordsCount()
        {
            // Act
            var result = _service.GetExerciseSelection(2, 10, "10,11,12,13,14");

            // Assert
            result.Should().NotBeNull();
            result!.LearnedWordsCount.Should().Be(3); // User 2 has learned 10, 11, 12
        }

        [Fact]
        public void GetExerciseSelection_InvalidVocabularyIds_ShouldReturnNull()
        {
            // Act
            var result = _service.GetExerciseSelection(2, 10, "999,998");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExerciseSelection_PartialValidIds_ShouldReturnSelectionWithValidOnly()
        {
            // Act
            var result = _service.GetExerciseSelection(2, 10, "10,11,999");

            // Assert
            result.Should().NotBeNull();
            result!.WordCount.Should().Be(2);
        }

        #endregion

        #region GetExercise Tests

        [Fact]
        public void GetExercise_DefaultMode_ShouldUseMatchingMode()
        {
            // Act
            var result = _service.GetExercise(2, 10, "10,11");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().NotBeEmpty();
        }

        [Fact]
        public void GetExercise_MatchingMode_ShouldReturnMatchingQuestions()
        {
            // Act
            var result = _service.GetExercise(2, 10, "10,11", "matching");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().NotBeEmpty();
            result.Questions.Should().AllSatisfy(q => q.IsMatchingQuestion.Should().BeTrue());
        }

        [Fact]
        public void GetExercise_FillingMode_ShouldReturnFillingQuestions()
        {
            // Act
            var result = _service.GetExercise(2, 10, "10,11,12", "filling");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().NotBeEmpty();
            result.Questions.Should().AllSatisfy(q =>
            {
                q.IsMatchingQuestion.Should().BeFalse();
                q.FillingSentence.Should().NotBeEmpty();
            });
        }

        [Fact]
        public void GetExercise_NonExistentTopic_ShouldReturnNull()
        {
            // Act
            var result = _service.GetExercise(2, 999, "10,11");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExercise_EmptyBatchVocabularyIds_ShouldReturnNull()
        {
            // Act
            var result = _service.GetExercise(2, 10, "");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExercise_InvalidMode_ShouldReturnNull()
        {
            // Act
            var result = _service.GetExercise(2, 10, "10,11", "invalid_mode");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExercise_NoLearnedWords_MatchingMode_ShouldReturnNull()
        {
            // Act - User 1 has no learned words
            var result = _service.GetExercise(1, 10, "10,11,12", "matching");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public void GetExercise_WithLearnedWords_MatchingMode_ShouldReturnQuestions()
        {
            // Act - User 2 has learned some words
            var result = _service.GetExercise(2, 10, "10,11,12", "matching");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().NotBeEmpty();
        }

        [Fact]
        public void GetExercise_FillingMode_ShouldHaveOptions()
        {
            // Act
            var result = _service.GetExercise(2, 10, "10,11", "filling");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().AllSatisfy(q =>
            {
                q.Options.Should().NotBeEmpty();
            });
        }

        [Fact]
        public void GetExercise_CaseInsensitiveMode_ShouldWork()
        {
            // Act
            var result = _service.GetExercise(2, 10, "10,11", "MATCHING");

            // Assert
            result.Should().NotBeNull();
        }

        #endregion

        #region GetDashboard Tests

        [Fact]
        public void GetDashboard_ShouldReturnDashboardViewModel()
        {
            // Act
            var result = _service.GetDashboard(2);

            // Assert
            result.Should().NotBeNull();
            result.HasParentTopics.Should().BeTrue();
        }

        [Fact]
        public void GetDashboard_ShouldHaveParentTopics()
        {
            // Act
            var result = _service.GetDashboard(2);

            // Assert
            result.Should().NotBeNull();
            result.ParentTopics.Should().NotBeEmpty();
            result.ParentTopics.Should().Contain(pt => pt.TopicId == 1);
        }

        [Fact]
        public void GetDashboard_ShouldCalculateLearnedPercent()
        {
            // Act
            var result = _service.GetDashboard(2);

            // Assert
            result.Should().NotBeNull();
            result.ParentTopics.Should().AllSatisfy(pt =>
            {
                pt.LearnedPercent.Should().BeGreaterThanOrEqualTo(0);
                pt.LearnedPercent.Should().BeLessThanOrEqualTo(100);
            });
        }

        [Fact]
        public void GetDashboard_SelectedParentTopic_ShouldShowChildTopics()
        {
            // Act
            var result = _service.GetDashboard(2, 1);

            // Assert
            result.Should().NotBeNull();
            result.SelectedParentTopicId.Should().Be(1);
            result.ChildTopics.Should().NotBeEmpty();
        }

        [Fact]
        public void GetDashboard_NoSelectedParentTopic_ShouldUseDefaultParent()
        {
            // Act
            var result = _service.GetDashboard(2);

            // Assert
            result.Should().NotBeNull();
            result.SelectedParentTopicId.Should().NotBeNull();
        }

        #endregion

        #region Edge Cases and Integration Tests

        [Fact]
        public void MarkWordsLearned_ThenGetStudySession_ShouldShowReviewMode()
        {
            // Arrange
            _service.MarkWordsLearned(2, 10, new[] { 13L });

            // Act
            var result = _service.GetStudySession(2, 10, "13", 0);

            // Assert
            result.Should().NotBeNull();
            result!.SessionMode.Should().Be(LearningActivityTypes.Review);
        }

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
        public void GetStudySession_WithAllVocabIds_ShouldReturnAll()
        {
            // Act
            var result = _service.GetStudySession(2, 10, "10,11,12,13,14", 0);

            // Assert
            result.Should().NotBeNull();
            result!.TotalWords.Should().Be(5);
        }

        [Fact]
        public void GetMinitest_ShouldIncludeAllBatchVocabularyIds()
        {
            // Act
            var result = _service.GetMinitest(2, 10, "10,11,12");

            // Assert
            result.Should().NotBeNull();
            result!.Questions.Should().HaveCount(3);
            result.Questions.Select(q => q.VocabId).Should().Contain(new[] { 10L, 11L, 12L });
        }

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
