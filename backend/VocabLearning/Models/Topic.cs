namespace VocabLearning.Models
{
    public class Topic
    {
        public long TopicId { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public long? ParentTopicId { get; set; }
    }
}
