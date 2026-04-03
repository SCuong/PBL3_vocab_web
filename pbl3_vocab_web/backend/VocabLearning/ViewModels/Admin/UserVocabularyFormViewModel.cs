using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class UserVocabularyFormViewModel
    {
        public long OriginalUserId { get; set; }

        public long OriginalVocabId { get; set; }

        [Display(Name = "User")]
        [Required(ErrorMessage = "User is required.")]
        public long UserId { get; set; }

        [Display(Name = "Vocabulary")]
        [Required(ErrorMessage = "Vocabulary is required.")]
        public long VocabId { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        [StringLength(100, ErrorMessage = "Status cannot exceed 100 characters.")]
        public string Status { get; set; } = string.Empty;

        [StringLength(500, ErrorMessage = "Note cannot exceed 500 characters.")]
        public string Note { get; set; } = string.Empty;

        [Display(Name = "First Learned Date")]
        public DateTime? FirstLearnedDate { get; set; }

        public IReadOnlyList<SelectListItem> UserOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> VocabularyOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
