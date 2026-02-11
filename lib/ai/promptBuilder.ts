/**
 * Tutor prompt builder
 *
 * Produces a single string prompt for an AI tutor. The prompt constrains the
 * model to stay within grade-level syllabus content for the given concept,
 * adapts explanation depth to `masteryScore`, matches the student's dominant
 * learning style, and ends with a short self-check question.
 *
 * Constraining the prompt (explicit syllabus restriction, clear depth and
 * style rules, and a single short output requirement) reduces hallucination
 * risk by limiting the assistant's permission surface and encouraging it to
 * avoid inventing out-of-syllabus details.
 */

export type DominantStyle = "visual" | "auditory" | "reading" | "kinesthetic"

/**
 * Build a tutoring prompt for the AI assistant.
 *
 * Parameters:
 * - `grade`: numeric grade level (used to anchor syllabus-level constraints)
 * - `concept`: the concept to explain
 * - `masteryScore`: 0-100 used to choose explanation depth
 * - `dominantStyle`: preferred learning style to shape presentation
 * - `studentQuestion`: the student's specific question to answer
 */
export function buildTutorPrompt(
  grade: number,
  concept: string,
  masteryScore: number,
  dominantStyle: DominantStyle,
  studentQuestion: string
): string {
  const clamp = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0))
  const ms = clamp(masteryScore)

  // Explanation depth guidance
  let depthInstruction = ""
  if (ms < 40) {
    depthInstruction =
      "Give a clear, step-by-step explanation with simple definitions, a worked example, and one short practice step the student can try now. Use minimal jargon."
  } else if (ms <= 70) {
    depthInstruction =
      "Provide a concise conceptual overview with one worked example and one suggestion to deepen understanding. Use a balance of definitions and an example."
  } else {
    depthInstruction =
      "Deliver a succinct, precise explanation that highlights connections and one optional extension or challenge to push mastery further. Keep examples brief."
  }

  // Style mapping
  const styleInstructionMap: Record<DominantStyle, string> = {
    visual:
      "Use descriptive visual language; include a simple diagram description or ASCII diagram the student can sketch, and call out key visual sequences or spatial relationships.",
    auditory:
      "Use spoken-language cues and analogies; write as if you are reading the explanation aloud with clear pausing markers and mnemonic phrases.",
    reading:
      "Present the explanation in well-structured paragraphs and bullet points; include clear definitions and labeled steps the student can re-read.",
    kinesthetic:
      "Suggest a short hands-on activity or step-by-step practice the student can perform, describing what to do and what to observe.",
  }

  const styleInstruction = styleInstructionMap[dominantStyle]

  // Syllabus-level guard: explicitly instruct the model to stay within the
  // grade-level scope for the given concept. This is an important anti-
  // hallucination constraint — the model should NOT introduce advanced or
  // unrelated topics.
  const syllabusGuard = `Limit the explanation strictly to topics and depth appropriate for Grade ${grade} syllabus-level treatment of "${concept}". Do not introduce concepts, facts, or examples beyond what would reasonably appear in a Grade ${grade} curriculum for this concept.`

  // Final self-check question: short, focused, aligned with the explanation.
  const selfCheck = `End the response with exactly one short self-check question (one sentence) that asks the student to apply the main idea.`

  // Student question instruction — answer the student's question using the
  // selected depth and style, and keep output concise and factual.
  const studentQInstr = `Answer the student's question: "${studentQuestion.replace(/"/g, '\"')}".`

  // Compose the final prompt. Keep instructions explicit and ordered to make
  // it easier for the model to follow constraints (reduces hallucination).
  const prompt = [
    `You are a helpful, accurate AI tutor.`,
    syllabusGuard,
    `Follow these rules exactly:`,
    `1) ${depthInstruction}`,
    `2) Match explanation style: ${styleInstruction}`,
    `3) Stay concise and avoid unnecessary tangents.`,
    `4) If you are unsure about a factual detail, say 'I don't know' or suggest consulting the syllabus or teacher.`,
    `5) Do not invent external references, statistics, or citations.`,
    `6) ${selfCheck}`,
    `Now: ${studentQInstr}`,
  ].join("\n\n")

  return prompt
}

export default buildTutorPrompt
