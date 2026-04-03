using System;
using System.Collections.Generic;

namespace VocabLearning.ViewModels.Learning
{
    public class LearningStudyViewModel
    {
        public long TopicId { get; set; }

        public long? ParentTopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public string TopicDescription { get; set; } = string.Empty;

        public string SessionMode { get; set; } = string.Empty;

        public string BatchVocabularyIds { get; set; } = string.Empty;

        public int CurrentIndex { get; set; }

        public int TotalWords { get; set; }

        public LearningStudyWordViewModel CurrentWord { get; set; } = new();

        public int DisplayIndex => CurrentIndex + 1;

        public bool CanGoPrevious => CurrentIndex > 0;

        public bool CanGoNext => CurrentIndex < TotalWords - 1;

        public bool IsLastWord => CurrentIndex >= TotalWords - 1;

        public int ProgressPercent => TotalWords == 0 ? 0 : (int)Math.Round(DisplayIndex * 100d / TotalWords);

        public string SessionModeDisplay => string.Equals(SessionMode, "REVIEW", StringComparison.OrdinalIgnoreCase)
            ? "Review Session"
            : "Learning Session";
    }

    public class LearningStudyWordViewModel
    {
        public long VocabId { get; set; }

        public string Word { get; set; } = string.Empty;

        public string Ipa { get; set; } = string.Empty;

        public string AudioUrl { get; set; } = string.Empty;

        public string Level { get; set; } = string.Empty;

        public string MeaningVi { get; set; } = string.Empty;

        public string TopicName { get; set; } = string.Empty;

        public List<LearningStudyExampleViewModel> Examples { get; set; } = new();
    }

    public class LearningStudyExampleViewModel
    {
        public string ExampleEn { get; set; } = string.Empty;

        public string ExampleVi { get; set; } = string.Empty;

        public string AudioUrl { get; set; } = string.Empty;
    }

    public class LearningMinitestViewModel
    {
        public long TopicId { get; set; }

        public long? ParentTopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public string BatchVocabularyIds { get; set; } = string.Empty;

        public string SessionMode { get; set; } = string.Empty;

        public List<LearningMinitestQuestionViewModel> Questions { get; set; } = new();

        public string SessionModeDisplay => string.Equals(SessionMode, "REVIEW", StringComparison.OrdinalIgnoreCase)
            ? "Review Minitest"
            : "Learning Minitest";
    }

    public class LearningMinitestQuestionViewModel
    {
        public long VocabId { get; set; }

        public string Word { get; set; } = string.Empty;

        public string? SelectedAnswer { get; set; }

        public List<string> Options { get; set; } = new();
    }

    public class LearningMinitestResultViewModel
    {
        public long TopicId { get; set; }

        public long? ParentTopicId { get; set; }

        public string TopicName { get; set; } = string.Empty;

        public int Score { get; set; }

        public int TotalQuestions { get; set; }

        public bool HasMoreWords { get; set; }

        public List<LearningMinitestQuestionResultViewModel> Questions { get; set; } = new();
    }

    public class LearningMinitestQuestionResultViewModel
    {
        public string Word { get; set; } = string.Empty;

        public string SelectedAnswer { get; set; } = string.Empty;

        public string CorrectAnswer { get; set; } = string.Empty;

        public bool IsCorrect { get; set; }

        public DateTime NextReviewDate { get; set; }
    }
}
