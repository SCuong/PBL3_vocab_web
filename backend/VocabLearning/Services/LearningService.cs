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
                return new ReviewOptionsViewModel
                {
                    VocabId = vocabId,
                    Options = new[] { 0, 3, 5 }
                        .Select(q => SimulateReviewOptionWithPriority(progress, q, now, isRepeatedThisSession))
                        .ToList()
                };
            }).ToList();
        }

        private static ReviewOptionItem SimulateReviewOptionWithPriority(Progress? progress, int quality, DateTime now, bool isRepeatedThisSession)
        {
            var today = now.Date;
            var isDueRealReview = progress?.Repetitions > 0
                && progress.NextReviewDate.HasValue
                && progress.NextReviewDate.Value.Date <= today;

            if (isDueRealReview)
            {
                var resultDays = CalculateRealReviewIntervalDays(progress!, quality, false);
                return new ReviewOptionItem
                {
                    Quality = quality,
                    Days = resultDays,
                    NextReviewDate = now.AddDays(resultDays)
                };
            }

            if (isRepeatedThisSession)
            {
                return new ReviewOptionItem
                {
                    Quality = quality,
                    Days = 1,
                    NextReviewDate = now.AddDays(1)
                };
            }

            return SimulateReviewOption(progress, quality, now, false);
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

            var (nextReviewDate, status) = isFirstExposureReview
                ? BuildFirstExposureReviewPlan(progress, quality, now, isRepeatedThisSession)
                : BuildReviewPlan(progress, quality, now);

            progress.LastReviewDate = now;
            progress.NextReviewDate = nextReviewDate;

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

        private static (DateTime NextReviewDate, string Status) BuildFirstExposureReviewPlan(Progress progress, int quality, DateTime now, bool isRepeatedThisSession = false)
        {
            var resultDays = isRepeatedThisSession || quality >= 5 ? 1 : 0;

            progress.EaseFactor = Math.Max(1.3d, progress.EaseFactor);
            progress.IntervalDays = Math.Max(0, resultDays);
            progress.Repetitions = quality >= 5 ? 1 : 0;

            return (now.AddDays(resultDays), UserVocabularyStatuses.Learning);
        }

        // UI preview only — separates first-exposure / same-session reinforcement / real review.
        // BuildReviewPlan (below) is the SM-2 source of truth for stored progress.
        private static ReviewOptionItem SimulateReviewOption(Progress? progress, int quality, DateTime now, bool isRepeatedThisSession = false)
        {
            int resultDays;

            if (isRepeatedThisSession)
            {
                // Phase B: word reinserted and seen again in the same session
                resultDays = 1;
            }
            else if (progress == null || progress.Repetitions == 0)
            {
                // Phase A: first exposure — show conservative intervals
                resultDays = quality switch
                {
                    0 => 0,
                    3 => 0,
                    5 => 1,
                    _ => 0
                };
            }
            else
            {
                // Phase C: real review session — use SM-2-inspired intervals
                resultDays = CalculateRealReviewIntervalDays(progress, quality, true);
            }

            return new ReviewOptionItem
            {
                Quality = quality,
                Days = resultDays,
                NextReviewDate = now.AddDays(resultDays)
            };
        }

        // UX-first SM-2 variant — same formula as SimulateReviewOption so preview matches actual.
        // Quality-differentiated intervals ensure Hard < Good < Easy at every stage.
        // Repetitions counter retained for Mastered status threshold (>= 4 successes).
        private static (DateTime NextReviewDate, string Status) BuildReviewPlan(Progress? progress, int quality, DateTime now)
        {
            var easeFactor = Math.Max(1.3d, progress?.EaseFactor ?? 2.5d);
            var intervalDays = Math.Max(1, progress?.IntervalDays ?? 1);
            var repetitions = Math.Max(0, progress?.Repetitions ?? 0);

            if (quality >= 3)
            {
                var previousRepetitions = repetitions;
                repetitions += 1;
                easeFactor = CalculateUpdatedEaseFactor(easeFactor, quality);
                intervalDays = CalculateSuccessfulReviewIntervalDays(intervalDays, easeFactor, quality, previousRepetitions);
            }
            else
            {
                // Failed — reset repetition/interval
                // Minimum 1 day prevents immediate same-session repetition
                repetitions = 0;
                intervalDays = 1;
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

        private static int CalculateRealReviewIntervalDays(Progress progress, int quality, bool allowImmediateForgot)
        {
            if (quality < 3)
            {
                return allowImmediateForgot ? 0 : 1;
            }

            var easeFactor = CalculateUpdatedEaseFactor(Math.Max(1.3d, progress.EaseFactor), quality);
            var intervalDays = Math.Max(1, progress.IntervalDays);
            var repetitions = Math.Max(0, progress.Repetitions);
            return CalculateSuccessfulReviewIntervalDays(intervalDays, easeFactor, quality, repetitions);
        }

        private static int CalculateSuccessfulReviewIntervalDays(int intervalDays, double easeFactor, int quality, int repetitions)
        {
            return quality switch
            {
                3 when repetitions <= 1 => Math.Max(2, (int)Math.Round(intervalDays * easeFactor * 0.5d, MidpointRounding.AwayFromZero)),
                3 => Math.Max(intervalDays + 1, (int)Math.Round(intervalDays * easeFactor * 0.75d, MidpointRounding.AwayFromZero)),
                4 when repetitions <= 1 => Math.Max(3, (int)Math.Round(intervalDays * easeFactor, MidpointRounding.AwayFromZero)),
                4 => Math.Max(intervalDays + 2, (int)Math.Round(intervalDays * easeFactor, MidpointRounding.AwayFromZero)),
                5 => Math.Max(6, (int)Math.Round(intervalDays * easeFactor * 1.3d, MidpointRounding.AwayFromZero)),
                _ => Math.Max(1, (int)Math.Round(intervalDays * easeFactor, MidpointRounding.AwayFromZero))
            };
        }

        private static double CalculateUpdatedEaseFactor(double easeFactor, int quality)
        {
            return Math.Max(1.3d, easeFactor + (0.1d - (5 - quality) * (0.08d + (5 - quality) * 0.02d)));
        }
    }
}
