using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;

namespace VocabLearning.Controllers
{
    [Route("api/AI")]
    [ApiController]
    public class AIController : Controller
    {
        private readonly IAIService _aiService;

        public AIController(IAIService aiService)
        {
            _aiService = aiService;
        }

        [HttpPost("Explain")]
        [IgnoreAntiforgeryToken] // Disable antiforgery for API call from React
        public async Task<IActionResult> Explain([FromForm] string word, [FromForm] string? context)
        {
            if (string.IsNullOrWhiteSpace(word))
            {
                return BadRequest("Từ vựng không được để trống.");
            }

            var explanation = await _aiService.ExplainVocabularyAsync(word, context);
            return Content(explanation, "text/html");
        }
    }
}
