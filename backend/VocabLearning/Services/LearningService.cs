using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.ViewModels.Learning;

namespace VocabLearning.Services
{
    public class LearningService : ILearningService
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

        public async Task<LearningSessionResponse> StartSessionAsync(
            long userId,
            StartLearningSessionRequest request,
            CancellationToken cancellationToken)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (!LearningSessionModes.IsValid(request.Mode))
            {
                throw new ArgumentException("Invalid mode. Allowed: STUDY, REVIEW.", nameof(request));
            }

            var distinctIds = request.VocabIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();
            if (distinctIds.Count == 0)
            {
                throw new ArgumentException("VocabIds must contain at least one id.", nameof(request));
            }

            if (request.TopicId.HasValue)
            {
                var topicExists = await _context.Topics
                    .AsNoTracking()
                    .AnyAsync(topic => topic.TopicId == request.TopicId.Value, cancellationToken);
                if (!topicExists)
                {
                    throw new KeyNotFoundException($"Topic {request.TopicId.Value} not found.");
                }
            }

            var validVocabsQuery = _context.Vocabularies
                .AsNoTracking()
                .Where(vocabulary => distinctIds.Contains(vocabulary.VocabId));
            if (request.TopicId.HasValue)
            {
                validVocabsQuery = validVocabsQuery
                    .Where(vocabulary => vocabulary.TopicId == request.TopicId.Value);
            }

            var validVocabIds = await validVocabsQuery
                .Select(vocabulary => vocabulary.VocabId)
                .ToListAsync(cancellationToken);

            if (validVocabIds.Count == 0)
            {
                throw new ArgumentException("None of the requested vocab ids are valid for this topic.", nameof(request));
            }

            // Preserve client-supplied order for valid ids.
            var orderedVocabIds = distinctIds
                .Where(id => validVocabIds.Contains(id))
                .ToList();

            var now = DateTime.UtcNow;
            var session = new LearningSession
            {
                UserId = userId,
                TopicId = request.TopicId,
                Mode = request.Mode,
                Status = LearningSessionStatuses.InProgress,
                CurrentIndex = 0,
                StartedAt = now,
                UpdatedAt = now
            };

            for (var index = 0; index < orderedVocabIds.Count; index++)
            {
                session.Items.Add(new LearningSessionItem
                {
                    VocabId = orderedVocabIds[index],
                    OrderIndex = index,
                    IsAnswered = false
                });
            }

            _context.LearningSessions.Add(session);
            await _context.SaveChangesAsync(cancellationToken);

