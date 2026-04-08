using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class LearningLogFormViewModel
    {
        public long LogId { get; set; }

        [Display(Name = "User")]
        [Required(ErrorMessage = "User is required.")]
        public long UserId { get; set; }

        [Required(ErrorMessage = "Date is required.")]
        public DateTime Date { get; set; } = DateTime.Now;

        [Display(Name = "Activity Type")]
        [Required(ErrorMessage = "Activity type is required.")]
        [StringLength(100, ErrorMessage = "Activity type cannot exceed 100 characters.")]
        public string ActivityType { get; set; } = string.Empty;

        [Display(Name = "Session")]
        [Required(ErrorMessage = "Session is required.")]
        public long SessionId { get; set; }

        [Display(Name = "Words Studied")]
        public int WordsStudied { get; set; }

        public float Score { get; set; }

        public IReadOnlyList<SelectListItem> SessionOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> UserOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
