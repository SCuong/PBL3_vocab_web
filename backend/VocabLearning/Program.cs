using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.AddEventSourceLogger();

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:3000";

builder.Services.AddScoped<VocabularyService>();
builder.Services.AddScoped<CustomAuthenticationService>();
builder.Services.AddScoped<AdminDataService>();
builder.Services.AddScoped<AdminExerciseService>();
builder.Services.AddScoped<LearningService>();
builder.Services.AddScoped<LearningFlowService>();
builder.Services.AddScoped<PasswordResetEmailService>();

var authenticationBuilder = builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = AuthenticationSchemeNames.Application;
        options.DefaultAuthenticateScheme = AuthenticationSchemeNames.Application;
        options.DefaultSignInScheme = AuthenticationSchemeNames.Application;
    })
    .AddCookie(AuthenticationSchemeNames.Application, options =>
    {
        options.LoginPath = "/Account/Login";
        options.LogoutPath = "/Account/Logout";
        options.AccessDeniedPath = "/Account/Login";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.Cookie.HttpOnly = true;
        var sameSiteConfig = builder.Configuration["Cookie:SameSite"] ?? "None";
        var securePolicyConfig = builder.Configuration["Cookie:SecurePolicy"] ?? "Always";
        options.Cookie.SameSite = sameSiteConfig == "Lax" ? SameSiteMode.Lax : SameSiteMode.None;
        options.Cookie.SecurePolicy = securePolicyConfig == "SameAsRequest"
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
        options.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                }

                context.Response.Redirect(context.RedirectUri);
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                if (context.Request.Path.StartsWithSegments("/api"))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
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
        options.Cookie.SameSite = sameSiteConfig == "Lax" ? SameSiteMode.Lax : SameSiteMode.None;
        options.Cookie.SecurePolicy = securePolicyConfig == "SameAsRequest"
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
        options.CallbackPath = "/signin-google";
        options.SignInScheme = AuthenticationSchemeNames.External;
        options.SaveTokens = true;
        options.Scope.Add("email");
        options.Scope.Add("profile");
    });
}

// MVC
builder.Services.AddControllersWithViews();

// Authorization
builder.Services.AddAuthorization();
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

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

await CustomAuthSchemaInitializer.InitializeAsync(app.Services);

// Auto-initialize database in production (Docker environment)
if (app.Configuration.GetValue<bool>("Database:AutoMigrate"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        // Kiểm tra xem bảng vocabulary đã tồn tại chưa
        var exists = await db.Database.ExecuteSqlRawAsync(
            "IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'vocabulary') " +
            "BEGIN RAISERROR('NEEDS_INIT', 16, 1) END"
        );
    }
    catch (Exception ex) when (ex.Message.Contains("NEEDS_INIT"))
    {
        logger.LogInformation("First run — running init.sql...");
        var initSqlPath = "/docker-entrypoint-initdb.d/init.sql";
        if (File.Exists(initSqlPath))
        {
            var sql = await File.ReadAllTextAsync(initSqlPath);
            var batches = System.Text.RegularExpressions.Regex
                .Split(sql, @"^\s*GO\s*$", System.Text.RegularExpressions.RegexOptions.Multiline)
                .Select(b => b.Trim())
                .Where(b => b.Length > 0);
            foreach (var batch in batches)
            {
                try { await db.Database.ExecuteSqlRawAsync(batch); }
                catch (Exception batchEx)
                {
                    logger.LogWarning("Batch warning (non-fatal): {Msg}", batchEx.Message);
                }
            }
            logger.LogInformation("Database initialized successfully.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database initialization failed.");
        throw;
    }
}
// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
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

app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
