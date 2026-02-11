/**
 * Mastery engine utilities
 *
 * This module provides a deterministic, transparent calculation for a learner's
 * mastery score for a concept. The calculation uses a weighted average of
 * complementary indicators:
 *  - `assessmentScore` (summative, high-signal) — highest weight
 *  - `practiceAccuracy` (formative practice performance) — strong weight
 *  - `aiHelpEffectiveness` (how useful AI tutoring was) — small weight
 *  - `engagementConsistency` (regularity of study) — small weight
 *
 * The resulting score is clamped to [0,100] and rounded to the nearest integer.
 * This keeps the function deterministic and easy to reason about for downstream
 * components such as student dashboards.
 */

export type MasteryInputs = Readonly<{
  /** Summative assessment score (0–100). High weight because it reflects demonstrated learning. */
  assessmentScore: number
  /** Accuracy during practice activities (0–100). Reflects fluency with concepts. */
  practiceAccuracy: number
  /** Effectiveness of AI help as rated or estimated (0–100). Captures assisted learning benefit. */
  aiHelpEffectiveness: number
  /** Consistency of engagement (0–100). Regular study improves retention and mastery. */
  engagementConsistency: number
}>;

/**
 * Calculate an overall mastery score from multiple indicators.
 *
 * Weighted contributions:
 *  - assessmentScore: 0.5
 *  - practiceAccuracy: 0.3
 *  - aiHelpEffectiveness: 0.1
 *  - engagementConsistency: 0.1
 *
 * The result is clamped between 0 and 100 and rounded to the nearest integer.
 *
 * Educational reasoning (brief): summative assessments provide the strongest
 * evidence of learning, while practice accuracy and engagement provide
 * complementary formative signals. AI help is useful but should have a smaller
 * influence so that the score reflects learner competence rather than
 * assistance.
 */
export function calculateMasteryScore(inputs: MasteryInputs): number {
  const clamp01 = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0))

  const a = clamp01(inputs.assessmentScore)
  const p = clamp01(inputs.practiceAccuracy)
  const ai = clamp01(inputs.aiHelpEffectiveness)
  const e = clamp01(inputs.engagementConsistency)

  const raw = a * 0.5 + p * 0.3 + ai * 0.1 + e * 0.1

  const clamped = Math.max(0, Math.min(100, raw))

  return Math.round(clamped)
}

export default calculateMasteryScore
