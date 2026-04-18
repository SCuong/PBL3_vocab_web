using System.Collections.Generic;

namespace VocabLearning.ViewModels.Learning
{
    public class LearningProgressStateViewModel
    {
        public List<LearningProgressTopicStateViewModel> Topics { get; set; } = new();
    }

    public class LearningProgressTopicStateViewModel
    {
        public long TopicId { get; set; }

        public List<long> LearnedWordIds { get; set; } = new();

        public List<long> ReviewWordIds { get; set; } = new();
    }

    public class LearningProgressUpdateRequest
    {
        public long TopicId { get; set; }

        public List<long> WordIds { get; set; } = new();
    }
}
