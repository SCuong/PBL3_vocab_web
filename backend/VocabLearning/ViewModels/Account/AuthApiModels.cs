namespace VocabLearning.ViewModels.Account
{
    public sealed class LoginApiRequest
    {
        public string UsernameOrEmail { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }

    public sealed class RegisterApiRequest
    {
        public string Name { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }

    public sealed class UpdateProfileApiRequest
    {
        public string Username { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;
    }

    public sealed class ChangePasswordApiRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;

        public string NewPassword { get; set; } = string.Empty;

        public string ConfirmNewPassword { get; set; } = string.Empty;
    }

    public sealed class AuthenticatedUserViewModel
    {
        public long UserId { get; set; }

        public string Username { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public bool HasGoogleLogin { get; set; }

        public bool HasLocalPassword { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public sealed class AuthApiResponse
    {
        public bool Succeeded { get; set; }

        public string? Message { get; set; }

        public AuthenticatedUserViewModel? User { get; set; }
    }
}
