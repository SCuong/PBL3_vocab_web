using System.ComponentModel.DataAnnotations;

namespace VocabLearning.ViewModels.Account
{
    public class ProfileViewModel
    {
        [Required(ErrorMessage = "Username is required.")]
        [Display(Name = "Username")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Username must be between 3 and 50 characters.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Email format is invalid.")]
        [Display(Name = "Email")]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Display(Name = "Role")]
        public string Role { get; set; } = string.Empty;

        [Display(Name = "Status")]
        public string Status { get; set; } = string.Empty;

        [Display(Name = "Created at")]
        public DateTime CreatedAt { get; set; }

        [Display(Name = "Google connected")]
        public bool HasGoogleLogin { get; set; }

        [Display(Name = "Local password")]
        public bool HasLocalPassword { get; set; }

        public string DisplayName { get; set; } = string.Empty;

        public string AvatarText { get; set; } = string.Empty;

        [Display(Name = "Last studied at")]
        public DateTime? LastStudiedAt { get; set; }

        public int TotalLearnedWords { get; set; }

        public int DueReviewTodayCount { get; set; }

        public int LearningStreakDays { get; set; }

        public float AccuracyLast7Days { get; set; }

        public List<ProfileLearningChartPointViewModel> Chart7Days { get; set; } = new();

        public List<ProfileLearningChartPointViewModel> Chart30Days { get; set; } = new();
    }

    public class ProfileLearningChartPointViewModel
    {
        public DateOnly Date { get; set; }

        public string Label { get; set; } = string.Empty;

        public int LearnedWords { get; set; }

        public int ReviewedWords { get; set; }
    }
}
