using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;

namespace VocabLearning.Controllers
{
    [Route("api/AI")]
    [ApiController]
    public class AIController : Controller
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

        /// <summary>
        /// Connectivity diagnostic — call GET /api/AI/Test to check if backend can reach Gemini.
        /// Returns JSON: { reachable, httpStatus, bodyPreview } or { reachable=false, errorType, message }.
        /// </summary>
        [HttpGet("Test")]
        public async Task<IActionResult> Test()
        {
            const string testUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=test_key_connectivity_check";
            _logger.LogInformation("Gemini connectivity test starting. URL={Url}", testUrl);

            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            try
            {
                var response = await client.GetAsync(testUrl);
                var body = await response.Content.ReadAsStringAsync();
                var preview = body.Length > 300 ? body[..300] + "..." : body;
                _logger.LogInformation("Gemini connectivity test OK. Status={Status}", response.StatusCode);
                return Ok(new
                {
                    reachable = true,
                    httpStatus = (int)response.StatusCode,
                    bodyPreview = preview
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini connectivity test FAILED. Type={Type}, Message={Msg}",
                    ex.GetType().Name, ex.Message);
                return Ok(new
                {
                    reachable = false,
                    errorType = ex.GetType().Name,
                    message = ex.Message,
                    innerMessage = ex.InnerException?.Message
                });
            }
        }
    }
}
