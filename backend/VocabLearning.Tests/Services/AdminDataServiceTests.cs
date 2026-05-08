using FluentAssertions;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    public class AdminDataServiceTests : IDisposable
    {
        private readonly Data.AppDbContext _context;
        private readonly AdminDataService _service;

        public AdminDataServiceTests()
        {
            _context = TestDbContextFactory.CreateWithSeedData();
            _service = new AdminDataService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region Helper Methods

        private void SeedExercisesAndSessions()
        {
            // Add exercises
            _context.Exercises.AddRange(
                new Exercise
                {
                    ExerciseId = 1,
                    VocabId = 1,
                    Type = ExerciseTypes.Filling,
                    MatchMode = null,
                    CreatedAt = DateTime.Now.AddDays(-2)
                },
                new Exercise
                {
                    ExerciseId = 2,
                    VocabId = 2,
                    Type = ExerciseTypes.MatchMeaning,
                    MatchMode = ExerciseMatchModes.MatchMeaning,
                    CreatedAt = DateTime.Now.AddDays(-1)
                });

            // Add exercise sessions
            _context.ExerciseSessions.AddRange(
                new ExerciseSession
                {
                    SessionId = 1,
                    UserId = 2,
                    TopicId = 1,
                    SessionType = "STUDY",
                    StartedAt = DateTime.Now.AddDays(-1),
                    FinishedAt = DateTime.Now.AddDays(-1).AddHours(1),
                    TotalQuestions = 10,
                    CorrectCount = 8,
                    Score = 80
                },
                new ExerciseSession
                {
                    SessionId = 2,
                    UserId = 2,
                    TopicId = 2,
                    SessionType = "TEST",
                    StartedAt = DateTime.Now,
                    FinishedAt = null,
                    TotalQuestions = 5,
                    CorrectCount = 0,
                    Score = 0
                });

            _context.SaveChanges();
        }

        #endregion

        #region GetUsers

        [Fact]
        public void GetUsers_ShouldReturnAllUsersOrderedByUsername()
        {
            // Act
            var result = _service.GetUsers();

            // Assert
            result.Should().HaveCount(3);
            result.Should().BeInAscendingOrder(u => u.Username);
            result[0].Username.Should().Be("admin");
            result[1].Username.Should().Be("inactive_user");
            result[2].Username.Should().Be("learner1");
        }

        #endregion

        #region GetVocabularies

        [Fact]
        public void GetVocabularies_ShouldReturnAllVocabulariesOrderedByWord()
        {
            // Act
            var result = _service.GetVocabularies();

            // Assert
            result.Should().HaveCount(2);
            result.Should().BeInAscendingOrder(v => v.Word);
            result[0].Word.Should().Be("apple");
            result[1].Word.Should().Be("cat");
        }

        #endregion

        #region GetTopics

        [Fact]
        public void GetTopics_ShouldReturnAllTopicsOrderedByName()
        {
            // Act
            var result = _service.GetTopics();

            // Assert
            result.Should().HaveCount(2);
            result.Should().BeInAscendingOrder(t => t.Name);
            result[0].Name.Should().Be("Animals");
            result[1].Name.Should().Be("Food");
        }

        #endregion

        #region GetTopicById

        [Fact]
        public void GetTopicById_ExistingId_ShouldReturnTopic()
        {
            // Act
            var result = _service.GetTopicById(1);

            // Assert
            result.Should().NotBeNull();
            result!.TopicId.Should().Be(1);
            result.Name.Should().Be("Animals");
        }

        [Fact]
        public void GetTopicById_NonExistentId_ShouldReturnNull()
        {
            // Act
            var result = _service.GetTopicById(999);

            // Assert
            result.Should().BeNull();
        }

        #endregion

        #region CreateTopic

        [Fact]
        public void CreateTopic_WithValidData_ShouldSucceed()
        {
            // Arrange
            var topic = new Topic
            {
                Name = "Sports",
                Description = "Words about sports",
                ParentTopicId = null
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateTopic(topic);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
            _service.GetTopics().Should().HaveCount(3);
        }

        [Fact]
        public void CreateTopic_WithEmptyName_ShouldFail()
        {
            // Arrange
            var topic = new Topic
            {
                Name = "  ",
                Description = "Some description"
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateTopic(topic);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Topic name is required.");
        }

        [Fact]
        public void CreateTopic_WithEmptyDescription_ShouldFail()
        {
            // Arrange
            var topic = new Topic
            {
                Name = "NewTopic",
                Description = "  "
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateTopic(topic);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Topic description is required.");
        }

        [Fact]
        public void CreateTopic_WithNonExistentParent_ShouldFail()
        {
            // Arrange
            var topic = new Topic
            {
                Name = "Child Topic",
                Description = "A child topic",
                ParentTopicId = 999
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateTopic(topic);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Parent topic does not exist.");
        }

        [Fact]
        public void CreateTopic_WithValidParent_ShouldSucceed()
        {
            // Arrange
            var topic = new Topic
            {
                Name = "Mammals",
                Description = "Animals that are mammals",
                ParentTopicId = 1  // Animals
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateTopic(topic);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
        }

        #endregion

        #region UpdateTopic

        [Fact]
        public void UpdateTopic_WithValidData_ShouldSucceed()
        {
            // Arrange
            var updated = new Topic
            {
                TopicId = 1,
                Name = "Animals Updated",
                Description = "Updated description"
            };

            // Act
            var result = _service.UpdateTopic(updated);

            // Assert
            result.Should().BeTrue();
            var topic = _service.GetTopicById(1);
            topic!.Name.Should().Be("Animals Updated");
            topic.Description.Should().Be("Updated description");
        }

        [Fact]
        public void UpdateTopic_NonExistent_ShouldFail()
        {
            // Arrange
            var updated = new Topic
            {
                TopicId = 999,
                Name = "Ghost",
                Description = "Non-existent topic"
            };

            // Act
            var result = _service.UpdateTopic(updated);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void UpdateTopic_SelfReferencingParent_ShouldFail()
        {
            // Arrange
            var updated = new Topic
            {
                TopicId = 1,
                Name = "Animals",
                Description = "Words about animals",
                ParentTopicId = 1  // Self-reference
            };

            // Act
            var result = _service.UpdateTopic(updated);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void UpdateTopic_WithNonExistentParent_ShouldFail()
        {
            // Arrange
            var updated = new Topic
            {
                TopicId = 1,
                Name = "Animals",
                Description = "Words about animals",
                ParentTopicId = 999
            };

            // Act
            var result = _service.UpdateTopic(updated);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void UpdateTopic_WithEmptyName_ShouldFail()
        {
            // Arrange
            var updated = new Topic
            {
                TopicId = 1,
                Name = "  ",
                Description = "Description"
            };

            // Act
            var result = _service.UpdateTopic(updated);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void UpdateTopic_WithEmptyDescription_ShouldFail()
        {
            // Arrange
            var updated = new Topic
            {
                TopicId = 1,
                Name = "Animals",
                Description = "  "
            };

            // Act
            var result = _service.UpdateTopic(updated);

            // Assert
            result.Should().BeFalse();
        }

        #endregion

        #region DeleteTopic

        [Fact]
        public void DeleteTopic_Existing_ShouldSucceed()
        {
            // Act
            var result = _service.DeleteTopic(1);

            // Assert
            result.Should().BeTrue();
            _service.GetTopicById(1).Should().BeNull();
            _service.GetTopics().Should().HaveCount(1);
        }

        [Fact]
        public void DeleteTopic_Existing_ShouldNullifyChildrenParentTopicId()
        {
            // Arrange
            var childTopic = new Topic
            {
                Name = "Mammals",
                Description = "Mammals topic",
                ParentTopicId = 1
            };
            _context.Topics.Add(childTopic);
            _context.SaveChanges();
            var childTopicId = childTopic.TopicId;

            // Act
            _service.DeleteTopic(1);

            // Assert
            var child = _service.GetTopicById(childTopicId);
            child!.ParentTopicId.Should().BeNull();
        }

        [Fact]
        public void DeleteTopic_NonExistent_ShouldFail()
        {
            // Act
            var result = _service.DeleteTopic(999);

            // Assert
            result.Should().BeFalse();
        }

        #endregion

        #region GetExercises

        [Fact]
        public void GetExercises_ShouldReturnOrderedByCreatedAtDescending()
        {
            // Arrange
            SeedExercisesAndSessions();

            // Act
            var result = _service.GetExercises();

            // Assert
            result.Should().HaveCount(2);
            result.Should().BeInDescendingOrder(e => e.CreatedAt);
        }

        #endregion

        #region CreateExercise

        [Fact]
        public void CreateExercise_WithValidFillingType_ShouldSucceed()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.Filling,
                MatchMode = null
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
            _service.GetExerciseById(exercise.ExerciseId).Should().NotBeNull();
        }

        [Fact]
        public void CreateExercise_WithValidMatchMeaningAndMatchMode_ShouldSucceed()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.MatchMeaning,
                MatchMode = ExerciseMatchModes.MatchMeaning
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
        }

        [Fact]
        public void CreateExercise_WithNonExistentVocabulary_ShouldFail()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 999,
                Type = ExerciseTypes.Filling
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Vocabulary does not exist.");
        }

        [Fact]
        public void CreateExercise_WithEmptyType_ShouldFail()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = "  "
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Exercise type is required.");
        }

        [Fact]
        public void CreateExercise_WithInvalidType_ShouldFail()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = "INVALID_TYPE"
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Exercise type is invalid.");
        }

        [Fact]
        public void CreateExercise_MatchMeaningWithoutMatchMode_ShouldFail()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.MatchMeaning,
                MatchMode = null
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Match mode is required for MATCH_MEANING exercises.");
        }

        [Fact]
        public void CreateExercise_WithInvalidMatchMode_ShouldFail()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.MatchMeaning,
                MatchMode = "INVALID_MODE"
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Match mode is invalid.");
        }

        [Fact]
        public void CreateExercise_WithDuplicate_ShouldFail()
        {
            // Arrange
            var exercise1 = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.Filling
            };
            _service.CreateExercise(exercise1);

            var exercise2 = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.Filling
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(exercise2);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("An exercise with the same vocabulary and type already exists.");
        }

        [Fact]
        public void CreateExercise_ShouldNormalizeTypeToUppercase()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = "filling"
            };

            // Act
            var (succeeded, _) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeTrue();
            exercise.Type.Should().Be("FILLING");
        }

        [Fact]
        public void CreateExercise_FillingTypeShouldClearMatchMode()
        {
            // Arrange
            var exercise = new Exercise
            {
                VocabId = 1,
                Type = ExerciseTypes.Filling,
                MatchMode = "SOME_MODE"
            };

            // Act
            var (succeeded, _) = _service.CreateExercise(exercise);

            // Assert
            succeeded.Should().BeTrue();
            exercise.MatchMode.Should().BeNull();
        }

        #endregion

        #region UpdateExercise

        [Fact]
        public void UpdateExercise_WithValidData_ShouldSucceed()
        {
            // Arrange
            SeedExercisesAndSessions();
            var updated = new Exercise
            {
                ExerciseId = 1,
                VocabId = 2,
                Type = ExerciseTypes.MatchMeaning,
                MatchMode = ExerciseMatchModes.MatchIpa
            };

            // Act
            var (succeeded, errorMessage) = _service.UpdateExercise(updated);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
            var exercise = _service.GetExerciseById(1);
            exercise!.VocabId.Should().Be(2);
        }

        [Fact]
        public void UpdateExercise_NonExistent_ShouldFail()
        {
            // Arrange
            var updated = new Exercise
            {
                ExerciseId = 999,
                VocabId = 1,
                Type = ExerciseTypes.Filling
            };

            // Act
            var (succeeded, _) = _service.UpdateExercise(updated);

            // Assert
            succeeded.Should().BeFalse();
        }

        [Fact]
        public void UpdateExercise_WithInvalidType_ShouldFail()
        {
            // Arrange
            SeedExercisesAndSessions();
            var updated = new Exercise
            {
                ExerciseId = 1,
                VocabId = 1,
                Type = "INVALID"
            };

            // Act
            var (succeeded, errorMessage) = _service.UpdateExercise(updated);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Exercise type is invalid.");
        }

        [Fact]
        public void UpdateExercise_WithDuplicate_ShouldFail()
        {
            // Arrange
            SeedExercisesAndSessions();
            var updated = new Exercise
            {
                ExerciseId = 1,
                VocabId = 2,
                Type = ExerciseTypes.MatchMeaning,
                MatchMode = ExerciseMatchModes.MatchMeaning
            };

            // Act
            var (succeeded, errorMessage) = _service.UpdateExercise(updated);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("An exercise with the same vocabulary and type already exists.");
        }

        #endregion

        #region DeleteExercise

        [Fact]
        public void DeleteExercise_Existing_ShouldSucceed()
        {
            // Arrange
            SeedExercisesAndSessions();
            _context.ExerciseResults.Add(new ExerciseResult
            {
                SessionId = 1,
                ExerciseId = 1,
                UserId = 2,
                IsCorrect = true,
                AnsweredAt = DateTime.Now
            });
            _context.SaveChanges();

            // Act
            var result = _service.DeleteExercise(1);

            // Assert
            result.Should().BeTrue();
            _service.GetExerciseById(1).Should().BeNull();
            _context.ExerciseResults.Where(er => er.ExerciseId == 1).Should().BeEmpty();
        }

        [Fact]
        public void DeleteExercise_NonExistent_ShouldFail()
        {
            // Act
            var result = _service.DeleteExercise(999);

            // Assert
            result.Should().BeFalse();
        }

        #endregion

        #region UserVocabulary CRUD

        [Fact]
        public void CreateUserVocabulary_WithValidData_ShouldSucceed()
        {
            // Arrange
            var userVocab = new UserVocabulary
            {
                UserId = 2,
                VocabId = 1,
                Status = UserVocabularyStatuses.Learning,
                Note = "Test note",
                FirstLearnedDate = DateTime.Now
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateUserVocabulary(userVocab);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
        }

        [Fact]
        public void CreateUserVocabulary_NonExistentUser_ShouldFail()
        {
            // Arrange
            var userVocab = new UserVocabulary
            {
                UserId = 999,
                VocabId = 1,
                Status = UserVocabularyStatuses.Learning
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateUserVocabulary(userVocab);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("User or vocabulary does not exist.");
        }

        [Fact]
        public void CreateUserVocabulary_NonExistentVocab_ShouldFail()
        {
            // Arrange
            var userVocab = new UserVocabulary
            {
                UserId = 2,
                VocabId = 999,
                Status = UserVocabularyStatuses.Learning
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateUserVocabulary(userVocab);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("User or vocabulary does not exist.");
        }

        [Fact]
        public void CreateUserVocabulary_Duplicate_ShouldFail()
        {
            // Arrange
            var userVocab = new UserVocabulary
            {
                UserId = 2,
                VocabId = 1,
                Status = UserVocabularyStatuses.Learning
            };
            _service.CreateUserVocabulary(userVocab);

            var duplicate = new UserVocabulary
            {
                UserId = 2,
                VocabId = 1,
                Status = UserVocabularyStatuses.Mastered
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateUserVocabulary(duplicate);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("This user-vocabulary record already exists.");
        }

        [Fact]
        public void DeleteUserVocabulary_Existing_ShouldSucceed()
        {
            // Arrange
            var userVocab = new UserVocabulary
            {
                UserId = 2,
                VocabId = 1,
                Status = UserVocabularyStatuses.Learning
            };
            _service.CreateUserVocabulary(userVocab);

            // Act
            var result = _service.DeleteUserVocabulary(2, 1);

            // Assert
            result.Should().BeTrue();
            _service.GetUserVocabulary(2, 1).Should().BeNull();
        }

        [Fact]
        public void DeleteUserVocabulary_NonExistent_ShouldFail()
        {
            // Act
            var result = _service.DeleteUserVocabulary(999, 999);

            // Assert
            result.Should().BeFalse();
        }

        #endregion

        #region CreateLearningLog

        [Fact]
        public void CreateLearningLog_WithValidData_ShouldSucceed()
        {
            // Arrange
            SeedExercisesAndSessions();
            var log = new LearningLog
            {
                UserId = 2,
                SessionId = 1,
                Date = DateTime.Now,
                ActivityType = "STUDY",
                WordsStudied = 10,
                Score = 85
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateLearningLog(log);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
        }

        [Fact]
        public void CreateLearningLog_NonExistentUser_ShouldFail()
        {
            // Arrange
            SeedExercisesAndSessions();
            var log = new LearningLog
            {
                UserId = 999,
                SessionId = 1,
                Date = DateTime.Now,
                ActivityType = "STUDY",
                WordsStudied = 5,
                Score = 50
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateLearningLog(log);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("User or session does not exist.");
        }

        [Fact]
        public void CreateLearningLog_NonExistentSession_ShouldFail()
        {
            // Arrange
            var log = new LearningLog
            {
                UserId = 2,
                SessionId = 999,
                Date = DateTime.Now,
                ActivityType = "STUDY",
                WordsStudied = 5,
                Score = 50
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateLearningLog(log);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("User or session does not exist.");
        }

        [Fact]
        public void CreateLearningLog_DuplicateSession_ShouldFail()
        {
            // Arrange
            SeedExercisesAndSessions();
            var log1 = new LearningLog
            {
                UserId = 2,
                SessionId = 1,
                Date = DateTime.Now,
                ActivityType = "STUDY",
                WordsStudied = 10,
                Score = 85
            };
            _service.CreateLearningLog(log1);

            var log2 = new LearningLog
            {
                UserId = 2,
                SessionId = 1,
                Date = DateTime.Now.AddHours(1),
                ActivityType = "TEST",
                WordsStudied = 5,
                Score = 90
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateLearningLog(log2);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("This session already has a learning log.");
        }

        #endregion

        #region GetExerciseTypeSuggestions

        [Fact]
        public void GetExerciseTypeSuggestions_ShouldReturnAllDefinedTypes()
        {
            // Act
            var result = _service.GetExerciseTypeSuggestions();

            // Assert
            result.Should().Contain(ExerciseTypes.MatchMeaning);
            result.Should().Contain(ExerciseTypes.Filling);
            result.Should().BeInAscendingOrder();
        }

        [Fact]
        public void GetExerciseTypeSuggestions_WithCustomTypes_ShouldIncludeAll()
        {
            // Arrange
            _context.Exercises.Add(new Exercise
            {
                VocabId = 1,
                Type = "CUSTOM_TYPE",
                CreatedAt = DateTime.Now
            });
            _context.SaveChanges();

            // Act
            var result = _service.GetExerciseTypeSuggestions();

            // Assert
            result.Should().Contain("CUSTOM_TYPE");
            result.Should().Contain(ExerciseTypes.MatchMeaning);
            result.Should().Contain(ExerciseTypes.Filling);
        }

        #endregion

        #region GetExerciseMatchModeSuggestions

        [Fact]
        public void GetExerciseMatchModeSuggestions_ShouldReturnAllDefinedModes()
        {
            // Act
            var result = _service.GetExerciseMatchModeSuggestions();

            // Assert
            result.Should().Contain(ExerciseMatchModes.MatchIpa);
            result.Should().Contain(ExerciseMatchModes.MatchMeaning);
            result.Should().BeInAscendingOrder();
        }

        #endregion

        #region GetExerciseLabels

        [Fact]
        public void GetExerciseLabels_WithExercises_ShouldReturnLabelsForAll()
        {
            // Arrange
            SeedExercisesAndSessions();

            // Act
            var result = _service.GetExerciseLabels();

            // Assert
            result.Should().HaveCount(2);
            result[1].Should().Contain("apple");
            result[1].Should().Contain("FILLING");
        }

        #endregion

        #region GetExerciseSessionLabels

        [Fact]
        public void GetExerciseSessionLabels_WithSessions_ShouldReturnLabelsForAll()
        {
            // Arrange
            SeedExercisesAndSessions();

            // Act
            var result = _service.GetExerciseSessionLabels();

            // Assert
            result.Should().HaveCount(2);
            result[2].Should().Contain("learner1");
            result[2].Should().Contain("TEST");
        }

        #endregion
    }
}
