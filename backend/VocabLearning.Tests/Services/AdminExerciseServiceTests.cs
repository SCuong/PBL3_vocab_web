using FluentAssertions;
using Moq;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Tests.Services
{
    public class AdminExerciseServiceTests
    {
        private readonly Mock<IAdminDataService> _mockAdminDataService;
        private readonly AdminExerciseService _service;

        public AdminExerciseServiceTests()
        {
            _mockAdminDataService = new Mock<IAdminDataService>();
            _service = new AdminExerciseService(_mockAdminDataService.Object);
        }

        #region GetExercises

        [Fact]
        public void GetExercises_ShouldReturnMappedViewModels()
        {
            // Arrange
            var exercises = new List<Exercise>
            {
                new()
                {
                    ExerciseId = 1,
                    VocabId = 10,
                    Type = "Matching",
                    MatchMode = "Words",
                    CreatedAt = new DateTime(2024, 1, 1)
                },
                new()
                {
                    ExerciseId = 2,
                    VocabId = 20,
                    Type = "FillingBlanks",
                    MatchMode = null,
                    CreatedAt = new DateTime(2024, 1, 2)
                }
            };
            _mockAdminDataService.Setup(s => s.GetExercises()).Returns(exercises);

            // Act
            var result = _service.GetExercises();

            // Assert
            result.Should().HaveCount(2);
            result[0].ExerciseId.Should().Be(1);
            result[0].VocabId.Should().Be(10);
            result[0].Type.Should().Be("Matching");
            result[0].MatchMode.Should().Be("Words");
            result[0].CreatedAt.Should().Be(new DateTime(2024, 1, 1));

            result[1].ExerciseId.Should().Be(2);
            result[1].VocabId.Should().Be(20);
            result[1].Type.Should().Be("FillingBlanks");
            result[1].MatchMode.Should().BeNull();
            result[1].CreatedAt.Should().Be(new DateTime(2024, 1, 2));

            _mockAdminDataService.Verify(s => s.GetExercises(), Times.Once);
        }

        [Fact]
        public void GetExercises_EmptyList_ShouldReturnEmpty()
        {
            // Arrange
            _mockAdminDataService.Setup(s => s.GetExercises()).Returns(new List<Exercise>());

            // Act
            var result = _service.GetExercises();

            // Assert
            result.Should().BeEmpty();
            _mockAdminDataService.Verify(s => s.GetExercises(), Times.Once);
        }

        #endregion

        #region GetExerciseById

        [Fact]
        public void GetExerciseById_Existing_ShouldReturnMappedViewModel()
        {
            // Arrange
            var exercise = new Exercise
            {
                ExerciseId = 5,
                VocabId = 50,
                Type = "Matching",
                MatchMode = "Definitions",
                CreatedAt = new DateTime(2024, 6, 15)
            };
            _mockAdminDataService.Setup(s => s.GetExerciseById(5)).Returns(exercise);

            // Act
            var result = _service.GetExerciseById(5);

            // Assert
            result.Should().NotBeNull();
            result!.ExerciseId.Should().Be(5);
            result.VocabId.Should().Be(50);
            result.Type.Should().Be("Matching");
            result.MatchMode.Should().Be("Definitions");
            result.CreatedAt.Should().Be(new DateTime(2024, 6, 15));

            _mockAdminDataService.Verify(s => s.GetExerciseById(5), Times.Once);
        }

        [Fact]
        public void GetExerciseById_NonExistent_ShouldReturnNull()
        {
            // Arrange
            _mockAdminDataService.Setup(s => s.GetExerciseById(999)).Returns((Exercise?)null);

            // Act
            var result = _service.GetExerciseById(999);

            // Assert
            result.Should().BeNull();
            _mockAdminDataService.Verify(s => s.GetExerciseById(999), Times.Once);
        }

        #endregion

        #region CreateExercise

        [Fact]
        public void CreateExercise_ValidModel_ShouldDelegateToDataService()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 15,
                Type = "Matching",
                MatchMode = "Words",
                CreatedAt = new DateTime(2024, 3, 1)
            };
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(model);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();

            _mockAdminDataService.Verify(
                s => s.CreateExercise(It.Is<Exercise>(e =>
                    e.VocabId == 15 &&
                    e.Type == "Matching" &&
                    e.MatchMode == "Words" &&
                    e.CreatedAt == new DateTime(2024, 3, 1))),
                Times.Once);
        }

        [Fact]
        public void CreateExercise_ShouldTrimTypeAndMatchMode()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 25,
                Type = "  Matching  ",
                MatchMode = "  Words  ",
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.CreateExercise(model);

            // Assert
            _mockAdminDataService.Verify(
                s => s.CreateExercise(It.Is<Exercise>(e =>
                    e.Type == "Matching" &&
                    e.MatchMode == "Words")),
                Times.Once);
        }

        [Fact]
        public void CreateExercise_ShouldHandleNullMatchMode()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 30,
                Type = "FillingBlanks",
                MatchMode = null,
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.CreateExercise(model);

            // Assert
            _mockAdminDataService.Verify(
                s => s.CreateExercise(It.Is<Exercise>(e =>
                    e.MatchMode == null)),
                Times.Once);
        }

        [Fact]
        public void CreateExercise_WhenDataServiceFails_ShouldReturnFailure()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 35,
                Type = "Matching",
                MatchMode = "Definitions",
                CreatedAt = DateTime.Now
            };
            var errorMsg = "Vocabulary does not exist.";
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((false, errorMsg));

            // Act
            var (succeeded, errorMessage) = _service.CreateExercise(model);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be(errorMsg);
        }

        #endregion

        #region UpdateExercise

        [Fact]
        public void UpdateExercise_ValidModel_ShouldDelegateToDataService()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 3,
                VocabId = 40,
                Type = "FillingBlanks",
                MatchMode = null,
                CreatedAt = new DateTime(2024, 5, 10)
            };
            _mockAdminDataService
                .Setup(s => s.UpdateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            var (succeeded, errorMessage) = _service.UpdateExercise(model);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();

            _mockAdminDataService.Verify(
                s => s.UpdateExercise(It.Is<Exercise>(e =>
                    e.ExerciseId == 3 &&
                    e.VocabId == 40 &&
                    e.Type == "FillingBlanks" &&
                    e.MatchMode == null &&
                    e.CreatedAt == new DateTime(2024, 5, 10))),
                Times.Once);
        }

        [Fact]
        public void UpdateExercise_ShouldTrimTypeAndMatchMode()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 4,
                VocabId = 45,
                Type = "  Matching  ",
                MatchMode = "  Sentences  ",
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.UpdateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.UpdateExercise(model);

            // Assert
            _mockAdminDataService.Verify(
                s => s.UpdateExercise(It.Is<Exercise>(e =>
                    e.Type == "Matching" &&
                    e.MatchMode == "Sentences")),
                Times.Once);
        }

        [Fact]
        public void UpdateExercise_WhenDataServiceFails_ShouldReturnFailure()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 99,
                VocabId = 50,
                Type = "Matching",
                MatchMode = "Words",
                CreatedAt = DateTime.Now
            };
            var errorMsg = "Exercise not found.";
            _mockAdminDataService
                .Setup(s => s.UpdateExercise(It.IsAny<Exercise>()))
                .Returns((false, errorMsg));

            // Act
            var (succeeded, errorMessage) = _service.UpdateExercise(model);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be(errorMsg);
        }

        #endregion

        #region DeleteExercise

        [Fact]
        public void DeleteExercise_Existing_ShouldReturnTrue()
        {
            // Arrange
            _mockAdminDataService.Setup(s => s.DeleteExercise(10)).Returns(true);

            // Act
            var result = _service.DeleteExercise(10);

            // Assert
            result.Should().BeTrue();
            _mockAdminDataService.Verify(s => s.DeleteExercise(10), Times.Once);
        }

        [Fact]
        public void DeleteExercise_NonExistent_ShouldReturnFalse()
        {
            // Arrange
            _mockAdminDataService.Setup(s => s.DeleteExercise(999)).Returns(false);

            // Act
            var result = _service.DeleteExercise(999);

            // Assert
            result.Should().BeFalse();
            _mockAdminDataService.Verify(s => s.DeleteExercise(999), Times.Once);
        }

        #endregion

        #region Mapping Verification

        [Fact]
        public void Mapping_ShouldPreserveAllProperties()
        {
            // Arrange
            var exercise = new Exercise
            {
                ExerciseId = 100,
                VocabId = 200,
                Type = "MultipleChoice",
                MatchMode = "Pronunciation",
                CreatedAt = new DateTime(2024, 12, 31, 23, 59, 59)
            };
            _mockAdminDataService.Setup(s => s.GetExerciseById(100)).Returns(exercise);

            // Act
            var result = _service.GetExerciseById(100);

            // Assert
            result.Should().NotBeNull();
            result!.ExerciseId.Should().Be(100);
            result.VocabId.Should().Be(200);
            result.Type.Should().Be("MultipleChoice");
            result.MatchMode.Should().Be("Pronunciation");
            result.CreatedAt.Should().Be(new DateTime(2024, 12, 31, 23, 59, 59));
        }

        #endregion

        #region Edge Cases

        [Fact]
        public void CreateExercise_WithWhitespaceOnlyMatchMode_ShouldTrimToEmpty()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 60,
                Type = "Matching",
                MatchMode = "   ",
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.CreateExercise(model);

            // Assert
            _mockAdminDataService.Verify(
                s => s.CreateExercise(It.Is<Exercise>(e =>
                    e.MatchMode == "")),
                Times.Once);
        }

        [Fact]
        public void CreateExercise_WithWhitespaceOnlyType_ShouldTrimToEmpty()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 65,
                Type = "   ",
                MatchMode = "Words",
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.CreateExercise(model);

            // Assert
            _mockAdminDataService.Verify(
                s => s.CreateExercise(It.Is<Exercise>(e =>
                    e.Type == "")),
                Times.Once);
        }

        [Fact]
        public void GetExercises_WithMultipleExercises_ShouldMaintainOrder()
        {
            // Arrange
            var exercises = new List<Exercise>
            {
                new() { ExerciseId = 1, VocabId = 10, Type = "TypeA", MatchMode = null, CreatedAt = DateTime.Now },
                new() { ExerciseId = 2, VocabId = 20, Type = "TypeB", MatchMode = null, CreatedAt = DateTime.Now },
                new() { ExerciseId = 3, VocabId = 30, Type = "TypeC", MatchMode = null, CreatedAt = DateTime.Now }
            };
            _mockAdminDataService.Setup(s => s.GetExercises()).Returns(exercises);

            // Act
            var result = _service.GetExercises();

            // Assert
            result.Should().HaveCount(3);
            result[0].ExerciseId.Should().Be(1);
            result[1].ExerciseId.Should().Be(2);
            result[2].ExerciseId.Should().Be(3);
        }

        #endregion

        #region Data Service Interaction Verification

        [Fact]
        public void CreateExercise_ShouldCallDataServiceExactlyOnce()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 0,
                VocabId = 70,
                Type = "Matching",
                MatchMode = "Words",
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.CreateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.CreateExercise(model);

            // Assert
            _mockAdminDataService.Verify(s => s.CreateExercise(It.IsAny<Exercise>()), Times.Once);
        }

        [Fact]
        public void UpdateExercise_ShouldCallDataServiceExactlyOnce()
        {
            // Arrange
            var model = new ExerciseFormViewModel
            {
                ExerciseId = 5,
                VocabId = 75,
                Type = "FillingBlanks",
                MatchMode = null,
                CreatedAt = DateTime.Now
            };
            _mockAdminDataService
                .Setup(s => s.UpdateExercise(It.IsAny<Exercise>()))
                .Returns((true, (string?)null));

            // Act
            _service.UpdateExercise(model);

            // Assert
            _mockAdminDataService.Verify(s => s.UpdateExercise(It.IsAny<Exercise>()), Times.Once);
        }

        [Fact]
        public void DeleteExercise_ShouldCallDataServiceExactlyOnce()
        {
            // Arrange
            _mockAdminDataService.Setup(s => s.DeleteExercise(10)).Returns(true);

            // Act
            _service.DeleteExercise(10);

            // Assert
            _mockAdminDataService.Verify(s => s.DeleteExercise(10), Times.Once);
        }

        [Fact]
        public void GetExerciseById_ShouldPassCorrectIdToDataService()
        {
            // Arrange
            var testId = 789L;
            _mockAdminDataService.Setup(s => s.GetExerciseById(testId)).Returns((Exercise?)null);

            // Act
            _service.GetExerciseById(testId);

            // Assert
            _mockAdminDataService.Verify(s => s.GetExerciseById(testId), Times.Once);
        }

        #endregion
    }
}
