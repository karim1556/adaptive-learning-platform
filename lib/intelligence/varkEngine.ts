/**
 * VARK preference evolution engine
 *
 * VARK here is treated as a set of evolving preference signals (not fixed
 * immutable labels). After content completion or AI interactions we update the
 * profile by boosting the learning-mode that produced positive mastery/engagement
 * signals and applying a slight decay to non-used styles. The result is always
 * normalized so the four dimensions sum to 100 and no value drops below 0.
 */

export type VARKProfile = Readonly<{
  visual: number
  auditory: number
  reading: number
  kinesthetic: number
}>;

export function updateVARKProfile(
  current: VARKProfile,
  event: {
    learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
    masteryGain: number
    engagementGain: number
  }
): VARKProfile {
  const clamp = (v: number) => Math.max(0, Number.isFinite(v) ? v : 0)

  // Treat gains as 0-100 signals; combine with slightly higher weight on mastery
  const mastery = clamp(event.masteryGain)
  const engagement = clamp(event.engagementGain)
  const combinedSignal = mastery * 0.6 + engagement * 0.4 // range 0-100

  // Determine absolute boost. Larger gains produce larger boosts, up to a cap.
  // This keeps the profile responsive but bounded.
  const MAX_BOOST = 30 // maximum raw points to add to the matching style
  const boost = (combinedSignal / 100) * MAX_BOOST

  // Relative decay applied to non-used styles (small proportional decay)
  const DECAY_RATE = 0.02 // 2% relative decay per event

  const next: Record<string, number> = {
    visual: current.visual,
    auditory: current.auditory,
    reading: current.reading,
    kinesthetic: current.kinesthetic,
  }

  // Apply decay to all styles first
  for (const k of Object.keys(next)) {
    next[k] = Math.max(0, next[k] - next[k] * DECAY_RATE)
  }

  // Boost the matching style
  next[event.learningMode] = (next[event.learningMode] || 0) + boost

  // Ensure no negatives (already guarded) and normalize so total = 100
  const total = Object.values(next).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)

  if (total <= 0) {
    // Fallback to uniform distribution
    return { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 }
  }

  const normalized: VARKProfile = {
    visual: (next.visual / total) * 100,
    auditory: (next.auditory / total) * 100,
    reading: (next.reading / total) * 100,
    kinesthetic: (next.kinesthetic / total) * 100,
  }

  // Final safety clamp to avoid tiny negative rounding issues
  for (const k of Object.keys(normalized)) {
    // @ts-ignore - dynamic access for safety clamp
    normalized[k] = Math.max(0, normalized[k])
  }

  return normalized
}

export default updateVARKProfile
