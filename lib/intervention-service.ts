/**
 * Intervention Tracking Service
 * 
 * Tracks teacher interventions and measures their effectiveness:
 * - Log intervention actions
 * - Capture pre/post metrics
 * - Calculate improvement impact
 * - Generate intervention effectiveness reports
 */

export interface Intervention {
  id: string
  teacherId: string
  studentId: string
  studentName: string
  classId: string
  type: "one-on-one" | "small-group" | "resource-sharing" | "parent-contact" | "modified-assignment" | "tutoring" | "other"
  description: string
  reason: string // Why intervention was needed
  preMetrics: {
    masteryScore: number
    engagementLevel: number
    attendanceRate?: number
  }
  postMetrics?: {
    masteryScore: number
    engagementLevel: number
    attendanceRate?: number
    measuredAt: string
  }
  status: "planned" | "in-progress" | "completed" | "follow-up-needed"
  startedAt: string
  completedAt?: string
  followUpDate?: string
  notes: string[]
  outcome?: "significant-improvement" | "moderate-improvement" | "no-change" | "declined" | "pending"
}

export interface InterventionSummary {
  teacherId: string
  totalInterventions: number
  activeInterventions: number
  completedInterventions: number
  successRate: number // Percentage showing improvement
  averageImprovement: {
    mastery: number
    engagement: number
  }
  byType: Record<string, { count: number; successRate: number }>
  recentInterventions: Intervention[]
}

export interface StudentInterventionHistory {
  studentId: string
  studentName: string
  interventions: Intervention[]
  overallProgress: {
    initialMastery: number
    currentMastery: number
    change: number
  }
  effectivenessScore: number // 0-100 based on improvements
}

const INTERVENTIONS_STORAGE_KEY = "adaptiq_interventions_v1"

