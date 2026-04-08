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
        private const string ExerciseModeMatching = "matching";
        private const string ExerciseModeFilling = "filling";

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

                var nextBatchVocabularyIds = GetNextBatchSelection(userId, childTopic.TopicId);

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
                    ProgressPercent = CalculatePercent(learnedWords, totalWords),
                    NextBatchVocabularyIds = string.Join(",", nextBatchVocabularyIds),
                    VocabularyPreview = topicVocabularies
                        .Select(vocabulary => new LearningChildTopicVocabularyPreviewViewModel
                        {
                            Word = vocabulary.Word ?? string.Empty,
                            MeaningVi = vocabulary.MeaningVi ?? string.Empty,
                            Ipa = vocabulary.Ipa ?? string.Empty
                        })
                        .ToList()
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
                vocabularyIds = GetNextBatchSelection(userId, topicId);
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

            index = Math.Clamp(index, 0, batchWords.Count - 1);

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

            var random = new Random();
            var model = new LearningMinitestViewModel
            {
                TopicId = topic.TopicId,
                ParentTopicId = topic.ParentTopicId,
                TopicName = topic.Name,
                BatchVocabularyIds = string.Empty,
                SessionMode = ResolveSessionMode(userId, vocabularyIds),
                SessionStartedAt = DateTime.Now
            };

            foreach (var vocabulary in batchWords)
            {
                model.Questions.Add(new LearningMinitestQuestionViewModel
                {
                    VocabId = vocabulary.VocabId,
                    Word = vocabulary.Word ?? string.Empty,
                    ExerciseType = ExerciseTypes.MatchMeaning,
                    MatchMode = ExerciseMatchModes.MatchMeaning,
                    Options = BuildMeaningOptions(vocabulary, topicMeanings, globalMeanings, random)
                });
            }

            model.BatchVocabularyIds = string.Join(",", model.Questions.Select(item => item.VocabId));

            return model;
        }

        public LearningMinitestViewModel? GetExercise(long userId, long topicId, string batchVocabularyIds)
        {
            return GetExercise(userId, topicId, batchVocabularyIds, ExerciseModeMatching);
        }

        public LearningExerciseSelectionViewModel? GetExerciseSelection(long userId, long topicId, string batchVocabularyIds)
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

            var learnedWordsCount = _context.UserVocabularies
                .Where(item => item.UserId == userId)
                .Join(
                    _context.Vocabularies.Where(vocabulary => vocabulary.TopicId == topicId),
                    userVocabulary => userVocabulary.VocabId,
                    vocabulary => vocabulary.VocabId,
                    (userVocabulary, vocabulary) => userVocabulary.VocabId)
                .Distinct()
                .Count();

            return new LearningExerciseSelectionViewModel
            {
                TopicId = topic.TopicId,
                ParentTopicId = topic.ParentTopicId,
                TopicName = topic.Name,
                BatchVocabularyIds = string.Join(",", vocabularyIds),
                WordCount = batchWords.Count,
                LearnedWordsCount = learnedWordsCount
            };
        }

        public LearningMinitestViewModel? GetExercise(long userId, long topicId, string batchVocabularyIds, string? mode)
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

            var normalizedMode = NormalizeExercisePageMode(mode);
            if (normalizedMode == null)
            {
                return null;
            }

            var topicWords = _context.Vocabularies
                .Where(vocabulary =>
                    vocabulary.TopicId == topicId
                    && !string.IsNullOrWhiteSpace(vocabulary.Word)
                    && !string.IsNullOrWhiteSpace(vocabulary.MeaningVi))
                .Select(vocabulary => new WordOption
                {
                    VocabId = vocabulary.VocabId,
                    Word = vocabulary.Word ?? string.Empty,
                    Meaning = vocabulary.MeaningVi ?? string.Empty
                })
                .ToList();

            var globalWords = _context.Vocabularies
                .Where(vocabulary =>
                    !string.IsNullOrWhiteSpace(vocabulary.Word)
                    && !string.IsNullOrWhiteSpace(vocabulary.MeaningVi))
                .Select(vocabulary => new WordOption
                {
                    VocabId = vocabulary.VocabId,
                    Word = vocabulary.Word ?? string.Empty,
                    Meaning = vocabulary.MeaningVi ?? string.Empty
                })
                .ToList();

            var random = new Random();
            var shuffledBatchWords = batchWords
                .OrderBy(_ => random.Next())
                .ToList();

            var model = new LearningMinitestViewModel
            {
                TopicId = topic.TopicId,
                ParentTopicId = topic.ParentTopicId,
                TopicName = topic.Name,
                BatchVocabularyIds = string.Join(",", vocabularyIds),
                SessionMode = ResolveSessionMode(userId, vocabularyIds),
                SessionStartedAt = DateTime.Now
            };

            if (string.Equals(normalizedMode, ExerciseModeMatching, StringComparison.Ordinal))
            {
                var learnedVocabularyIds = _context.UserVocabularies
                    .Where(item => item.UserId == userId)
                    .Select(item => item.VocabId)
                    .ToHashSet();

                var matchingWords = shuffledBatchWords
                    .Where(item => learnedVocabularyIds.Contains(item.VocabId))
                    .Take(Math.Min(5, shuffledBatchWords.Count))
                    .ToList();

                if (!matchingWords.Any())
                {
                    var learnedTopicWords = _context.Vocabularies
                        .Where(vocabulary =>
                            vocabulary.TopicId == topicId
                            && learnedVocabularyIds.Contains(vocabulary.VocabId))
                        .ToList();

                    matchingWords = learnedTopicWords
                        .OrderBy(_ => random.Next())
                        .Take(Math.Min(5, learnedTopicWords.Count))
                        .ToList();
                }

                if (!matchingWords.Any())
                {
                    return null;
                }

                foreach (var vocabulary in matchingWords)
                {
                    model.Questions.Add(new LearningMinitestQuestionViewModel
                    {
                        VocabId = vocabulary.VocabId,
                        Word = vocabulary.Word ?? string.Empty,
                        ExerciseType = ExerciseTypes.MatchMeaning,
                        MatchMode = ExerciseMatchModes.MatchMeaning,
                        Meaning = NormalizeMeaning(vocabulary.MeaningVi),
                        IsMatchingQuestion = true,
                        MatchPrompt = NormalizeMeaning(vocabulary.MeaningVi)
                    });
                }
            }
            else
            {
                foreach (var vocabulary in shuffledBatchWords)
                {
                    var exampleText = vocabulary.Examples
                        .OrderBy(example => example.ExampleId)
                        .Select(example => example.ExampleEn)
                        .FirstOrDefault(text => !string.IsNullOrWhiteSpace(text));

                    model.Questions.Add(new LearningMinitestQuestionViewModel
                    {
                        VocabId = vocabulary.VocabId,
                        Word = vocabulary.Word ?? string.Empty,
                        ExerciseType = ExerciseTypes.Filling,
                        MatchMode = null,
                        Meaning = NormalizeMeaning(vocabulary.MeaningVi),
                        IsMatchingQuestion = false,
                        FillingSentence = BuildFillingSentence(exampleText, vocabulary.Word),
                        Options = BuildFillingOptions(vocabulary, topicWords, globalWords, random)
                    });
                }
            }

            return model;
        }

        public (bool Succeeded, string? ErrorMessage, LearningMinitestResultViewModel? Result) SubmitMinitest(long userId, LearningMinitestViewModel model)
        {
            return SubmitAssessment(userId, model, ExerciseTypes.MatchMeaning, ExerciseMatchModes.MatchMeaning, true);
        }

        public (bool Succeeded, string? ErrorMessage, LearningMinitestResultViewModel? Result) SubmitExercise(long userId, LearningMinitestViewModel model)
        {
            var questionVocabularyIds = model.Questions
                .Select(item => item.VocabId)
                .Where(vocabularyId => vocabularyId > 0)
                .Distinct()
                .ToList();

            if (questionVocabularyIds.Any())
            {
                model.BatchVocabularyIds = string.Join(",", questionVocabularyIds);
            }

            return SubmitAssessment(userId, model, null, null, false);
        }

        private (bool Succeeded, string? ErrorMessage, LearningMinitestResultViewModel? Result) SubmitAssessment(
            long userId,
            LearningMinitestViewModel model,
            string? fixedExerciseType,
            string? fixedMatchMode,
            bool shouldUpdateLearningProgress)
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
                TopicName = topic.Name,
                SubmittedAt = DateTime.Now,
                ExerciseType = fixedExerciseType ?? BuildExerciseTypeSummary(model.Questions)
            };

            try
            {
                using var transaction = _context.Database.BeginTransaction();

                var isMatchingOnlySubmission = model.Questions.Any()
                    && model.Questions.All(item => item.IsMatchingQuestion);

                var shouldTrackProgress = shouldUpdateLearningProgress && !isMatchingOnlySubmission;

                var userVocabularyByVocabId = shouldTrackProgress
                    ? _context.UserVocabularies
                        .Where(item => item.UserId == userId && vocabularyIds.Contains(item.VocabId))
                        .ToDictionary(item => item.VocabId)
                    : new Dictionary<long, UserVocabulary>();

                var progressByVocabId = shouldTrackProgress
                    ? _context.Progresses
                        .Where(item => item.UserId == userId && vocabularyIds.Contains(item.VocabId))
                        .ToDictionary(item => item.VocabId)
                    : new Dictionary<long, Progress>();

                var existingExercises = _context.Exercises
                    .Where(item => vocabularyIds.Contains(item.VocabId))
                    .ToList();

                var sessionStartedAt = model.SessionStartedAt == default
                    ? result.SubmittedAt
                    : model.SessionStartedAt;
                if (sessionStartedAt > result.SubmittedAt)
                {
                    sessionStartedAt = result.SubmittedAt;
                }

                var sessionType = ResolveExerciseSessionType(fixedExerciseType != null, model.SessionMode);
                var exerciseSession = new ExerciseSession
                {
                    UserId = userId,
                    TopicId = model.TopicId,
                    SessionType = sessionType,
                    StartedAt = sessionStartedAt,
                    FinishedAt = result.SubmittedAt
                };

                _context.ExerciseSessions.Add(exerciseSession);
                _context.SaveChanges();

                foreach (var vocabularyId in vocabularyIds)
                {
                    if (!vocabularies.TryGetValue(vocabularyId, out var vocabulary))
                    {
                        continue;
                    }

                    var question = model.Questions.FirstOrDefault(item => item.VocabId == vocabularyId);
                    var selectedAnswer = question?.SelectedAnswer?.Trim() ?? string.Empty;
                    var correctAnswer = NormalizeMeaning(vocabulary.MeaningVi);
                    var isCorrect = isMatchingOnlySubmission
                        ? true
                        : !string.IsNullOrWhiteSpace(selectedAnswer)
                            && string.Equals(selectedAnswer, correctAnswer, StringComparison.OrdinalIgnoreCase);

                    var submittedExerciseType = fixedExerciseType == null
                        ? NormalizeExerciseType(question?.ExerciseType)
                        : NormalizeExerciseType(fixedExerciseType);

                    var submittedMatchMode = fixedExerciseType == null
                        ? NormalizeSubmittedMatchMode(question, vocabulary, submittedExerciseType)
                        : fixedMatchMode;

                    var exercise = existingExercises.FirstOrDefault(item =>
                        item.VocabId == vocabularyId
                        && string.Equals(item.Type, submittedExerciseType, StringComparison.OrdinalIgnoreCase)
                        && string.Equals(item.MatchMode ?? string.Empty, submittedMatchMode ?? string.Empty, StringComparison.OrdinalIgnoreCase));

                    if (exercise == null)
                    {
                        exercise = new Exercise
                        {
                            VocabId = vocabularyId,
                            Type = submittedExerciseType,
                            MatchMode = submittedMatchMode,
                            CreatedAt = result.SubmittedAt
                        };

                        _context.Exercises.Add(exercise);
                        _context.SaveChanges();
                        existingExercises.Add(exercise);
                    }

                    DateTime? nextReviewDate = null;
                    if (shouldTrackProgress)
                    {
                        nextReviewDate = SaveAnswerResult(
                            exerciseSession.SessionId,
                            userId,
                            vocabularyId,
                            isCorrect,
                            exercise,
                            result.SubmittedAt,
                            userVocabularyByVocabId,
                            progressByVocabId);
                    }

                    if (!isMatchingOnlySubmission)
                    {
                        result.Questions.Add(new LearningMinitestQuestionResultViewModel
                        {
                            Word = vocabulary.Word ?? string.Empty,
                            ExerciseType = submittedExerciseType,
                            MatchMode = submittedMatchMode,
                            SelectedAnswer = string.IsNullOrWhiteSpace(selectedAnswer) ? "No answer" : selectedAnswer,
                            CorrectAnswer = correctAnswer,
                            IsCorrect = isCorrect,
                            NextReviewDate = nextReviewDate
                        });
                    }
                }

                if (isMatchingOnlySubmission)
                {
                    result.TotalQuestions = model.Questions.Count;
                    result.CorrectCount = result.TotalQuestions;
                    result.Score = result.TotalQuestions == 0 ? 0 : 100f;
                }
                else
                {
                    result.CorrectCount = result.Questions.Count(item => item.IsCorrect);
                    result.TotalQuestions = result.Questions.Count;
                    result.Score = result.TotalQuestions == 0
                        ? 0
                        : result.CorrectCount * 100f / result.TotalQuestions;
                }
                result.HasMoreWords = GetNextBatchSelection(userId, model.TopicId).Any();

                exerciseSession.TotalQuestions = result.TotalQuestions;
                exerciseSession.CorrectCount = result.CorrectCount;
                exerciseSession.Score = result.Score;
                exerciseSession.FinishedAt = result.SubmittedAt;

                _context.LearningLogs.Add(new LearningLog
                {
                    UserId = userId,
                    SessionId = exerciseSession.SessionId,
                    Date = result.SubmittedAt,
                    ActivityType = MapLearningLogActivityType(sessionType),
                    WordsStudied = result.TotalQuestions,
                    Score = result.Score
                });

                _context.SaveChanges();
                transaction.Commit();

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

        private List<long> GetNextBatchSelection(long userId, long topicId)
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
                return newVocabularyIds;
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
                return dueVocabularyIds;
            }

            return new List<long>();
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

        private static string ResolveExerciseSessionType(bool isMiniTest, string? sessionMode)
        {
            if (string.Equals(sessionMode, LearningActivityTypes.Review, StringComparison.OrdinalIgnoreCase))
            {
                return LearningActivityTypes.Review;
            }

            return isMiniTest ? "MINI_TEST" : "PRACTICE";
        }

        private static string MapLearningLogActivityType(string sessionType)
        {
            if (string.Equals(sessionType, LearningActivityTypes.Review, StringComparison.OrdinalIgnoreCase))
            {
                return LearningActivityTypes.Review;
            }

            return string.Equals(sessionType, "MINI_TEST", StringComparison.OrdinalIgnoreCase)
                ? LearningActivityTypes.Test
                : LearningActivityTypes.Learn;
        }

        private List<LearningMinitestAnswerOptionViewModel> BuildFillingOptions(
            Vocabulary vocabulary,
            List<WordOption> topicWords,
            List<WordOption> globalWords,
            Random random)
        {
            var correctAnswerMeaning = NormalizeMeaning(vocabulary.MeaningVi);
            var correctAnswerWord = NormalizeWord(vocabulary.Word);

            var wrongOptions = topicWords
                .Where(item => item.VocabId != vocabulary.VocabId)
                .Select(item => item.Word)
                .Concat(
                    globalWords
                        .Where(item => item.VocabId != vocabulary.VocabId)
                        .Select(item => item.Word))
                .Select(NormalizeWord)
                .Where(option => !string.IsNullOrWhiteSpace(option))
                .Where(option => !string.Equals(option, correctAnswerWord, StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(_ => random.Next())
                .Take(3)
                .ToList();

            var options = new List<LearningMinitestAnswerOptionViewModel>();
            if (!string.IsNullOrWhiteSpace(correctAnswerWord))
            {
                options.Add(new LearningMinitestAnswerOptionViewModel
                {
                    DisplayText = correctAnswerWord,
                    Value = correctAnswerMeaning
                });
            }

            foreach (var wrongOption in wrongOptions)
            {
                var optionMeaning = globalWords
                    .Where(item => string.Equals(item.Word, wrongOption, StringComparison.OrdinalIgnoreCase))
                    .Select(item => NormalizeMeaning(item.Meaning))
                    .FirstOrDefault();

                if (string.IsNullOrWhiteSpace(optionMeaning))
                {
                    continue;
                }

                options.Add(new LearningMinitestAnswerOptionViewModel
                {
                    DisplayText = wrongOption,
                    Value = optionMeaning
                });
            }

            return options
                .GroupBy(item => item.DisplayText, StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .OrderBy(_ => random.Next())
                .ToList();
        }

        private List<LearningMinitestAnswerOptionViewModel> BuildMeaningOptions(
            Vocabulary vocabulary,
            List<MeaningOption> topicMeanings,
            List<MeaningOption> globalMeanings,
            Random random)
        {
            var correctAnswer = NormalizeMeaning(vocabulary.MeaningVi);

            var wrongOptions = topicMeanings
                .Where(item => item.VocabId != vocabulary.VocabId)
                .Select(item => item.Meaning)
                .Concat(
                    globalMeanings
                        .Where(item => item.VocabId != vocabulary.VocabId)
                        .Select(item => item.Meaning))
                .Select(NormalizeMeaning)
                .Where(option => !string.IsNullOrWhiteSpace(option))
                .Where(option => !string.Equals(option, correctAnswer, StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(_ => random.Next())
                .Take(3)
                .ToList();

            var options = new List<LearningMinitestAnswerOptionViewModel>();

            if (!string.IsNullOrWhiteSpace(correctAnswer))
            {
                options.Add(new LearningMinitestAnswerOptionViewModel
                {
                    DisplayText = correctAnswer,
                    Value = correctAnswer
                });
            }

            options.AddRange(wrongOptions.Select(option => new LearningMinitestAnswerOptionViewModel
            {
                DisplayText = option,
                Value = option
            }));

            return options
                .GroupBy(item => item.DisplayText, StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .OrderBy(_ => random.Next())
                .ToList();
        }

        private static string BuildMatchPrompt(Vocabulary vocabulary, bool useIpaAsMatchPrompt)
        {
            var ipa = vocabulary.Ipa?.Trim() ?? string.Empty;
            if (useIpaAsMatchPrompt && !string.IsNullOrWhiteSpace(ipa))
            {
                return ipa;
            }

            return NormalizeMeaning(vocabulary.MeaningVi);
        }

        private static string BuildFillingSentence(string? exampleText, string? word)
        {
            var normalizedWord = NormalizeWord(word);
            if (string.IsNullOrWhiteSpace(normalizedWord))
            {
                return string.Empty;
            }

            if (string.IsNullOrWhiteSpace(exampleText))
            {
                return $"I ___ {normalizedWord}.";
            }

            var replacedText = exampleText.Replace(normalizedWord, "___", StringComparison.OrdinalIgnoreCase);

            return string.Equals(replacedText, exampleText, StringComparison.Ordinal)
                ? $"___ ({normalizedWord})"
                : replacedText;
        }

        private DateTime SaveAnswerResult(
            long sessionId,
            long userId,
            long vocabId,
            bool isCorrect,
            Exercise exercise,
            DateTime answeredAt,
            Dictionary<long, UserVocabulary> userVocabularyByVocabId,
            Dictionary<long, Progress> progressByVocabId)
        {
            var now = answeredAt;
            userVocabularyByVocabId.TryGetValue(vocabId, out var userVocabulary);
            progressByVocabId.TryGetValue(vocabId, out var progress);

            var (nextReviewDate, status) = BuildReviewPlan(progress, isCorrect, now);

            if (userVocabulary == null)
            {
                userVocabulary = new UserVocabulary
                {
                    UserId = userId,
                    VocabId = vocabId,
                    Status = status,
                    Note = string.Empty,
                    FirstLearnedDate = now
                };

                _context.UserVocabularies.Add(userVocabulary);
                userVocabularyByVocabId[vocabId] = userVocabulary;
            }
            else
            {
                userVocabulary.Status = status;

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
                progressByVocabId[vocabId] = progress;
            }

            progress.LastReviewDate = now;
            progress.NextReviewDate = nextReviewDate;

            _context.ExerciseResults.Add(new ExerciseResult
            {
                SessionId = sessionId,
                ExerciseId = exercise.ExerciseId,
                UserId = userId,
                IsCorrect = isCorrect,
                AnsweredAt = now
            });

            return nextReviewDate;
        }

        private static (DateTime NextReviewDate, string Status) BuildReviewPlan(Progress? progress, bool isCorrect, DateTime now)
        {
            var easeFactor = Math.Max(1.3d, progress?.EaseFactor ?? 2.5d);
            var intervalDays = Math.Max(1, progress?.IntervalDays ?? 1);
            var repetitions = Math.Max(0, progress?.Repetitions ?? 0);

            if (isCorrect)
            {
                repetitions += 1;
                intervalDays = repetitions switch
                {
                    1 => 1,
                    2 => 3,
                    _ => Math.Max(1, (int)Math.Round(intervalDays * easeFactor))
                };
                easeFactor = Math.Max(1.3d, easeFactor + 0.1d);
            }
            else
            {
                repetitions = 0;
                intervalDays = 1;
                easeFactor = Math.Max(1.3d, easeFactor - 0.2d);
            }

            if (progress != null)
            {
                progress.EaseFactor = easeFactor;
                progress.IntervalDays = intervalDays;
                progress.Repetitions = repetitions;
            }

            var status = repetitions >= 4
                ? UserVocabularyStatuses.Mastered
                : UserVocabularyStatuses.Learning;

            return (now.AddDays(intervalDays), status);
        }

        private static int CalculatePercent(int learnedWords, int totalWords)
        {
            if (totalWords <= 0)
            {
                return 0;
            }

            return (int)Math.Round(learnedWords * 100d / totalWords);
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

        private static string NormalizeWord(string? value)
        {
            return value?.Trim() ?? string.Empty;
        }

        private static string? NormalizeExercisePageMode(string? value)
        {
            var normalized = value?.Trim().ToLowerInvariant();
            return normalized is ExerciseModeMatching or ExerciseModeFilling
                ? normalized
                : null;
        }

        private static string NormalizeExerciseType(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? ExerciseTypes.MatchMeaning
                : value.Trim().ToUpperInvariant();
        }

        private static string NormalizeExerciseMatchMode(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? ExerciseMatchModes.MatchMeaning
                : value.Trim().ToUpperInvariant();
        }

        private static string BuildExerciseTypeSummary(IEnumerable<LearningMinitestQuestionViewModel> questions)
        {
            var types = questions
                .Select(question => NormalizeExerciseType(question.ExerciseType))
                .Distinct(StringComparer.Ordinal)
                .ToList();

            return types.Count == 1
                ? types[0]
                : "MIXED";
        }

        private static string? NormalizeSubmittedMatchMode(
            LearningMinitestQuestionViewModel? question,
            Vocabulary vocabulary,
            string exerciseType)
        {
            if (string.Equals(exerciseType, ExerciseTypes.Filling, StringComparison.Ordinal))
            {
                return null;
            }

            if (!string.IsNullOrWhiteSpace(question?.MatchMode))
            {
                return NormalizeExerciseMatchMode(question.MatchMode);
            }

            return string.Equals(question?.MatchPrompt, vocabulary.Ipa, StringComparison.OrdinalIgnoreCase)
                ? ExerciseMatchModes.MatchIpa
                : ExerciseMatchModes.MatchMeaning;
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

        private sealed class WordOption
        {
            public long VocabId { get; set; }

            public string Word { get; set; } = string.Empty;

            public string Meaning { get; set; } = string.Empty;
        }

        private sealed class MeaningOption
        {
            public long VocabId { get; set; }

            public string Meaning { get; set; } = string.Empty;
        }
    }
}
