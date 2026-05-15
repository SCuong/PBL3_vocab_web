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

        public LearningProgressStateViewModel GetLearningProgressState(long userId)
        {
            var now = DateTime.Now;
            var today = now.Date;

            var learnedPairs = _context.UserVocabularies
                .Where(item => item.UserId == userId)
                .Join(
                    _context.Vocabularies.Where(vocabulary => vocabulary.TopicId.HasValue),
                    userVocabulary => userVocabulary.VocabId,
                    vocabulary => vocabulary.VocabId,
                    (userVocabulary, vocabulary) => new
                    {
                        TopicId = vocabulary.TopicId!.Value,
                        vocabulary.VocabId
                    })
                .Distinct()
                .ToList();

            var reviewPairs = _context.Progresses
                .Where(progress =>
                    progress.UserId == userId
                    && progress.NextReviewDate.HasValue
                    && progress.NextReviewDate.Value.Date <= today)
                .Join(
                    _context.Vocabularies.Where(vocabulary => vocabulary.TopicId.HasValue),
                    progress => progress.VocabId,
                    vocabulary => vocabulary.VocabId,
                    (progress, vocabulary) => new
                    {
                        TopicId = vocabulary.TopicId!.Value,
                        vocabulary.VocabId
                    })
                .Distinct()
                .ToList();

            var learnedByTopic = learnedPairs
                .GroupBy(item => item.TopicId)
                .ToDictionary(group => group.Key, group => group.Select(item => item.VocabId).Distinct().OrderBy(id => id).ToList());

            var reviewByTopic = reviewPairs
                .GroupBy(item => item.TopicId)
                .ToDictionary(group => group.Key, group => group.Select(item => item.VocabId).Distinct().OrderBy(id => id).ToList());

            var topicIds = learnedByTopic.Keys
                .Concat(reviewByTopic.Keys)
                .Distinct()
                .OrderBy(id => id)
                .ToList();

            var model = new LearningProgressStateViewModel();
            foreach (var topicId in topicIds)
            {
                model.Topics.Add(new LearningProgressTopicStateViewModel
                {
                    TopicId = topicId,
                    LearnedWordIds = learnedByTopic.TryGetValue(topicId, out var learnedWordIds) ? learnedWordIds : new List<long>(),
                    ReviewWordIds = reviewByTopic.TryGetValue(topicId, out var reviewWordIds) ? reviewWordIds : new List<long>()
                });
            }

            return model;
        }

        public LearningProgressStateViewModel MarkWordsLearned(long userId, long topicId, IReadOnlyCollection<long> wordIds)
        {
            if (topicId <= 0 || wordIds.Count == 0)
            {
                return GetLearningProgressState(userId);
            }

            var now = DateTime.Now;
            var validVocabularyIds = _context.Vocabularies
                .Where(vocabulary => vocabulary.TopicId == topicId && wordIds.Contains(vocabulary.VocabId))
                .Select(vocabulary => vocabulary.VocabId)
                .Distinct()
                .ToList();

            if (validVocabularyIds.Count == 0)
            {
                return GetLearningProgressState(userId);
            }

            var existingUserVocabularies = _context.UserVocabularies
                .Where(item => item.UserId == userId && validVocabularyIds.Contains(item.VocabId))
                .ToList();

            foreach (var duplicateGroup in existingUserVocabularies.GroupBy(item => item.VocabId))
            {
                foreach (var duplicate in duplicateGroup.Skip(1))
                {
                    _context.UserVocabularies.Remove(duplicate);
                }
            }

            var userVocabularyByVocabId = existingUserVocabularies
                .GroupBy(item => item.VocabId)
                .ToDictionary(group => group.Key, group => group.First());

            var existingProgresses = _context.Progresses
                .Where(item => item.UserId == userId && validVocabularyIds.Contains(item.VocabId))
                .ToList();

            foreach (var duplicateGroup in existingProgresses.GroupBy(item => item.VocabId))
            {
                foreach (var duplicate in duplicateGroup.Skip(1))
                {
                    _context.Progresses.Remove(duplicate);
                }
            }

            var progressByVocabId = existingProgresses
                .GroupBy(item => item.VocabId)
                .ToDictionary(group => group.Key, group => group.First());

            foreach (var vocabularyId in validVocabularyIds)
            {
                if (!userVocabularyByVocabId.TryGetValue(vocabularyId, out var userVocabulary))
                {
                    userVocabulary = new UserVocabulary
                    {
                        UserId = userId,
                        VocabId = vocabularyId,
                        Status = UserVocabularyStatuses.Learning,
                        Note = string.Empty,
                        FirstLearnedDate = now
                    };

                    _context.UserVocabularies.Add(userVocabulary);
                    userVocabularyByVocabId[vocabularyId] = userVocabulary;
                }
                else
                {
                    userVocabulary.Status = UserVocabularyStatuses.Learning;
                    userVocabulary.FirstLearnedDate ??= now;
                }

                if (!progressByVocabId.TryGetValue(vocabularyId, out var progress))
                {
                    progress = new Progress
                    {
                        UserId = userId,
                        VocabId = vocabularyId,
                        EaseFactor = 2.5d,
                        IntervalDays = 1,
                        Repetitions = 1  // word has completed one learning pass
                    };

                    _context.Progresses.Add(progress);
                    progressByVocabId[vocabularyId] = progress;
                }

                progress.LastReviewDate = now;
                // Preserve SM-2 dates already set by SubmitSingleWordReview during the session
                progress.NextReviewDate ??= now.AddDays(1);
            }

            _context.SaveChanges();
            return GetLearningProgressState(userId);
        }

        public LearningProgressStateViewModel MarkWordsReviewed(long userId, long topicId, IReadOnlyCollection<long> wordIds)
        {
            if (topicId <= 0 || wordIds.Count == 0)
            {
                return GetLearningProgressState(userId);
            }

            var now = DateTime.Now;
            var validVocabularyIds = _context.Vocabularies
                .Where(vocabulary => vocabulary.TopicId == topicId && wordIds.Contains(vocabulary.VocabId))
                .Select(vocabulary => vocabulary.VocabId)
                .Distinct()
                .ToList();

            if (validVocabularyIds.Count == 0)
            {
                return GetLearningProgressState(userId);
            }

            var existingUserVocabularies = _context.UserVocabularies
                .Where(item => item.UserId == userId && validVocabularyIds.Contains(item.VocabId))
                .ToList();

            foreach (var duplicateGroup in existingUserVocabularies.GroupBy(item => item.VocabId))
            {
                foreach (var duplicate in duplicateGroup.Skip(1))
                {
                    _context.UserVocabularies.Remove(duplicate);
                }
            }

            var userVocabularyByVocabId = existingUserVocabularies
                .GroupBy(item => item.VocabId)
                .ToDictionary(group => group.Key, group => group.First());

            var existingProgresses = _context.Progresses
                .Where(item => item.UserId == userId && validVocabularyIds.Contains(item.VocabId))
                .ToList();

            foreach (var duplicateGroup in existingProgresses.GroupBy(item => item.VocabId))
            {
                foreach (var duplicate in duplicateGroup.Skip(1))
                {
                    _context.Progresses.Remove(duplicate);
                }
            }

            var progressByVocabId = existingProgresses
                .GroupBy(item => item.VocabId)
                .ToDictionary(group => group.Key, group => group.First());

            foreach (var vocabularyId in validVocabularyIds)
            {
                if (!userVocabularyByVocabId.TryGetValue(vocabularyId, out var userVocabulary))
                {
                    userVocabulary = new UserVocabulary
                    {
                        UserId = userId,
                        VocabId = vocabularyId,
                        Status = UserVocabularyStatuses.Learning,
                        Note = string.Empty,
                        FirstLearnedDate = now
                    };

                    _context.UserVocabularies.Add(userVocabulary);
                    userVocabularyByVocabId[vocabularyId] = userVocabulary;
                }
                else
                {
                    userVocabulary.FirstLearnedDate ??= now;
                }

                if (!progressByVocabId.TryGetValue(vocabularyId, out var progress))
                {
                    progress = new Progress
                    {
                        UserId = userId,
                        VocabId = vocabularyId,
                        EaseFactor = 2.5d,
                        IntervalDays = 1,
                        Repetitions = 0
                    };

                    _context.Progresses.Add(progress);
                    progressByVocabId[vocabularyId] = progress;
                }

                // Viewing flashcards is not a quiz — do not advance SM-2 state.
                // Only initialize NextReviewDate for brand-new Progress records.
                progress.LastReviewDate = now;
                progress.NextReviewDate ??= now.AddDays(1);
            }

            _context.SaveChanges();
            return GetLearningProgressState(userId);
        }

        public List<ReviewOptionsViewModel> GetBatchReviewOptions(long userId, IReadOnlyCollection<long> vocabIds, IReadOnlyCollection<long> repeatedVocabIds)
        {
            var now = DateTime.Now;
            var progressByVocabId = _context.Progresses
                .Where(p => p.UserId == userId && vocabIds.Contains(p.VocabId))
                .ToDictionary(p => p.VocabId);

            var repeatedSet = new HashSet<long>(repeatedVocabIds);

            return vocabIds.Select(vocabId =>
            {
                progressByVocabId.TryGetValue(vocabId, out var progress);
                var isRepeatedThisSession = repeatedSet.Contains(vocabId);
                var state = progress is null ? null : ToSm2State(progress);
                return new ReviewOptionsViewModel
                {
                    VocabId = vocabId,
                    Options = new[] { 0, 3, 5 }
                        .Select(q =>
                        {
                            var preview = Sm2Calculator.Preview(state, q, now, isRepeatedThisSession);
                            return new ReviewOptionItem
                            {
                                Quality = q,
                                Days = preview.Days,
                                NextReviewDate = preview.NextReviewDate
                            };
                        })
                        .ToList()
                };
            }).ToList();
        }

        public LearningProgressStateViewModel SubmitSingleWordReview(long userId, long vocabId, long topicId, int quality, bool isRepeatedThisSession = false)
        {
            quality = Math.Clamp(quality, 0, 5);
            var now = DateTime.Now;

            var progress = _context.Progresses
                .FirstOrDefault(p => p.UserId == userId && p.VocabId == vocabId);
            var isFirstExposureReview = progress == null || progress.Repetitions == 0;

            // Idempotency: ignore duplicate submissions within 5-second window (handles network retries / multi-tab)
            if (!isRepeatedThisSession
                && progress?.LastReviewDate.HasValue == true
                && (now - progress.LastReviewDate.Value).TotalSeconds < 5)
            {
                return GetLearningProgressState(userId);
            }

            var userVocabulary = _context.UserVocabularies
                .FirstOrDefault(uv => uv.UserId == userId && uv.VocabId == vocabId);

            if (progress == null)
            {
                progress = new Progress { UserId = userId, VocabId = vocabId };
                _context.Progresses.Add(progress);
            }

            var plan = Sm2Calculator.Plan(
                ToSm2State(progress),
                quality,
                now,
                isFirstExposureReview,
                isRepeatedThisSession);
            var status = plan.Status;

            ApplySm2Plan(progress, plan);

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
            }
            else
            {
                userVocabulary.Status = status;
                userVocabulary.FirstLearnedDate ??= now;
            }

            _context.SaveChanges();
            return GetLearningProgressState(userId);
        }

        private static Sm2State ToSm2State(Progress progress) =>
            new(progress.EaseFactor, progress.IntervalDays, progress.Repetitions, progress.LastReviewDate, progress.NextReviewDate);

        private static void ApplySm2Plan(Progress progress, Sm2Plan plan)
        {
            progress.EaseFactor = plan.NewState.EaseFactor;
            progress.IntervalDays = plan.NewState.IntervalDays;
            progress.Repetitions = plan.NewState.Repetitions;
            progress.LastReviewDate = plan.NewState.LastReviewDate ?? progress.LastReviewDate;
            progress.NextReviewDate = plan.NextReviewDate;
        }
    }
}
