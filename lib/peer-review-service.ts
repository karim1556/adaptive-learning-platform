/**
 * Peer Review Service
 * 
 * Enables objective soft-skill assessment through:
 * - Peer evaluation rubrics (teamwork, creativity, communication, problem-solving)
 * - Anonymous peer feedback
 * - Aggregated soft-skill scores
 * - Progress visualization
 */

export interface SoftSkillRubric {
  id: string
  skill: "teamwork" | "creativity" | "communication" | "problem-solving" | "leadership"
  name: string
  description: string
  levels: {
    score: number
    label: string
    description: string
  }[]
}

export interface PeerReview {
  id: string
  projectId: string
  reviewerId: string
  reviewerName?: string // Only if not anonymous
  revieweeId: string
  revieweeName: string
  isAnonymous: boolean
  ratings: {
    skill: string
    score: number
    comment?: string
  }[]
  overallComment?: string
  strengths: string[]
  improvements: string[]
  submittedAt: string
}

export interface PeerReviewSummary {
  studentId: string
  studentName: string
  projectId: string
  reviewCount: number
  averageScores: Record<string, number>
  overallScore: number
  commonStrengths: string[]
  commonImprovements: string[]
  trend: "improving" | "stable" | "declining"
}

export interface PeerReviewAssignment {
  id: string
  projectId: string
  reviewerId: string
  revieweeId: string
  assignedAt: string
  completedAt?: string
  status: "pending" | "completed"
}

const REVIEWS_STORAGE_KEY = "adaptiq_peer_reviews_v1"
const ASSIGNMENTS_STORAGE_KEY = "adaptiq_review_assignments_v1"

// Standard soft skill rubrics
export const softSkillRubrics: SoftSkillRubric[] = [
  {
    id: "teamwork",
    skill: "teamwork",
    name: "Teamwork",
    description: "Ability to collaborate effectively with team members",
    levels: [
      { score: 1, label: "Needs Improvement", description: "Rarely participates or contributes to team discussions" },
      { score: 2, label: "Developing", description: "Sometimes participates but inconsistently" },
      { score: 3, label: "Proficient", description: "Actively participates and supports teammates" },
      { score: 4, label: "Advanced", description: "Leads collaboration and helps others contribute" },
      { score: 5, label: "Exemplary", description: "Inspires the team and resolves conflicts constructively" }
    ]
  },
  {
    id: "creativity",
    skill: "creativity",
    name: "Creativity",
    description: "Ability to generate original ideas and innovative solutions",
    levels: [
      { score: 1, label: "Needs Improvement", description: "Relies mostly on existing solutions" },
      { score: 2, label: "Developing", description: "Occasionally suggests new ideas" },
      { score: 3, label: "Proficient", description: "Regularly proposes creative solutions" },
      { score: 4, label: "Advanced", description: "Consistently innovates and thinks outside the box" },
      { score: 5, label: "Exemplary", description: "Inspires others with breakthrough ideas" }
    ]
  },
  {
    id: "communication",
    skill: "communication",
    name: "Communication",
    description: "Ability to express ideas clearly and listen actively",
    levels: [
      { score: 1, label: "Needs Improvement", description: "Struggles to express ideas clearly" },
      { score: 2, label: "Developing", description: "Can communicate basic ideas when prompted" },
      { score: 3, label: "Proficient", description: "Communicates ideas clearly and listens to others" },
      { score: 4, label: "Advanced", description: "Articulates complex ideas and facilitates discussion" },
      { score: 5, label: "Exemplary", description: "Exceptional communicator who adapts to audience" }
    ]
  },
  {
    id: "problem-solving",
    skill: "problem-solving",
    name: "Problem Solving",
    description: "Ability to analyze challenges and develop effective solutions",
    levels: [
      { score: 1, label: "Needs Improvement", description: "Struggles to identify problems" },
      { score: 2, label: "Developing", description: "Can identify problems but needs help solving" },
      { score: 3, label: "Proficient", description: "Analyzes problems and proposes solutions" },
      { score: 4, label: "Advanced", description: "Systematically solves complex problems" },
      { score: 5, label: "Exemplary", description: "Anticipates problems and implements preventive solutions" }
    ]
  },
  {
    id: "leadership",
    skill: "leadership",
    name: "Leadership",
    description: "Ability to guide and motivate others toward goals",
    levels: [
      { score: 1, label: "Needs Improvement", description: "Rarely takes initiative" },
      { score: 2, label: "Developing", description: "Takes initiative when asked" },
      { score: 3, label: "Proficient", description: "Proactively takes on responsibility" },
      { score: 4, label: "Advanced", description: "Guides team and delegates effectively" },
      { score: 5, label: "Exemplary", description: "Inspires others and leads by example" }
    ]
  }
]

