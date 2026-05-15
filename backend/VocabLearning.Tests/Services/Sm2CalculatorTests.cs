using System;
using FluentAssertions;
using VocabLearning.Constants;
using VocabLearning.Services;

namespace VocabLearning.Tests.Services
{
    public class Sm2CalculatorTests
    {
        private static readonly DateTime Now = new(2026, 1, 15, 10, 0, 0, DateTimeKind.Local);

        // ---------- First exposure ----------

        [Theory]
        [InlineData(0, 0)]
        [InlineData(3, 0)]
        [InlineData(5, 1)]
        public void Plan_FirstExposure_NotRepeated_ShouldUseQualityRule(int quality, int expectedDays)
        {
            var plan = Sm2Calculator.Plan(Sm2State.Default, quality, Now, isFirstExposure: true, isRepeatedThisSession: false);

            plan.NewState.IntervalDays.Should().Be(expectedDays);
            plan.NewState.Repetitions.Should().Be(quality >= 5 ? 1 : 0);
            plan.NextReviewDate.Should().Be(Now.AddDays(expectedDays));
            plan.Status.Should().Be(UserVocabularyStatuses.Learning);
        }

        [Fact]
        public void Plan_FirstExposure_RepeatedThisSession_ShouldGet1Day()
        {
            var plan = Sm2Calculator.Plan(Sm2State.Default, quality: 0, Now, isFirstExposure: true, isRepeatedThisSession: true);

            plan.NewState.IntervalDays.Should().Be(1);
            plan.NewState.Repetitions.Should().Be(0);
            plan.NextReviewDate.Should().Be(Now.AddDays(1));
        }

        [Fact]
        public void Plan_FirstExposure_LowEaseFactor_ShouldFloorAt1Point3()
        {
            var current = Sm2State.Default with { EaseFactor = 0.5d };

            var plan = Sm2Calculator.Plan(current, quality: 5, Now, isFirstExposure: true, isRepeatedThisSession: false);

            plan.NewState.EaseFactor.Should().Be(Sm2Calculator.EaseFactorFloor);
        }

        // ---------- Real review ----------

