using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;
using VocabLearning.ViewModels.Common;
using VocabLearning.ViewModels.Vocabulary;

namespace VocabLearning.Controllers
{
    [ApiController]
    public class VocabularyController : ControllerBase
    {
        private readonly VocabularyService _service;

        public VocabularyController(VocabularyService service)
        {
            _service = service;
        }

        [HttpGet("/api/vocabulary")]
        public async Task<ActionResult<PagedResultViewModel<VocabularyListItemViewModel>>> GetVocabularyApi(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 24,
            [FromQuery] string? search = null,
            [FromQuery] string? cefr = null,
            [FromQuery] long? topicId = null,
            CancellationToken cancellationToken = default)
        {
            var result = await _service.GetVocabularyPageAsync(page, pageSize, search, cefr, topicId, cancellationToken);
            var items = result.Items
                .Select(vocabulary => new VocabularyListItemViewModel
                {
                    Id = vocabulary.VocabId,
                    Word = vocabulary.Word ?? string.Empty,
                    Ipa = vocabulary.Ipa ?? string.Empty,
                    Meaning = vocabulary.MeaningVi ?? string.Empty,
                    Cefr = vocabulary.Level ?? string.Empty,
                    TopicId = vocabulary.TopicId,
                    TopicName = vocabulary.Topic?.Name ?? string.Empty,
                    AudioUrl = vocabulary.AudioUrl ?? string.Empty
                })
                .ToList();

            var totalPages = result.TotalCount == 0
                ? 0
                : (int)Math.Ceiling(result.TotalCount / (double)result.PageSize);

            return Ok(new PagedResultViewModel<VocabularyListItemViewModel>
            {
                Items = items,
                Page = result.Page,
                PageSize = result.PageSize,
                TotalCount = result.TotalCount,
                TotalPages = totalPages,
                HasNextPage = result.Page < totalPages
            });
        }

        [HttpGet("/api/vocabulary/by-ids")]
        public ActionResult<IEnumerable<VocabularyListItemViewModel>> GetVocabularyByIdsApi([FromQuery] long[] ids)
        {
            var items = _service.GetVocabularyByIds(ids)
                .Select(vocabulary => new VocabularyListItemViewModel
                {
                    Id = vocabulary.VocabId,
                    Word = vocabulary.Word ?? string.Empty,
                    Ipa = vocabulary.Ipa ?? string.Empty,
                    Meaning = vocabulary.MeaningVi ?? string.Empty,
                    Cefr = vocabulary.Level ?? string.Empty,
                    TopicId = vocabulary.TopicId,
                    TopicName = vocabulary.Topic?.Name ?? string.Empty,
                    AudioUrl = vocabulary.AudioUrl ?? string.Empty
                })
                .ToList();

            return Ok(items);
        }

        [HttpGet("/api/vocabulary/topics")]
        public ActionResult<IEnumerable<VocabularyTopicFilterItemViewModel>> GetVocabularyTopicsApi()
        {
            var vocabularyCountsByTopic = _service.GetVocabularyCountsByTopic();
            var items = _service.GetTopicsForFilter()
                .Select(topic => new VocabularyTopicFilterItemViewModel
                {
                    TopicId = topic.TopicId,
                    Name = topic.Name,
                    Description = topic.Description,
                    ParentTopicId = topic.ParentTopicId,
                    WordCount = vocabularyCountsByTopic.TryGetValue(topic.TopicId, out var count) ? count : 0
                })
                .ToList();

            return Ok(items);
        }

        [HttpGet("/api/learning/topics/{topicId:long}/vocabulary")]
        public ActionResult<IEnumerable<VocabularyLearningItemViewModel>> GetLearningVocabularyByTopicApi(long topicId)
        {
            var topic = _service.GetTopicsForFilter().FirstOrDefault(item => item.TopicId == topicId);
            if (topic == null)
            {
                return NotFound();
            }

            var items = _service.GetVocabularyByTopicId(topicId)
                .Select(vocabulary =>
                {
                    var firstExample = _service.GetFirstExampleByVocabularyId(vocabulary.VocabId);

                    return new VocabularyLearningItemViewModel
                    {
                        Id = vocabulary.VocabId,
                        Word = vocabulary.Word ?? string.Empty,
                        Ipa = vocabulary.Ipa ?? string.Empty,
                        Meaning = vocabulary.MeaningVi ?? string.Empty,
                        Cefr = vocabulary.Level ?? string.Empty,
                        TopicId = vocabulary.TopicId,
                        TopicName = topic.Name,
                        AudioUrl = vocabulary.AudioUrl ?? string.Empty,
                        Example = firstExample?.ExampleEn ?? string.Empty,
                        ExampleVi = firstExample?.ExampleVi ?? string.Empty,
                        ExampleAudioUrl = firstExample?.AudioUrl ?? string.Empty
                    };
                })
                .ToList();

            return Ok(items);
        }

        [HttpGet("/api/vocabulary/{id:long}")]
        public ActionResult<VocabularyDetailViewModel> GetVocabularyDetailApi(long id)
        {
            var vocabulary = _service.GetVocabularyDetail(id);
            if (vocabulary is null)
            {
                return NotFound();
            }

            return Ok(new VocabularyDetailViewModel
            {
                Id = vocabulary.VocabId,
                Word = vocabulary.Word ?? string.Empty,
                Ipa = vocabulary.Ipa ?? string.Empty,
                Meaning = vocabulary.MeaningVi ?? string.Empty,
                Cefr = vocabulary.Level ?? string.Empty,
                TopicId = vocabulary.TopicId,
                TopicName = vocabulary.Topic?.Name ?? string.Empty,
                AudioUrl = vocabulary.AudioUrl ?? string.Empty,
                Examples = vocabulary.Examples
                    .Select(example => new VocabularyExampleViewModel
                    {
                        Id = example.ExampleId,
                        ExampleEn = example.ExampleEn,
                        ExampleVi = example.ExampleVi,
                        AudioUrl = example.AudioUrl ?? string.Empty
                    })
                    .ToList()
            });
        }
    }
}
