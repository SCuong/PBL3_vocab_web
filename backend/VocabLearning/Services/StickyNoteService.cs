using Microsoft.EntityFrameworkCore;
using VocabLearning.Data;
using VocabLearning.Models;
using VocabLearning.ViewModels.Notes;

namespace VocabLearning.Services
{
    public class StickyNoteService : IStickyNoteService
    {
        private const int MaxContentLength = 1000;
        private const string DefaultColor = "yellow";
        private static readonly string[] AllowedColors = { "yellow", "blue", "green", "pink", "purple" };

        private readonly AppDbContext _dbContext;

        public StickyNoteService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<List<StickyNoteViewModel>> GetForUserAsync(long userId, CancellationToken cancellationToken = default)
        {
            return await _dbContext.StickyNotes
                .AsNoTracking()
                .Where(note => note.UserId == userId)
                .OrderByDescending(note => note.IsPinned)
                .ThenByDescending(note => note.UpdatedAt)
                .Select(note => Map(note))
                .ToListAsync(cancellationToken);
        }

        public async Task<StickyNoteViewModel> CreateAsync(long userId, CreateStickyNoteRequest? request, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var stickyNote = new StickyNote
            {
                UserId = userId,
                Content = SanitizeContent(request?.Content),
                Color = NormalizeColor(request?.Color),
                IsPinned = false,
                CreatedAt = now,
                UpdatedAt = now,
            };

            _dbContext.StickyNotes.Add(stickyNote);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Map(stickyNote);
        }

        public async Task<StickyNoteViewModel?> UpdateAsync(long userId, long stickyNoteId, UpdateStickyNoteRequest? request, CancellationToken cancellationToken = default)
        {
            var stickyNote = await _dbContext.StickyNotes
                .FirstOrDefaultAsync(note => note.StickyNoteId == stickyNoteId && note.UserId == userId, cancellationToken);
            if (stickyNote == null)
            {
                return null;
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

            return Map(stickyNote);
        }

        public async Task<bool> DeleteAsync(long userId, long stickyNoteId, CancellationToken cancellationToken = default)
        {
            var stickyNote = await _dbContext.StickyNotes
                .FirstOrDefaultAsync(note => note.StickyNoteId == stickyNoteId && note.UserId == userId, cancellationToken);
            if (stickyNote == null)
            {
                return false;
            }

            _dbContext.StickyNotes.Remove(stickyNote);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
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
            return normalized.Length > MaxContentLength ? normalized[..MaxContentLength] : normalized;
        }

        private static string NormalizeColor(string? color)
        {
            var normalized = (color ?? DefaultColor).Trim().ToLowerInvariant();
            return AllowedColors.Contains(normalized) ? normalized : DefaultColor;
        }
    }
}
