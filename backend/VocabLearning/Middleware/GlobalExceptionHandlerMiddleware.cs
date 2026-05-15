using System.Net;
using System.Text.Json;

namespace VocabLearning.Middleware
{
    public class GlobalExceptionHandlerMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

        public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            _logger.LogError(
                exception,
                "Unhandled exception on {Method} {Path}",
                context.Request.Method,
                context.Request.Path);

            if (context.Response.HasStarted)
            {
                _logger.LogWarning("Response already started — cannot write error response.");
                return;
            }

            // Single response shape for all failures (API + MVC). Matches the
            // {succeeded, message} convention used by controller error returns
            // so the SPA does not need a separate parser for unhandled errors.
            // exception.Message is intentionally not included — internal details
            // stay in server-side logs only.
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            var response = new
            {
                succeeded = false,
                message = "An unexpected error occurred.",
                status = 500
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