        [Fact]
        public void Plan_RealReview_QualityZero_ShouldResetRepetitions_AndSet1Day()
        {
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 30, Repetitions: 5, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var plan = Sm2Calculator.Plan(current, quality: 0, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.Repetitions.Should().Be(0);
            plan.NewState.IntervalDays.Should().Be(1);
            plan.NextReviewDate.Should().Be(Now.AddDays(1));
            plan.Status.Should().Be(UserVocabularyStatuses.Learning);
        }

        [Theory]
        [InlineData(3, 1, 2)]   // reps=1 path: max(2, round(1 * EF_after * 0.5))
        [InlineData(4, 1, 3)]   // reps=1 path: max(3, round(1 * EF_after))
        [InlineData(5, 1, 6)]   // q=5 always: max(6, round(1 * EF_after * 1.3))
        public void Plan_RealReview_FromSingleSuccess_ShouldHitMinimumFloors(int quality, int repetitions, int expectedMinDays)
        {
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 1, Repetitions: repetitions, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var plan = Sm2Calculator.Plan(current, quality, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.IntervalDays.Should().BeGreaterThanOrEqualTo(expectedMinDays);
            plan.NewState.Repetitions.Should().Be(repetitions + 1);
            plan.Status.Should().Be(UserVocabularyStatuses.Learning); // reps would be 2, < 4
        }

        [Fact]
        public void Plan_RealReview_QualityBelowFloor_ShouldKeepEaseFactorAbove1Point3()
        {
            var current = new Sm2State(EaseFactor: 1.0d, IntervalDays: 5, Repetitions: 3, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var plan = Sm2Calculator.Plan(current, quality: 0, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.EaseFactor.Should().BeGreaterThanOrEqualTo(Sm2Calculator.EaseFactorFloor);
        }

        [Fact]
        public void Plan_RealReview_ReachingFourthRepetition_ShouldFlagMastered()
        {
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 10, Repetitions: 3, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var plan = Sm2Calculator.Plan(current, quality: 5, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.Repetitions.Should().Be(4);
            plan.Status.Should().Be(UserVocabularyStatuses.Mastered);
        }

        [Fact]
        public void Plan_RealReview_BelowMasteredThreshold_ShouldStayLearning()
        {
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 1, Repetitions: 2, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var plan = Sm2Calculator.Plan(current, quality: 5, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.Repetitions.Should().Be(3);
            plan.Status.Should().Be(UserVocabularyStatuses.Learning);
        }

        [Fact]
        public void Plan_RealReview_FailureAfterMastery_ShouldRevertToLearning()
        {
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 60, Repetitions: 6, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var plan = Sm2Calculator.Plan(current, quality: 0, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.Repetitions.Should().Be(0);
            plan.Status.Should().Be(UserVocabularyStatuses.Learning);
        }

        // ---------- Quality clamping ----------

        [Theory]
        [InlineData(-3, 0)]
        [InlineData(99, 5)]
        public void Plan_QualityOutOfRange_ShouldBeClamped(int rawQuality, int effectiveQuality)
        {
            var clamped = Sm2Calculator.Plan(Sm2State.Default, effectiveQuality, Now, isFirstExposure: true, isRepeatedThisSession: false);
            var raw = Sm2Calculator.Plan(Sm2State.Default, rawQuality, Now, isFirstExposure: true, isRepeatedThisSession: false);

            raw.Should().BeEquivalentTo(clamped);
        }

        // ---------- Preview ----------

        [Theory]
        [InlineData(0, 0)]
        [InlineData(3, 0)]
        [InlineData(5, 1)]
        public void Preview_FirstExposure_ShouldMatchSimulationRule(int quality, int expectedDays)
        {
            var preview = Sm2Calculator.Preview(Sm2State.Default, quality, Now, isRepeatedThisSession: false);

            preview.Days.Should().Be(expectedDays);
            preview.NextReviewDate.Should().Be(Now.AddDays(expectedDays));
        }

        [Fact]
        public void Preview_RepeatedThisSession_NotDue_ShouldGet1Day()
        {
            var current = Sm2State.Default with { Repetitions = 0 };

            var preview = Sm2Calculator.Preview(current, quality: 0, Now, isRepeatedThisSession: true);

            preview.Days.Should().Be(1);
        }

        [Fact]
        public void Preview_DueRealReview_QualityFail_ShouldGet1Day_NotImmediate()
        {
            // allowImmediateForgot=false branch (due-real-review preview).
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 5, Repetitions: 3, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var preview = Sm2Calculator.Preview(current, quality: 0, Now, isRepeatedThisSession: false);

            preview.Days.Should().Be(1);
        }

        [Fact]
        public void Preview_NotDue_NotFirstExposure_QualityFail_ShouldGetZeroDays()
        {
            // allowImmediateForgot=true branch (else-baseline preview).
            // Reps>0 but NextReviewDate is in the future.
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 30, Repetitions: 3, LastReviewDate: null, NextReviewDate: Now.AddDays(7));

            var preview = Sm2Calculator.Preview(current, quality: 0, Now, isRepeatedThisSession: false);

            preview.Days.Should().Be(0);
        }

        [Fact]
        public void Preview_NullState_ShouldUseFirstExposureRule()
        {
            var preview = Sm2Calculator.Preview(null, quality: 5, Now, isRepeatedThisSession: false);

            preview.Days.Should().Be(1);
        }

        // ---------- Preview / Plan consistency ----------

        [Theory]
        [InlineData(0)]
        [InlineData(3)]
        [InlineData(5)]
        public void Preview_AndPlan_FirstExposure_ShouldAgreeOnNextReviewDate(int quality)
        {
            var preview = Sm2Calculator.Preview(Sm2State.Default, quality, Now, isRepeatedThisSession: false);
            var plan = Sm2Calculator.Plan(Sm2State.Default, quality, Now, isFirstExposure: true, isRepeatedThisSession: false);

            plan.NextReviewDate.Should().Be(preview.NextReviewDate);
            plan.NewState.IntervalDays.Should().Be(preview.Days);
        }

        [Theory]
        [InlineData(3)]
        [InlineData(5)]
        public void Preview_AndPlan_DueRealReview_ShouldAgreeOnIntervalDays(int quality)
        {
            var current = new Sm2State(EaseFactor: 2.5d, IntervalDays: 6, Repetitions: 2, LastReviewDate: null, NextReviewDate: Now.AddDays(-1));

            var preview = Sm2Calculator.Preview(current, quality, Now, isRepeatedThisSession: false);
            var plan = Sm2Calculator.Plan(current, quality, Now, isFirstExposure: false, isRepeatedThisSession: false);

            plan.NewState.IntervalDays.Should().Be(preview.Days);
            plan.NextReviewDate.Should().Be(preview.NextReviewDate);
        }
    }
}
