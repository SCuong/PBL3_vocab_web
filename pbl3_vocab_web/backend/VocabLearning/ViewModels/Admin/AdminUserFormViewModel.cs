using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;
using VocabLearning.Constants;

namespace VocabLearning.ViewModels.Admin
{
    public class AdminUserFormViewModel
    {
        public long UserId { get; set; }

        [Required(ErrorMessage = "Username is required.")]
        [StringLength(50, ErrorMessage = "Username cannot exceed 50 characters.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Email is not valid.")]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters.")]
        public string Email { get; set; } = string.Empty;

        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be between 6 and 100 characters.")]
        public string? Password { get; set; }

        [Required(ErrorMessage = "Role is required.")]
        public string Role { get; set; } = UserRoles.Learner;

        [Required(ErrorMessage = "Status is required.")]
        public string Status { get; set; } = UserStatuses.Active;

        public bool IsEditMode { get; set; }

        public IReadOnlyList<SelectListItem> AvailableRoles { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> AvailableStatuses { get; set; } = Array.Empty<SelectListItem>();
    }
}
