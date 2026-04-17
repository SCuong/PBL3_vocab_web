using System.ComponentModel.DataAnnotations;

namespace VocabLearning.ViewModels.Account
{
    public class ChangePasswordViewModel
    {
        [Display(Name = "Email")]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Current password is required.")]
        [DataType(DataType.Password)]
        [Display(Name = "Current password")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required.")]
        [StringLength(40, MinimumLength = 8, ErrorMessage = "The {0} must be between at {2} and at max {1} characters long.")]
        [DataType(DataType.Password)]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password confirmation is required.")]
        [DataType(DataType.Password)]
        [Display(Name = "Confirm new password")]
        [Compare(nameof(NewPassword), ErrorMessage = "Password confirmation does not match.")]
        public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
