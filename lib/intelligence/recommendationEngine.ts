import type { VARKProfile } from "./varkEngine"

/**
 * Learning content descriptor used by the recommendation engine.
 */
export type LearningContent = Readonly<{
  id: string
  concept: string
  difficulty: number // 0-100
  learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
  lastSeenDaysAgo: number
}>;

/**
 * Rank learning contents for a student.
 *
 * Factors:
 * - Style alignment (0.4): preference match between student's VARK profile
 *   and the content's learning mode — helps surface content the student will
 *   naturally prefer and engage with.
 * - Mastery gap match (0.3): how well the content difficulty addresses the
 *   student's current mastery gaps (difficulty higher than current mastery
 *   indicates an opportunity to close gaps).
 * - Engagement boost (0.2): boosts items when the student is currently
 *   engaged — useful to prioritize opportunities while attention is high.
 * - Content freshness (0.1): favors items not seen recently so the feed
 *   resurfaces forgotten or spaced items for retention.
 */
export function rankContentForStudent(
  contents: LearningContent[],
  masteryScore: number,
  varkProfile: VARKProfile,
  engagementScore: number
): (LearningContent & { score: number })[] {
  const clamp = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0))

  const ranked = contents.map((c) => {
    // 1) Style alignment: use the student's VARK percentage for the content's mode.
    //    Higher means the content matches the learner's preferred mode.
    const styleAlignment = clamp((varkProfile as any)[c.learningMode] ?? 0)

    // 2) Mastery gap match: if content difficulty > masteryScore, there is a
    //    positive gap to close. Use that gap (0-100) as the signal. If
    //    difficulty <= masteryScore, gap is 0 (no immediate gap to close).
    const masteryGap = Math.max(0, clamp(c.difficulty) - clamp(masteryScore))

    // 3) Engagement boost: direct student engagement signal (0-100).
    //    Highly engaged students can be given slightly more challenging
    //    or exploratory content.
    const engagementBoost = clamp(engagementScore)

    // 4) Freshness: items not seen recently should be favored for spacing.
    //    Map `lastSeenDaysAgo` to a 0-100 freshness score with a 30-day window.
    const freshness = clamp(Math.min(100, (c.lastSeenDaysAgo / 30) * 100))

    // Combine weighted scores. Each sub-score is 0-100, weights sum to 1.
    const scoreRaw =
      styleAlignment * 0.4 + masteryGap * 0.3 + engagementBoost * 0.2 + freshness * 0.1

    const score = Math.round(clamp(scoreRaw))

    return { ...c, score }
  })

  // Sort descending by score
  ranked.sort((a, b) => b.score - a.score)

  return ranked
}

export default rankContentForStudent
