using System;
using VocabLearning.Constants;

namespace VocabLearning.Services
{
    /// <summary>
    /// Pure SM-2-inspired spaced-repetition calculator. No persistence, no time-of-day
    /// dependence beyond the caller-supplied <c>now</c>. Routing logic mirrors the
    /// historical LearningService behavior:
    ///   - Mutation path (<see cref="Plan"/>) splits on <c>isFirstExposure</c>, which
    ///     callers derive from <c>state.Repetitions == 0</c>.
    ///   - Preview path (<see cref="Preview"/>) splits on whether the word is currently
    ///     due for a real review (<c>Repetitions &gt; 0</c> and <c>NextReviewDate</c>
    ///     on or before <c>now.Date</c>).
    /// </summary>
    public static class Sm2Calculator
    {
        public const double EaseFactorFloor = 1.3d;
        public const int MasteredRepetitionThreshold = 4;

        public static Sm2Plan Plan(
            Sm2State current,
            int quality,
            DateTime now,
            bool isFirstExposure,
            bool isRepeatedThisSession)
        {
            quality = Math.Clamp(quality, 0, 5);
            return isFirstExposure
                ? PlanFirstExposure(current, quality, now, isRepeatedThisSession)
                : PlanRealReview(current, quality, now);
        }

        public static Sm2Preview Preview(
            Sm2State? current,
            int quality,
            DateTime now,
            bool isRepeatedThisSession)
        {
            quality = Math.Clamp(quality, 0, 5);
            var today = now.Date;
            var isDueRealReview = current is { Repetitions: > 0, NextReviewDate: { } nextReview }
                && nextReview.Date <= today;

            int days;
            if (isDueRealReview)
            {
                days = CalculateRealReviewIntervalDays(current!, quality, allowImmediateForgot: false);
            }
            else if (isRepeatedThisSession)
            {
                days = 1;
            }
            else
            {
                days = SimulateBaseline(current, quality);
            }

            return new Sm2Preview(days, now.AddDays(days));
        }

        private static int SimulateBaseline(Sm2State? current, int quality)
        {
            if (current is null || current.Repetitions == 0)
            {
                return quality switch
                {
                    0 => 0,
                    3 => 0,
                    5 => 1,
                    _ => 0
                };
            }

            return CalculateRealReviewIntervalDays(current, quality, allowImmediateForgot: true);
        }

        private static Sm2Plan PlanFirstExposure(Sm2State current, int quality, DateTime now, bool isRepeatedThisSession)
        {
            var resultDays = isRepeatedThisSession || quality >= 5 ? 1 : 0;
            var newEaseFactor = Math.Max(EaseFactorFloor, current.EaseFactor);
            var newIntervalDays = Math.Max(0, resultDays);
            var newRepetitions = quality >= 5 ? 1 : 0;
            var nextReviewDate = now.AddDays(resultDays);

            var newState = current with
            {
                EaseFactor = newEaseFactor,
                IntervalDays = newIntervalDays,
                Repetitions = newRepetitions,
                LastReviewDate = now,
                NextReviewDate = nextReviewDate
            };

            return new Sm2Plan(newState, nextReviewDate, UserVocabularyStatuses.Learning);
        }

        private static Sm2Plan PlanRealReview(Sm2State current, int quality, DateTime now)
        {
            var easeFactor = Math.Max(EaseFactorFloor, current.EaseFactor);
            var intervalDays = Math.Max(1, current.IntervalDays);
            var repetitions = Math.Max(0, current.Repetitions);

            if (quality >= 3)
            {
                var previousRepetitions = repetitions;
                repetitions += 1;
                easeFactor = CalculateUpdatedEaseFactor(easeFactor, quality);
                intervalDays = CalculateSuccessfulReviewIntervalDays(intervalDays, easeFactor, quality, previousRepetitions);
            }
            else
            {
                // Failed — reset repetition/interval. Minimum 1 day prevents same-session repeat.
                repetitions = 0;
                intervalDays = 1;
            }

            var status = repetitions >= MasteredRepetitionThreshold
                ? UserVocabularyStatuses.Mastered
                : UserVocabularyStatuses.Learning;

            var nextReviewDate = now.AddDays(intervalDays);

            var newState = current with
            {
                EaseFactor = easeFactor,
                IntervalDays = intervalDays,
                Repetitions = repetitions,
                LastReviewDate = now,
                NextReviewDate = nextReviewDate
            };

            return new Sm2Plan(newState, nextReviewDate, status);
        }

        private static int CalculateRealReviewIntervalDays(Sm2State state, int quality, bool allowImmediateForgot)
        {
            if (quality < 3)
            {
                return allowImmediateForgot ? 0 : 1;
            }

            var easeFactor = CalculateUpdatedEaseFactor(Math.Max(EaseFactorFloor, state.EaseFactor), quality);
            var intervalDays = Math.Max(1, state.IntervalDays);
            var repetitions = Math.Max(0, state.Repetitions);
            return CalculateSuccessfulReviewIntervalDays(intervalDays, easeFactor, quality, repetitions);
        }

        private static int CalculateSuccessfulReviewIntervalDays(int intervalDays, double easeFactor, int quality, int repetitions)
        {
            return quality switch
            {
                3 when repetitions <= 1 => Math.Max(2, (int)Math.Round(intervalDays * easeFactor * 0.5d, MidpointRounding.AwayFromZero)),
                3 => Math.Max(intervalDays + 1, (int)Math.Round(intervalDays * easeFactor * 0.75d, MidpointRounding.AwayFromZero)),
                4 when repetitions <= 1 => Math.Max(3, (int)Math.Round(intervalDays * easeFactor, MidpointRounding.AwayFromZero)),
                4 => Math.Max(intervalDays + 2, (int)Math.Round(intervalDays * easeFactor, MidpointRounding.AwayFromZero)),
                5 => Math.Max(6, (int)Math.Round(intervalDays * easeFactor * 1.3d, MidpointRounding.AwayFromZero)),
                _ => Math.Max(1, (int)Math.Round(intervalDays * easeFactor, MidpointRounding.AwayFromZero))
            };
        }

        private static double CalculateUpdatedEaseFactor(double easeFactor, int quality)
        {
            return Math.Max(EaseFactorFloor, easeFactor + (0.1d - (5 - quality) * (0.08d + (5 - quality) * 0.02d)));
        }
    }
}
