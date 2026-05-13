using System.Globalization;
using System.Text.Json;

namespace VocabLearning.Services
{
    public sealed record VerifiedGoogleIdToken(string Subject, string Email, string? Name);

    public sealed class GoogleIdTokenVerifier
    {
        private const int MaxTokenLength = 4096;
        private static readonly Uri TokenInfoEndpoint = new("https://oauth2.googleapis.com/tokeninfo");
        private readonly HttpClient httpClient;
        private readonly IConfiguration configuration;
        private readonly ILogger<GoogleIdTokenVerifier> logger;

        public GoogleIdTokenVerifier(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<GoogleIdTokenVerifier> logger)
        {
            this.httpClient = httpClient;
            this.configuration = configuration;
            this.logger = logger;
        }

        public async Task<VerifiedGoogleIdToken?> VerifyAsync(
            string idToken,
            CancellationToken cancellationToken = default)
        {
            var cleanToken = idToken.Trim();
            var clientId = configuration["Authentication:Google:ClientId"]?.Trim();

            if (string.IsNullOrWhiteSpace(clientId))
            {
                logger.LogWarning("Google ID token verification skipped because Google client id is not configured.");
                return null;
            }

            if (string.IsNullOrWhiteSpace(cleanToken) || cleanToken.Length > MaxTokenLength)
            {
                return null;
            }

            var requestUri = new Uri($"{TokenInfoEndpoint}?id_token={Uri.EscapeDataString(cleanToken)}");
            using var response = await httpClient.GetAsync(requestUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = document.RootElement;

            if (!TryGetString(root, "sub", out var subject)
                || !TryGetString(root, "email", out var email)
                || !TryGetString(root, "aud", out var audience)
                || !TryGetString(root, "iss", out var issuer)
                || !TryGetString(root, "exp", out var expiresAtRaw))
            {
                return null;
            }

            if (!string.Equals(audience, clientId, StringComparison.Ordinal))
            {
                return null;
            }

            if (issuer is not ("https://accounts.google.com" or "accounts.google.com"))
            {
                return null;
            }

            if (!long.TryParse(expiresAtRaw, NumberStyles.None, CultureInfo.InvariantCulture, out var expiresAtUnix)
                || DateTimeOffset.FromUnixTimeSeconds(expiresAtUnix) <= DateTimeOffset.UtcNow)
            {
                return null;
            }

            if (!TryGetBoolean(root, "email_verified", out var emailVerified) || !emailVerified)
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            TryGetString(root, "name", out var name);
            return new VerifiedGoogleIdToken(subject, email, name);
        }

        private static bool TryGetString(JsonElement root, string propertyName, out string value)
        {
            value = string.Empty;
            if (!root.TryGetProperty(propertyName, out var property))
            {
                return false;
            }

            value = property.ValueKind == JsonValueKind.String
                ? property.GetString() ?? string.Empty
                : property.ToString();

            return !string.IsNullOrWhiteSpace(value);
        }

        private static bool TryGetBoolean(JsonElement root, string propertyName, out bool value)
        {
            value = false;
            if (!root.TryGetProperty(propertyName, out var property))
            {
                return false;
            }

            if (property.ValueKind is JsonValueKind.True or JsonValueKind.False)
            {
                value = property.GetBoolean();
                return true;
            }

            if (property.ValueKind == JsonValueKind.String
                && bool.TryParse(property.GetString(), out var parsed))
            {
                value = parsed;
                return true;
            }

            return false;
        }
    }
}
