using Microsoft.EntityFrameworkCore;
using VocabLearning.Data;
using VocabLearning.Models;

namespace VocabLearning.Services
{
    public class VocabularyService
    {
        private readonly AppDbContext _context;

        public VocabularyService(AppDbContext context)
        {
            _context = context;
        }

        public List<Vocabulary> GetVocabularyList()
        {
            return _context.Vocabularies
                .Include(vocabulary => vocabulary.Topic)
                .OrderBy(vocabulary => vocabulary.Word)
                .ToList();
        }

        public List<Topic> GetTopics()
        {
            return _context.Topics
                .OrderBy(topic => topic.Name)
                .ToList();
        }

        public Vocabulary? GetVocabularyById(long id)
        {
            return _context.Vocabularies.FirstOrDefault(vocabulary => vocabulary.VocabId == id);
        }

        public bool VocabularyExists(long id)
        {
            return _context.Vocabularies.Any(vocabulary => vocabulary.VocabId == id);
        }

        public Vocabulary? GetVocabularyDetail(long id)
        {
            var vocabulary = _context.Vocabularies
                .Include(item => item.Topic)
                .FirstOrDefault(item => item.VocabId == id);

            if (vocabulary == null)
            {
                return null;
            }

            vocabulary.AudioUrl = NormalizeAudioUrl(vocabulary.AudioUrl);

            vocabulary.Examples = _context.Examples
                .Where(item => item.VocabId == id)
                .OrderBy(item => item.ExampleId)
                .ToList();

            foreach (var example in vocabulary.Examples)
            {
                example.AudioUrl = NormalizeAudioUrl(example.AudioUrl);
            }

            return vocabulary;
        }

        public (bool Succeeded, string? ErrorMessage) CreateVocabulary(Vocabulary vocabulary)
        {
            if (string.IsNullOrWhiteSpace(vocabulary.Word))
            {
                return (false, "Word is required.");
            }

            var normalizedLevel = NormalizeLevel(vocabulary.Level);
            if (!IsValidLevel(normalizedLevel))
            {
                return (false, "Level is invalid. Use: A1, A2, B1, B2, C1, C2.");
            }

            vocabulary.Level = normalizedLevel;

            var normalizedWord = vocabulary.Word.Trim().ToUpperInvariant();
            var wordExists = _context.Vocabularies
                .Any(item => (item.Word ?? string.Empty).Trim().ToUpper() == normalizedWord);

            if (wordExists)
            {
                return (false, "This word already exists.");
            }

            if (vocabulary.TopicId.HasValue && !_context.Topics.Any(topic => topic.TopicId == vocabulary.TopicId.Value))
            {
                return (false, "Selected topic does not exist.");
            }

            try
            {
                _context.Vocabularies.Add(vocabulary);
                _context.SaveChanges();
                return (true, null);
            }
            catch (DbUpdateException)
            {
                return (false, "Could not save vocabulary. Please check your data and try again.");
            }
        }

        public (bool Succeeded, string? ErrorMessage) UpdateVocabulary(Vocabulary updatedVocabulary)
        {
            var vocabulary = GetVocabularyById(updatedVocabulary.VocabId);

            if (vocabulary == null || string.IsNullOrWhiteSpace(updatedVocabulary.Word))
            {
                return (false, "Vocabulary was not found or word is empty.");
            }

            var normalizedWord = updatedVocabulary.Word.Trim().ToUpperInvariant();
            var duplicateWord = _context.Vocabularies.Any(item =>
                item.VocabId != updatedVocabulary.VocabId
                && (item.Word ?? string.Empty).Trim().ToUpper() == normalizedWord);

            if (duplicateWord)
            {
                return (false, "This word already exists.");
            }

            if (updatedVocabulary.TopicId.HasValue && !_context.Topics.Any(topic => topic.TopicId == updatedVocabulary.TopicId.Value))
            {
                return (false, "Selected topic does not exist.");
            }

            var normalizedLevel = NormalizeLevel(updatedVocabulary.Level);
            if (!IsValidLevel(normalizedLevel))
            {
                return (false, "Level is invalid. Use: A1, A2, B1, B2, C1, C2.");
            }

            vocabulary.Word = updatedVocabulary.Word;
            vocabulary.Ipa = updatedVocabulary.Ipa;
            vocabulary.AudioUrl = updatedVocabulary.AudioUrl;
            vocabulary.Level = normalizedLevel;
            vocabulary.MeaningVi = updatedVocabulary.MeaningVi;
            vocabulary.TopicId = updatedVocabulary.TopicId;

            try
            {
                _context.SaveChanges();
                return (true, null);
            }
            catch (DbUpdateException)
            {
                return (false, "Could not update vocabulary. Please check your data and try again.");
            }
        }

