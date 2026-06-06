using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;
using VocabLearning.ViewModels.AI;

namespace VocabLearning.Controllers
{
    [Route("api/AI")]
    [ApiController]
    public class AIController : ControllerBase
    {
        private readonly IAIService _aiService;
        private readonly ILogger<AIController> _logger;

        public AIController(IAIService aiService, ILogger<AIController> logger)
        {
            _aiService = aiService;
            _logger = logger;
        }

        [HttpPost("Explain")]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> Explain([FromForm] string word, [FromForm] string? context)
        {
            if (string.IsNullOrWhiteSpace(word))
                return BadRequest(new { message = "Từ vựng không được để trống." });

            _logger.LogInformation("AI Explain request: word={Word}", word);
            try
            {
                var explanation = await _aiService.ExplainVocabularyAsync(word, context);
                _logger.LogInformation("AI Explain success: word={Word}, fallback={Fallback}",
                    word, explanation.IsFallback);
                return Ok(explanation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Explain failed: word={Word}", word);
                return Ok(CreateFallback(word, context));
            }
        }

        private static VocabularyExplanationViewModel CreateFallback(string word, string? context)
        {
            var normalizedWord = word.Trim();
            var meaning = string.IsNullOrWhiteSpace(context)
                ? "ngữ cảnh đang học"
                : context.Trim();

            return new VocabularyExplanationViewModel
            {
                Summary = $"{normalizedWord} là từ vựng tiếng Anh liên quan đến “{meaning}”.",
                QuickUsage = "Hãy xem nghĩa và ví dụ hiện có, sau đó thử đặt một câu ngắn với từ này.",
                Explanation = $"{normalizedWord}: {meaning}",
                IsFallback = true
            };
        }
    }
}
