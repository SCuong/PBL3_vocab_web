using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Constants;
using VocabLearning.Controllers;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.Tests.Helpers;
using VocabLearning.ViewModels.Notes;

namespace VocabLearning.Tests.Controllers
{
    public class StickyNotesControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly CustomAuthenticationService _authService;
        private readonly StickyNotesController _controller;

        public StickyNotesControllerTests()
        {
            _context = TestDbContextFactory.Create();
            _authService = new CustomAuthenticationService(_context);
            var stickyNoteService = new StickyNoteService(_context);
            _controller = new StickyNotesController(stickyNoteService, _authService);

            _context.Users.AddRange(
                new Users
                {
                    UserId = 1,
                    Username = "learner",
                    Email = "learner@example.com",
                    PasswordHash = "hash",
                    Role = UserRoles.Learner,
                    Status = UserStatuses.Active,
                    CreatedAt = DateTime.UtcNow,
                },
                new Users
                {
                    UserId = 2,
                    Username = "other",
                    Email = "other@example.com",
                    PasswordHash = "hash",
                    Role = UserRoles.Learner,
                    Status = UserStatuses.Active,
                    CreatedAt = DateTime.UtcNow,
                });
            _context.SaveChanges();

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = CreatePrincipal(1),
                },
            };
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        [Fact]
        public async Task GetStickyNotes_ReturnsOnlyAuthenticatedUsersNotes()
        {
            _context.StickyNotes.AddRange(
                new StickyNote
                {
                    StickyNoteId = 10,
                    UserId = 1,
                    Content = "mine",
                    Color = "yellow",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                    UpdatedAt = DateTime.UtcNow.AddMinutes(-10),
                },
                new StickyNote
                {
                    StickyNoteId = 11,
                    UserId = 2,
                    Content = "not mine",
                    Color = "blue",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
            await _context.SaveChangesAsync();

            var result = await _controller.GetStickyNotes();

            var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var notes = ok.Value.Should().BeAssignableTo<List<StickyNoteViewModel>>().Subject;
            notes.Should().ContainSingle();
            notes[0].Content.Should().Be("mine");
        }

        [Fact]
        public async Task CreateStickyNote_CreatesNoteForAuthenticatedUser()
        {
            var result = await _controller.CreateStickyNote(
                new CreateStickyNoteRequest { Content = " new note ", Color = "pink" });

            var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var note = ok.Value.Should().BeOfType<StickyNoteViewModel>().Subject;
            note.Content.Should().Be("new note");
            note.Color.Should().Be("pink");

            _context.StickyNotes.Should().ContainSingle(item =>
                item.UserId == 1 && item.Content == "new note" && item.Color == "pink");
        }

        [Fact]
        public async Task UpdateStickyNote_UpdatesOnlyAuthenticatedUsersNote()
        {
            _context.StickyNotes.Add(new StickyNote
            {
                StickyNoteId = 12,
                UserId = 1,
                Content = "old",
                Color = "yellow",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();

            var result = await _controller.UpdateStickyNote(
                12,
                new UpdateStickyNoteRequest { Content = "updated", Color = "green", IsPinned = true });

            var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var note = ok.Value.Should().BeOfType<StickyNoteViewModel>().Subject;
            note.Content.Should().Be("updated");
            note.Color.Should().Be("green");
            note.IsPinned.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteStickyNote_RemovesAuthenticatedUsersNote()
        {
            _context.StickyNotes.Add(new StickyNote
            {
                StickyNoteId = 13,
                UserId = 1,
                Content = "delete me",
                Color = "yellow",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();

            var result = await _controller.DeleteStickyNote(13);

            result.Should().BeOfType<OkObjectResult>();
            _context.StickyNotes.Should().BeEmpty();
        }

        [Fact]
        public async Task UpdateStickyNote_ForDifferentUser_ReturnsNotFound()
        {
            _context.StickyNotes.Add(new StickyNote
            {
                StickyNoteId = 14,
                UserId = 2,
                Content = "other",
                Color = "yellow",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await _context.SaveChangesAsync();

            var result = await _controller.UpdateStickyNote(
                14,
                new UpdateStickyNoteRequest { Content = "nope" });

            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        private static ClaimsPrincipal CreatePrincipal(long userId)
        {
            var identity = new ClaimsIdentity(
                new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                    new Claim(ClaimTypes.Email, "learner@example.com"),
                    new Claim(ClaimTypes.Role, UserRoles.Learner),
                },
                AuthenticationSchemeNames.Application);

            return new ClaimsPrincipal(identity);
        }
    }
}
