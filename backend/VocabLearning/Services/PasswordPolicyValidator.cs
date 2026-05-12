namespace VocabLearning.Services
{
    public static class PasswordPolicyValidator
    {
        public const int MinimumLength = 5;
        public const int MaximumLength = 128;

        public static string ErrorMessage =>
            $"Password must be {MinimumLength}-{MaximumLength} characters and include at least one lowercase letter and one digit.";

        public static bool IsValid(string? password)
        {
            if (string.IsNullOrEmpty(password)
                || password.Length < MinimumLength
                || password.Length > MaximumLength)
            {
                return false;
            }

            var hasLowercase = false;
            var hasDigit = false;

            foreach (var character in password)
            {
                hasLowercase |= character is >= 'a' and <= 'z';
                hasDigit |= character is >= '0' and <= '9';

                if (hasLowercase && hasDigit)
                {
                    return true;
                }
            }

            return false;
        }
    }
}
