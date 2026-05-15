using VocabLearning.Models;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Services
{
    public interface IAdminDataService
    {
        List<Users> GetUsers();
        List<Vocabulary> GetVocabularies();
        List<Topic> GetTopics();
        List<Exercise> GetExercises();
        List<ExerciseSession> GetExerciseSessions();
        List<LearningOverviewRowViewModel> GetLearningOverviewRows(
            long? userId = null,
            long? topicId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null);
        List<string> GetExerciseTypeSuggestions();
        List<string> GetExerciseMatchModeSuggestions();
        Dictionary<long, string> GetExerciseLabels();
        Dictionary<long, string> GetExerciseSessionLabels();

        Topic? GetTopicById(long id);
        (bool Succeeded, string? ErrorMessage) CreateTopic(Topic topic);
        bool UpdateTopic(Topic updatedTopic);
        bool DeleteTopic(long id);

        List<UserVocabulary> GetUserVocabularies();
        UserVocabulary? GetUserVocabulary(long userId, long vocabId);
        (bool Succeeded, string? ErrorMessage) CreateUserVocabulary(UserVocabulary userVocabulary);
        (bool Succeeded, string? ErrorMessage) UpdateUserVocabulary(
            long originalUserId,
            long originalVocabId,
            UserVocabulary updatedUserVocabulary);
        bool DeleteUserVocabulary(long userId, long vocabId);

        List<Progress> GetProgresses();
        Progress? GetProgress(long userId, long vocabId);
        (bool Succeeded, string? ErrorMessage) CreateProgress(Progress progress);
        (bool Succeeded, string? ErrorMessage) UpdateProgress(
            long originalUserId,
            long originalVocabId,
            Progress updatedProgress);
        bool DeleteProgress(long userId, long vocabId);

        Exercise? GetExerciseById(long id);
        (bool Succeeded, string? ErrorMessage) CreateExercise(Exercise exercise);
        (bool Succeeded, string? ErrorMessage) UpdateExercise(Exercise updatedExercise);
        bool DeleteExercise(long id);

        List<ExerciseResult> GetExerciseResults();
        ExerciseResult? GetExerciseResultById(long id);
        (bool Succeeded, string? ErrorMessage) CreateExerciseResult(ExerciseResult exerciseResult);
        (bool Succeeded, string? ErrorMessage) UpdateExerciseResult(ExerciseResult updatedExerciseResult);
        bool DeleteExerciseResult(long id);

        List<LearningLog> GetLearningLogs();
        LearningLog? GetLearningLogById(long id);
        (bool Succeeded, string? ErrorMessage) CreateLearningLog(LearningLog learningLog);
        (bool Succeeded, string? ErrorMessage) UpdateLearningLog(LearningLog updatedLearningLog);
        bool DeleteLearningLog(long id);
    }
}
