using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace VocabLearning.Services
{
    public class GeminiService : IAIService
    {
        private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";
        private const string Model = "gemini-2.5-flash";

        private readonly string _apiKey;
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;

            if (string.IsNullOrEmpty(_apiKey))
                throw new InvalidOperationException("Gemini:ApiKey not configured. Set Gemini__ApiKey= in .env file.");

            var prefix = _apiKey.Length >= 8 ? _apiKey[..8] + "..." : "(too short — check key)";
            _logger.LogInformation("GeminiService initialized. KeyLoaded=true, Prefix={Prefix}, KeyLength={Len}",
                prefix, _apiKey.Length);

        }

        public async Task<string> ExplainVocabularyAsync(string word, string? context = null)
        {
            var maskedEndpoint = $"{BaseUrl}/{Model}:generateContent?key=***";
            var endpoint = $"{BaseUrl}/{Model}:generateContent?key={_apiKey}";

            string prompt = $@"Bạn là một giáo viên tiếng Anh tận tâm. Hãy giải thích từ vựng '{word}' bằng tiếng Việt một cách dễ hiểu.
{(string.IsNullOrWhiteSpace(context) ? "" : $"Ngữ cảnh sử dụng của từ này có thể liên quan đến: {context}. ")}
Vui lòng định dạng phản hồi bằng HTML cơ bản (chỉ dùng <b>, <i>, <ul>, <li>, <br>) với cấu trúc sau:
1. <b>Nghĩa chính:</b> (Giải nghĩa)
2. <b>Sắc thái sử dụng:</b> (Cách dùng trong ngữ cảnh nào, trang trọng hay thân mật)
3. <b>Ví dụ:</b>
   <ul>
     <li>(Ví dụ tiếng Anh 1) - <i>(Nghĩa tiếng Việt 1)</i></li>
     <li>(Ví dụ tiếng Anh 2) - <i>(Nghĩa tiếng Việt 2)</i></li>
   </ul>
4. <b>Mẹo ghi nhớ:</b> (Một cách nhớ vui hoặc dễ nhớ)";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var sw = Stopwatch.StartNew();
            _logger.LogInformation("Gemini request starting. Endpoint={Endpoint}", maskedEndpoint);

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                var response = await _httpClient.PostAsync(endpoint, content, cts.Token);
                sw.Stop();

                _logger.LogInformation("Gemini response received in {Elapsed}ms. Status={Status}",
                    sw.ElapsedMilliseconds, response.StatusCode);

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API error. Status={Status}, Body={Body}",
                        response.StatusCode, responseBody);
                    return $"<div class='alert alert-danger'>Gemini API lỗi {(int)response.StatusCode}: {ExtractErrorMessage(responseBody)}</div>";
                }

                return ExtractText(responseBody);
            }
            catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
            {
                sw.Stop();
                _logger.LogError("Gemini API: HttpClient hard timeout after {Elapsed}ms. Word={Word}",
                    sw.ElapsedMilliseconds, word);
                return "<div class='alert alert-warning'>Gemini API timeout. Kiểm tra kết nối mạng tới googleapis.com.</div>";
            }
            catch (OperationCanceledException)
            {
                sw.Stop();
                _logger.LogError("Gemini API: cancelled after {Elapsed}ms (30s CTS). Word={Word}",
                    sw.ElapsedMilliseconds, word);
                return "<div class='alert alert-warning'>Gemini API không phản hồi sau 30 giây. Kiểm tra kết nối mạng hoặc thử lại.</div>";
            }
            catch (HttpRequestException ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Gemini API: network/DNS error after {Elapsed}ms. StatusCode={Status}. Detail={Detail}",
                    sw.ElapsedMilliseconds, ex.StatusCode, ex.ToString());
                return $"<div class='alert alert-danger'>Lỗi mạng khi gọi Gemini: {ex.Message}<br><small>Có thể DNS hoặc firewall chặn googleapis.com</small></div>";
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Gemini API: unexpected error after {Elapsed}ms. Detail={Detail}",
                    sw.ElapsedMilliseconds, ex.ToString());
                return $"<div class='alert alert-danger'>Lỗi kết nối AI: {ex.Message}</div>";
            }
        }

        private static string ExtractText(string responseBody)
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
                return text ?? "Không thể lấy được phản hồi từ AI.";
            }
            catch
            {
                return $"<div class='alert alert-warning'>Không thể parse phản hồi từ Gemini.</div>";
            }
        }

        private static string ExtractErrorMessage(string responseBody)
        {
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                return doc.RootElement.GetProperty("error").GetProperty("message").GetString() ?? responseBody;
            }
            catch
            {
                return responseBody;
            }
        }

    }
}
