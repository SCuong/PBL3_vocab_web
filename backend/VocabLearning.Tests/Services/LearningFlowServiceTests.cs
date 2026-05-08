using System;
using System.Collections.Generic;
using System.Text.Json;
using FluentAssertions;
using Moq;
using VocabLearning.Services;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Tests.Services
{
    public class LearningFlowServiceTests
    {
        private readonly Mock<ILearningService> _mockLearningService;
        private readonly LearningFlowService _service;

        public LearningFlowServiceTests()
        {
            _mockLearningService = new Mock<ILearningService>();
            _service = new LearningFlowService(_mockLearningService.Object);
        }

        #region BuildExercisePage Tests

        [Fact]
        public void BuildExercisePage_NoMode_SelectionFound_ShouldReturnExerciseModeView()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string ids = "1,2,3";
            string? mode = null;

            var selection = new LearningExerciseSelectionViewModel
            {
                TopicId = topicId,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                BatchVocabularyIds = ids,
                WordCount = 3,
                LearnedWordsCount = 2
            };

            _mockLearningService
                .Setup(s => s.GetExerciseSelection(userId, topicId, ids))
                .Returns(selection);

            // Act
            var result = _service.BuildExercisePage(userId, topicId, ids, mode);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeFalse();
            result.ViewName.Should().Be("ExerciseMode");
            result.Model.Should().Be(selection);
            _mockLearningService.Verify(s => s.GetExerciseSelection(userId, topicId, ids), Times.Once);
        }

        [Fact]
        public void BuildExercisePage_NoMode_SelectionNull_ShouldRedirectToIndex()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string ids = "1,2,3";
            string? mode = null;

            _mockLearningService
                .Setup(s => s.GetExerciseSelection(userId, topicId, ids))
                .Returns((LearningExerciseSelectionViewModel?)null);

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildExercisePage(userId, topicId, ids, mode);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { parentTopicId = 5 });
            result.TempDataMessageKey.Should().Be("InfoMessage");
            result.TempDataMessage.Should().Be("The exercise could not be created for this topic.");
            _mockLearningService.Verify(s => s.GetParentTopicId(topicId), Times.Once);
        }

        [Fact]
        public void BuildExercisePage_WithMode_ExerciseFound_ShouldReturnExerciseView()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string ids = "1,2,3";
            string? mode = "matching";

            var exercise = new LearningMinitestViewModel
            {
                TopicId = topicId,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                BatchVocabularyIds = ids,
                SessionMode = "LEARN",
                SessionStartedAt = DateTime.Now,
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "MATCH_MEANING" }
                }
            };

            _mockLearningService
                .Setup(s => s.GetExercise(userId, topicId, ids, mode))
                .Returns(exercise);

            // Act
            var result = _service.BuildExercisePage(userId, topicId, ids, mode);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeFalse();
            result.ViewName.Should().Be("Exercise");
            result.Model.Should().Be(exercise);
            _mockLearningService.Verify(s => s.GetExercise(userId, topicId, ids, mode), Times.Once);
        }

        [Fact]
        public void BuildExercisePage_WithMode_ExerciseNull_ShouldRedirectToExercise()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string ids = "1,2,3";
            string? mode = "matching";

            _mockLearningService
                .Setup(s => s.GetExercise(userId, topicId, ids, mode))
                .Returns((LearningMinitestViewModel?)null);

            // Act
            var result = _service.BuildExercisePage(userId, topicId, ids, mode);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Exercise");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId, ids });
            result.TempDataMessageKey.Should().Be("InfoMessage");
            result.TempDataMessage.Should().Be("The selected exercise mode is not available.");
        }

        #endregion

        #region BuildStudyPage Tests

        [Fact]
        public void BuildStudyPage_SessionFound_ShouldReturnStudyView()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string? ids = "1,2,3";
            int index = 0;

            var studySession = new LearningStudyViewModel
            {
                TopicId = topicId,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                TopicDescription = "Description",
                SessionMode = "LEARN",
                BatchVocabularyIds = ids,
                CurrentIndex = index,
                TotalWords = 3,
                CurrentWord = new LearningStudyWordViewModel
                {
                    VocabId = 1,
                    Word = "apple",
                    Ipa = "/ˈæpəl/",
                    Level = "A1",
                    MeaningVi = "Quả táo"
                }
            };

            _mockLearningService
                .Setup(s => s.GetStudySession(userId, topicId, ids, index))
                .Returns(studySession);

            // Act
            var result = _service.BuildStudyPage(userId, topicId, ids, index);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeFalse();
            result.ViewName.Should().Be("Study");
            result.Model.Should().Be(studySession);
            _mockLearningService.Verify(s => s.GetStudySession(userId, topicId, ids, index), Times.Once);
        }

        [Fact]
        public void BuildStudyPage_SessionNull_ShouldRedirectToIndex()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string? ids = "1,2,3";
            int index = 0;

            _mockLearningService
                .Setup(s => s.GetStudySession(userId, topicId, ids, index))
                .Returns((LearningStudyViewModel?)null);

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildStudyPage(userId, topicId, ids, index);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { parentTopicId = 5 });
            result.TempDataMessageKey.Should().Be("InfoMessage");
            result.TempDataMessage.Should().Be("This topic has no available batch right now.");
        }

        #endregion

        #region BuildMinitestPage Tests

        [Fact]
        public void BuildMinitestPage_Found_ShouldReturnMinitestView()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string ids = "1,2,3";

            var minitest = new LearningMinitestViewModel
            {
                TopicId = topicId,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                BatchVocabularyIds = ids,
                SessionMode = "LEARN",
                SessionStartedAt = DateTime.Now,
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "MATCH_MEANING" },
                    new() { VocabId = 2, Word = "banana", ExerciseType = "MATCH_MEANING" }
                }
            };

            _mockLearningService
                .Setup(s => s.GetMinitest(userId, topicId, ids))
                .Returns(minitest);

            // Act
            var result = _service.BuildMinitestPage(userId, topicId, ids);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeFalse();
            result.ViewName.Should().Be("Minitest");
            result.Model.Should().Be(minitest);
            _mockLearningService.Verify(s => s.GetMinitest(userId, topicId, ids), Times.Once);
        }

        [Fact]
        public void BuildMinitestPage_Null_ShouldRedirectToIndex()
        {
            // Arrange
            long userId = 1;
            long topicId = 10;
            string ids = "1,2,3";

            _mockLearningService
                .Setup(s => s.GetMinitest(userId, topicId, ids))
                .Returns((LearningMinitestViewModel?)null);

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildMinitestPage(userId, topicId, ids);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { parentTopicId = 5 });
            result.TempDataMessageKey.Should().Be("InfoMessage");
            result.TempDataMessage.Should().Be("The minitest could not be created for this topic.");
        }

        #endregion

        #region SubmitMinitest Tests

        [Fact]
        public void SubmitMinitest_Success_ShouldReturnSuccessResult()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                BatchVocabularyIds = "1,2,3",
                SessionMode = "LEARN",
                SessionStartedAt = DateTime.Now,
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "MATCH_MEANING" }
                }
            };

            var resultViewModel = new LearningMinitestResultViewModel
            {
                TopicId = 10,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                Score = 100f,
                CorrectCount = 1,
                TotalQuestions = 1,
                SubmittedAt = DateTime.Now
            };

            _mockLearningService
                .Setup(s => s.SubmitMinitest(userId, model))
                .Returns((true, null, resultViewModel));

            // Act
            var result = _service.SubmitMinitest(userId, model);

            // Assert
            result.Should().NotBeNull();
            result.Succeeded.Should().BeTrue();
            result.RedirectAction.Should().Be("Result");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10 });
            result.Result.Should().Be(resultViewModel);
            result.TempDataMessageKey.Should().BeNull();
            result.TempDataMessage.Should().BeNull();
            _mockLearningService.Verify(s => s.SubmitMinitest(userId, model), Times.Once);
        }

        [Fact]
        public void SubmitMinitest_Failed_ShouldReturnFailedResult()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                BatchVocabularyIds = "1,2,3",
                SessionMode = "LEARN",
                SessionStartedAt = DateTime.Now,
                Questions = new List<LearningMinitestQuestionViewModel>()
            };

            var errorMessage = "Database error occurred";

            _mockLearningService
                .Setup(s => s.SubmitMinitest(userId, model))
                .Returns((false, errorMessage, (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitMinitest(userId, model);

            // Assert
            result.Should().NotBeNull();
            result.Succeeded.Should().BeFalse();
            result.RedirectAction.Should().Be("Minitest");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10, ids = "1,2,3" });
            result.TempDataMessageKey.Should().Be("ErrorMessage");
            result.TempDataMessage.Should().Be(errorMessage);
            result.Result.Should().BeNull();
        }

        [Fact]
        public void SubmitMinitest_Failed_WithNullErrorMessage_ShouldUseDefaultMessage()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                BatchVocabularyIds = "1,2,3"
            };

            _mockLearningService
                .Setup(s => s.SubmitMinitest(userId, model))
                .Returns((false, null, (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitMinitest(userId, model);

            // Assert
            result.Succeeded.Should().BeFalse();
            result.TempDataMessage.Should().Be("The minitest result could not be saved.");
        }

        #endregion

        #region SubmitExercise Tests

        [Fact]
        public void SubmitExercise_Success_ShouldReturnSuccessResult()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                BatchVocabularyIds = "1,2,3",
                SessionMode = "LEARN",
                SessionStartedAt = DateTime.Now,
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "MATCH_MEANING" }
                }
            };

            var resultViewModel = new LearningMinitestResultViewModel
            {
                TopicId = 10,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                Score = 100f,
                CorrectCount = 1,
                TotalQuestions = 1,
                ExerciseType = "MATCH_MEANING",
                SubmittedAt = DateTime.Now
            };

            _mockLearningService
                .Setup(s => s.SubmitExercise(userId, model))
                .Returns((true, null, resultViewModel));

            // Act
            var result = _service.SubmitExercise(userId, model);

            // Assert
            result.Should().NotBeNull();
            result.Succeeded.Should().BeTrue();
            result.RedirectAction.Should().Be("Result");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10 });
            result.Result.Should().Be(resultViewModel);
            _mockLearningService.Verify(s => s.SubmitExercise(userId, model), Times.Once);
        }

        [Fact]
        public void SubmitExercise_Failed_AllMatchMeaning_ShouldReturnMatchingMode()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                BatchVocabularyIds = "1,2,3",
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "MATCH_MEANING" },
                    new() { VocabId = 2, Word = "banana", ExerciseType = "MATCH_MEANING" }
                }
            };

            _mockLearningService
                .Setup(s => s.SubmitExercise(userId, model))
                .Returns((false, "Validation failed", (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitExercise(userId, model);

            // Assert
            result.Should().NotBeNull();
            result.Succeeded.Should().BeFalse();
            result.RedirectAction.Should().Be("Exercise");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10, ids = "1,2,3", mode = "matching" });
            result.TempDataMessage.Should().Be("Validation failed");
        }

        [Fact]
        public void SubmitExercise_Failed_MixedTypes_ShouldReturnFillingMode()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                BatchVocabularyIds = "1,2,3",
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "MATCH_MEANING" },
                    new() { VocabId = 2, Word = "banana", ExerciseType = "FILL_IN_BLANK" }
                }
            };

            _mockLearningService
                .Setup(s => s.SubmitExercise(userId, model))
                .Returns((false, "Some answers were incorrect", (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitExercise(userId, model);

            // Assert
            result.Should().NotBeNull();
            result.Succeeded.Should().BeFalse();
            result.RedirectAction.Should().Be("Exercise");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10, ids = "1,2,3", mode = "filling" });
            result.TempDataMessage.Should().Be("Some answers were incorrect");
        }

        [Fact]
        public void SubmitExercise_Failed_AllFilling_ShouldReturnFillingMode()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                BatchVocabularyIds = "1,2,3",
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "FILL_IN_BLANK" },
                    new() { VocabId = 2, Word = "banana", ExerciseType = "FILL_IN_BLANK" }
                }
            };

            _mockLearningService
                .Setup(s => s.SubmitExercise(userId, model))
                .Returns((false, "Try again", (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitExercise(userId, model);

            // Assert
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10, ids = "1,2,3", mode = "filling" });
        }

        [Fact]
        public void SubmitExercise_Failed_CaseInsensitiveExerciseTypeComparison()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                BatchVocabularyIds = "1,2,3",
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "match_meaning" }, // lowercase
                    new() { VocabId = 2, Word = "banana", ExerciseType = "Match_Meaning" }  // mixed case
                }
            };

            _mockLearningService
                .Setup(s => s.SubmitExercise(userId, model))
                .Returns((false, "Error", (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitExercise(userId, model);

            // Assert
            // Should recognize both as MATCH_MEANING (case-insensitive) and return "matching"
            result.RedirectRouteValues.Should().BeEquivalentTo(new { topicId = 10, ids = "1,2,3", mode = "matching" });
        }

        [Fact]
        public void SubmitExercise_Failed_WithNullErrorMessage_ShouldUseDefaultMessage()
        {
            // Arrange
            long userId = 1;
            var model = new LearningMinitestViewModel
            {
                TopicId = 10,
                BatchVocabularyIds = "1,2,3",
                Questions = new List<LearningMinitestQuestionViewModel>
                {
                    new() { VocabId = 1, Word = "apple", ExerciseType = "FILL_IN_BLANK" }
                }
            };

            _mockLearningService
                .Setup(s => s.SubmitExercise(userId, model))
                .Returns((false, null, (LearningMinitestResultViewModel?)null));

            // Act
            var result = _service.SubmitExercise(userId, model);

            // Assert
            result.TempDataMessage.Should().Be("The exercise result could not be saved.");
        }

        #endregion

        #region BuildResultPage Tests

        [Fact]
        public void BuildResultPage_NullJson_ShouldRedirectToIndex()
        {
            // Arrange
            long topicId = 10;
            string? json = null;

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildResultPage(json, topicId);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { parentTopicId = 5 });
            result.TempDataMessageKey.Should().Be("InfoMessage");
            result.TempDataMessage.Should().Be("There is no minitest result to show.");
        }

        [Fact]
        public void BuildResultPage_EmptyJson_ShouldRedirectToIndex()
        {
            // Arrange
            long topicId = 10;
            string? json = string.Empty;

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildResultPage(json, topicId);

            // Assert
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
            result.TempDataMessage.Should().Be("There is no minitest result to show.");
        }

        [Fact]
        public void BuildResultPage_WhitespaceOnlyJson_ShouldRedirectToIndex()
        {
            // Arrange
            long topicId = 10;
            string? json = "   ";

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildResultPage(json, topicId);

            // Assert
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
        }

        [Fact]
        public void BuildResultPage_ValidJson_ShouldReturnResultView()
        {
            // Arrange
            long topicId = 10;
            var resultViewModel = new LearningMinitestResultViewModel
            {
                TopicId = 10,
                ParentTopicId = 5,
                TopicName = "Test Topic",
                Score = 85.5f,
                CorrectCount = 17,
                TotalQuestions = 20,
                HasMoreWords = true,
                SubmittedAt = DateTime.Now,
                ExerciseType = "MATCH_MEANING",
                Questions = new List<LearningMinitestQuestionResultViewModel>
                {
                    new()
                    {
                        Word = "apple",
                        ExerciseType = "MATCH_MEANING",
                        SelectedAnswer = "Quả táo",
                        CorrectAnswer = "Quả táo",
                        IsCorrect = true
                    }
                }
            };

            string json = JsonSerializer.Serialize(resultViewModel);

            // Act
            var result = _service.BuildResultPage(json, topicId);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeFalse();
            result.ViewName.Should().Be("Result");
            result.Model.Should().NotBeNull();
            result.Model.Should().BeOfType<LearningMinitestResultViewModel>();

            var deserializedModel = result.Model as LearningMinitestResultViewModel;
            deserializedModel.Should().NotBeNull();
            deserializedModel!.TopicId.Should().Be(10);
            deserializedModel.Score.Should().Be(85.5f);
            deserializedModel.CorrectCount.Should().Be(17);
            deserializedModel.TotalQuestions.Should().Be(20);
            deserializedModel.HasMoreWords.Should().BeTrue();
        }

        [Fact]
        public void BuildResultPage_InvalidJson_ShouldRedirectWithError()
        {
            // Arrange
            long topicId = 10;
            string json = "{ invalid json }";

            _mockLearningService
                .Setup(s => s.GetParentTopicId(topicId))
                .Returns(5);

            // Act
            var result = _service.BuildResultPage(json, topicId);

            // Assert
            result.Should().NotBeNull();
            result.ShouldRedirect.Should().BeTrue();
            result.RedirectAction.Should().Be("Index");
            result.RedirectRouteValues.Should().BeEquivalentTo(new { parentTopicId = 5 });
            result.TempDataMessageKey.Should().Be("ErrorMessage");
            result.TempDataMessage.Should().Be("The minitest result could not be loaded.");
        }

        [Fact]
        public void BuildResultPage_ValidJsonWithComplexData_ShouldReturnResultView()
        {
            // Arrange
            long topicId = 15;
            var resultViewModel = new LearningMinitestResultViewModel
            {
                TopicId = 15,
                ParentTopicId = 8,
                TopicName = "Complex Topic",
                Score = 92.3f,
                CorrectCount = 92,
                TotalQuestions = 100,
                HasMoreWords = false,
                SubmittedAt = new DateTime(2026, 4, 30, 10, 30, 0),
                ExerciseType = "FILL_IN_BLANK",
                Questions = new List<LearningMinitestQuestionResultViewModel>
                {
                    new()
                    {
                        Word = "elephant",
                        ExerciseType = "FILL_IN_BLANK",
                        SelectedAnswer = "voi",
                        CorrectAnswer = "voi",
                        IsCorrect = true,
                        NextReviewDate = new DateTime(2026, 5, 7)
                    },
                    new()
                    {
                        Word = "butterfly",
                        ExerciseType = "FILL_IN_BLANK",
                        SelectedAnswer = "buom",
                        CorrectAnswer = "bươm",
                        IsCorrect = false,
                        NextReviewDate = null
                    }
                }
            };

            string json = JsonSerializer.Serialize(resultViewModel);

            // Act
            var result = _service.BuildResultPage(json, topicId);

            // Assert
            result.ShouldRedirect.Should().BeFalse();
            result.ViewName.Should().Be("Result");

            var model = result.Model as LearningMinitestResultViewModel;
            model.Should().NotBeNull();
            model!.TopicId.Should().Be(15);
            model.ParentTopicId.Should().Be(8);
            model.TopicName.Should().Be("Complex Topic");
            model.Score.Should().Be(92.3f);
            model.CorrectCount.Should().Be(92);
            model.TotalQuestions.Should().Be(100);
            model.HasMoreWords.Should().BeFalse();
            model.ExerciseType.Should().Be("FILL_IN_BLANK");
            model.Questions.Should().HaveCount(2);
            model.Questions[0].IsCorrect.Should().BeTrue();
            model.Questions[1].IsCorrect.Should().BeFalse();
        }

        #endregion
    }
}
