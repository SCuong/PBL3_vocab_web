using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using VocabLearning.Constants;
using VocabLearning.Data;
using VocabLearning.Services;

var builder = WebApplication.CreateBuilder(args);
var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var frontendOrigin = builder.Configuration["Frontend:Origin"] ?? "http://localhost:3000";

builder.Services.AddScoped<VocabularyService>();
builder.Services.AddScoped<CustomAuthenticationService>();
builder.Services.AddScoped<AdminDataService>();
builder.Services.AddScoped<LearningService>();

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
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
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
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
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

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
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
