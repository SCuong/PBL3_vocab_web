using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace VocabLearning.ViewModels.Admin
{
    public class TopicFormViewModel
    {
        public long TopicId { get; set; }

        [Required(ErrorMessage = "Topic name is required.")]
        [StringLength(100, ErrorMessage = "Topic name cannot exceed 100 characters.")]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Description is required.")]
        [StringLength(500, ErrorMessage = "Description cannot exceed 500 characters.")]
        public string Description { get; set; } = string.Empty;

        [Display(Name = "Parent Topic")]
        public long? ParentTopicId { get; set; }

        public IReadOnlyList<SelectListItem> ParentTopicOptions { get; set; } = Array.Empty<SelectListItem>();
    }
}
