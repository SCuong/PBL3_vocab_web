using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Services
{
    public class LearningService
    {
        private const int BatchSize = 10;

        private readonly AppDbContext _context;

        public LearningService(AppDbContext context)
        {
            _context = context;
        }

        public LearningDashboardViewModel GetDashboard(long userId, long? selectedParentTopicId = null)
        {
            var now = DateTime.Now;
            var topics = _context.Topics
                .OrderBy(topic => topic.TopicId)
                .ToList();

            var vocabularies = _context.Vocabularies
                .Where(vocabulary => vocabulary.TopicId.HasValue)
                .OrderBy(vocabulary => vocabulary.Word)
                .ToList();

            var learnedVocabularyIds = _context.UserVocabularies
                .Where(item => item.UserId == userId)
                .Select(item => item.VocabId)
                .ToHashSet();

            var dueVocabularyIds = _context.Progresses
                .Where(item =>
                    item.UserId == userId
                    && item.NextReviewDate.HasValue
                    && item.NextReviewDate.Value <= now)
                .Select(item => item.VocabId)
                .ToHashSet();

            var parentTopics = topics
                .Where(topic => !topic.ParentTopicId.HasValue)
                .OrderBy(topic => topic.TopicId)
                .ToList();

            var selectedParentTopic = parentTopics
                .FirstOrDefault(topic => topic.TopicId == selectedParentTopicId)
                ?? parentTopics.FirstOrDefault();

            var model = new LearningDashboardViewModel
            {
                SelectedParentTopicId = selectedParentTopic?.TopicId,
                SelectedParentTopicName = selectedParentTopic?.Name ?? string.Empty,
                SelectedParentDescription = selectedParentTopic?.Description ?? string.Empty
            };

            foreach (var parentTopic in parentTopics)
            {
                var childTopics = topics
                    .Where(topic => topic.ParentTopicId == parentTopic.TopicId)
                    .OrderBy(topic => topic.TopicId)
                    .ToList();

                if (!childTopics.Any())
                {
                    childTopics.Add(parentTopic);
                }

                var topicIds = childTopics.Select(topic => topic.TopicId).ToHashSet();
                var topicVocabularies = vocabularies
                    .Where(vocabulary => vocabulary.TopicId.HasValue && topicIds.Contains(vocabulary.TopicId.Value))
                    .ToList();

                var learnedWords = topicVocabularies.Count(vocabulary => learnedVocabularyIds.Contains(vocabulary.VocabId));
                var totalWords = topicVocabularies.Count;

                model.ParentTopics.Add(new LearningParentTopicViewModel
                {
                    TopicId = parentTopic.TopicId,
                    Name = parentTopic.Name,
                    ChildTopicCount = childTopics.Count,
                    LearnedPercent = CalculatePercent(learnedWords, totalWords),
                    IsSelected = selectedParentTopic?.TopicId == parentTopic.TopicId
                });
            }

            if (selectedParentTopic == null)
            {
                return model;
            }

            var selectedChildTopics = topics
                .Where(topic => topic.ParentTopicId == selectedParentTopic.TopicId)
                .OrderBy(topic => topic.TopicId)
                .ToList();

            if (!selectedChildTopics.Any())
            {
                selectedChildTopics.Add(selectedParentTopic);
            }

            model.SelectedParentChildTopicCount = selectedChildTopics.Count;

            var selectedChildTopicIds = selectedChildTopics.Select(topic => topic.TopicId).ToHashSet();
            var selectedParentVocabularies = vocabularies
                .Where(vocabulary => vocabulary.TopicId.HasValue && selectedChildTopicIds.Contains(vocabulary.TopicId.Value))
                .ToList();

            model.SelectedParentLearnedPercent = CalculatePercent(
                selectedParentVocabularies.Count(vocabulary => learnedVocabularyIds.Contains(vocabulary.VocabId)),
                selectedParentVocabularies.Count);

            foreach (var childTopic in selectedChildTopics)
            {
                var topicVocabularies = vocabularies
                    .Where(vocabulary => vocabulary.TopicId == childTopic.TopicId)
                    .ToList();

                var totalWords = topicVocabularies.Count;
                var learnedWords = topicVocabularies.Count(vocabulary => learnedVocabularyIds.Contains(vocabulary.VocabId));
                var dueReviewCount = topicVocabularies.Count(vocabulary => dueVocabularyIds.Contains(vocabulary.VocabId));

                model.ChildTopics.Add(new LearningChildTopicViewModel
                {
                    TopicId = childTopic.TopicId,
                    Name = childTopic.Name,
                    Description = childTopic.Description,
                    TotalWords = totalWords,
                    LearnedWords = learnedWords,
                    RemainingWords = Math.Max(0, totalWords - learnedWords),
                    DueReviewCount = dueReviewCount,
                    ProgressPercent = CalculatePercent(learnedWords, totalWords)
                });
            }

            return model;
        }

        public LearningStudyViewModel? GetStudySession(long userId, long topicId, string? batchVocabularyIds, int index)
        {
            var topic = _context.Topics.FirstOrDefault(item => item.TopicId == topicId);
            if (topic == null)
            {
                return null;
            }

            var vocabularyIds = ParseVocabularyIds(batchVocabularyIds);
            if (!vocabularyIds.Any())
            {
                var selection = GetNextBatchSelection(userId, topicId);
                vocabularyIds = selection.VocabularyIds;
            }

            if (!vocabularyIds.Any())
            {
                return null;
            }

            var batchWords = GetOrderedTopicVocabularyBatch(topicId, vocabularyIds);
            if (!batchWords.Any())
            {
                return null;
            }

            if (index < 0)
            {
                index = 0;
            }

            if (index >= batchWords.Count)
            {
                index = batchWords.Count - 1;
            }

            var currentWord = batchWords[index];

            return new LearningStudyViewModel
            {
                TopicId = topic.TopicId,
                ParentTopicId = topic.ParentTopicId,
                TopicName = topic.Name,
                TopicDescription = topic.Description,
                SessionMode = ResolveSessionMode(userId, vocabularyIds),
                BatchVocabularyIds = string.Join(",", vocabularyIds),
                CurrentIndex = index,
                TotalWords = batchWords.Count,
                CurrentWord = MapStudyWord(currentWord)
            };
        }

        public LearningMinitestViewModel? GetMinitest(long userId, long topicId, string batchVocabularyIds)
        {
            var topic = _context.Topics.FirstOrDefault(item => item.TopicId == topicId);
            if (topic == null)
            {
                return null;
            }

            var vocabularyIds = ParseVocabularyIds(batchVocabularyIds);
            if (!vocabularyIds.Any())
            {
                return null;
            }

            var batchWords = GetOrderedTopicVocabularyBatch(topicId, vocabularyIds);
            if (!batchWords.Any())
            {
                return null;
            }

            var topicMeanings = _context.Vocabularies
                .Where(vocabulary =>
                    vocabulary.TopicId == topicId
                    && !string.IsNullOrWhiteSpace(vocabulary.MeaningVi))
                .Select(vocabulary => new MeaningOption
                {
                    VocabId = vocabulary.VocabId,
                    Meaning = vocabulary.MeaningVi ?? string.Empty
                })
                .ToList();

            var globalMeanings = _context.Vocabularies
                .Where(vocabulary => !string.IsNullOrWhiteSpace(vocabulary.MeaningVi))
                .Select(vocabulary => new MeaningOption
                {
                    VocabId = vocabulary.VocabId,
                    Meaning = vocabulary.MeaningVi ?? string.Empty
                })
                .ToList();

            var random = new Random(CreateRandomSeed(topicId, vocabularyIds));
            var model = new LearningMinitestViewModel
            {
                TopicId = topic.TopicId,
                ParentTopicId = topic.ParentTopicId,
                TopicName = topic.Name,
                BatchVocabularyIds = string.Join(",", vocabularyIds),
                SessionMode = ResolveSessionMode(userId, vocabularyIds)
            };

            foreach (var vocabulary in batchWords)
            {
                model.Questions.Add(new LearningMinitestQuestionViewModel
                {
                    VocabId = vocabulary.VocabId,
                    Word = vocabulary.Word ?? string.Empty,
                    Options = BuildQuestionOptions(vocabulary, topicMeanings, globalMeanings, random)
                });
            }

            return model;
        }

        public (bool Succeeded, string? ErrorMessage, LearningMinitestResultViewModel? Result) SubmitMinitest(long userId, LearningMinitestViewModel model)
        {
            var userExists = _context.Users.Any(user =>
                user.UserId == userId
                && user.Status.ToUpper() == UserStatuses.Active);

            if (!userExists)
            {
                return (false, "Your session is no longer valid. Please sign in again.", null);
            }

            var topic = _context.Topics.FirstOrDefault(item => item.TopicId == model.TopicId);
            if (topic == null)
            {
                return (false, "The selected topic was not found.", null);
            }

            var vocabularyIds = ParseVocabularyIds(model.BatchVocabularyIds);
            var vocabularies = _context.Vocabularies
                .Where(vocabulary => vocabularyIds.Contains(vocabulary.VocabId))
                .ToDictionary(vocabulary => vocabulary.VocabId);

            var result = new LearningMinitestResultViewModel
            {
                TopicId = topic.TopicId,
                ParentTopicId = topic.ParentTopicId,
                TopicName = topic.Name
            };

            try
            {
                foreach (var vocabularyId in vocabularyIds)
                {
                    if (!vocabularies.TryGetValue(vocabularyId, out var vocabulary))
                    {
                        continue;
                    }

                    var question = model.Questions.FirstOrDefault(item => item.VocabId == vocabularyId);
                    var selectedAnswer = question?.SelectedAnswer?.Trim() ?? string.Empty;
                    var correctAnswer = NormalizeMeaning(vocabulary.MeaningVi);
                    var isCorrect = !string.IsNullOrWhiteSpace(selectedAnswer)
                        && string.Equals(selectedAnswer, correctAnswer, StringComparison.OrdinalIgnoreCase);

                    var saveResult = SaveAnswerResult(userId, vocabularyId, isCorrect);

                    result.Questions.Add(new LearningMinitestQuestionResultViewModel
                    {
                        Word = vocabulary.Word ?? string.Empty,
                        SelectedAnswer = string.IsNullOrWhiteSpace(selectedAnswer) ? "No answer" : selectedAnswer,
                        CorrectAnswer = correctAnswer,
                        IsCorrect = isCorrect,
                        NextReviewDate = saveResult.NextReviewDate
                    });
                }

                result.Score = result.Questions.Count(item => item.IsCorrect);
                result.TotalQuestions = result.Questions.Count;
                result.HasMoreWords = GetNextBatchSelection(userId, model.TopicId).VocabularyIds.Any();

                return (true, null, result);
            }
            catch (DbUpdateException exception)
            {
                return (false, exception.InnerException?.Message ?? exception.Message, null);
            }
        }

        public long? GetParentTopicId(long topicId)
        {
            return _context.Topics
                .Where(topic => topic.TopicId == topicId)
                .Select(topic => topic.ParentTopicId)
                .FirstOrDefault();
        }

        private BatchSelection GetNextBatchSelection(long userId, long topicId)
        {
            var now = DateTime.Now;
            var topicVocabularyIds = _context.Vocabularies
                .Where(vocabulary => vocabulary.TopicId == topicId)
                .OrderBy(vocabulary => vocabulary.Word)
                .Select(vocabulary => vocabulary.VocabId)
                .ToList();

            var learnedVocabularyIds = _context.UserVocabularies
                .Where(item => item.UserId == userId && topicVocabularyIds.Contains(item.VocabId))
                .Select(item => item.VocabId)
                .ToHashSet();

            var newVocabularyIds = topicVocabularyIds
                .Where(vocabularyId => !learnedVocabularyIds.Contains(vocabularyId))
                .Take(BatchSize)
                .ToList();

            if (newVocabularyIds.Any())
            {
                return new BatchSelection(newVocabularyIds, LearningActivityTypes.Learn);
            }

            var dueVocabularyIds = _context.Progresses
                .Where(item =>
                    item.UserId == userId
                    && topicVocabularyIds.Contains(item.VocabId)
                    && item.NextReviewDate.HasValue
                    && item.NextReviewDate.Value <= now)
                .OrderBy(item => item.NextReviewDate)
                .ThenBy(item => item.VocabId)
                .Select(item => item.VocabId)
                .Take(BatchSize)
                .ToList();

            if (dueVocabularyIds.Any())
            {
                return new BatchSelection(dueVocabularyIds, LearningActivityTypes.Review);
            }

            return new BatchSelection(new List<long>(), string.Empty);
        }

        private List<Vocabulary> GetOrderedTopicVocabularyBatch(long topicId, List<long> vocabularyIds)
        {
            var batchWords = _context.Vocabularies
                .Include(vocabulary => vocabulary.Examples)
                .Where(vocabulary => vocabulary.TopicId == topicId && vocabularyIds.Contains(vocabulary.VocabId))
                .ToList();

            return vocabularyIds
                .Select(vocabularyId => batchWords.FirstOrDefault(vocabulary => vocabulary.VocabId == vocabularyId))
                .Where(vocabulary => vocabulary != null)
                .Cast<Vocabulary>()
                .ToList();
        }

        private LearningStudyWordViewModel MapStudyWord(Vocabulary vocabulary)
        {
            return new LearningStudyWordViewModel
            {
                VocabId = vocabulary.VocabId,
                Word = vocabulary.Word ?? string.Empty,
                Ipa = vocabulary.Ipa ?? string.Empty,
                AudioUrl = NormalizeAudioUrl(vocabulary.AudioUrl),
                Level = vocabulary.Level ?? string.Empty,
                MeaningVi = vocabulary.MeaningVi ?? string.Empty,
                TopicName = vocabulary.Topic?.Name ?? string.Empty,
                Examples = vocabulary.Examples
                    .OrderBy(example => example.ExampleId)
                    .Select(example => new LearningStudyExampleViewModel
                    {
                        ExampleEn = example.ExampleEn,
                        ExampleVi = example.ExampleVi,
                        AudioUrl = NormalizeAudioUrl(example.AudioUrl)
                    })
                    .ToList()
            };
        }

        private string ResolveSessionMode(long userId, List<long> vocabularyIds)
        {
            var learnedVocabularyIds = _context.UserVocabularies
                .Where(item => item.UserId == userId && vocabularyIds.Contains(item.VocabId))
                .Select(item => item.VocabId)
                .ToHashSet();

            return vocabularyIds.Any(vocabularyId => !learnedVocabularyIds.Contains(vocabularyId))
                ? LearningActivityTypes.Learn
                : LearningActivityTypes.Review;
        }

        private List<string> BuildQuestionOptions(
            Vocabulary vocabulary,
            List<MeaningOption> topicMeanings,
            List<MeaningOption> globalMeanings,
            Random random)
        {
            var options = new List<string>();
            var correctAnswer = NormalizeMeaning(vocabulary.MeaningVi);

            if (!string.IsNullOrWhiteSpace(correctAnswer))
            {
                options.Add(correctAnswer);
            }

            AddOptions(
                options,
                topicMeanings
                    .Where(item => item.VocabId != vocabulary.VocabId)
                    .Select(item => item.Meaning),
                random);

            AddOptions(
                options,
                globalMeanings
                    .Where(item => item.VocabId != vocabulary.VocabId)
                    .Select(item => item.Meaning),
                random);

            var distinctOptions = options
                .Select(NormalizeMeaning)
                .Where(option => !string.IsNullOrWhiteSpace(option))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var wrongOptions = distinctOptions
                .Where(option => !string.Equals(option, correctAnswer, StringComparison.OrdinalIgnoreCase))
                .OrderBy(_ => random.Next())
                .Take(3)
                .ToList();

            var finalOptions = new List<string>();

            if (!string.IsNullOrWhiteSpace(correctAnswer))
            {
                finalOptions.Add(correctAnswer);
            }

            finalOptions.AddRange(wrongOptions);

            return finalOptions
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(_ => random.Next())
                .ToList();
        }

        private static void AddOptions(List<string> options, IEnumerable<string> candidates, Random random)
        {
            var shuffledCandidates = candidates
                .Select(NormalizeMeaning)
                .Where(candidate => !string.IsNullOrWhiteSpace(candidate))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(_ => random.Next())
                .ToList();

            foreach (var candidate in shuffledCandidates)
            {
                if (options.Any(item => string.Equals(item, candidate, StringComparison.OrdinalIgnoreCase)))
                {
                    continue;
                }

                options.Add(candidate);

                if (options.Count >= 4)
                {
                    break;
                }
            }
        }

        private LearningAnswerResult SaveAnswerResult(long userId, long vocabId, bool isCorrect)
        {
            var now = DateTime.Now;
            var userVocabulary = _context.UserVocabularies
                .FirstOrDefault(item => item.UserId == userId && item.VocabId == vocabId);

            var progress = _context.Progresses
                .FirstOrDefault(item => item.UserId == userId && item.VocabId == vocabId);

            var activityType = userVocabulary == null
                ? LearningActivityTypes.Learn
                : LearningActivityTypes.Review;

            var reviewPlan = BuildReviewPlan(progress, isCorrect, now);

            if (userVocabulary == null)
            {
                userVocabulary = new UserVocabulary
                {
                    UserId = userId,
                    VocabId = vocabId,
                    Status = reviewPlan.Status,
                    Note = string.Empty,
                    FirstLearnedDate = now
                };

                _context.UserVocabularies.Add(userVocabulary);
                _context.SaveChanges();
            }
            else
            {
                userVocabulary.Status = reviewPlan.Status;

                if (!userVocabulary.FirstLearnedDate.HasValue)
                {
                    userVocabulary.FirstLearnedDate = now;
                }
            }

            if (progress == null)
            {
                progress = new Progress
                {
                    UserId = userId,
                    VocabId = vocabId
                };

                _context.Progresses.Add(progress);
            }

            progress.LastReviewDate = now;
            progress.NextReviewDate = reviewPlan.NextReviewDate;

            _context.LearningLogs.Add(new LearningLog
            {
                UserId = userId,
                Date = now,
                ActivityType = activityType,
                Score = isCorrect ? 1 : 0
            });

            _context.SaveChanges();

            return new LearningAnswerResult(reviewPlan.NextReviewDate);
        }

        private static ReviewPlan BuildReviewPlan(Progress? progress, bool isCorrect, DateTime now)
        {
            if (!isCorrect)
            {
                var incorrectInterval = GetIncorrectInterval(progress);
                return new ReviewPlan(now.Add(incorrectInterval), UserVocabularyStatuses.Learning);
            }

            var previousInterval = GetPreviousInterval(progress);

            if (previousInterval.TotalDays < 1)
            {
                return new ReviewPlan(now.AddDays(1), UserVocabularyStatuses.Learning);
            }

            if (previousInterval.TotalDays < 3)
            {
                return new ReviewPlan(now.AddDays(3), UserVocabularyStatuses.Learning);
            }

            if (previousInterval.TotalDays < 7)
            {
                return new ReviewPlan(now.AddDays(7), UserVocabularyStatuses.Learning);
            }

            if (previousInterval.TotalDays < 14)
            {
                return new ReviewPlan(now.AddDays(14), UserVocabularyStatuses.Mastered);
            }

            return new ReviewPlan(now.AddDays(30), UserVocabularyStatuses.Mastered);
        }

        private static TimeSpan GetPreviousInterval(Progress? progress)
        {
            if (progress?.LastReviewDate == null || progress.NextReviewDate == null)
            {
                return TimeSpan.Zero;
            }

            var interval = progress.NextReviewDate.Value - progress.LastReviewDate.Value;
            return interval < TimeSpan.Zero ? TimeSpan.Zero : interval;
        }

        private static TimeSpan GetIncorrectInterval(Progress? progress)
        {
            var previousInterval = GetPreviousInterval(progress);

            if (previousInterval.TotalDays >= 14)
            {
                return TimeSpan.FromDays(1);
            }

            if (previousInterval.TotalDays >= 7)
            {
                return TimeSpan.FromHours(12);
            }

            if (previousInterval.TotalDays >= 1)
            {
                return TimeSpan.FromHours(4);
            }

            return TimeSpan.FromHours(1);
        }

        private static int CalculatePercent(int learnedWords, int totalWords)
        {
            if (totalWords <= 0)
            {
                return 0;
            }

            return (int)Math.Round(learnedWords * 100d / totalWords);
        }

        private static int CreateRandomSeed(long topicId, IEnumerable<long> vocabularyIds)
        {
            unchecked
            {
                var seed = (int)topicId;

                foreach (var vocabularyId in vocabularyIds)
                {
                    seed = (seed * 397) ^ vocabularyId.GetHashCode();
                }

                return seed;
            }
        }

        private static List<long> ParseVocabularyIds(string? batchVocabularyIds)
        {
            if (string.IsNullOrWhiteSpace(batchVocabularyIds))
            {
                return new List<long>();
            }

            return batchVocabularyIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => long.TryParse(value, out var vocabularyId) ? vocabularyId : 0)
                .Where(vocabularyId => vocabularyId > 0)
                .Distinct()
                .ToList();
        }

        private static string NormalizeMeaning(string? value)
        {
            return value?.Trim() ?? string.Empty;
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

            return normalized;
        }

        private sealed class BatchSelection
        {
            public BatchSelection(List<long> vocabularyIds, string sessionMode)
            {
                VocabularyIds = vocabularyIds;
                SessionMode = sessionMode;
            }

            public List<long> VocabularyIds { get; }

            public string SessionMode { get; }
        }

        private sealed class MeaningOption
        {
            public long VocabId { get; set; }

            public string Meaning { get; set; } = string.Empty;
        }

        private sealed class LearningAnswerResult
        {
            public LearningAnswerResult(DateTime nextReviewDate)
            {
                NextReviewDate = nextReviewDate;
            }

            public DateTime NextReviewDate { get; }
        }

        private sealed class ReviewPlan
        {
            public ReviewPlan(DateTime nextReviewDate, string status)
            {
                NextReviewDate = nextReviewDate;
                Status = status;
            }

            public DateTime NextReviewDate { get; }

            public string Status { get; }
        }
    }
}
