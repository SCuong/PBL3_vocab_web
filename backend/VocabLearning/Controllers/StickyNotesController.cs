using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.Services;
using VocabLearning.ViewModels.Notes;

namespace VocabLearning.Controllers
{
    [Authorize]
    [ApiController]
    public class StickyNotesController : ControllerBase
    {
        private static readonly string[] AllowedColors = { "yellow", "blue", "green", "pink", "purple" };

        private readonly AppDbContext _dbContext;
        private readonly CustomAuthenticationService _authenticationService;

        public StickyNotesController(AppDbContext dbContext, CustomAuthenticationService authenticationService)
        {
            _dbContext = dbContext;
            _authenticationService = authenticationService;
        }

        [HttpGet("/api/sticky-notes")]
        public async Task<ActionResult<List<StickyNoteViewModel>>> GetStickyNotes(CancellationToken cancellationToken = default)
        {
            var user = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            var notes = await _dbContext.StickyNotes
                .AsNoTracking()
                .Where(note => note.UserId == user.UserId)
                .OrderByDescending(note => note.IsPinned)
                .ThenByDescending(note => note.UpdatedAt)
                .Select(note => Map(note))
                .ToListAsync(cancellationToken);

            return Ok(notes);
        }

        [HttpPost("/api/sticky-notes")]
        public async Task<ActionResult<StickyNoteViewModel>> CreateStickyNote(
            [FromBody] CreateStickyNoteRequest? request,
            CancellationToken cancellationToken = default)
        {
            var user = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            var now = DateTime.UtcNow;
            var stickyNote = new StickyNote
            {
                UserId = user.UserId,
                Content = SanitizeContent(request?.Content),
                Color = NormalizeColor(request?.Color),
                IsPinned = false,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _dbContext.StickyNotes.Add(stickyNote);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(Map(stickyNote));
        }

        [HttpPut("/api/sticky-notes/{stickyNoteId:long}")]
        public async Task<ActionResult<StickyNoteViewModel>> UpdateStickyNote(
            [FromRoute] long stickyNoteId,
            [FromBody] UpdateStickyNoteRequest? request,
            CancellationToken cancellationToken = default)
        {
            var user = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            var stickyNote = await _dbContext.StickyNotes
                .FirstOrDefaultAsync(note => note.StickyNoteId == stickyNoteId && note.UserId == user.UserId, cancellationToken);
            if (stickyNote == null)
            {
                return NotFound(new { succeeded = false, message = "Sticky note not found." });
            }

            if (request != null)
            {
                if (request.Content != null)
                {
                    stickyNote.Content = SanitizeContent(request.Content);
                }
                if (request.Color != null)
                {
                    stickyNote.Color = NormalizeColor(request.Color);
                }
                if (request.IsPinned.HasValue)
                {
                    stickyNote.IsPinned = request.IsPinned.Value;
                }
            }

            stickyNote.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(Map(stickyNote));
        }

        [HttpDelete("/api/sticky-notes/{stickyNoteId:long}")]
        public async Task<ActionResult> DeleteStickyNote([FromRoute] long stickyNoteId, CancellationToken cancellationToken = default)
        {
            var user = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            var stickyNote = await _dbContext.StickyNotes
                .FirstOrDefaultAsync(note => note.StickyNoteId == stickyNoteId && note.UserId == user.UserId, cancellationToken);
            if (stickyNote == null)
            {
                return NotFound(new { succeeded = false, message = "Sticky note not found." });
            }

            _dbContext.StickyNotes.Remove(stickyNote);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new { succeeded = true });
        }

        private static StickyNoteViewModel Map(StickyNote note)
        {
            return new StickyNoteViewModel
            {
                StickyNoteId = note.StickyNoteId,
                Content = note.Content,
                Color = note.Color,
                IsPinned = note.IsPinned,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt,
            };
        }

        private static string SanitizeContent(string? content)
        {
            var normalized = (content ?? string.Empty).Trim();
            return normalized.Length > 1000 ? normalized[..1000] : normalized;
        }

        private static string NormalizeColor(string? color)
        {
            var normalized = (color ?? "yellow").Trim().ToLowerInvariant();
            return AllowedColors.Contains(normalized) ? normalized : "yellow";
        }
    }
}
