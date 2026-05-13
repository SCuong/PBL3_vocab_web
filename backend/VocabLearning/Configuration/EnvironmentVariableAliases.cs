namespace VocabLearning.Configuration
{
    public static class EnvironmentVariableAliases
    {
        private static readonly IReadOnlyDictionary<string, string> Aliases = new Dictionary<string, string>
        {
            ["GOOGLE_CLIENT_ID"] = "Authentication__Google__ClientId",
            ["GOOGLE_CLIENT_SECRET"] = "Authentication__Google__ClientSecret",
            ["GOOGLE_CALLBACK_PATH"] = "Authentication__Google__CallbackPath",
            ["FRONTEND_ORIGIN"] = "Frontend__Origin",
            ["COOKIE_SAMESITE"] = "Cookie__SameSite",
            ["COOKIE_SECURE_POLICY"] = "Cookie__SecurePolicy",
            ["SMTP_HOST"] = "Smtp__Host",
            ["SMTP_PORT"] = "Smtp__Port",
            ["SMTP_USERNAME"] = "Smtp__Username",
            ["SMTP_PASSWORD"] = "Smtp__Password",
            ["SMTP_FROM_EMAIL"] = "Smtp__FromEmail",
            ["SMTP_FROM_NAME"] = "Smtp__FromName",
            ["GEMINI_API_KEY"] = "Gemini__ApiKey"
        };

        public static void Apply()
        {
            foreach (var (legacyName, configurationName) in Aliases)
            {
                var configuredValue = Environment.GetEnvironmentVariable(configurationName);
                if (!string.IsNullOrWhiteSpace(configuredValue))
                {
                    continue;
                }

                var legacyValue = Environment.GetEnvironmentVariable(legacyName);
                if (string.IsNullOrWhiteSpace(legacyValue))
                {
                    continue;
                }

                Environment.SetEnvironmentVariable(configurationName, legacyValue.Trim());
            }
        }
    }
}
