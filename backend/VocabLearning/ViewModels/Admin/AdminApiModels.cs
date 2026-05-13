namespace VocabLearning.ViewModels.Admin
{
    // ── Request DTOs ─────────────────────────────────────────────────────────

    public sealed class AdminCreateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public sealed class AdminUpdateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Password { get; set; }
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public sealed class AdminCreateTopicRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public long? ParentTopicId { get; set; }
    }

    public sealed class AdminUpdateTopicRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public long? ParentTopicId { get; set; }
    }

    // ── Response DTOs ────────────────────────────────────────────────────────

    public sealed class AdminUserResponse
    {
        public long UserId { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public bool HasGoogleLogin { get; set; }
        public bool HasLocalPassword { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTime? DeletedAt { get; set; }
    }

    public sealed class AdminTopicResponse
    {
        public long TopicId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public long? ParentTopicId { get; set; }
        public string? ParentTopicName { get; set; }
    }

    // ── Response Envelopes ───────────────────────────────────────────────────

    public sealed class AdminApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
    }

    public sealed class AdminUserListApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<AdminUserResponse> Users { get; set; } = Array.Empty<AdminUserResponse>();
        public int TotalCount { get; set; }
    }

    public sealed class AdminUserApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public AdminUserResponse? User { get; set; }
    }

    public sealed class AdminTopicListApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<AdminTopicResponse> Topics { get; set; } = Array.Empty<AdminTopicResponse>();
    }

    public sealed class AdminTopicApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public AdminTopicResponse? Topic { get; set; }
    }

    public sealed class AdminLearningOverviewApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<LearningOverviewRowViewModel> Rows { get; set; } = Array.Empty<LearningOverviewRowViewModel>();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRows { get; set; }
        public int TotalPages { get; set; }
        public int ActiveUserCount { get; set; }
        public int LearnedTopicCount { get; set; }
        public int TotalWordsStudied { get; set; }
        public double TotalActiveHours { get; set; }
    }
}
