using System;
using System.Collections.Generic;

namespace VocabLearning.ViewModels.Learning
{
    public class LearningDashboardViewModel
    {
        public long? SelectedParentTopicId { get; set; }

        public string SelectedParentTopicName { get; set; } = string.Empty;

        public string SelectedParentDescription { get; set; } = string.Empty;

        public int SelectedParentChildTopicCount { get; set; }

        public int SelectedParentLearnedPercent { get; set; }

        public List<LearningParentTopicViewModel> ParentTopics { get; set; } = new();

        public List<LearningChildTopicViewModel> ChildTopics { get; set; } = new();

        public bool HasParentTopics => ParentTopics.Count > 0;
    }

    public class LearningParentTopicViewModel
    {
        public long TopicId { get; set; }

        public string Name { get; set; } = string.Empty;

        public int ChildTopicCount { get; set; }

        public int LearnedPercent { get; set; }

        public bool IsSelected { get; set; }
    }

    public class LearningChildTopicViewModel
    {
        public long TopicId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public int TotalWords { get; set; }

        public int LearnedWords { get; set; }

        public int RemainingWords { get; set; }

        public int DueReviewCount { get; set; }

        public int ProgressPercent { get; set; }

        public bool HasWords => TotalWords > 0;

        public bool CanStartSession => RemainingWords > 0 || DueReviewCount > 0;

        public int NextBatchSize
        {
            get
            {
                if (DueReviewCount > 0)
                {
                    return Math.Min(10, DueReviewCount);
                }

                return Math.Min(10, RemainingWords);
            }
        }

        public string ActionText
        {
            get
            {
                if (DueReviewCount > 0)
                {
                    return $"Review {NextBatchSize} words";
                }

                if (RemainingWords > 0)
                {
                    return $"Learn {NextBatchSize} words";
                }

                if (!HasWords)
                {
                    return "No vocabulary yet";
                }

                return "Completed";
            }
        }
    }
}