function loadReviews(): PeerReview[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(REVIEWS_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveReviews(reviews: PeerReview[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews))
}

function loadAssignments(): PeerReviewAssignment[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveAssignments(assignments: PeerReviewAssignment[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments))
}

/**
 * Assign peer reviews for a project
 * Each student reviews 2-3 other team members
 */
export function assignPeerReviews(
  projectId: string,
  teamMembers: { id: string; name: string }[],
  reviewsPerStudent: number = 2
): PeerReviewAssignment[] {
  const assignments: PeerReviewAssignment[] = []
  const existingAssignments = loadAssignments()

  // Remove old assignments for this project
  const filtered = existingAssignments.filter(a => a.projectId !== projectId)

  for (const reviewer of teamMembers) {
    // Get other team members (potential reviewees)
    const others = teamMembers.filter(m => m.id !== reviewer.id)
    
    // Randomly select reviewees
    const shuffled = others.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(reviewsPerStudent, shuffled.length))

    for (const reviewee of selected) {
      assignments.push({
        id: `assign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        reviewerId: reviewer.id,
        revieweeId: reviewee.id,
        assignedAt: new Date().toISOString(),
        status: "pending"
      })
    }
  }

  saveAssignments([...filtered, ...assignments])
  return assignments
}

/**
 * Get pending reviews for a student
 */
export function getPendingReviews(studentId: string): PeerReviewAssignment[] {
  const assignments = loadAssignments()
  return assignments.filter(a => a.reviewerId === studentId && a.status === "pending")
}

/**
 * Get completed reviews for a student (reviews they've received)
 */
export function getReceivedReviews(studentId: string, projectId?: string): PeerReview[] {
  const reviews = loadReviews()
  return reviews.filter(r => 
    r.revieweeId === studentId && 
    (!projectId || r.projectId === projectId)
  )
}

/**
 * Submit a peer review
 */
export function submitPeerReview(
  review: Omit<PeerReview, "id" | "submittedAt">
): { success: boolean; error?: string } {
  try {
    const reviews = loadReviews()
    const assignments = loadAssignments()

    // Check if already reviewed
    const existing = reviews.find(
      r => r.projectId === review.projectId && 
           r.reviewerId === review.reviewerId && 
           r.revieweeId === review.revieweeId
    )
    if (existing) {
      return { success: false, error: "Already submitted a review for this team member" }
    }

    const newReview: PeerReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      submittedAt: new Date().toISOString()
    }

    reviews.push(newReview)
    saveReviews(reviews)

    // Update assignment status
    const assignmentIndex = assignments.findIndex(
      a => a.projectId === review.projectId && 
           a.reviewerId === review.reviewerId && 
           a.revieweeId === review.revieweeId
    )
    if (assignmentIndex !== -1) {
      assignments[assignmentIndex].status = "completed"
      assignments[assignmentIndex].completedAt = new Date().toISOString()
      saveAssignments(assignments)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Calculate peer review summary for a student
 */
export function calculateReviewSummary(studentId: string, projectId?: string): PeerReviewSummary | null {
  const reviews = getReceivedReviews(studentId, projectId)
  
  if (reviews.length === 0) return null

  // Calculate average scores per skill
  const skillScores: Record<string, number[]> = {}
  const allStrengths: string[] = []
  const allImprovements: string[] = []

  for (const review of reviews) {
    for (const rating of review.ratings) {
      if (!skillScores[rating.skill]) {
        skillScores[rating.skill] = []
      }
      skillScores[rating.skill].push(rating.score)
    }
    allStrengths.push(...review.strengths)
    allImprovements.push(...review.improvements)
  }

  const averageScores: Record<string, number> = {}
  let totalScore = 0
  let scoreCount = 0

  for (const [skill, scores] of Object.entries(skillScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    averageScores[skill] = Math.round(avg * 10) / 10
    totalScore += avg
    scoreCount++
  }

  const overallScore = scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0

  // Find common strengths and improvements
  const strengthCounts: Record<string, number> = {}
  const improvementCounts: Record<string, number> = {}

  for (const s of allStrengths) {
    strengthCounts[s] = (strengthCounts[s] || 0) + 1
  }
  for (const i of allImprovements) {
    improvementCounts[i] = (improvementCounts[i] || 0) + 1
  }

  const commonStrengths = Object.entries(strengthCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s)

  const commonImprovements = Object.entries(improvementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([i]) => i)

  return {
    studentId,
    studentName: reviews[0]?.revieweeName || "Student",
    projectId: projectId || reviews[0]?.projectId || "",
    reviewCount: reviews.length,
    averageScores,
    overallScore,
    commonStrengths,
    commonImprovements,
    trend: "stable" // Would need historical data to calculate trend
  }
}

/**
 * Get all review summaries for a project (teacher view)
 */
export function getProjectReviewSummaries(projectId: string, teamMembers: { id: string; name: string }[]): PeerReviewSummary[] {
  return teamMembers
    .map(member => calculateReviewSummary(member.id, projectId))
    .filter((s): s is PeerReviewSummary => s !== null)
}

/**
 * Pre-defined strength/improvement options for quick selection
 */
export const feedbackOptions = {
  strengths: [
    "Great communicator",
    "Reliable and dependable",
    "Creative thinker",
    "Strong problem solver",
    "Good listener",
    "Takes initiative",
    "Helps others",
    "Stays organized",
    "Meets deadlines",
    "Positive attitude"
  ],
  improvements: [
    "Could participate more",
    "Needs to meet deadlines",
    "Could communicate more clearly",
    "Should consider others' ideas",
    "Needs to take more initiative",
    "Could be more organized",
    "Should share work more equally",
    "Needs to listen more",
    "Could be more creative",
    "Should ask for help when needed"
  ]
}

export default {
  softSkillRubrics,
  assignPeerReviews,
  getPendingReviews,
  getReceivedReviews,
  submitPeerReview,
  calculateReviewSummary,
  getProjectReviewSummaries,
  feedbackOptions
}
