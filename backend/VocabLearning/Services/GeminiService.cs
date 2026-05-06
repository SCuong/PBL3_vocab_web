using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Mscc.GenerativeAI;

namespace VocabLearning.Services
{
    public class GeminiService : IAIService
    {
        private readonly string _apiKey;
        private readonly GoogleAI _googleAI;

        public GeminiService(IConfiguration configuration)
        {
            _apiKey = configuration["Gemini:ApiKey"] ?? string.Empty;
            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new ArgumentNullException(nameof(_apiKey), "Gemini API Key is not configured.");
            }
            _googleAI = new GoogleAI(apiKey: _apiKey);
        }

        public async Task<string> ExplainVocabularyAsync(string word, string? context = null)
        {
            try
            {
                var model = _googleAI.GenerativeModel(model: "gemini-flash-latest");
                
                string prompt = $@"
Bạn là một giáo viên tiếng Anh tận tâm. Hãy giải thích từ vựng '{word}' bằng tiếng Việt một cách dễ hiểu.
{(string.IsNullOrWhiteSpace(context) ? "" : $"Ngữ cảnh sử dụng của từ này có thể liên quan đến: {context}. ")}
Vui lòng định dạng phản hồi bằng HTML cơ bản (chỉ dùng <b>, <i>, <ul>, <li>, <br>) với cấu trúc sau:
1. <b>Nghĩa chính:</b> (Giải nghĩa)
2. <b>Sắc thái sử dụng:</b> (Cách dùng trong ngữ cảnh nào, trang trọng hay thân mật)
3. <b>Ví dụ:</b> 
   <ul>
     <li>(Ví dụ tiếng Anh 1) - <i>(Nghĩa tiếng Việt 1)</i></li>
     <li>(Ví dụ tiếng Anh 2) - <i>(Nghĩa tiếng Việt 2)</i></li>
   </ul>
4. <b>Mẹo ghi nhớ:</b> (Một cách nhớ vui hoặc dễ nhớ)
";
                
                var response = await model.GenerateContent(prompt);
                return response.Text ?? "Không thể lấy được phản hồi từ AI.";
            }
            catch (Exception ex)
            {
                // In production, you would log this exception
                return $"<div class='alert alert-danger'>Lỗi khi kết nối với AI: {ex.Message}</div>";
            }
        }
    }
}
