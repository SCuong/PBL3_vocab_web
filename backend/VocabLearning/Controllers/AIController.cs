using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;

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
                return BadRequest("Từ vựng không được để trống.");

            _logger.LogInformation("AI Explain request: word={Word}", word);
            try
            {
                var explanation = await _aiService.ExplainVocabularyAsync(word, context);
                _logger.LogInformation("AI Explain success: word={Word}", word);
                return Content(explanation, "text/html");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI Explain failed: word={Word}", word);
                return StatusCode(500, "Lỗi khi gọi AI. Vui lòng thử lại.");
            }
        }

    }
}
