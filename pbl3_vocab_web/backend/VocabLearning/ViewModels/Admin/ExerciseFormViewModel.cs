using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class ExerciseFormViewModel
    {
        public long ExerciseId { get; set; }

        [Display(Name = "Vocabulary")]
        [Required(ErrorMessage = "Vocabulary is required.")]
        public long VocabId { get; set; }

        [Required(ErrorMessage = "Type is required.")]
        [StringLength(100, ErrorMessage = "Type cannot exceed 100 characters.")]
        public string Type { get; set; } = string.Empty;

        [Display(Name = "Created At")]
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public IReadOnlyList<SelectListItem> VocabularyOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
