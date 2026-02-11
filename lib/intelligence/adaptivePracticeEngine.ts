/**
 * Adaptive Practice Engine
 * 
 * Dynamically generates personalized practice assignments based on:
 * - Student's mastery profile (weak concepts prioritized)
 * - Learning style (VARK preferences)
 * - Spaced repetition (resurface forgotten concepts)
 * - Zone of Proximal Development (slightly above current level)
 */

export interface PracticeQuestion {
  id: string
  conceptId: string
  conceptName: string
  question: string
  type: "multiple-choice" | "short-answer" | "true-false" | "fill-blank"
  options?: string[]
  correctAnswer: string
  explanation: string
  difficulty: number // 0-100
  learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
  hints?: string[]
}

export interface PracticeSession {
  id: string
  studentId: string
  conceptId: string
  conceptName: string
  questions: PracticeQuestion[]
  startedAt: string
  completedAt?: string
  score?: number
  timeSpent?: number
  questionsAnswered: number
  correctAnswers: number
}

export interface AdaptivePracticeConfig {
  targetConceptCount: number // How many weak concepts to target
  questionsPerConcept: number
  difficultyBuffer: number // How much above mastery level to target
  includeSpacedRepetition: boolean
}

export interface ConceptGap {
  conceptId: string
  conceptName: string
  masteryScore: number
  priority: "critical" | "high" | "medium" | "low"
  lastPracticed?: string
  recommendedDifficulty: number
}

// Question bank templates by concept
const questionTemplates: Record<string, PracticeQuestion[]> = {
  "linear-equations": [
    {
      id: "le-1",
      conceptId: "linear-equations",
      conceptName: "Linear Equations",
      question: "Solve for x: 2x + 5 = 15",
      type: "short-answer",
      correctAnswer: "5",
      explanation: "Subtract 5 from both sides: 2x = 10. Divide by 2: x = 5",
      difficulty: 30,
      learningMode: "reading",
      hints: ["First, isolate the term with x", "What number times 2 equals 10?"]
    },
    {
      id: "le-2",
      conceptId: "linear-equations",
      conceptName: "Linear Equations",
      question: "What is the slope of the line y = 3x - 7?",
      type: "multiple-choice",
      options: ["3", "-7", "7", "-3"],
      correctAnswer: "3",
      explanation: "In y = mx + b form, m is the slope. Here m = 3",
      difficulty: 40,
      learningMode: "visual"
    },
    {
      id: "le-3",
      conceptId: "linear-equations",
      conceptName: "Linear Equations",
      question: "True or False: The equation 4x - 8 = 0 has a solution of x = 2",
      type: "true-false",
      correctAnswer: "true",
      explanation: "4(2) - 8 = 8 - 8 = 0 ✓",
      difficulty: 25,
      learningMode: "reading"
    },
    {
      id: "le-4",
      conceptId: "linear-equations",
      conceptName: "Linear Equations",
      question: "Fill in the blank: If 5x = 25, then x = ___",
      type: "fill-blank",
      correctAnswer: "5",
      explanation: "Divide both sides by 5: x = 25/5 = 5",
      difficulty: 20,
      learningMode: "kinesthetic"
    }
  ],
  "quadratic-equations": [
    {
      id: "qe-1",
      conceptId: "quadratic-equations",
      conceptName: "Quadratic Equations",
      question: "Solve: x² - 9 = 0",
      type: "multiple-choice",
      options: ["x = 3 or x = -3", "x = 9", "x = 3", "x = -9"],
      correctAnswer: "x = 3 or x = -3",
      explanation: "x² = 9, so x = ±√9 = ±3",
      difficulty: 45,
      learningMode: "visual"
    },
    {
      id: "qe-2",
      conceptId: "quadratic-equations",
      conceptName: "Quadratic Equations",
      question: "What is the vertex form of a quadratic equation?",
      type: "multiple-choice",
      options: ["y = a(x-h)² + k", "y = ax² + bx + c", "y = mx + b", "y = a/x"],
      correctAnswer: "y = a(x-h)² + k",
      explanation: "Vertex form shows the vertex at point (h, k)",
      difficulty: 55,
      learningMode: "reading"
    }
  ],
  "fractions": [
    {
      id: "fr-1",
      conceptId: "fractions",
      conceptName: "Fractions",
      question: "Simplify: 12/18",
      type: "short-answer",
      correctAnswer: "2/3",
      explanation: "GCD of 12 and 18 is 6. 12÷6 = 2, 18÷6 = 3",
      difficulty: 30,
      learningMode: "visual"
    },
    {
      id: "fr-2",
      conceptId: "fractions",
      conceptName: "Fractions",
      question: "What is 1/4 + 1/2?",
      type: "multiple-choice",
      options: ["3/4", "2/6", "1/6", "2/4"],
      correctAnswer: "3/4",
      explanation: "Convert to common denominator: 1/4 + 2/4 = 3/4",
      difficulty: 35,
      learningMode: "kinesthetic"
    }
  ],
  "geometry-basics": [
    {
      id: "gb-1",
      conceptId: "geometry-basics",
      conceptName: "Geometry Basics",
      question: "What is the area of a rectangle with length 8 and width 5?",
      type: "short-answer",
      correctAnswer: "40",
      explanation: "Area = length × width = 8 × 5 = 40",
      difficulty: 25,
      learningMode: "visual"
    },
    {
      id: "gb-2",
      conceptId: "geometry-basics",
      conceptName: "Geometry Basics",
      question: "How many degrees are in a triangle's interior angles total?",
      type: "multiple-choice",
      options: ["180", "360", "90", "270"],
      correctAnswer: "180",
      explanation: "The sum of interior angles in any triangle is always 180°",
      difficulty: 30,
      learningMode: "reading"
    }
  ],
  "percentages": [
    {
      id: "pct-1",
      conceptId: "percentages",
      conceptName: "Percentages",
      question: "What is 25% of 80?",
      type: "short-answer",
      correctAnswer: "20",
      explanation: "25% = 0.25, so 0.25 × 80 = 20",
      difficulty: 25,
      learningMode: "reading"
    },
    {
      id: "pct-2",
      conceptId: "percentages",
      conceptName: "Percentages",
      question: "If a shirt costs $50 and is 20% off, what is the sale price?",
      type: "multiple-choice",
      options: ["$40", "$30", "$45", "$35"],
      correctAnswer: "$40",
      explanation: "20% of $50 = $10 discount. $50 - $10 = $40",
      difficulty: 40,
      learningMode: "kinesthetic"
    }
  ],
  "algebra-basics": [
    {
      id: "ab-1",
      conceptId: "algebra-basics",
      conceptName: "Algebra Basics",
      question: "Simplify: 3x + 5x",
      type: "short-answer",
      correctAnswer: "8x",
      explanation: "Combine like terms: 3x + 5x = 8x",
      difficulty: 20,
      learningMode: "reading"
    },
    {
      id: "ab-2",
      conceptId: "algebra-basics",
      conceptName: "Algebra Basics",
      question: "If y = 2x and x = 4, what is y?",
      type: "short-answer",
      correctAnswer: "8",
      explanation: "Substitute x = 4: y = 2(4) = 8",
      difficulty: 25,
      learningMode: "kinesthetic"
    }
  ]
}

