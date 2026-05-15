using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VocabLearning.Services;
using VocabLearning.ViewModels.Notes;

namespace VocabLearning.Controllers
{
    [Authorize]
    [ApiController]
    public class StickyNotesController : ControllerBase
    {
        private readonly IStickyNoteService _stickyNoteService;
        private readonly ICustomAuthenticationService _authenticationService;

        public StickyNotesController(
            IStickyNoteService stickyNoteService,
            ICustomAuthenticationService authenticationService)
        {
            _stickyNoteService = stickyNoteService;
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

            var notes = await _stickyNoteService.GetForUserAsync(user.UserId, cancellationToken);
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

            var created = await _stickyNoteService.CreateAsync(user.UserId, request, cancellationToken);
            return Ok(created);
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

            var updated = await _stickyNoteService.UpdateAsync(user.UserId, stickyNoteId, request, cancellationToken);
            if (updated == null)
            {
                return NotFound(new { succeeded = false, message = "Sticky note not found." });
            }

            return Ok(updated);
        }

        [HttpDelete("/api/sticky-notes/{stickyNoteId:long}")]
        public async Task<ActionResult> DeleteStickyNote([FromRoute] long stickyNoteId, CancellationToken cancellationToken = default)
        {
            var user = await _authenticationService.ResolveAuthenticatedUserAsync(User, cancellationToken);
            if (user == null)
            {
                return Unauthorized(new { succeeded = false, message = "Not authenticated." });
            }

            var deleted = await _stickyNoteService.DeleteAsync(user.UserId, stickyNoteId, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { succeeded = false, message = "Sticky note not found." });
            }

            return Ok(new { succeeded = true });
        }
    }
}
