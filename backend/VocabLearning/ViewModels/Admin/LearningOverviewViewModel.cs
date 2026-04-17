using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class LearningOverviewViewModel
    {
        public long? SelectedUserId { get; set; }

        public long? SelectedTopicId { get; set; }

        public DateTime? FromDate { get; set; }

        public DateTime? ToDate { get; set; }

        public IReadOnlyList<SelectListItem> UserOptions { get; set; } = Array.Empty<SelectListItem>();

        public IReadOnlyList<SelectListItem> TopicOptions { get; set; } = Array.Empty<SelectListItem>();

        public List<LearningOverviewRowViewModel> Rows { get; set; } = new();

        public List<LearningOverviewRowViewModel> PagedRows { get; set; } = new();

        public string SortBy { get; set; } = "lastActivity";

        public string SortDirection { get; set; } = "desc";

        public int Page { get; set; } = 1;

        public int PageSize { get; set; } = 20;

        public int TotalRows { get; set; }

        public int TotalPages => PageSize <= 0 ? 1 : (int)Math.Ceiling(TotalRows / (double)PageSize);

        public int ActiveUserCount => Rows.Select(item => item.UserId).Distinct().Count();

        public int LearnedTopicCount => Rows.Select(item => item.TopicId).Distinct().Count();

        public int TotalWordsStudied => Rows.Sum(item => item.WordsStudied);

        public double TotalActiveHours => Rows.Sum(item => item.ActiveMinutes) / 60d;
    }

    public class LearningOverviewRowViewModel
    {
        public long UserId { get; set; }

        public string Username { get; set; } = string.Empty;

        public long TopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public int SessionCount { get; set; }

        public int WordsStudied { get; set; }

        public double ActiveMinutes { get; set; }

        public DateTime FirstActivityAt { get; set; }

        public DateTime LastActivityAt { get; set; }
    }
}
