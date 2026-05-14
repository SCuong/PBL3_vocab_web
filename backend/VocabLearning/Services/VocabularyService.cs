using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;

namespace VocabLearning.Services
{
    public class VocabularyService
    {
        private const int MaxVocabularyPageSize = 100;
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

        public async Task<(List<Vocabulary> Items, int TotalCount, int Page, int PageSize)> GetVocabularyPageAsync(
            int page,
            int pageSize,
            string? search,
            string? cefr,
            long? topicId,
            CancellationToken cancellationToken = default)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Clamp(pageSize, 1, MaxVocabularyPageSize);
            var normalizedSearch = search?.Trim();
            var normalizedCefr = string.IsNullOrWhiteSpace(cefr) || string.Equals(cefr, "ALL", StringComparison.OrdinalIgnoreCase)
                ? null
                : cefr.Trim().ToUpperInvariant();

            var query = _context.Vocabularies
                .AsNoTracking()
                .Include(vocabulary => vocabulary.Topic)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(normalizedSearch))
            {
                var keywordPattern = $"%{normalizedSearch}%";
                query = query.Where(vocabulary =>
                    EF.Functions.Like(vocabulary.Word ?? string.Empty, keywordPattern)
                    || EF.Functions.Like(vocabulary.MeaningVi ?? string.Empty, keywordPattern));
            }

            if (!string.IsNullOrWhiteSpace(normalizedCefr))
            {
                query = query.Where(vocabulary => vocabulary.Level == normalizedCefr);
            }

            if (topicId.HasValue)
            {
                query = query.Where(vocabulary => vocabulary.TopicId == topicId.Value);
            }

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderBy(vocabulary => vocabulary.Word)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .ToListAsync(cancellationToken);

            foreach (var item in items)
            {
                item.AudioUrl = NormalizeAudioUrl(item.AudioUrl);
            }

