using System.ComponentModel.DataAnnotations;

namespace VocabLearning.ViewModels.Example
{
    public class ExampleFormViewModel
    {
        public long ExampleId { get; set; }

        public long VocabId { get; set; }

        [Display(Name = "Example (EN)")]
        [Required(ErrorMessage = "Example in English is required.")]
        [StringLength(500, ErrorMessage = "Example in English cannot exceed 500 characters.")]
        public string? ExampleEn { get; set; }

        [Display(Name = "Example (VI)")]
        [Required(ErrorMessage = "Example in Vietnamese is required.")]
        [StringLength(500, ErrorMessage = "Example in Vietnamese cannot exceed 500 characters.")]
        public string? ExampleVi { get; set; }

        [Display(Name = "Audio URL")]
        [StringLength(255, ErrorMessage = "Audio URL cannot exceed 255 characters.")]
        public string? AudioUrl { get; set; }
    }
}
