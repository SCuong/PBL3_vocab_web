using System.Net.Http.Json;
using System.Text.Json;

namespace VocabLearning.Tests.Integration
{
    public static class HttpClientAuthExtensions
    {
        public static async Task<string> GetAntiforgeryTokenAsync(this HttpClient client)
        {
            var response = await client.GetAsync("/api/v1/auth/antiforgery");
            response.EnsureSuccessStatusCode();

            await using var stream = await response.Content.ReadAsStreamAsync();
            using var document = await JsonDocument.ParseAsync(stream);
            return document.RootElement.GetProperty("token").GetString()
                ?? throw new InvalidOperationException("Antiforgery token missing.");
        }

        public static async Task<HttpResponseMessage> LoginAsSeededLearnerAsync(this HttpClient client)
        {
            return await client.LoginAsync(
                SqlServerIntegrationWebAppFactory.LearnerEmail,
                SqlServerIntegrationWebAppFactory.LearnerPassword);
        }

        public static async Task<HttpResponseMessage> LoginAsSeededAdminAsync(this HttpClient client)
        {
            return await client.LoginAsync(
                SqlServerIntegrationWebAppFactory.AdminEmail,
                SqlServerIntegrationWebAppFactory.AdminPassword);
        }

        public static async Task<HttpResponseMessage> LoginAsync(
            this HttpClient client,
            string usernameOrEmail,
            string password,
            bool rememberMe = false)
        {
            var token = await client.GetAntiforgeryTokenAsync();
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/login")
            {
                Content = JsonContent.Create(new
                {
                    usernameOrEmail,
                    password,
                    rememberMe
                })
            };

            request.Headers.Add("X-XSRF-TOKEN", token);
            return await client.SendAsync(request);
        }
    }
}
