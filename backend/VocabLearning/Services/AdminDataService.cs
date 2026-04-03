using VocabLearning.Data;
using VocabLearning.Models;

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
                .OrderBy(exercise => exercise.ExerciseId)
                .ToList();
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
            if (!UserExists(userVocabulary.UserId) || !VocabularyExists(userVocabulary.VocabId))
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

            if (!UserExists(updatedUserVocabulary.UserId) || !VocabularyExists(updatedUserVocabulary.VocabId))
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
            if (!UserExists(progress.UserId) || !VocabularyExists(progress.VocabId))
            {
                return (false, "User or vocabulary does not exist.");
            }

            if (!UserVocabularyExists(progress.UserId, progress.VocabId))
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

            if (!UserExists(updatedProgress.UserId) || !VocabularyExists(updatedProgress.VocabId))
            {
                return (false, "User or vocabulary does not exist.");
            }

            if (!UserVocabularyExists(updatedProgress.UserId, updatedProgress.VocabId))
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
            if (!VocabularyExists(exercise.VocabId))
            {
                return (false, "Vocabulary does not exist.");
            }

            if (string.IsNullOrWhiteSpace(exercise.Type))
            {
                return (false, "Type is required.");
            }

            if (exercise.CreatedAt == default)
            {
                exercise.CreatedAt = DateTime.Now;
            }

            _context.Exercises.Add(exercise);
            _context.SaveChanges();
            return (true, null);
        }

        public (bool Succeeded, string? ErrorMessage) UpdateExercise(Exercise updatedExercise)
        {
            var exercise = GetExerciseById(updatedExercise.ExerciseId);

            if (exercise == null || !VocabularyExists(updatedExercise.VocabId))
            {
                return (false, "Exercise or vocabulary was not found.");
            }

            if (string.IsNullOrWhiteSpace(updatedExercise.Type))
            {
                return (false, "Type is required.");
            }

            exercise.VocabId = updatedExercise.VocabId;
            exercise.Type = updatedExercise.Type;
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
            if (!ExerciseExists(exerciseResult.ExerciseId) || !UserExists(exerciseResult.UserId))
            {
                return (false, "Exercise or user does not exist.");
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

            if (!ExerciseExists(updatedExerciseResult.ExerciseId) || !UserExists(updatedExerciseResult.UserId))
            {
                return (false, "Exercise or user does not exist.");
            }

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
            if (!UserExists(learningLog.UserId))
            {
                return (false, "User does not exist.");
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

            if (!UserExists(updatedLearningLog.UserId))
            {
                return (false, "User does not exist.");
            }

            learningLog.UserId = updatedLearningLog.UserId;
            learningLog.Date = updatedLearningLog.Date;
            learningLog.ActivityType = updatedLearningLog.ActivityType;
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

        private bool UserExists(long userId)
        {
            return _context.Users.Any(user => user.UserId == userId);
        }

        private bool VocabularyExists(long vocabId)
        {
            return _context.Vocabularies.Any(vocabulary => vocabulary.VocabId == vocabId);
        }

        private bool UserVocabularyExists(long userId, long vocabId)
        {
            return _context.UserVocabularies.Any(item => item.UserId == userId && item.VocabId == vocabId);
        }

        private bool ExerciseExists(long exerciseId)
        {
            return _context.Exercises.Any(exercise => exercise.ExerciseId == exerciseId);
        }
    }
}
