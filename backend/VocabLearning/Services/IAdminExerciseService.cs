using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Services
{
    public interface IAdminExerciseService
    {
        List<AdminExerciseViewModel> GetExercises();

        AdminExerciseViewModel? GetExerciseById(long id);

        (bool Succeeded, string? ErrorMessage) CreateExercise(ExerciseFormViewModel model);

        (bool Succeeded, string? ErrorMessage) UpdateExercise(ExerciseFormViewModel model);

        bool DeleteExercise(long id);
    }
}
