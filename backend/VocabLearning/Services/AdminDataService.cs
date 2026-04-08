using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Constants;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Services
{
    public class AdminDataService
    {
        private readonly AppDbContext _context;

        public AdminDataService(AppDbContext context)
        {
            _context = context;
        }

        public List<Users> GetUsers()
        {
            return _context.Users
                .OrderBy(user => user.Username)
                .ToList();
        }

        public List<Vocabulary> GetVocabularies()
        {
            return _context.Vocabularies
                .OrderBy(vocabulary => vocabulary.Word)
                .ToList();
        }

        public List<Topic> GetTopics()
        {
            return _context.Topics
                .OrderBy(topic => topic.Name)
                .ToList();
        }

        public List<Exercise> GetExercises()
        {
            return _context.Exercises
                .OrderByDescending(exercise => exercise.CreatedAt)
                .ThenByDescending(exercise => exercise.ExerciseId)
                .ToList();
        }

        public List<ExerciseSession> GetExerciseSessions()
        {
            return _context.ExerciseSessions
                .OrderByDescending(session => session.StartedAt)
                .ThenByDescending(session => session.SessionId)
                .ToList();
        }

        public List<LearningOverviewRowViewModel> GetLearningOverviewRows(
            long? userId = null,
            long? topicId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            var sessions = _context.ExerciseSessions
                .Select(session => new
                {
                    session.SessionId,
                    session.UserId,
                    session.TopicId,
                    session.StartedAt,
                    session.FinishedAt
                })
                .ToList();
            var toDateExclusive = toDate?.Date.AddDays(1);
            var rows = new List<LearningOverviewRowViewModel>();

            foreach (var session in sessions)
            {
                if (userId.HasValue && session.UserId != userId.Value)
                {
                    continue;
                }

                if (topicId.HasValue && session.TopicId != topicId.Value)
                {
                    continue;
                }

                if (fromDate.HasValue && session.StartedAt < fromDate.Value)
                {
                    continue;
                }

                if (toDateExclusive.HasValue && session.StartedAt >= toDateExclusive.Value)
                {
                    continue;
                }

                var row = rows.FirstOrDefault(item => item.UserId == session.UserId && item.TopicId == session.TopicId);

                if (row == null)
                {
                    var user = _context.Users.FirstOrDefault(item => item.UserId == session.UserId);
                    var topic = _context.Topics.FirstOrDefault(item => item.TopicId == session.TopicId);

                    row = new LearningOverviewRowViewModel
                    {
                        UserId = session.UserId,
                        Username = string.IsNullOrWhiteSpace(user?.Username) ? $"User {session.UserId}" : user.Username,
                        TopicId = session.TopicId,
                        TopicName = string.IsNullOrWhiteSpace(topic?.Name) ? $"Topic {session.TopicId}" : topic.Name,
                        SessionCount = 0,
                        WordsStudied = 0,
                        ActiveMinutes = 0,
                        FirstActivityAt = session.StartedAt,
                        LastActivityAt = session.FinishedAt ?? session.StartedAt
                    };

                    rows.Add(row);
                }

                row.SessionCount += 1;

                if (session.StartedAt < row.FirstActivityAt)
                {
                    row.FirstActivityAt = session.StartedAt;
                }

                if ((session.FinishedAt ?? session.StartedAt) > row.LastActivityAt)
                {
                    row.LastActivityAt = session.FinishedAt ?? session.StartedAt;
                }

                if (session.FinishedAt.HasValue && session.FinishedAt.Value >= session.StartedAt)
                {
                    row.ActiveMinutes += (session.FinishedAt.Value - session.StartedAt).TotalMinutes;
                }

                var wordsStudiedInSession = _context.LearningLogs
                    .Where(log => log.SessionId == session.SessionId)
                    .ToList();

                foreach (var log in wordsStudiedInSession)
                {
                    if (log.WordsStudied > 0)
                    {
                        row.WordsStudied += log.WordsStudied;
                    }
                }
            }

            return rows
                .OrderByDescending(item => item.LastActivityAt)
                .ThenBy(item => item.Username)
                .ThenBy(item => item.TopicName)
                .ToList();
        }

        public List<string> GetExerciseTypeSuggestions()
        {
            var result = new List<string>();

            foreach (var type in ExerciseTypes.All)
            {
                if (!result.Contains(type, StringComparer.OrdinalIgnoreCase))
                {
                    result.Add(type);
                }
            }

            foreach (var type in _context.Exercises.Select(exercise => exercise.Type).ToList())
            {
                var cleanType = type?.Trim();
                if (!string.IsNullOrWhiteSpace(cleanType) && !result.Contains(cleanType, StringComparer.OrdinalIgnoreCase))
                {
                    result.Add(cleanType);
                }
            }

            result.Sort(StringComparer.OrdinalIgnoreCase);
            return result;
        }

        public List<string> GetExerciseMatchModeSuggestions()
        {
            var result = new List<string>();

            foreach (var mode in ExerciseMatchModes.All)
            {
                if (!result.Contains(mode, StringComparer.OrdinalIgnoreCase))
                {
                    result.Add(mode);
                }
            }

            foreach (var mode in _context.Exercises.Select(exercise => exercise.MatchMode).ToList())
            {
                var cleanMode = mode?.Trim();
                if (!string.IsNullOrWhiteSpace(cleanMode) && !result.Contains(cleanMode, StringComparer.OrdinalIgnoreCase))
                {
                    result.Add(cleanMode);
                }
            }

            result.Sort(StringComparer.OrdinalIgnoreCase);
            return result;
        }

        public Dictionary<long, string> GetExerciseLabels()
        {
            var labels = new Dictionary<long, string>();

            foreach (var exercise in GetExercises())
            {
                var vocabulary = _context.Vocabularies.FirstOrDefault(item => item.VocabId == exercise.VocabId);
                var word = string.IsNullOrWhiteSpace(vocabulary?.Word) ? "Unknown word" : vocabulary.Word.Trim();
                var type = string.IsNullOrWhiteSpace(exercise.Type) ? "Unknown type" : exercise.Type.Trim();
                labels[exercise.ExerciseId] = $"#{exercise.ExerciseId} • {word} • {type}";
            }

            return labels;
        }

        public Dictionary<long, string> GetExerciseSessionLabels()
        {
            var labels = new Dictionary<long, string>();

            foreach (var session in GetExerciseSessions())
            {
                var user = _context.Users.FirstOrDefault(item => item.UserId == session.UserId);
                var userLabel = string.IsNullOrWhiteSpace(user?.Username) ? $"User {session.UserId}" : user.Username;
                labels[session.SessionId] = $"#{session.SessionId} • {userLabel} • {session.SessionType} • {session.StartedAt:yyyy-MM-dd HH:mm}";
            }

            return labels;
        }

        public Topic? GetTopicById(long id)
        {
            return _context.Topics.FirstOrDefault(topic => topic.TopicId == id);
        }

        public (bool Succeeded, string? ErrorMessage) CreateTopic(Topic topic)
        {
            if (string.IsNullOrWhiteSpace(topic.Name))
            {
                return (false, "Topic name is required.");
            }

            if (string.IsNullOrWhiteSpace(topic.Description))
            {
                return (false, "Topic description is required.");
            }

            if (topic.ParentTopicId.HasValue && !_context.Topics.Any(item => item.TopicId == topic.ParentTopicId.Value))
            {
                return (false, "Parent topic does not exist.");
            }

            _context.Topics.Add(topic);
            _context.SaveChanges();
            return (true, null);
        }

        public bool UpdateTopic(Topic updatedTopic)
        {
            var topic = GetTopicById(updatedTopic.TopicId);

            if (topic == null)
            {
                return false;
            }

            if (updatedTopic.ParentTopicId == updatedTopic.TopicId)
            {
                return false;
            }

            if (updatedTopic.ParentTopicId.HasValue && !_context.Topics.Any(item => item.TopicId == updatedTopic.ParentTopicId.Value))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(updatedTopic.Name) || string.IsNullOrWhiteSpace(updatedTopic.Description))
            {
                return false;
            }

            topic.Name = updatedTopic.Name;
            topic.Description = updatedTopic.Description;
            topic.ParentTopicId = updatedTopic.ParentTopicId;

            _context.SaveChanges();
            return true;
        }

        public bool DeleteTopic(long id)
        {
            var topic = GetTopicById(id);

            if (topic == null)
            {
                return false;
            }

            var childTopics = _context.Topics.Where(item => item.ParentTopicId == id).ToList();

            foreach (var childTopic in childTopics)
            {
                childTopic.ParentTopicId = null;
            }

            _context.Topics.Remove(topic);
            _context.SaveChanges();
            return true;
        }

        public List<UserVocabulary> GetUserVocabularies()
        {
            return _context.UserVocabularies
                .OrderBy(item => item.UserId)
                .ThenBy(item => item.VocabId)
                .ToList();
        }

        public UserVocabulary? GetUserVocabulary(long userId, long vocabId)
        {
            return _context.UserVocabularies
                .FirstOrDefault(item => item.UserId == userId && item.VocabId == vocabId);
        }

        public (bool Succeeded, string? ErrorMessage) CreateUserVocabulary(UserVocabulary userVocabulary)
        {
            var hasUser = _context.Users.Any(item => item.UserId == userVocabulary.UserId);
            var hasVocabulary = _context.Vocabularies.Any(item => item.VocabId == userVocabulary.VocabId);

            if (!hasUser || !hasVocabulary)
            {
                return (false, "User or vocabulary does not exist.");
            }

            if (GetUserVocabulary(userVocabulary.UserId, userVocabulary.VocabId) != null)
            {
                return (false, "This user-vocabulary record already exists.");
            }

            _context.UserVocabularies.Add(userVocabulary);
            _context.SaveChanges();
            return (true, null);
        }

        public (bool Succeeded, string? ErrorMessage) UpdateUserVocabulary(
            long originalUserId,
            long originalVocabId,
            UserVocabulary updatedUserVocabulary)
        {
            var existing = GetUserVocabulary(originalUserId, originalVocabId);

            if (existing == null)
            {
                return (false, "User-vocabulary record was not found.");
            }

            var hasUser = _context.Users.Any(item => item.UserId == updatedUserVocabulary.UserId);
            var hasVocabulary = _context.Vocabularies.Any(item => item.VocabId == updatedUserVocabulary.VocabId);

            if (!hasUser || !hasVocabulary)
            {
                return (false, "User or vocabulary does not exist.");
            }

            var isChangingKey = originalUserId != updatedUserVocabulary.UserId || originalVocabId != updatedUserVocabulary.VocabId;
            if (isChangingKey && GetUserVocabulary(updatedUserVocabulary.UserId, updatedUserVocabulary.VocabId) != null)
            {
                return (false, "This user-vocabulary record already exists.");
            }

            _context.UserVocabularies.Remove(existing);
            _context.UserVocabularies.Add(updatedUserVocabulary);
            _context.SaveChanges();
            return (true, null);
        }

        public bool DeleteUserVocabulary(long userId, long vocabId)
        {
            var existing = GetUserVocabulary(userId, vocabId);

            if (existing == null)
            {
                return false;
            }

            _context.UserVocabularies.Remove(existing);
            _context.SaveChanges();
            return true;
        }

        public List<Progress> GetProgresses()
        {
            return _context.Progresses
                .OrderBy(item => item.UserId)
                .ThenBy(item => item.VocabId)
                .ToList();
        }

        public Progress? GetProgress(long userId, long vocabId)
        {
            return _context.Progresses
                .FirstOrDefault(item => item.UserId == userId && item.VocabId == vocabId);
        }

        public (bool Succeeded, string? ErrorMessage) CreateProgress(Progress progress)
        {
            var hasUser = _context.Users.Any(item => item.UserId == progress.UserId);
            var hasVocabulary = _context.Vocabularies.Any(item => item.VocabId == progress.VocabId);

            if (!hasUser || !hasVocabulary)
            {
                return (false, "User or vocabulary does not exist.");
            }

            var hasUserVocabulary = _context.UserVocabularies.Any(item => item.UserId == progress.UserId && item.VocabId == progress.VocabId);
            if (!hasUserVocabulary)
            {
                return (false, "The matching user vocabulary record must exist before creating progress.");
            }

            if (GetProgress(progress.UserId, progress.VocabId) != null)
            {
                return (false, "This progress record already exists.");
            }

            _context.Progresses.Add(progress);
            _context.SaveChanges();
            return (true, null);
        }

        public (bool Succeeded, string? ErrorMessage) UpdateProgress(
            long originalUserId,
            long originalVocabId,
            Progress updatedProgress)
        {
            var existing = GetProgress(originalUserId, originalVocabId);

            if (existing == null)
            {
                return (false, "Progress record was not found.");
            }

            var hasUser = _context.Users.Any(item => item.UserId == updatedProgress.UserId);
            var hasVocabulary = _context.Vocabularies.Any(item => item.VocabId == updatedProgress.VocabId);

            if (!hasUser || !hasVocabulary)
            {
                return (false, "User or vocabulary does not exist.");
            }

            var hasUserVocabulary = _context.UserVocabularies.Any(item => item.UserId == updatedProgress.UserId && item.VocabId == updatedProgress.VocabId);
            if (!hasUserVocabulary)
            {
                return (false, "The matching user vocabulary record must exist before updating progress.");
            }

            var isChangingKey = originalUserId != updatedProgress.UserId || originalVocabId != updatedProgress.VocabId;
            if (isChangingKey && GetProgress(updatedProgress.UserId, updatedProgress.VocabId) != null)
            {
                return (false, "This progress record already exists.");
            }

            _context.Progresses.Remove(existing);
            _context.Progresses.Add(updatedProgress);
            _context.SaveChanges();
            return (true, null);
        }

        public bool DeleteProgress(long userId, long vocabId)
        {
            var existing = GetProgress(userId, vocabId);

            if (existing == null)
            {
                return false;
            }

            _context.Progresses.Remove(existing);
            _context.SaveChanges();
            return true;
        }

        public Exercise? GetExerciseById(long id)
        {
            return _context.Exercises.FirstOrDefault(exercise => exercise.ExerciseId == id);
        }

        public (bool Succeeded, string? ErrorMessage) CreateExercise(Exercise exercise)
        {
            var hasVocabulary = _context.Vocabularies.Any(item => item.VocabId == exercise.VocabId);
            if (!hasVocabulary)
            {
                return (false, "Vocabulary does not exist.");
            }

            var cleanType = exercise.Type?.Trim().ToUpperInvariant() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(cleanType))
            {
                return (false, "Exercise type is required.");
            }

            if (!ExerciseTypes.All.Contains(cleanType, StringComparer.OrdinalIgnoreCase))
            {
                return (false, "Exercise type is invalid.");
            }

            var cleanMatchMode = string.IsNullOrWhiteSpace(exercise.MatchMode)
                ? null
                : exercise.MatchMode.Trim().ToUpperInvariant();
            if (string.Equals(cleanType, ExerciseTypes.MatchMeaning, StringComparison.OrdinalIgnoreCase)
                && string.IsNullOrWhiteSpace(cleanMatchMode))
            {
                return (false, "Match mode is required for MATCH_MEANING exercises.");
            }

            if (!string.IsNullOrWhiteSpace(cleanMatchMode)
                && !ExerciseMatchModes.All.Contains(cleanMatchMode, StringComparer.OrdinalIgnoreCase))
            {
                return (false, "Match mode is invalid.");
            }

            if (!string.Equals(cleanType, ExerciseTypes.MatchMeaning, StringComparison.OrdinalIgnoreCase))
            {
                cleanMatchMode = null;
            }

            var duplicateExists = _context.Exercises.Any(item =>
                item.VocabId == exercise.VocabId
                && string.Equals(item.Type, cleanType, StringComparison.OrdinalIgnoreCase)
                && string.Equals(item.MatchMode ?? string.Empty, cleanMatchMode ?? string.Empty, StringComparison.OrdinalIgnoreCase));

            if (duplicateExists)
            {
                return (false, "An exercise with the same vocabulary and type already exists.");
            }

            if (exercise.CreatedAt == default)
            {
                exercise.CreatedAt = DateTime.Now;
            }

            exercise.Type = cleanType;
            exercise.MatchMode = cleanMatchMode;
            _context.Exercises.Add(exercise);
            _context.SaveChanges();
            return (true, null);
        }

        public (bool Succeeded, string? ErrorMessage) UpdateExercise(Exercise updatedExercise)
        {
            var exercise = GetExerciseById(updatedExercise.ExerciseId);
            var hasVocabulary = _context.Vocabularies.Any(item => item.VocabId == updatedExercise.VocabId);

            if (exercise == null || !hasVocabulary)
            {
                return (false, "Exercise or vocabulary was not found.");
            }

            var cleanType = updatedExercise.Type?.Trim().ToUpperInvariant() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(cleanType))
            {
                return (false, "Exercise type is required.");
            }

            if (!ExerciseTypes.All.Contains(cleanType, StringComparer.OrdinalIgnoreCase))
            {
                return (false, "Exercise type is invalid.");
            }

            var cleanMatchMode = string.IsNullOrWhiteSpace(updatedExercise.MatchMode)
                ? null
                : updatedExercise.MatchMode.Trim().ToUpperInvariant();
            if (string.Equals(cleanType, ExerciseTypes.MatchMeaning, StringComparison.OrdinalIgnoreCase)
                && string.IsNullOrWhiteSpace(cleanMatchMode))
            {
                return (false, "Match mode is required for MATCH_MEANING exercises.");
            }

            if (!string.IsNullOrWhiteSpace(cleanMatchMode)
                && !ExerciseMatchModes.All.Contains(cleanMatchMode, StringComparer.OrdinalIgnoreCase))
            {
                return (false, "Match mode is invalid.");
            }

            if (!string.Equals(cleanType, ExerciseTypes.MatchMeaning, StringComparison.OrdinalIgnoreCase))
            {
                cleanMatchMode = null;
            }

            var duplicateExists = _context.Exercises.Any(item =>
                item.ExerciseId != updatedExercise.ExerciseId
                && item.VocabId == updatedExercise.VocabId
                && string.Equals(item.Type, cleanType, StringComparison.OrdinalIgnoreCase)
                && string.Equals(item.MatchMode ?? string.Empty, cleanMatchMode ?? string.Empty, StringComparison.OrdinalIgnoreCase));

            if (duplicateExists)
            {
                return (false, "An exercise with the same vocabulary and type already exists.");
            }

            exercise.VocabId = updatedExercise.VocabId;
            exercise.Type = cleanType;
            exercise.MatchMode = cleanMatchMode;
            if (updatedExercise.CreatedAt != default)
            {
                exercise.CreatedAt = updatedExercise.CreatedAt;
            }

            _context.SaveChanges();
            return (true, null);
        }

        public bool DeleteExercise(long id)
        {
            var exercise = GetExerciseById(id);

            if (exercise == null)
            {
                return false;
            }

            var results = _context.ExerciseResults.Where(item => item.ExerciseId == id).ToList();

            _context.ExerciseResults.RemoveRange(results);
            _context.Exercises.Remove(exercise);
            _context.SaveChanges();
            return true;
        }

        public List<ExerciseResult> GetExerciseResults()
        {
            return _context.ExerciseResults
                .OrderByDescending(item => item.AnsweredAt)
                .ThenBy(item => item.ResultId)
                .ToList();
        }

        public ExerciseResult? GetExerciseResultById(long id)
        {
            return _context.ExerciseResults.FirstOrDefault(item => item.ResultId == id);
        }

        public (bool Succeeded, string? ErrorMessage) CreateExerciseResult(ExerciseResult exerciseResult)
        {
            var hasExercise = _context.Exercises.Any(item => item.ExerciseId == exerciseResult.ExerciseId);
            var hasUser = _context.Users.Any(item => item.UserId == exerciseResult.UserId);
            var hasSession = _context.ExerciseSessions.Any(item => item.SessionId == exerciseResult.SessionId);

            if (!hasExercise || !hasUser || !hasSession)
            {
                return (false, "Exercise, session or user does not exist.");
            }

            _context.ExerciseResults.Add(exerciseResult);
            _context.SaveChanges();
            return (true, null);
        }

        public (bool Succeeded, string? ErrorMessage) UpdateExerciseResult(ExerciseResult updatedExerciseResult)
        {
            var exerciseResult = GetExerciseResultById(updatedExerciseResult.ResultId);

            if (exerciseResult == null)
            {
                return (false, "Exercise result was not found.");
            }

            var hasExercise = _context.Exercises.Any(item => item.ExerciseId == updatedExerciseResult.ExerciseId);
            var hasUser = _context.Users.Any(item => item.UserId == updatedExerciseResult.UserId);
            var hasSession = _context.ExerciseSessions.Any(item => item.SessionId == updatedExerciseResult.SessionId);

            if (!hasExercise || !hasUser || !hasSession)
            {
                return (false, "Exercise, session or user does not exist.");
            }

            exerciseResult.SessionId = updatedExerciseResult.SessionId;
            exerciseResult.ExerciseId = updatedExerciseResult.ExerciseId;
            exerciseResult.UserId = updatedExerciseResult.UserId;
            exerciseResult.IsCorrect = updatedExerciseResult.IsCorrect;
            exerciseResult.AnsweredAt = updatedExerciseResult.AnsweredAt;

            _context.SaveChanges();
            return (true, null);
        }

        public bool DeleteExerciseResult(long id)
        {
            var exerciseResult = GetExerciseResultById(id);

            if (exerciseResult == null)
            {
                return false;
            }

            _context.ExerciseResults.Remove(exerciseResult);
            _context.SaveChanges();
            return true;
        }

        public List<LearningLog> GetLearningLogs()
        {
            return _context.LearningLogs
                .OrderByDescending(item => item.Date)
                .ThenBy(item => item.LogId)
                .ToList();
        }

        public LearningLog? GetLearningLogById(long id)
        {
            return _context.LearningLogs.FirstOrDefault(item => item.LogId == id);
        }

        public (bool Succeeded, string? ErrorMessage) CreateLearningLog(LearningLog learningLog)
        {
            var hasUser = _context.Users.Any(item => item.UserId == learningLog.UserId);
            var hasSession = _context.ExerciseSessions.Any(item => item.SessionId == learningLog.SessionId);

            if (!hasUser || !hasSession)
            {
                return (false, "User or session does not exist.");
            }

            if (_context.LearningLogs.Any(item => item.SessionId == learningLog.SessionId))
            {
                return (false, "This session already has a learning log.");
            }

            _context.LearningLogs.Add(learningLog);
            _context.SaveChanges();
            return (true, null);
        }

        public (bool Succeeded, string? ErrorMessage) UpdateLearningLog(LearningLog updatedLearningLog)
        {
            var learningLog = GetLearningLogById(updatedLearningLog.LogId);

            if (learningLog == null)
            {
                return (false, "Learning log was not found.");
            }

            var hasUser = _context.Users.Any(item => item.UserId == updatedLearningLog.UserId);
            var hasSession = _context.ExerciseSessions.Any(item => item.SessionId == updatedLearningLog.SessionId);

            if (!hasUser || !hasSession)
            {
                return (false, "User or session does not exist.");
            }

            if (_context.LearningLogs.Any(item => item.LogId != updatedLearningLog.LogId && item.SessionId == updatedLearningLog.SessionId))
            {
                return (false, "This session already has a learning log.");
            }

            learningLog.UserId = updatedLearningLog.UserId;
            learningLog.SessionId = updatedLearningLog.SessionId;
            learningLog.Date = updatedLearningLog.Date;
            learningLog.ActivityType = updatedLearningLog.ActivityType;
            learningLog.WordsStudied = updatedLearningLog.WordsStudied;
            learningLog.Score = updatedLearningLog.Score;

            _context.SaveChanges();
            return (true, null);
        }

        public bool DeleteLearningLog(long id)
        {
            var learningLog = GetLearningLogById(id);

            if (learningLog == null)
            {
                return false;
            }

            _context.LearningLogs.Remove(learningLog);
            _context.SaveChanges();
            return true;
        }


    }
}
