using System.ComponentModel.DataAnnotations;

namespace VocabLearning.ViewModels.Account
{
    public class VerifyEmailViewModel
    {
        [Required(ErrorMessage = "Email is required.")]
        [Display(Name = "Email")]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;
    }
}
