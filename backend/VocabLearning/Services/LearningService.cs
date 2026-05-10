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
                    && progress.NextReviewDate.Value <= now)
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

        public List<ReviewOptionsViewModel> GetBatchReviewOptions(long userId, IReadOnlyCollection<long> vocabIds)
        {
            var now = DateTime.Now;
            var progressByVocabId = _context.Progresses
                .Where(p => p.UserId == userId && vocabIds.Contains(p.VocabId))
                .ToDictionary(p => p.VocabId);

            return vocabIds.Select(vocabId =>
            {
                progressByVocabId.TryGetValue(vocabId, out var progress);
                return new ReviewOptionsViewModel
                {
                    VocabId = vocabId,
                    Options = new[] { 0, 3, 4, 5 }
                        .Select(q => SimulateReviewOption(progress, q, now))
                        .ToList()
                };
            }).ToList();
        }

        public LearningProgressStateViewModel SubmitSingleWordReview(long userId, long vocabId, long topicId, int quality)
        {
            quality = Math.Clamp(quality, 0, 5);
            var now = DateTime.Now;

            var progress = _context.Progresses
                .FirstOrDefault(p => p.UserId == userId && p.VocabId == vocabId);

            // Idempotency: ignore duplicate submissions within 5-second window (handles network retries / multi-tab)
            if (progress?.LastReviewDate.HasValue == true
                && (now - progress.LastReviewDate.Value).TotalSeconds < 5)
            {
                return GetLearningProgressState(userId);
            }

            var userVocabulary = _context.UserVocabularies
                .FirstOrDefault(uv => uv.UserId == userId && uv.VocabId == vocabId);

            var (nextReviewDate, status) = BuildReviewPlan(progress, quality, now);

            if (progress == null)
            {
                progress = new Progress { UserId = userId, VocabId = vocabId };
                _context.Progresses.Add(progress);
            }

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

        // INTENTIONAL DESIGN: This is a UX-first SM-2 variant, not pure academic SM-2.
        // Pure SM-2 gives identical intervals for all quality >= 3 at repetitions 1 and 2
        // (hardcoded 1-day and 6-day steps), which makes all review buttons look the same.
        // Instead, this preview simulation uses quality-differentiated multipliers so learners
        // see meaningful, distinct feedback (Hard < Good < Easy) at every stage.
        // The actual stored progress (BuildReviewPlan) follows standard SM-2 for long-term
        // retention correctness. This method is for UI preview only.
        private static ReviewOptionItem SimulateReviewOption(Progress? progress, int quality, DateTime now)
        {
            var easeFactor = Math.Max(1.3d, progress?.EaseFactor ?? 2.5d);
            var intervalDays = Math.Max(1, progress?.IntervalDays ?? 1);

            int resultDays;
            if (quality == 0)
            {
                resultDays = 0; // preview: "Ôn lại ngay" — stored interval remains 1 day (BuildReviewPlan)
            }
            else
            {
                var updatedEF = Math.Max(1.3d, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
                resultDays = quality switch
                {
                    3 => Math.Max(2, (int)Math.Round(intervalDays * updatedEF * 0.5, MidpointRounding.AwayFromZero)),
                    4 => Math.Max(3, (int)Math.Round(intervalDays * updatedEF, MidpointRounding.AwayFromZero)),
                    5 => Math.Max(4, (int)Math.Round(intervalDays * updatedEF * 1.3, MidpointRounding.AwayFromZero)),
                    _ => Math.Max(1, (int)Math.Round(intervalDays * updatedEF, MidpointRounding.AwayFromZero))
                };
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
                repetitions += 1;
                var updatedEF = Math.Max(1.3d, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
                intervalDays = quality switch
                {
                    3 => Math.Max(2, (int)Math.Round(intervalDays * updatedEF * 0.5, MidpointRounding.AwayFromZero)),
                    4 => Math.Max(3, (int)Math.Round(intervalDays * updatedEF, MidpointRounding.AwayFromZero)),
                    5 => Math.Max(4, (int)Math.Round(intervalDays * updatedEF * 1.3, MidpointRounding.AwayFromZero)),
                    _ => Math.Max(1, (int)Math.Round(intervalDays * updatedEF, MidpointRounding.AwayFromZero))
                };
                easeFactor = updatedEF;
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
    }
}
