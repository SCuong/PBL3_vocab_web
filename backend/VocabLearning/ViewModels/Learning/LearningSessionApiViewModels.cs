using System;
using System.Collections.Generic;

namespace VocabLearning.ViewModels.Learning
{
    public class StartLearningSessionRequest
    {
        public string Mode { get; set; } = string.Empty;

        public long? TopicId { get; set; }

        public List<long> VocabIds { get; set; } = new();
    }

    public class SaveLearningSessionAnswerRequest
    {
        public long VocabId { get; set; }

        public int Quality { get; set; }

        public int? CurrentIndex { get; set; }
    }

    public class LearningSessionItemResponse
    {
        public long SessionItemId { get; set; }

        public long VocabId { get; set; }

        public int OrderIndex { get; set; }

        public bool IsAnswered { get; set; }

        public int? Quality { get; set; }

        public DateTime? AnsweredAt { get; set; }

        public string? Word { get; set; }

        public string? Ipa { get; set; }

        public string? AudioUrl { get; set; }

        public string? Level { get; set; }

        public string? MeaningVi { get; set; }
    }

    public class LearningSessionResponse
    {
        public long SessionId { get; set; }

        public long UserId { get; set; }

        public long? TopicId { get; set; }

        public string Mode { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public int CurrentIndex { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime? AbandonedAt { get; set; }

        public List<LearningSessionItemResponse> Items { get; set; } = new();
    }

    public class CompleteLearningSessionResponse
    {
        public long SessionId { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CompletedAt { get; set; }

        public int CommittedItemCount { get; set; }

        public LearningProgressStateViewModel Progress { get; set; } = new();
    }
}
