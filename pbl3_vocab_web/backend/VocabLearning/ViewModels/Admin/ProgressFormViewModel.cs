using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class ProgressFormViewModel
    {
        public long OriginalUserId { get; set; }

        public long OriginalVocabId { get; set; }

        [Display(Name = "User")]
        [Required(ErrorMessage = "User is required.")]
        public long UserId { get; set; }

        [Display(Name = "Vocabulary")]
        [Required(ErrorMessage = "Vocabulary is required.")]
        public long VocabId { get; set; }

        [Display(Name = "Last Review Date")]
        public DateTime? LastReviewDate { get; set; }

        [Display(Name = "Next Review Date")]
        public DateTime? NextReviewDate { get; set; }

        public IReadOnlyList<SelectListItem> UserOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> VocabularyOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
