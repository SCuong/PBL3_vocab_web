using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class ExerciseFormViewModel
    {
        public long ExerciseId { get; set; }

        [Display(Name = "Vocabulary")]
        [Range(1, long.MaxValue, ErrorMessage = "Vocabulary is required.")]
        public long VocabId { get; set; }

        [Display(Name = "Exercise type")]
        [Required(ErrorMessage = "Exercise type is required.")]
        [StringLength(100, ErrorMessage = "Exercise type cannot exceed 100 characters.")]
        public string Type { get; set; } = string.Empty;

        [Display(Name = "Match mode")]
        [StringLength(50, ErrorMessage = "Match mode cannot exceed 50 characters.")]
        public string? MatchMode { get; set; }

        [Display(Name = "Created At")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public IReadOnlyList<SelectListItem> VocabularyOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> TypeOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> MatchModeOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
