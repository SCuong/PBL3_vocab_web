using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class ExerciseResultFormViewModel
    {
        public long ResultId { get; set; }

        [Display(Name = "Exercise")]
        [Required(ErrorMessage = "Exercise is required.")]
        public long ExerciseId { get; set; }

        [Display(Name = "User")]
        [Required(ErrorMessage = "User is required.")]
        public long UserId { get; set; }

        [Display(Name = "Is Correct")]
        public bool IsCorrect { get; set; }

        [Display(Name = "Answered At")]
        [Required(ErrorMessage = "Answered time is required.")]
        public DateTime AnsweredAt { get; set; } = DateTime.Now;

        public IReadOnlyList<SelectListItem> ExerciseOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> UserOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
