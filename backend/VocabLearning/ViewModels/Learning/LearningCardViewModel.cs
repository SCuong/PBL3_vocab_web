using System;
using System.Collections.Generic;

namespace VocabLearning.ViewModels.Learning
{
    public class ReviewOptionItem
    {
        public int Quality { get; set; }
        public int Days { get; set; }
        public DateTime NextReviewDate { get; set; }
    }

    public class ReviewOptionsViewModel
    {
        public long VocabId { get; set; }
        public List<ReviewOptionItem> Options { get; set; } = new();
    }

    public class BatchReviewOptionsRequest
    {
        public List<long> VocabIds { get; set; } = new();
        public List<long> RepeatedVocabIds { get; set; } = new();
    }

    public class SingleWordReviewRequest
    {
        public long VocabId { get; set; }
        public long TopicId { get; set; }
        public int Quality { get; set; }
        public bool IsRepeatedThisSession { get; set; }
    }
}
