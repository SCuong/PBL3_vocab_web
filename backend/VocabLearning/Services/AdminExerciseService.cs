using VocabLearning.Models;
using VocabLearning.ViewModels.Admin;

namespace VocabLearning.Services
{
    public class AdminExerciseService
    {
        private readonly AdminDataService _adminDataService;

        public AdminExerciseService(AdminDataService adminDataService)
        {
            _adminDataService = adminDataService;
        }

        public List<AdminExerciseViewModel> GetExercises()
        {
            return _adminDataService.GetExercises()
                .Select(MapToViewModel)
                .ToList();
        }

        public AdminExerciseViewModel? GetExerciseById(long id)
        {
            var exercise = _adminDataService.GetExerciseById(id);
            return exercise == null ? null : MapToViewModel(exercise);
        }

        public (bool Succeeded, string? ErrorMessage) CreateExercise(ExerciseFormViewModel model)
        {
            return _adminDataService.CreateExercise(new Exercise
            {
                VocabId = model.VocabId,
                Type = model.Type.Trim(),
                MatchMode = model.MatchMode?.Trim(),
                CreatedAt = model.CreatedAt
            });
        }

        public (bool Succeeded, string? ErrorMessage) UpdateExercise(ExerciseFormViewModel model)
        {
            return _adminDataService.UpdateExercise(new Exercise
            {
                ExerciseId = model.ExerciseId,
                VocabId = model.VocabId,
                Type = model.Type.Trim(),
                MatchMode = model.MatchMode?.Trim(),
                CreatedAt = model.CreatedAt
            });
        }

        public bool DeleteExercise(long id)
        {
            return _adminDataService.DeleteExercise(id);
        }

        private static AdminExerciseViewModel MapToViewModel(Exercise exercise)
        {
            return new AdminExerciseViewModel
            {
                ExerciseId = exercise.ExerciseId,
                VocabId = exercise.VocabId,
                Type = exercise.Type,
                MatchMode = exercise.MatchMode,
                CreatedAt = exercise.CreatedAt
            };
        }
    }
}
