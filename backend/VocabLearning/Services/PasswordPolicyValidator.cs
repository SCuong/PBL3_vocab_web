namespace VocabLearning.Services
{
    public static class PasswordPolicyValidator
    {
        public const int MinimumLength = 8;
        public const int MaximumLength = 128;

        public static string ErrorMessage =>
            $"Password must be {MinimumLength}-{MaximumLength} characters and include lowercase, uppercase, number, and special character.";

        public static bool IsValid(string? password)
        {
            if (string.IsNullOrEmpty(password)
                || password.Length < MinimumLength
                || password.Length > MaximumLength)
            {
                return false;
            }

            var hasLowercase = false;
            var hasUppercase = false;
            var hasDigit = false;
            var hasSpecial = false;

            foreach (var character in password)
            {
                hasLowercase |= character is >= 'a' and <= 'z';
                hasUppercase |= character is >= 'A' and <= 'Z';
                hasDigit |= character is >= '0' and <= '9';
                hasSpecial |= !char.IsLetterOrDigit(character);

                if (hasLowercase && hasUppercase && hasDigit && hasSpecial)
                {
                    return true;
                }
            }

            return false;
        }
    }
}
