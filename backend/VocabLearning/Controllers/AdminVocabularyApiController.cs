using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = UserRoles.Admin)]
    public sealed class AdminVocabularyApiController : ControllerBase
    {
        private readonly IVocabularyService _vocabularyService;

        public AdminVocabularyApiController(IVocabularyService vocabularyService)
        {
            _vocabularyService = vocabularyService;
        }

        // ── Vocabulary ────────────────────────────────────────────────────────

        [HttpGet("vocabulary")]
        public async Task<ActionResult<AdminVocabularyListApiResponse>> GetVocabulary(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            string? cefr = null,
            long? topicId = null,
            CancellationToken cancellationToken = default)
        {
            var (items, totalCount, normalizedPage, normalizedPageSize) =
                await _vocabularyService.GetVocabularyPageAsync(page, pageSize, search, cefr, topicId, cancellationToken);

            var vocabIds = items.Select(v => v.VocabId).ToList();
            var examples = _vocabularyService.GetExamplesForVocabIds(vocabIds);
            var examplesByVocab = examples.ToLookup(e => e.VocabId);

            var dtos = items.Select(v => MapVocabulary(v, examplesByVocab[v.VocabId])).ToList();
            var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)normalizedPageSize));

            return Ok(new AdminVocabularyListApiResponse
            {
                Succeeded = true,
                Items = dtos,
                TotalCount = totalCount,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalPages = totalPages,
            });
        }

        [HttpPost("vocabulary")]
        public ActionResult<AdminVocabularyApiResponse> CreateVocabulary(
            [FromBody] AdminCreateVocabularyRequest? request)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.Word))
                return BadRequest(Fail("Word is required."));
            if (string.IsNullOrWhiteSpace(request.Level))
                return BadRequest(Fail("Level is required."));

            var vocabulary = new Vocabulary
            {
                Word = request.Word.Trim(),
                Ipa = request.Ipa?.Trim(),
                AudioUrl = request.AudioUrl?.Trim(),
                Level = request.Level.Trim().ToUpperInvariant(),
                MeaningVi = request.MeaningVi?.Trim(),
                TopicId = request.TopicId,
            };

            var result = _vocabularyService.CreateVocabulary(vocabulary);
            if (!result.Succeeded)
                return BadRequest(Fail(result.ErrorMessage ?? "Vocabulary could not be created."));

            return Ok(new AdminVocabularyApiResponse
            {
                Succeeded = true,
                Message = "Vocabulary created successfully.",
                Vocabulary = MapVocabulary(vocabulary, Enumerable.Empty<Example>()),
            });
        }

        [HttpPut("vocabulary/{id:long}")]
        public ActionResult<AdminApiResponse> UpdateVocabulary(
            long id,
            [FromBody] AdminUpdateVocabularyRequest? request)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.Word))
                return BadRequest(Fail("Word is required."));
            if (string.IsNullOrWhiteSpace(request.Level))
                return BadRequest(Fail("Level is required."));

            var updated = new Vocabulary
            {
                VocabId = id,
                Word = request.Word.Trim(),
                Ipa = request.Ipa?.Trim(),
                AudioUrl = request.AudioUrl?.Trim(),
                Level = request.Level.Trim().ToUpperInvariant(),
                MeaningVi = request.MeaningVi?.Trim(),
                TopicId = request.TopicId,
            };

            var result = _vocabularyService.UpdateVocabulary(updated);
            if (!result.Succeeded)
                return BadRequest(Fail(result.ErrorMessage ?? "Vocabulary could not be updated."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "Vocabulary updated successfully." });
        }

        [HttpDelete("vocabulary/{id:long}")]
        public ActionResult<AdminApiResponse> DeleteVocabulary(long id)
        {
            var deleted = _vocabularyService.DeleteVocabulary(id);
            if (!deleted)
                return NotFound(Fail("Vocabulary not found."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "Vocabulary deleted successfully." });
        }

        // ── Examples ──────────────────────────────────────────────────────────

        [HttpPost("vocabulary/{vocabId:long}/examples")]
        public ActionResult<AdminExampleApiResponse> CreateExample(
            long vocabId,
            [FromBody] AdminCreateExampleRequest? request)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.ExampleEn))
                return BadRequest(Fail("English example is required."));
            if (string.IsNullOrWhiteSpace(request.ExampleVi))
                return BadRequest(Fail("Vietnamese translation is required."));

            var example = new Example
            {
                VocabId = vocabId,
                ExampleEn = request.ExampleEn.Trim(),
                ExampleVi = request.ExampleVi.Trim(),
                AudioUrl = request.AudioUrl?.Trim(),
            };

            var created = _vocabularyService.CreateExample(example);
            if (!created)
                return BadRequest(Fail("Example could not be created. Vocabulary may not exist."));

            return Ok(new AdminExampleApiResponse
            {
                Succeeded = true,
                Message = "Example created successfully.",
                Example = MapExample(example),
            });
        }

        [HttpPut("examples/{id:long}")]
        public ActionResult<AdminApiResponse> UpdateExample(
            long id,
            [FromBody] AdminUpdateExampleRequest? request)
        {
            if (request is null)
                return BadRequest(Fail("Request body is required."));

            if (string.IsNullOrWhiteSpace(request.ExampleEn))
                return BadRequest(Fail("English example is required."));
            if (string.IsNullOrWhiteSpace(request.ExampleVi))
                return BadRequest(Fail("Vietnamese translation is required."));

            var existing = _vocabularyService.GetExampleById(id);
            if (existing is null)
                return NotFound(Fail("Example not found."));

            var updated = new Example
            {
                ExampleId = id,
                VocabId = existing.VocabId,
                ExampleEn = request.ExampleEn.Trim(),
                ExampleVi = request.ExampleVi.Trim(),
                AudioUrl = request.AudioUrl?.Trim(),
            };

            var success = _vocabularyService.UpdateExample(updated);
            if (!success)
                return BadRequest(Fail("Example could not be updated."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "Example updated successfully." });
        }

        [HttpDelete("examples/{id:long}")]
        public ActionResult<AdminApiResponse> DeleteExample(long id)
        {
            var deleted = _vocabularyService.DeleteExample(id);
            if (!deleted)
                return NotFound(Fail("Example not found."));

            return Ok(new AdminApiResponse { Succeeded = true, Message = "Example deleted successfully." });
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static AdminApiResponse Fail(string message) =>
            new() { Succeeded = false, Message = message };

        private static AdminVocabularyResponse MapVocabulary(Vocabulary v, IEnumerable<Example> examples) => new()
        {
            VocabId = v.VocabId,
            Word = v.Word ?? string.Empty,
            Ipa = string.IsNullOrWhiteSpace(v.Ipa) ? null : v.Ipa,
            AudioUrl = string.IsNullOrWhiteSpace(v.AudioUrl) ? null : v.AudioUrl,
            Level = v.Level,
            MeaningVi = string.IsNullOrWhiteSpace(v.MeaningVi) ? null : v.MeaningVi,
            TopicId = v.TopicId,
            TopicName = v.Topic?.Name,
            Examples = examples.Select(MapExample).ToList(),
        };

        private static AdminExampleResponse MapExample(Example e) => new()
        {
            ExampleId = e.ExampleId,
            VocabId = e.VocabId,
            ExampleEn = e.ExampleEn ?? string.Empty,
            ExampleVi = e.ExampleVi ?? string.Empty,
            AudioUrl = string.IsNullOrWhiteSpace(e.AudioUrl) ? null : e.AudioUrl,
        };
    }
}