            return (items, totalCount, normalizedPage, normalizedPageSize);
        }

        public List<Topic> GetTopics()
        {
            return _context.Topics
                .OrderBy(topic => topic.Name)
                .ToList();
        }

        public List<Topic> GetTopicsForFilter()
        {
            return _context.Topics
                .OrderBy(topic => topic.ParentTopicId.HasValue)
                .ThenBy(topic => topic.ParentTopicId)
                .ThenBy(topic => topic.Name)
                .ToList();
        }

        public Dictionary<long, int> GetVocabularyCountsByTopic()
        {
            return _context.Vocabularies
                .Where(vocabulary => vocabulary.TopicId.HasValue)
                .GroupBy(vocabulary => vocabulary.TopicId!.Value)
                .Select(group => new { TopicId = group.Key, Count = group.Count() })
                .ToDictionary(item => item.TopicId, item => item.Count);
        }

        public List<Vocabulary> GetVocabularyByIds(IEnumerable<long> vocabularyIds)
        {
            var ids = vocabularyIds
                .Where(id => id > 0)
                .Distinct()
                .ToArray();

            if (ids.Length == 0)
            {
                return new List<Vocabulary>();
            }

            var items = _context.Vocabularies
                .AsNoTracking()
                .Include(vocabulary => vocabulary.Topic)
                .Where(vocabulary => ids.Contains(vocabulary.VocabId))
                .OrderBy(vocabulary => vocabulary.Word)
                .ToList();

            foreach (var item in items)
            {
                item.AudioUrl = NormalizeAudioUrl(item.AudioUrl);
            }

            return items;
        }

        public List<Vocabulary> GetVocabularyByTopicId(long topicId)
        {
            var items = _context.Vocabularies
                .Where(vocabulary => vocabulary.TopicId == topicId)
                .OrderBy(vocabulary => vocabulary.VocabId)
                .ToList();

            foreach (var item in items)
            {
                item.AudioUrl = NormalizeAudioUrl(item.AudioUrl);
            }

            return items;
        }

        public Example? GetFirstExampleByVocabularyId(long vocabId)
        {
            var example = _context.Examples
                .Where(example => example.VocabId == vocabId)
                .OrderBy(example => example.ExampleId)
                .FirstOrDefault();

            if (example != null)
            {
                example.AudioUrl = NormalizeAudioUrl(example.AudioUrl);
            }

            return example;
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

            var cleanWord = vocabulary.Word.Trim();

            var normalizedLevel = NormalizeLevel(vocabulary.Level);
            if (!IsValidLevel(normalizedLevel))
            {
                return (false, "Level is invalid. Use: A1, A2, B1, B2, C1, C2.");
            }

            vocabulary.Word = cleanWord;
            vocabulary.Level = normalizedLevel;

            var wordExists = _context.Vocabularies
                .Any(item => item.Word == cleanWord);

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
                ProvisionStandardExercises(vocabulary.VocabId, vocabulary.Ipa);
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

            var cleanWord = updatedVocabulary.Word.Trim();
            var duplicateWord = _context.Vocabularies.Any(item =>
                item.VocabId != updatedVocabulary.VocabId
                && item.Word == cleanWord);

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

            vocabulary.Word = cleanWord;
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

        public List<Example> GetExamplesForVocabIds(IReadOnlyList<long> vocabIds)
        {
            if (vocabIds.Count == 0)
                return new List<Example>();

            return _context.Examples
                .AsNoTracking()
                .Where(e => vocabIds.Contains(e.VocabId))
                .OrderBy(e => e.VocabId)
                .ThenBy(e => e.ExampleId)
                .ToList();
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
            ProvisionFillingExerciseIfApplicable(example.VocabId, example.ExampleEn);
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

            var exerciseIds = _context.Exercises
                .Where(exercise => exercise.VocabId == id)
                .Select(exercise => exercise.ExerciseId)
                .ToList();
            var exerciseResults = _context.ExerciseResults
                .Where(result => exerciseIds.Contains(result.ExerciseId))
                .ToList();
            var exercises = _context.Exercises.Where(exercise => exercise.VocabId == id).ToList();
            var progresses = _context.Progresses.Where(progress => progress.VocabId == id).ToList();
            var userVocabularies = _context.UserVocabularies.Where(item => item.VocabId == id).ToList();
            var examples = _context.Examples.Where(example => example.VocabId == id).ToList();

            _context.ExerciseResults.RemoveRange(exerciseResults);
            _context.Exercises.RemoveRange(exercises);
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

        private void ProvisionStandardExercises(long vocabId, string? ipa)
        {
            var existing = _context.Exercises
                .Where(e => e.VocabId == vocabId)
                .Select(e => new { e.Type, e.MatchMode })
                .ToList();

            bool Has(string type, string? mode) =>
                existing.Any(e =>
                    string.Equals(e.Type, type, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(e.MatchMode ?? string.Empty, mode ?? string.Empty, StringComparison.OrdinalIgnoreCase));

            var toAdd = new List<Exercise>();
            var now = DateTime.Now;

            if (!Has(ExerciseTypes.MatchMeaning, ExerciseMatchModes.MatchMeaning))
                toAdd.Add(new Exercise { VocabId = vocabId, Type = ExerciseTypes.MatchMeaning, MatchMode = ExerciseMatchModes.MatchMeaning, CreatedAt = now });

            if (!string.IsNullOrWhiteSpace(ipa) && !Has(ExerciseTypes.MatchMeaning, ExerciseMatchModes.MatchIpa))
                toAdd.Add(new Exercise { VocabId = vocabId, Type = ExerciseTypes.MatchMeaning, MatchMode = ExerciseMatchModes.MatchIpa, CreatedAt = now });

            if (toAdd.Count == 0) return;

            _context.Exercises.AddRange(toAdd);
            try { _context.SaveChanges(); }
            catch (DbUpdateException) { }
        }

        private void ProvisionFillingExerciseIfApplicable(long vocabId, string? exampleEn)
        {
            if (string.IsNullOrWhiteSpace(exampleEn)) return;

            var word = _context.Vocabularies
                .Where(v => v.VocabId == vocabId)
                .Select(v => v.Word)
                .FirstOrDefault();

            if (string.IsNullOrWhiteSpace(word)) return;
            if (!exampleEn.Contains(word, StringComparison.OrdinalIgnoreCase)) return;

            var alreadyExists = _context.Exercises.Any(e =>
                e.VocabId == vocabId &&
                string.Equals(e.Type, ExerciseTypes.Filling, StringComparison.OrdinalIgnoreCase));

            if (alreadyExists) return;

            _context.Exercises.Add(new Exercise
            {
                VocabId = vocabId,
                Type = ExerciseTypes.Filling,
                MatchMode = null,
                CreatedAt = DateTime.Now
            });
            try { _context.SaveChanges(); }
            catch (DbUpdateException) { }
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
