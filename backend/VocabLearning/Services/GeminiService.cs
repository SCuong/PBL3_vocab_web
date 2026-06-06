using System.Diagnostics;
using System.Text;
using System.Text.Json;
using VocabLearning.ViewModels.AI;

namespace VocabLearning.Services
{
    public class GeminiService : IAIService
    {
        private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
        private const string Model = "gemini-2.5-flash";

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly string _apiKey;
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;

            _logger.LogInformation("GeminiService initialized. KeyConfigured={Configured}",
                !string.IsNullOrWhiteSpace(_apiKey));
        }

        public async Task<VocabularyExplanationViewModel> ExplainVocabularyAsync(
            string word,
            string? context = null)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                _logger.LogWarning("Gemini API key is not configured. Returning learner fallback.");
                return CreateFallback(word, context);
            }

            var endpoint = $"{BaseUrl}/{Model}:generateContent?key={_apiKey}";
            var prompt = BuildPrompt(word, context);
            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    temperature = 0.3
                }
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json");

            var stopwatch = Stopwatch.StartNew();
            _logger.LogInformation("Gemini vocabulary explanation request starting. Word={Word}", word);

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                using var response = await _httpClient.PostAsync(endpoint, content, cts.Token);
                var responseBody = await response.Content.ReadAsStringAsync();
                stopwatch.Stop();

                _logger.LogInformation(
                    "Gemini response received in {Elapsed}ms. Status={Status}",
                    stopwatch.ElapsedMilliseconds,
                    response.StatusCode);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API returned status {Status}. Word={Word}",
                        response.StatusCode, word);
                    return CreateFallback(word, context);
                }

                var explanation = ExtractExplanation(responseBody);
                if (explanation is null)
                {
                    _logger.LogWarning("Gemini response could not be parsed as structured learner content. Word={Word}",
                        word);
                    return CreateFallback(word, context);
                }

                return explanation;
            }
            catch (OperationCanceledException)
            {
                stopwatch.Stop();
                _logger.LogError("Gemini API timed out after {Elapsed}ms. Word={Word}",
                    stopwatch.ElapsedMilliseconds, word);
                return CreateFallback(word, context);
            }
            catch (HttpRequestException ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Gemini API network error after {Elapsed}ms. Word={Word}",
                    stopwatch.ElapsedMilliseconds, word);
                return CreateFallback(word, context);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Gemini API unexpected error after {Elapsed}ms. Word={Word}",
                    stopwatch.ElapsedMilliseconds, word);
                return CreateFallback(word, context);
            }
        }

        private static string BuildPrompt(string word, string? context)
        {
            var contextInstruction = string.IsNullOrWhiteSpace(context)
                ? "Không có nghĩa tiếng Việt bổ sung."
                : $"Nghĩa/ngữ cảnh hiện có: {context.Trim()}";

            return $$"""
Bạn là trợ lý học từ vựng tiếng Anh cho người Việt.
Hãy tạo nội dung ngắn, thực tế, dễ quét cho từ "{{word.Trim()}}".
{{contextInstruction}}

Chỉ trả về JSON hợp lệ theo đúng cấu trúc:
{
  "summary": "Tóm tắt thân thiện, tối đa 3 câu",
  "quickUsage": "Cách dùng tự nhiên, tối đa 2 câu",
  "collocations": [
    { "phrase": "cụm từ", "meaning": "nghĩa tiếng Việt", "example": "ví dụ tiếng Anh ngắn" }
  ],
  "confusingWords": [
    { "word": "từ dễ nhầm", "difference": "phân biệt ngắn bằng tiếng Việt" }
  ],
  "commonMistakes": [
    { "wrong": "câu sai", "correct": "câu đúng", "explanation": "giải thích ngắn bằng tiếng Việt" }
  ]
}

Yêu cầu:
- Viết giải thích bằng tiếng Việt; câu ví dụ bằng tiếng Anh.
- Tập trung cách dùng tự nhiên, cụm từ phổ biến, từ dễ nhầm, lỗi người Việt hay mắc.
- Tối đa 5 collocations, 3 confusingWords, 3 commonMistakes.
- Không viết bài luận, markdown, HTML hoặc nội dung ngoài JSON.
""";
        }

        private static VocabularyExplanationViewModel? ExtractExplanation(string responseBody)
        {
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrWhiteSpace(text))
                    return null;

                var json = StripCodeFence(text);
                var explanation = JsonSerializer.Deserialize<VocabularyExplanationViewModel>(json, JsonOptions);
                if (explanation is null || string.IsNullOrWhiteSpace(explanation.Summary))
                    return null;

                explanation.Summary = explanation.Summary.Trim();
                explanation.QuickUsage = explanation.QuickUsage?.Trim() ?? string.Empty;
                explanation.Collocations = explanation.Collocations?
                    .Where(item => !string.IsNullOrWhiteSpace(item.Phrase))
                    .Take(5)
                    .ToList() ?? [];
                explanation.ConfusingWords = explanation.ConfusingWords?
                    .Where(item => !string.IsNullOrWhiteSpace(item.Word))
                    .Take(3)
                    .ToList() ?? [];
                explanation.CommonMistakes = explanation.CommonMistakes?
                    .Where(item => !string.IsNullOrWhiteSpace(item.Correct))
                    .Take(3)
                    .ToList() ?? [];
                explanation.Explanation = BuildCompatibilityExplanation(explanation);
                explanation.IsFallback = false;

                return explanation;
            }
            catch
            {
                return null;
            }
        }

        private static string StripCodeFence(string value)
        {
            var trimmed = value.Trim();
            if (!trimmed.StartsWith("```", StringComparison.Ordinal))
                return trimmed;

            var firstLineEnd = trimmed.IndexOf('\n');
            if (firstLineEnd >= 0)
                trimmed = trimmed[(firstLineEnd + 1)..];

            if (trimmed.EndsWith("```", StringComparison.Ordinal))
                trimmed = trimmed[..^3];

            return trimmed.Trim();
        }

        private static string BuildCompatibilityExplanation(VocabularyExplanationViewModel explanation)
        {
            return string.IsNullOrWhiteSpace(explanation.QuickUsage)
                ? explanation.Summary
                : $"{explanation.Summary}\n\n{explanation.QuickUsage}";
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
