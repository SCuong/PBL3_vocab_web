using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Vocabulary
{
    public class VocabularyFormViewModel
    {
        public long VocabId { get; set; }

        [Required(ErrorMessage = "Word is required.")]
        [StringLength(100, ErrorMessage = "Word cannot exceed 100 characters.")]
        public string? Word { get; set; }

        [Display(Name = "IPA")]
        [StringLength(100, ErrorMessage = "IPA cannot exceed 100 characters.")]
        public string? Ipa { get; set; }

        [Display(Name = "Audio URL")]
        [StringLength(255, ErrorMessage = "Audio URL cannot exceed 255 characters.")]
        public string? AudioUrl { get; set; }

        [StringLength(50, ErrorMessage = "Level cannot exceed 50 characters.")]
        public string? Level { get; set; }

        [Display(Name = "Meaning (VI)")]
        [StringLength(500, ErrorMessage = "Meaning (VI) cannot exceed 500 characters.")]
        public string? MeaningVi { get; set; }

        [Display(Name = "Topic")]
        public long? TopicId { get; set; }

        public IReadOnlyList<SelectListItem> LevelOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> TopicOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
