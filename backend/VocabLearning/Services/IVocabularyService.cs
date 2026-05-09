using VocabLearning.Models;

namespace VocabLearning.Services
{
    public interface IVocabularyService
    {
        List<Vocabulary> GetVocabularyList();

        Task<(List<Vocabulary> Items, int TotalCount, int Page, int PageSize)> GetVocabularyPageAsync(
            int page, int pageSize, string? search, string? cefr, long? topicId,
            CancellationToken cancellationToken = default);

        List<Topic> GetTopics();

        List<Topic> GetTopicsForFilter();

        Dictionary<long, int> GetVocabularyCountsByTopic();

        List<Vocabulary> GetVocabularyByIds(IEnumerable<long> vocabularyIds);

        List<Vocabulary> GetVocabularyByTopicId(long topicId);

        Example? GetFirstExampleByVocabularyId(long vocabId);

        Vocabulary? GetVocabularyById(long id);

        bool VocabularyExists(long id);

        Vocabulary? GetVocabularyDetail(long id);

        (bool Succeeded, string? ErrorMessage) CreateVocabulary(Vocabulary vocabulary);

        (bool Succeeded, string? ErrorMessage) UpdateVocabulary(Vocabulary updatedVocabulary);

        Example? GetExampleById(long id);

        bool CreateExample(Example example);

        bool UpdateExample(Example updatedExample);

        bool DeleteExample(long id);

        bool DeleteVocabulary(long id);

        List<Example> GetExamplesForVocabIds(IReadOnlyList<long> vocabIds);
    }
}
