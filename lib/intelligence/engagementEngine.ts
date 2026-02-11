/**
 * Engagement engine
 *
 * Provides a small deterministic utility to compute an engagement `score` and
 * `level` from multiple behavior signals. Teachers and the AMEP intervention
 * workflow can use the output to triage students for outreach or differentiated
 * support: a low engagement level can flag students for check-ins, medium can
 * suggest nudges or targeted content, and high can deprioritize immediate
 * intervention.
 */

export type EngagementInputs = Readonly<{
  /** How frequently the learner logs in (0–100). */
  loginFrequency: number
  /** How much the learner interacts with content (clicks, views, completions) (0–100). */
  contentInteraction: number
  /** Use of AI tutoring or assistance (0–100). */
  aiUsage: number
  /** Participation in projects or collaborative activities (0–100). */
  projectParticipation: number
  /** Overall consistency of engagement over time (0–100). */
  consistencyScore: number
}>;

/**
 * Calculate engagement index used for teacher intervention decisions.
 *
 * Weighted formula:
 *  - loginFrequency: 0.25
 *  - contentInteraction: 0.25
 *  - aiUsage: 0.20
 *  - projectParticipation: 0.20
 *  - consistencyScore: 0.10
 *
 * Returns an object with `score` (0–100, rounded) and `level`:
 *  - < 40 => "low"
 *  - 40–70 => "medium"
 *  - > 70 => "high"
 *
 * The function is deterministic, clamps out-of-range inputs, and contains no
 * randomness so downstream tooling and alerts are stable.
 */
export function calculateEngagementIndex(inputs: EngagementInputs): {
  score: number
  level: "low" | "medium" | "high"
} {
  const clamp = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0))

  const login = clamp(inputs.loginFrequency)
  const content = clamp(inputs.contentInteraction)
  const ai = clamp(inputs.aiUsage)
  const project = clamp(inputs.projectParticipation)
  const consistency = clamp(inputs.consistencyScore)

  const raw =
    login * 0.25 + content * 0.25 + ai * 0.2 + project * 0.2 + consistency * 0.1

  const score = Math.round(Math.max(0, Math.min(100, raw)))

  const level: "low" | "medium" | "high" = score < 40 ? "low" : score > 70 ? "high" : "medium"

  return { score, level }
}

export default calculateEngagementIndex
