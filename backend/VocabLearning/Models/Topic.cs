using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VocabLearning.Models
{
    [Table("topic")]
    public class Topic
    {
        [Key]
        [Column("topic_id")]
        public long TopicId { get; set; }

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("parent_topic_id")]
        public long? ParentTopicId { get; set; }
    }
}