function loadInterventions(): Intervention[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(INTERVENTIONS_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveInterventions(interventions: Intervention[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(INTERVENTIONS_STORAGE_KEY, JSON.stringify(interventions))
}

/**
 * Create a new intervention
 */
export function createIntervention(
  data: Omit<Intervention, "id" | "startedAt" | "notes" | "status">
): { success: boolean; intervention?: Intervention; error?: string } {
  try {
    const intervention: Intervention = {
      ...data,
      id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: new Date().toISOString(),
      notes: [],
      status: "planned"
    }

    const interventions = loadInterventions()
    interventions.unshift(intervention)
    saveInterventions(interventions)

    return { success: true, intervention }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Get interventions for a teacher
 */
export function getTeacherInterventions(teacherId: string): Intervention[] {
  return loadInterventions().filter(i => i.teacherId === teacherId)
}

/**
 * Get interventions for a student
 */
export function getStudentInterventions(studentId: string): Intervention[] {
  return loadInterventions().filter(i => i.studentId === studentId)
}

/**
 * Update intervention status
 */
export function updateInterventionStatus(
  interventionId: string,
  status: Intervention["status"],
  notes?: string
): { success: boolean } {
  const interventions = loadInterventions()
  const index = interventions.findIndex(i => i.id === interventionId)
  
  if (index === -1) return { success: false }

  interventions[index].status = status
  if (status === "completed") {
    interventions[index].completedAt = new Date().toISOString()
  }
  if (notes) {
    interventions[index].notes.push(`[${new Date().toLocaleDateString()}] ${notes}`)
  }
  
  saveInterventions(interventions)
  return { success: true }
}

/**
 * Record post-intervention metrics
 */
export function recordPostMetrics(
  interventionId: string,
  metrics: {
    masteryScore: number
    engagementLevel: number
    attendanceRate?: number
  }
): { success: boolean; outcome?: Intervention["outcome"] } {
  const interventions = loadInterventions()
  const index = interventions.findIndex(i => i.id === interventionId)
  
  if (index === -1) return { success: false }

  const intervention = interventions[index]
  intervention.postMetrics = {
    ...metrics,
    measuredAt: new Date().toISOString()
  }

  // Calculate outcome
  const masteryChange = metrics.masteryScore - intervention.preMetrics.masteryScore
  const engagementChange = metrics.engagementLevel - intervention.preMetrics.engagementLevel
  const averageChange = (masteryChange + engagementChange) / 2

  let outcome: Intervention["outcome"]
  if (averageChange >= 15) outcome = "significant-improvement"
  else if (averageChange >= 5) outcome = "moderate-improvement"
  else if (averageChange >= -5) outcome = "no-change"
  else outcome = "declined"

  intervention.outcome = outcome
  intervention.status = "completed"
  intervention.completedAt = new Date().toISOString()

  saveInterventions(interventions)
  return { success: true, outcome }
}

/**
 * Add a note to an intervention
 */
export function addInterventionNote(interventionId: string, note: string): { success: boolean } {
  const interventions = loadInterventions()
  const index = interventions.findIndex(i => i.id === interventionId)
  
  if (index === -1) return { success: false }

  interventions[index].notes.push(`[${new Date().toLocaleDateString()}] ${note}`)
  saveInterventions(interventions)
  return { success: true }
}

/**
 * Get intervention summary for a teacher
 */
export function getInterventionSummary(teacherId: string): InterventionSummary {
  const interventions = getTeacherInterventions(teacherId)
  
  const completed = interventions.filter(i => i.status === "completed" && i.outcome)
  const successful = completed.filter(i => 
    i.outcome === "significant-improvement" || i.outcome === "moderate-improvement"
  )

  // Calculate average improvements
  let totalMasteryChange = 0
  let totalEngagementChange = 0
  let metricsCount = 0

  for (const i of completed) {
    if (i.postMetrics) {
      totalMasteryChange += i.postMetrics.masteryScore - i.preMetrics.masteryScore
      totalEngagementChange += i.postMetrics.engagementLevel - i.preMetrics.engagementLevel
      metricsCount++
    }
  }

  // Group by type
  const byType: Record<string, { count: number; successRate: number }> = {}
  const typeGroups: Record<string, Intervention[]> = {}

  for (const i of interventions) {
    if (!typeGroups[i.type]) typeGroups[i.type] = []
    typeGroups[i.type].push(i)
  }

  for (const [type, group] of Object.entries(typeGroups)) {
    const typeCompleted = group.filter(i => i.status === "completed" && i.outcome)
    const typeSuccessful = typeCompleted.filter(i => 
      i.outcome === "significant-improvement" || i.outcome === "moderate-improvement"
    )
    byType[type] = {
      count: group.length,
      successRate: typeCompleted.length > 0 
        ? Math.round((typeSuccessful.length / typeCompleted.length) * 100)
        : 0
    }
  }

  return {
    teacherId,
    totalInterventions: interventions.length,
    activeInterventions: interventions.filter(i => 
      i.status === "planned" || i.status === "in-progress"
    ).length,
    completedInterventions: completed.length,
    successRate: completed.length > 0 
      ? Math.round((successful.length / completed.length) * 100)
      : 0,
    averageImprovement: {
      mastery: metricsCount > 0 ? Math.round(totalMasteryChange / metricsCount) : 0,
      engagement: metricsCount > 0 ? Math.round(totalEngagementChange / metricsCount) : 0
    },
    byType,
    recentInterventions: interventions.slice(0, 5)
  }
}

/**
 * Get student intervention history
 */
export function getStudentInterventionHistory(studentId: string): StudentInterventionHistory | null {
  const interventions = getStudentInterventions(studentId)
  
  if (interventions.length === 0) return null

  // Sort by date
  const sorted = interventions.sort((a, b) => 
    new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  )

  const first = sorted[0]
  const latest = sorted[sorted.length - 1]
  
  const initialMastery = first.preMetrics.masteryScore
  const currentMastery = latest.postMetrics?.masteryScore ?? latest.preMetrics.masteryScore

  // Calculate effectiveness score based on outcomes
  const completed = interventions.filter(i => i.outcome)
  let effectivenessScore = 50 // baseline
  
  for (const i of completed) {
    if (i.outcome === "significant-improvement") effectivenessScore += 15
    else if (i.outcome === "moderate-improvement") effectivenessScore += 8
    else if (i.outcome === "no-change") effectivenessScore -= 2
    else if (i.outcome === "declined") effectivenessScore -= 10
  }
  effectivenessScore = Math.max(0, Math.min(100, effectivenessScore))

  return {
    studentId,
    studentName: first.studentName,
    interventions: sorted,
    overallProgress: {
      initialMastery,
      currentMastery,
      change: currentMastery - initialMastery
    },
    effectivenessScore
  }
}

/**
 * Get suggested interventions for a student based on their current metrics
 */
export function getSuggestedInterventions(
  currentMastery: number,
  currentEngagement: number,
  learningStyle?: string
): { type: Intervention["type"]; description: string; priority: "high" | "medium" | "low" }[] {
  const suggestions: { type: Intervention["type"]; description: string; priority: "high" | "medium" | "low" }[] = []

  // Low mastery suggestions
  if (currentMastery < 40) {
    suggestions.push({
      type: "one-on-one",
      description: "Schedule individual tutoring session to address foundational gaps",
      priority: "high"
    })
    suggestions.push({
      type: "modified-assignment",
      description: "Provide scaffolded assignments with additional support materials",
      priority: "high"
    })
  } else if (currentMastery < 60) {
    suggestions.push({
      type: "small-group",
      description: "Include in small group review sessions",
      priority: "medium"
    })
    suggestions.push({
      type: "resource-sharing",
      description: "Share targeted practice resources for weak concepts",
      priority: "medium"
    })
  }

  // Low engagement suggestions
  if (currentEngagement < 40) {
    suggestions.push({
      type: "parent-contact",
      description: "Contact parents to discuss engagement concerns",
      priority: "high"
    })
    suggestions.push({
      type: "one-on-one",
      description: "Check-in meeting to understand barriers to engagement",
      priority: "high"
    })
  } else if (currentEngagement < 60) {
    suggestions.push({
      type: "resource-sharing",
      description: `Share ${learningStyle || "varied"}-focused content to increase engagement`,
      priority: "medium"
    })
  }

  // Both low
  if (currentMastery < 50 && currentEngagement < 50) {
    suggestions.push({
      type: "tutoring",
      description: "Arrange peer tutoring or external tutoring support",
      priority: "high"
    })
  }

  return suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
}

/**
 * Intervention type labels and descriptions
 */
export const interventionTypes: Record<Intervention["type"], { label: string; description: string }> = {
  "one-on-one": {
    label: "One-on-One Meeting",
    description: "Individual meeting with the student"
  },
  "small-group": {
    label: "Small Group Session",
    description: "Group intervention with similar students"
  },
  "resource-sharing": {
    label: "Resource Sharing",
    description: "Providing additional learning materials"
  },
  "parent-contact": {
    label: "Parent/Guardian Contact",
    description: "Communication with family"
  },
  "modified-assignment": {
    label: "Modified Assignment",
    description: "Adjusted work to meet student needs"
  },
  "tutoring": {
    label: "Tutoring Arrangement",
    description: "External or peer tutoring setup"
  },
  "other": {
    label: "Other",
    description: "Custom intervention"
  }
}

export default {
  createIntervention,
  getTeacherInterventions,
  getStudentInterventions,
  updateInterventionStatus,
  recordPostMetrics,
  addInterventionNote,
  getInterventionSummary,
  getStudentInterventionHistory,
  getSuggestedInterventions,
  interventionTypes
}
