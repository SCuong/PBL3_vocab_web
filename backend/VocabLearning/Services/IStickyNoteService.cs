using VocabLearning.ViewModels.Notes;

namespace VocabLearning.Services
{
    public interface IStickyNoteService
    {
        Task<List<StickyNoteViewModel>> GetForUserAsync(long userId, CancellationToken cancellationToken = default);

        Task<StickyNoteViewModel> CreateAsync(long userId, CreateStickyNoteRequest? request, CancellationToken cancellationToken = default);

        // Returns null when the note is missing or owned by a different user.
        Task<StickyNoteViewModel?> UpdateAsync(long userId, long stickyNoteId, UpdateStickyNoteRequest? request, CancellationToken cancellationToken = default);

        // Returns false when the note is missing or owned by a different user.
        Task<bool> DeleteAsync(long userId, long stickyNoteId, CancellationToken cancellationToken = default);
    }
}