/**
 * Identify concept gaps based on mastery data
 */
export function identifyConceptGaps(
  masteryData: Array<{ conceptId: string; conceptName: string; masteryScore: number; lastActivity?: string }>
): ConceptGap[] {
  const gaps: ConceptGap[] = masteryData
    .filter(m => m.masteryScore < 80) // Only concepts not mastered
    .map(m => {
      let priority: ConceptGap["priority"]
      if (m.masteryScore < 30) priority = "critical"
      else if (m.masteryScore < 50) priority = "high"
      else if (m.masteryScore < 65) priority = "medium"
      else priority = "low"

      return {
        conceptId: m.conceptId,
        conceptName: m.conceptName,
        masteryScore: m.masteryScore,
        priority,
        lastPracticed: m.lastActivity,
        recommendedDifficulty: Math.min(100, m.masteryScore + 15) // Slightly above current level
      }
    })
    .sort((a, b) => {
      // Sort by priority then by mastery score
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      return a.masteryScore - b.masteryScore
    })

  return gaps
}

/**
 * Generate adaptive practice questions for a student
 */
export function generateAdaptivePractice(
  gaps: ConceptGap[],
  varkProfile: { visual: number; auditory: number; reading: number; kinesthetic: number },
  config: AdaptivePracticeConfig = {
    targetConceptCount: 3,
    questionsPerConcept: 3,
    difficultyBuffer: 15,
    includeSpacedRepetition: true
  }
): PracticeQuestion[] {
  const selectedGaps = gaps.slice(0, config.targetConceptCount)
  const questions: PracticeQuestion[] = []

  // Determine dominant learning style
  const styles = Object.entries(varkProfile).sort((a, b) => b[1] - a[1])
  const dominantStyle = styles[0][0] as PracticeQuestion["learningMode"]
  const secondaryStyle = styles[1][0] as PracticeQuestion["learningMode"]

  for (const gap of selectedGaps) {
    const conceptQuestions = questionTemplates[gap.conceptId] || []
    
    if (conceptQuestions.length === 0) {
      // Generate generic questions if no templates exist
      questions.push(...generateGenericQuestions(gap, config.questionsPerConcept, dominantStyle))
      continue
    }

    // Filter and sort by learning style preference and appropriate difficulty
    const targetDifficulty = gap.recommendedDifficulty
    const suitable = conceptQuestions
      .filter(q => q.difficulty <= targetDifficulty + config.difficultyBuffer)
      .sort((a, b) => {
        // Prefer questions matching learning style
        const aStyleMatch = a.learningMode === dominantStyle ? 2 : a.learningMode === secondaryStyle ? 1 : 0
        const bStyleMatch = b.learningMode === dominantStyle ? 2 : b.learningMode === secondaryStyle ? 1 : 0
        if (aStyleMatch !== bStyleMatch) return bStyleMatch - aStyleMatch
        
        // Then by difficulty proximity to target
        return Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty)
      })

    // Take required number of questions
    const selected = suitable.slice(0, config.questionsPerConcept)
    questions.push(...selected.map(q => ({
      ...q,
      id: `${q.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    })))
  }

  return questions
}

/**
 * Generate generic questions when no templates exist
 */
function generateGenericQuestions(
  gap: ConceptGap,
  count: number,
  learningMode: PracticeQuestion["learningMode"]
): PracticeQuestion[] {
  const questions: PracticeQuestion[] = []
  const types: PracticeQuestion["type"][] = ["multiple-choice", "true-false", "short-answer"]

  for (let i = 0; i < count; i++) {
    questions.push({
      id: `gen-${gap.conceptId}-${i}-${Date.now()}`,
      conceptId: gap.conceptId,
      conceptName: gap.conceptName,
      question: `Practice question ${i + 1} for ${gap.conceptName}`,
      type: types[i % types.length],
      options: types[i % types.length] === "multiple-choice" ? ["Option A", "Option B", "Option C", "Option D"] : undefined,
      correctAnswer: types[i % types.length] === "true-false" ? "true" : "Option A",
      explanation: `This helps reinforce your understanding of ${gap.conceptName}`,
      difficulty: gap.recommendedDifficulty,
      learningMode
    })
  }

  return questions
}

/**
 * Calculate practice session score and update recommendations
 */
export function evaluatePracticeSession(
  session: PracticeSession
): { score: number; masteryChange: number; recommendations: string[] } {
  const score = session.questionsAnswered > 0 
    ? Math.round((session.correctAnswers / session.questionsAnswered) * 100)
    : 0

  const masteryChange = score >= 70 ? Math.round((score - 50) / 5) : Math.round((score - 70) / 10)

  const recommendations: string[] = []
  
  if (score >= 90) {
    recommendations.push("Excellent work! You've mastered this concept well.")
    recommendations.push("Consider moving to more challenging material.")
  } else if (score >= 70) {
    recommendations.push("Good progress! A bit more practice will solidify your understanding.")
  } else if (score >= 50) {
    recommendations.push("You're getting there! Review the explanations for missed questions.")
    recommendations.push("Try watching a video explanation of this concept.")
  } else {
    recommendations.push("This concept needs more attention. Let's review the basics.")
    recommendations.push("Consider asking your teacher for additional help.")
  }

  return { score, masteryChange, recommendations }
}

/**
 * Get next recommended practice based on performance
 */
export function getNextPracticeRecommendation(
  currentConceptId: string,
  score: number,
  allGaps: ConceptGap[]
): ConceptGap | null {
  if (score >= 80) {
    // Move to next priority concept
    return allGaps.find(g => g.conceptId !== currentConceptId) || null
  } else {
    // Stay on current concept with adjusted difficulty
    const current = allGaps.find(g => g.conceptId === currentConceptId)
    if (current) {
      return {
        ...current,
        recommendedDifficulty: Math.max(10, current.recommendedDifficulty - 10)
      }
    }
    return null
  }
}

export default {
  identifyConceptGaps,
  generateAdaptivePractice,
  evaluatePracticeSession,
  getNextPracticeRecommendation
}