            return await BuildSessionResponseAsync(session.SessionId, userId, cancellationToken)
                ?? throw new InvalidOperationException("Failed to load freshly created session.");
        }

        public async Task<LearningSessionResponse?> GetActiveSessionAsync(
            long userId,
            string mode,
            long? topicId,
            CancellationToken cancellationToken)
        {
            if (!LearningSessionModes.IsValid(mode))
            {
                throw new ArgumentException("Invalid mode. Allowed: STUDY, REVIEW.", nameof(mode));
            }

            var query = _context.LearningSessions
                .Where(session => session.UserId == userId
                    && session.Mode == mode
                    && session.Status == LearningSessionStatuses.InProgress);
            if (topicId.HasValue)
            {
                query = query.Where(session => session.TopicId == topicId.Value);
            }

            var latest = await query
                .OrderByDescending(session => session.UpdatedAt)
                .Select(session => session.SessionId)
                .FirstOrDefaultAsync(cancellationToken);

            if (latest == 0)
            {
                return null;
            }

            return await BuildSessionResponseAsync(latest, userId, cancellationToken);
        }

        public async Task<LearningSessionResponse> SaveSessionAnswerAsync(
            long userId,
            long sessionId,
            SaveLearningSessionAnswerRequest request,
            CancellationToken cancellationToken)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));
            if (request.Quality is < 0 or > 5)
            {
                throw new ArgumentException("Quality must be between 0 and 5.", nameof(request));
            }

            var session = await _context.LearningSessions
                .Include(s => s.Items)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
            if (session == null)
            {
                throw new KeyNotFoundException($"Session {sessionId} not found.");
            }
            if (session.UserId != userId)
            {
                throw new UnauthorizedAccessException("Session does not belong to the current user.");
            }
            if (session.Status != LearningSessionStatuses.InProgress)
            {
                throw new InvalidOperationException($"Session {sessionId} is not in progress (status={session.Status}).");
            }

            var item = session.Items.FirstOrDefault(i => i.VocabId == request.VocabId);
            if (item == null)
            {
                throw new KeyNotFoundException($"Vocab {request.VocabId} is not part of session {sessionId}.");
            }

            var now = DateTime.UtcNow;
            item.Quality = request.Quality;
            item.IsAnswered = true;
            item.AnsweredAt = now;

            var nextIndex = item.OrderIndex + 1;
            if (request.CurrentIndex.HasValue)
            {
                nextIndex = Math.Max(nextIndex, request.CurrentIndex.Value);
            }
            session.CurrentIndex = Math.Max(session.CurrentIndex, Math.Max(0, nextIndex));
            session.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);

            return await BuildSessionResponseAsync(sessionId, userId, cancellationToken)
                ?? throw new InvalidOperationException("Failed to reload session after save.");
        }

        public async Task<CompleteLearningSessionResponse> CompleteSessionAsync(
            long userId,
            long sessionId,
            CancellationToken cancellationToken)
        {
            // Npgsql retry strategy is enabled (Program.cs EnableRetryOnFailure), so a
            // user-initiated transaction must be executed via the execution strategy delegate
            // so the whole unit is retried atomically. EF Core throws otherwise:
            // "The configured execution strategy 'NpgsqlRetryingExecutionStrategy' does not
            // support user-initiated transactions."
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                var session = await _context.LearningSessions
                    .Include(s => s.Items)
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
                if (session == null)
                {
                    throw new KeyNotFoundException($"Session {sessionId} not found.");
                }
                if (session.UserId != userId)
                {
                    throw new UnauthorizedAccessException("Session does not belong to the current user.");
                }
                if (session.Status != LearningSessionStatuses.InProgress)
                {
                    throw new InvalidOperationException($"Session {sessionId} is not in progress (status={session.Status}).");
                }

                var answeredItems = session.Items
                    .Where(item => item.IsAnswered && item.Quality.HasValue)
                    .OrderBy(item => item.OrderIndex)
                    .ToList();
                if (answeredItems.Count == 0)
                {
                    throw new InvalidOperationException("Cannot complete a session with no answered items.");
                }

                var now = DateTime.UtcNow;
                var vocabIds = answeredItems.Select(item => item.VocabId).ToList();

                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var existingProgresses = await _context.Progresses
                        .Where(progress => progress.UserId == userId && vocabIds.Contains(progress.VocabId))
                        .ToListAsync(cancellationToken);
                    var progressByVocabId = existingProgresses.ToDictionary(progress => progress.VocabId);

                    var existingUserVocabularies = await _context.UserVocabularies
                        .Where(item => item.UserId == userId && vocabIds.Contains(item.VocabId))
                        .ToListAsync(cancellationToken);
                    var userVocabByVocabId = existingUserVocabularies.ToDictionary(item => item.VocabId);

                    foreach (var item in answeredItems)
                    {
                        var quality = Math.Clamp(item.Quality!.Value, 0, 5);

                        if (!progressByVocabId.TryGetValue(item.VocabId, out var progress))
                        {
                            progress = new Progress { UserId = userId, VocabId = item.VocabId };
                            _context.Progresses.Add(progress);
                            progressByVocabId[item.VocabId] = progress;
                        }

                        var isFirstExposure = progress.Repetitions == 0;
                        var plan = Sm2Calculator.Plan(
                            ToSm2State(progress),
                            quality,
                            now,
                            isFirstExposure,
                            isRepeatedThisSession: false);

                        ApplySm2Plan(progress, plan);

                        if (!userVocabByVocabId.TryGetValue(item.VocabId, out var userVocabulary))
                        {
                            userVocabulary = new UserVocabulary
                            {
                                UserId = userId,
                                VocabId = item.VocabId,
                                Status = plan.Status,
                                Note = string.Empty,
                                FirstLearnedDate = now
                            };
                            _context.UserVocabularies.Add(userVocabulary);
                            userVocabByVocabId[item.VocabId] = userVocabulary;
                        }
                        else
                        {
                            userVocabulary.Status = plan.Status;
                            userVocabulary.FirstLearnedDate ??= now;
                        }
                    }

                    session.Status = LearningSessionStatuses.Completed;
                    session.CompletedAt = now;
                    session.UpdatedAt = now;

                    await _context.SaveChangesAsync(cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                }
                catch
                {
                    await transaction.RollbackAsync(cancellationToken);
                    throw;
                }

                return new CompleteLearningSessionResponse
                {
                    SessionId = session.SessionId,
                    Status = session.Status,
                    CompletedAt = session.CompletedAt ?? now,
                    CommittedItemCount = answeredItems.Count,
                    Progress = GetLearningProgressState(userId)
                };
            });
        }

        public async Task<bool> AbandonSessionAsync(
            long userId,
            long sessionId,
            CancellationToken cancellationToken)
        {
            var session = await _context.LearningSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
            if (session == null)
            {
                throw new KeyNotFoundException($"Session {sessionId} not found.");
            }
            if (session.UserId != userId)
            {
                throw new UnauthorizedAccessException("Session does not belong to the current user.");
            }
            if (session.Status != LearningSessionStatuses.InProgress)
            {
                return false;
            }

            var now = DateTime.UtcNow;
            session.Status = LearningSessionStatuses.Abandoned;
            session.AbandonedAt = now;
            session.UpdatedAt = now;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        private async Task<LearningSessionResponse?> BuildSessionResponseAsync(
            long sessionId,
            long userId,
            CancellationToken cancellationToken)
        {
            var session = await _context.LearningSessions
                .AsNoTracking()
                .Where(s => s.SessionId == sessionId && s.UserId == userId)
                .Select(s => new
                {
                    s.SessionId,
                    s.UserId,
                    s.TopicId,
                    s.Mode,
                    s.Status,
                    s.CurrentIndex,
                    s.StartedAt,
                    s.UpdatedAt,
                    s.CompletedAt,
                    s.AbandonedAt
                })
                .FirstOrDefaultAsync(cancellationToken);
            if (session == null) return null;

            var items = await _context.LearningSessionItems
                .AsNoTracking()
                .Where(item => item.SessionId == sessionId)
                .OrderBy(item => item.OrderIndex)
                .Join(
                    _context.Vocabularies.AsNoTracking(),
                    item => item.VocabId,
                    vocabulary => vocabulary.VocabId,
                    (item, vocabulary) => new LearningSessionItemResponse
                    {
                        SessionItemId = item.SessionItemId,
                        VocabId = item.VocabId,
                        OrderIndex = item.OrderIndex,
                        IsAnswered = item.IsAnswered,
                        Quality = item.Quality,
                        AnsweredAt = item.AnsweredAt,
                        Word = vocabulary.Word,
                        Ipa = vocabulary.Ipa,
                        AudioUrl = vocabulary.AudioUrl,
                        Level = vocabulary.Level,
                        MeaningVi = vocabulary.MeaningVi
                    })
                .ToListAsync(cancellationToken);

            return new LearningSessionResponse
            {
                SessionId = session.SessionId,
                UserId = session.UserId,
                TopicId = session.TopicId,
                Mode = session.Mode,
                Status = session.Status,
                CurrentIndex = session.CurrentIndex,
                StartedAt = session.StartedAt,
                UpdatedAt = session.UpdatedAt,
                CompletedAt = session.CompletedAt,
                AbandonedAt = session.AbandonedAt,
                Items = items
            };
        }
    }
}
