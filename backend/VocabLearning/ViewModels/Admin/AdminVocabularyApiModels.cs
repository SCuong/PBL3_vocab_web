namespace VocabLearning.ViewModels.Admin
{
    // ── Request DTOs ─────────────────────────────────────────────────────────

    public sealed class AdminCreateVocabularyRequest
    {
        public string Word { get; set; } = string.Empty;
        public string? Ipa { get; set; }
        public string? AudioUrl { get; set; }
        public string Level { get; set; } = string.Empty;
        public string? MeaningVi { get; set; }
        public long? TopicId { get; set; }
    }

    public sealed class AdminUpdateVocabularyRequest
    {
        public string Word { get; set; } = string.Empty;
        public string? Ipa { get; set; }
        public string? AudioUrl { get; set; }
        public string Level { get; set; } = string.Empty;
        public string? MeaningVi { get; set; }
        public long? TopicId { get; set; }
    }

    public sealed class AdminCreateExampleRequest
    {
        public string ExampleEn { get; set; } = string.Empty;
        public string ExampleVi { get; set; } = string.Empty;
        public string? AudioUrl { get; set; }
    }

    public sealed class AdminUpdateExampleRequest
    {
        public string ExampleEn { get; set; } = string.Empty;
        public string ExampleVi { get; set; } = string.Empty;
        public string? AudioUrl { get; set; }
    }

    // ── Response DTOs ────────────────────────────────────────────────────────

    public sealed class AdminExampleResponse
    {
        public long ExampleId { get; set; }
        public long VocabId { get; set; }
        public string ExampleEn { get; set; } = string.Empty;
        public string ExampleVi { get; set; } = string.Empty;
        public string? AudioUrl { get; set; }
    }

    public sealed class AdminVocabularyResponse
    {
        public long VocabId { get; set; }
        public string Word { get; set; } = string.Empty;
        public string? Ipa { get; set; }
        public string? AudioUrl { get; set; }
        public string? Level { get; set; }
        public string? MeaningVi { get; set; }
        public long? TopicId { get; set; }
        public string? TopicName { get; set; }
        public IReadOnlyList<AdminExampleResponse> Examples { get; set; } = Array.Empty<AdminExampleResponse>();
    }

    // ── Response Envelopes ───────────────────────────────────────────────────

    public sealed class AdminVocabularyListApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public IReadOnlyList<AdminVocabularyResponse> Items { get; set; } = Array.Empty<AdminVocabularyResponse>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public sealed class AdminVocabularyApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public AdminVocabularyResponse? Vocabulary { get; set; }
    }

    public sealed class AdminExampleApiResponse
    {
        public bool Succeeded { get; set; }
        public string? Message { get; set; }
        public AdminExampleResponse? Example { get; set; }
    }
}
