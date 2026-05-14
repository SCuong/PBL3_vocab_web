using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System.Threading.RateLimiting;
using VocabLearning.Configuration;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Services;

// Preserve current DateTime behavior during SQL Server -> PostgreSQL migration.
// Follow-up should normalize persisted timestamps to UTC.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Load .env for local dev (Docker sets these as real env vars)
// Try multiple paths since CWD differs between dotnet run / dotnet watch / IDE
var envFile = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), "..", "..", ".env"),          // run from backend/VocabLearning/
    Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".env"),     // run from bin/Debug/
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),                      // run from repo root
}
.Select(Path.GetFullPath)
.FirstOrDefault(File.Exists);
if (envFile != null)
{
    foreach (var line in File.ReadAllLines(envFile))
    {
        if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#')) continue;
        var idx = line.IndexOf('=');
        if (idx < 0) continue;
        var key = line[..idx].Trim();
        var val = line[(idx + 1)..].Trim();
        Environment.SetEnvironmentVariable(key, val);
    }
}

EnvironmentVariableAliases.Apply();

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.AddEventSourceLogger();

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var googleCallbackPath = builder.Configuration["Authentication:Google:CallbackPath"] ?? "/signin-google";
const string productionFrontendOrigin = "https://pbl-3-vocab-web.vercel.app";
if (!googleCallbackPath.StartsWith('/'))
{
    throw new InvalidOperationException("Authentication:Google:CallbackPath must start with '/'.");
}

var frontendOrigin = builder.Configuration["Frontend:Origin"];
if (string.IsNullOrWhiteSpace(frontendOrigin))
{
    frontendOrigin = builder.Environment.IsProduction()
        ? productionFrontendOrigin
        : "http://localhost:3000";
}
if (builder.Environment.IsProduction())
{
    if (!Uri.TryCreate(frontendOrigin, UriKind.Absolute, out var frontendOriginUri))
    {
        throw new InvalidOperationException("Frontend:Origin must be an absolute URL in production.");
    }

    if (frontendOriginUri.IsLoopback)
    {
        frontendOrigin = productionFrontendOrigin;
    }
}

builder.Services.AddScoped<VocabularyService>();
builder.Services.AddScoped<CustomAuthenticationService>();
builder.Services.AddScoped<AdminDataService>();
builder.Services.AddScoped<LearningService>();
builder.Services.AddScoped<IDashboardAnalyticsService, DashboardAnalyticsService>();
builder.Services.AddScoped<PasswordResetEmailService>();
builder.Services.AddHttpClient<GoogleIdTokenVerifier>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddHttpClient<IAIService, GeminiService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(35);
    client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
});

var authenticationBuilder = builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = AuthenticationSchemeNames.Application;
        options.DefaultAuthenticateScheme = AuthenticationSchemeNames.Application;
        options.DefaultSignInScheme = AuthenticationSchemeNames.Application;
    })
    .AddCookie(AuthenticationSchemeNames.Application, options =>
    {
        options.LoginPath = "/login";
        options.LogoutPath = "/login";
        options.AccessDeniedPath = "/login";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.Cookie.HttpOnly = true;
        var sameSiteConfig = builder.Configuration["Cookie:SameSite"] ?? "None";
        var securePolicyConfig = builder.Configuration["Cookie:SecurePolicy"] ?? "Always";
        options.Cookie.SameSite = builder.Environment.IsProduction()
            ? SameSiteMode.None
            : sameSiteConfig == "Lax" ? SameSiteMode.Lax : SameSiteMode.None;
        options.Cookie.SecurePolicy = builder.Environment.IsProduction()
            ? CookieSecurePolicy.Always
            : securePolicyConfig == "SameAsRequest"
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    return context.Response.WriteAsJsonAsync(new
                    {
                        succeeded = false,
                        message = "Not authenticated."
                    });
                }

                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/json";
                    return context.Response.WriteAsJsonAsync(new
                    {
                        succeeded = false,
                        message = "Access denied."
                    });
                }

                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            }
        };
    })
    .AddCookie(AuthenticationSchemeNames.External, options =>
    {
        options.Cookie.Name = "__VocabLearning.External";
        options.Cookie.HttpOnly = true;
        var sameSiteConfig = builder.Configuration["Cookie:SameSite"] ?? "None";
        var securePolicyConfig = builder.Configuration["Cookie:SecurePolicy"] ?? "Always";
        options.Cookie.SameSite = builder.Environment.IsProduction()
            ? SameSiteMode.None
            : sameSiteConfig == "Lax" ? SameSiteMode.Lax : SameSiteMode.None;
        options.Cookie.SecurePolicy = builder.Environment.IsProduction()
            ? CookieSecurePolicy.Always
            : securePolicyConfig == "SameAsRequest"
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
    });

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authenticationBuilder.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.CallbackPath = googleCallbackPath;
        options.SignInScheme = AuthenticationSchemeNames.External;
        options.SaveTokens = true;
        options.Scope.Add("email");
        options.Scope.Add("profile");
    });
}

builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Authorization
builder.Services.AddAuthorization();

// Forwarded headers — trust Nginx in Docker (172.16.0.0/12) and loopback (dev)
// ForwardLimit = 1: single Nginx hop — prevents X-Forwarded-For prefix spoofing
// KnownIPNetworks replaces KnownNetworks (.NET 10); System.Net.IPNetwork avoids ambiguity with legacy type
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(System.Net.IPAddress.Parse("172.16.0.0"), 12)); // Docker bridge
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(System.Net.IPAddress.Parse("10.0.0.0"), 8));    // cloud VPC / overlay
    options.KnownIPNetworks.Add(new System.Net.IPNetwork(System.Net.IPAddress.Parse("127.0.0.0"), 8));   // loopback (dev)
    options.ForwardLimit = 1;
});

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            }));

    options.AddPolicy("forgot-password", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(5),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0,
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendClient", policy =>
    {
        policy.WithOrigins(frontendOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var defaultConnection = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(defaultConnection))
{
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        defaultConnection,
        npgsqlOptions => npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null)));

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();

// Auto-initialize database in production (Docker environment)
var autoMigrateDatabase = app.Configuration.GetValue<bool>("Database:AutoMigrate");
if (autoMigrateDatabase)
{
    throw new InvalidOperationException(
        "Database:AutoMigrate is disabled. Use database/postgres/init.sql for empty PostgreSQL databases or a reviewed migration.");
}
// Must be first: rewrites RemoteIpAddress from X-Forwarded-For before rate limiter and auth read it.
// HTTPS is terminated at Nginx — UseHttpsRedirection is intentionally disabled.
app.UseForwardedHeaders();

app.UseMiddleware<VocabLearning.Middleware.GlobalExceptionHandlerMiddleware>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

//app.UseHttpsRedirection();
app.UseStaticFiles();

var configuredAvatarPath = builder.Configuration["Frontend:AvatarPath"];
var avatarDirectoryCandidates = new[]
{
    configuredAvatarPath,
    Path.Combine(app.Environment.ContentRootPath, "FE", "Avatar"),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "frontend", "Avatar")),
    Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "..", "FE", "Avatar"))
};

var avatarDirectory = avatarDirectoryCandidates
    .Where(path => !string.IsNullOrWhiteSpace(path))
    .Select(path => Path.GetFullPath(path!))
    .FirstOrDefault(Directory.Exists);

if (!string.IsNullOrWhiteSpace(avatarDirectory))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(avatarDirectory),
        RequestPath = "/avatars"
    });
}
else
{
    app.Logger.LogWarning("Avatar directory not found. Static avatar files will not be served.");
}

app.UseRouting();
app.UseCors("FrontendClient");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();
app.MapHealthChecks("/health");
app.MapControllers();

app.Run();
