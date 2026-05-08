using FluentAssertions;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;

namespace VocabLearning.Tests.Services
{
    public class VocabularyServiceTests : IDisposable
    {
        private readonly Data.AppDbContext _context;
        private readonly VocabularyService _service;

        public VocabularyServiceTests()
        {
            _context = TestDbContextFactory.CreateWithSeedData();
            _service = new VocabularyService(_context);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        #region GetVocabularyList

        [Fact]
        public void GetVocabularyList_ShouldReturnAllVocabularies()
        {
            // Act
            var result = _service.GetVocabularyList();

            // Assert
            result.Should().HaveCount(2);
            result.Should().BeInAscendingOrder(v => v.Word);
        }

        #endregion

        #region GetVocabularyById

        [Fact]
        public void GetVocabularyById_ExistingId_ShouldReturnVocabulary()
        {
            // Act
            var result = _service.GetVocabularyById(1);

            // Assert
            result.Should().NotBeNull();
            result!.Word.Should().Be("apple");
        }

        [Fact]
        public void GetVocabularyById_NonExistentId_ShouldReturnNull()
        {
            // Act
            var result = _service.GetVocabularyById(999);

            // Assert
            result.Should().BeNull();
        }

        #endregion

        #region VocabularyExists

        [Fact]
        public void VocabularyExists_ExistingId_ShouldReturnTrue()
        {
            _service.VocabularyExists(1).Should().BeTrue();
        }

        [Fact]
        public void VocabularyExists_NonExistentId_ShouldReturnFalse()
        {
            _service.VocabularyExists(999).Should().BeFalse();
        }

        #endregion

        #region CreateVocabulary

        [Fact]
        public void CreateVocabulary_WithValidData_ShouldSucceed()
        {
            // Arrange
            var vocab = new Vocabulary
            {
                Word = "dog",
                Ipa = "/dɒɡ/",
                Level = "A1",
                MeaningVi = "con chó",
                TopicId = 1
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateVocabulary(vocab);

            // Assert
            succeeded.Should().BeTrue();
            errorMessage.Should().BeNull();
            _service.VocabularyExists(vocab.VocabId).Should().BeTrue();
        }

        [Fact]
        public void CreateVocabulary_WithDuplicateWord_ShouldFail()
        {
            // Arrange
            var vocab = new Vocabulary
            {
                Word = "apple", // already exists
                Level = "A1",
                MeaningVi = "quả táo"
            };

            // Act
            var (succeeded, errorMessage) = _service.CreateVocabulary(vocab);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("This word already exists.");
        }

        [Fact]
        public void CreateVocabulary_WithEmptyWord_ShouldFail()
        {
            // Arrange
            var vocab = new Vocabulary { Word = "  ", Level = "A1" };

            // Act
            var (succeeded, errorMessage) = _service.CreateVocabulary(vocab);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Word is required.");
        }

        [Fact]
        public void CreateVocabulary_WithInvalidLevel_ShouldFail()
        {
            // Arrange
            var vocab = new Vocabulary { Word = "newword", Level = "X9" };

            // Act
            var (succeeded, errorMessage) = _service.CreateVocabulary(vocab);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Contain("Level is invalid");
        }

        [Theory]
        [InlineData("a1", "A1")]
        [InlineData("B2", "B2")]
        [InlineData(" c1 ", "C1")]
        public void CreateVocabulary_ShouldNormalizeLevel(string input, string expected)
        {
            // Arrange
            var vocab = new Vocabulary { Word = $"word_{input.Trim()}", Level = input, MeaningVi = "test" };

            // Act
            var (succeeded, _) = _service.CreateVocabulary(vocab);

            // Assert
            succeeded.Should().BeTrue();
            vocab.Level.Should().Be(expected);
        }

        [Fact]
        public void CreateVocabulary_WithNonExistentTopic_ShouldFail()
        {
            // Arrange
            var vocab = new Vocabulary { Word = "newword", Level = "A1", TopicId = 999 };

            // Act
            var (succeeded, errorMessage) = _service.CreateVocabulary(vocab);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("Selected topic does not exist.");
        }

        #endregion

        #region UpdateVocabulary

        [Fact]
        public void UpdateVocabulary_WithValidData_ShouldSucceed()
        {
            // Arrange
            var updated = new Vocabulary
            {
                VocabId = 1,
                Word = "apple_updated",
                Level = "B1",
                MeaningVi = "quả táo (cập nhật)"
            };

            // Act
            var (succeeded, _) = _service.UpdateVocabulary(updated);

            // Assert
            succeeded.Should().BeTrue();
            var vocab = _service.GetVocabularyById(1);
            vocab!.Word.Should().Be("apple_updated");
            vocab.Level.Should().Be("B1");
        }

        [Fact]
        public void UpdateVocabulary_WithDuplicateWord_ShouldFail()
        {
            // Arrange — try renaming vocab 1 to "cat" which already exists as vocab 2
            var updated = new Vocabulary { VocabId = 1, Word = "cat", Level = "A1" };

            // Act
            var (succeeded, errorMessage) = _service.UpdateVocabulary(updated);

            // Assert
            succeeded.Should().BeFalse();
            errorMessage.Should().Be("This word already exists.");
        }

        [Fact]
        public void UpdateVocabulary_NonExistentId_ShouldFail()
        {
            // Arrange
            var updated = new Vocabulary { VocabId = 999, Word = "ghost", Level = "A1" };

            // Act
            var (succeeded, _) = _service.UpdateVocabulary(updated);

            // Assert
            succeeded.Should().BeFalse();
        }

        #endregion

        #region Example CRUD

        [Fact]
        public void CreateExample_WithValidData_ShouldSucceed()
        {
            // Arrange
            var example = new Example
            {
                VocabId = 1,
                ExampleEn = "This is a test.",
                ExampleVi = "Đây là một bài test."
            };

            // Act
            var result = _service.CreateExample(example);

            // Assert
            result.Should().BeTrue();
        }

        [Fact]
        public void CreateExample_WithNonExistentVocab_ShouldFail()
        {
            // Arrange
            var example = new Example
            {
                VocabId = 999,
                ExampleEn = "Test",
                ExampleVi = "Test"
            };

            // Act
            var result = _service.CreateExample(example);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void CreateExample_WithEmptyText_ShouldFail()
        {
            // Arrange
            var example = new Example
            {
                VocabId = 1,
                ExampleEn = "",
                ExampleVi = "Có nghĩa"
            };

            // Act
            var result = _service.CreateExample(example);

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public void DeleteExample_ExistingId_ShouldSucceed()
        {
            _service.DeleteExample(1).Should().BeTrue();
            _service.GetExampleById(1).Should().BeNull();
        }

        [Fact]
        public void DeleteExample_NonExistentId_ShouldFail()
        {
            _service.DeleteExample(999).Should().BeFalse();
        }

        #endregion

        #region GetTopics

        [Fact]
        public void GetTopics_ShouldReturnAllTopics()
        {
            var result = _service.GetTopics();
            result.Should().HaveCount(2);
            result.Should().BeInAscendingOrder(t => t.Name);
        }

        #endregion

        #region GetVocabularyByTopicId

        [Fact]
        public void GetVocabularyByTopicId_ShouldReturnCorrectItems()
        {
            // Topic 1 = Animals, has "cat"
            var result = _service.GetVocabularyByTopicId(1);
            result.Should().HaveCount(1);
            result[0].Word.Should().Be("cat");
        }

        [Fact]
        public void GetVocabularyByTopicId_EmptyTopic_ShouldReturnEmpty()
        {
            // No vocabulary with topicId = 999
            var result = _service.GetVocabularyByTopicId(999);
            result.Should().BeEmpty();
        }

        #endregion

        #region DeleteVocabulary

        [Fact]
        public void DeleteVocabulary_ExistingId_ShouldRemoveAndCascade()
        {
            // Act
            var result = _service.DeleteVocabulary(1);

            // Assert
            result.Should().BeTrue();
            _service.GetVocabularyById(1).Should().BeNull();
            _service.GetExampleById(1).Should().BeNull(); // example cascaded
        }

        [Fact]
        public void DeleteVocabulary_NonExistentId_ShouldFail()
        {
            _service.DeleteVocabulary(999).Should().BeFalse();
        }

        #endregion

        #region GetVocabularyByIds

        [Fact]
        public void GetVocabularyByIds_ShouldReturnMatchingItems()
        {
            var result = _service.GetVocabularyByIds(new long[] { 1, 2 });
            result.Should().HaveCount(2);
        }

        [Fact]
        public void GetVocabularyByIds_EmptyList_ShouldReturnEmpty()
        {
            var result = _service.GetVocabularyByIds(Array.Empty<long>());
            result.Should().BeEmpty();
        }

        [Fact]
        public void GetVocabularyByIds_WithNonExistentIds_ShouldReturnOnlyExisting()
        {
            var result = _service.GetVocabularyByIds(new long[] { 1, 999 });
            result.Should().HaveCount(1);
        }

        #endregion

        #region GetVocabularyCountsByTopic

        [Fact]
        public void GetVocabularyCountsByTopic_ShouldReturnCorrectCounts()
        {
            var result = _service.GetVocabularyCountsByTopic();
            result.Should().ContainKey(1).WhoseValue.Should().Be(1); // Animals: cat
            result.Should().ContainKey(2).WhoseValue.Should().Be(1); // Food: apple
        }

        #endregion
    }
}