        public Example? GetExampleById(long id)
        {
            return _context.Examples.FirstOrDefault(example => example.ExampleId == id);
        }

        public bool CreateExample(Example example)
        {
            if (!VocabularyExists(example.VocabId)
                || string.IsNullOrWhiteSpace(example.ExampleEn)
                || string.IsNullOrWhiteSpace(example.ExampleVi))
            {
                return false;
            }

            _context.Examples.Add(example);
            _context.SaveChanges();
            return true;
        }

        public bool UpdateExample(Example updatedExample)
        {
            var example = GetExampleById(updatedExample.ExampleId);

            if (example == null
                || !VocabularyExists(updatedExample.VocabId)
                || string.IsNullOrWhiteSpace(updatedExample.ExampleEn)
                || string.IsNullOrWhiteSpace(updatedExample.ExampleVi))
            {
                return false;
            }

            example.ExampleEn = updatedExample.ExampleEn;
            example.ExampleVi = updatedExample.ExampleVi;
            example.AudioUrl = updatedExample.AudioUrl;

            _context.SaveChanges();
            return true;
        }

        public bool DeleteExample(long id)
        {
            var example = GetExampleById(id);

            if (example == null)
            {
                return false;
            }

            _context.Examples.Remove(example);
            _context.SaveChanges();
            return true;
        }

        public bool DeleteVocabulary(long id)
        {
            var vocabulary = GetVocabularyById(id);

            if (vocabulary == null)
            {
                return false;
            }

            try
            {
                _context.Database.ExecuteSqlRaw(
                    "DELETE FROM [exercise_result] WHERE [exercise_id] IN (SELECT [exercise_id] FROM [exercise] WHERE [vocab_id] = {0})",
                    id);

                _context.Database.ExecuteSqlRaw(
                    "DELETE FROM [exercise] WHERE [vocab_id] = {0}",
                    id);
            }
            catch
            {
            }

            var progresses = _context.Progresses.Where(progress => progress.VocabId == id).ToList();
            var userVocabularies = _context.UserVocabularies.Where(item => item.VocabId == id).ToList();
            var examples = _context.Examples.Where(example => example.VocabId == id).ToList();

            _context.Progresses.RemoveRange(progresses);
            _context.UserVocabularies.RemoveRange(userVocabularies);
            _context.Examples.RemoveRange(examples);
            _context.Vocabularies.Remove(vocabulary);

            try
            {
                _context.SaveChanges();
                return true;
            }
            catch (DbUpdateException)
            {
                return false;
            }
        }

        private static string NormalizeAudioUrl(string? value)
        {
            var normalized = value?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return string.Empty;
            }

            normalized = normalized.Replace('\\', '/');
            normalized = normalized.Replace("&amp;", "&", StringComparison.OrdinalIgnoreCase);
            normalized = normalized.Replace("andclient=", "&client=", StringComparison.OrdinalIgnoreCase);
            normalized = normalized.Replace("andtl=", "&tl=", StringComparison.OrdinalIgnoreCase);
            normalized = normalized.Replace("andq=", "&q=", StringComparison.OrdinalIgnoreCase);

            if (normalized.Contains("translate.google.com/translate_tts", StringComparison.OrdinalIgnoreCase))
            {
                normalized = normalized.Replace(
                    "translate.google.com/translate_tts",
                    "translate.googleapis.com/translate_tts",
                    StringComparison.OrdinalIgnoreCase);
            }

            var queryIndex = normalized.IndexOf('?');
            if (queryIndex < 0 || !normalized.Contains("translate_tts", StringComparison.OrdinalIgnoreCase))
            {
                return normalized;
            }

            var baseUrl = normalized[..queryIndex];
            var query = normalized[(queryIndex + 1)..];
            var parts = query.Split('&', StringSplitOptions.RemoveEmptyEntries);
            var rebuilt = new List<string>();

            foreach (var part in parts)
            {
                var equalIndex = part.IndexOf('=');
                if (equalIndex <= 0)
                {
                    rebuilt.Add(part);
                    continue;
                }

                var key = part[..equalIndex];
                var rawValue = part[(equalIndex + 1)..];

                if (string.Equals(key, "q", StringComparison.OrdinalIgnoreCase))
                {
                    var decoded = Uri.UnescapeDataString(rawValue.Replace("+", "%20", StringComparison.Ordinal));
                    rawValue = Uri.EscapeDataString(decoded);
                }

                rebuilt.Add($"{key}={rawValue}");
            }

            return $"{baseUrl}?{string.Join("&", rebuilt)}";
        }

        private static string NormalizeLevel(string? value)
        {
            return value?.Trim().ToUpperInvariant() ?? string.Empty;
        }

        private static bool IsValidLevel(string level)
        {
            return level is "A1" or "A2" or "B1" or "B2" or "C1" or "C2";
        }
    }
}
