/**
 * Institutional Metrics Service
 * 
 * Provides unified platform-wide metrics for admin dashboard:
 * - Mastery Rate
 * - Teacher Adoption Rate
 * - Administrative Confidence Score
 * - Platform Usage Analytics
 */

import { supabase } from "@/lib/supabaseClient"

export interface InstitutionalMetrics {
  // Core metrics
  masteryRate: number // Percentage of students at mastery level (>=70%)
  teacherAdoptionRate: number // Percentage of teachers actively using platform
  adminConfidenceScore: number // Composite score 0-100
  
  // Student metrics
  studentMetrics: {
    totalStudents: number
    activeStudents: number // Logged in within 7 days
    averageMastery: number
    averageEngagement: number
    masteryDistribution: { level: string; count: number; percentage: number }[]
    engagementDistribution: { level: string; count: number; percentage: number }[]
    atRiskCount: number // Students needing intervention
  }
  
  // Teacher metrics
  teacherMetrics: {
    totalTeachers: number
    activeTeachers: number // Created content/logged in within 7 days
    lessonsCreated: number
    projectsCreated: number
    pollsConducted: number
    interventionsLogged: number
    averageClassSize: number
  }
  
  // Platform usage
  usageMetrics: {
    dailyActiveUsers: number
    weeklyActiveUsers: number
    monthlyActiveUsers: number
    avgSessionDuration: number // minutes
    lessonsCompleted: number
    checkpointsAttempted: number
    aiChatSessions: number
    totalTimeSpent: number // hours
  }
  
  // Trends (last 30 days)
  trends: {
    date: string
    mastery: number
    engagement: number
    activeUsers: number
  }[]
  
  // Insights and recommendations
  insights: string[]
  recommendations: string[]
  
  lastUpdated: string
}

export interface DepartmentMetrics {
  department: string
  teacherCount: number
  studentCount: number
  averageMastery: number
  averageEngagement: number
  adoptionRate: number
}

const METRICS_CACHE_KEY = "adaptiq_institutional_metrics_v1"
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

function getCachedMetrics(): { metrics: InstitutionalMetrics; timestamp: number } | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(METRICS_CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function cacheMetrics(metrics: InstitutionalMetrics) {
  if (typeof window === "undefined") return
  localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify({
    metrics,
    timestamp: Date.now()
  }))
}

/**
 * Calculate institutional metrics
 */
export async function calculateInstitutionalMetrics(): Promise<InstitutionalMetrics> {
  // Check cache first
  const cached = getCachedMetrics()
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.metrics
  }

  // Get all profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
  
  const allProfiles = profiles || []
  const students = allProfiles.filter(p => p.role === "student")
  const teachers = allProfiles.filter(p => p.role === "teacher")
  
  // Calculate student metrics
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const activeStudents = students.filter(s => 
    s.updated_at && new Date(s.updated_at) >= sevenDaysAgo
  )
  
  const avgMastery = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.overall_mastery ?? s.overall_mastery_score ?? 0), 0) / students.length)
    : 0
    
  const avgEngagement = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.engagement_index ?? s.engagement_index_score ?? 50), 0) / students.length)
    : 50

  // Mastery distribution
  const masteryBuckets = {
    "Mastery (80-100%)": students.filter(s => (s.overall_mastery ?? s.overall_mastery_score ?? 0) >= 80).length,
    "Proficient (60-79%)": students.filter(s => (s.overall_mastery ?? s.overall_mastery_score ?? 0) >= 60 && (s.overall_mastery ?? s.overall_mastery_score ?? 0) < 80).length,
    "Developing (40-59%)": students.filter(s => (s.overall_mastery ?? s.overall_mastery_score ?? 0) >= 40 && (s.overall_mastery ?? s.overall_mastery_score ?? 0) < 60).length,
    "Needs Support (<40%)": students.filter(s => (s.overall_mastery ?? s.overall_mastery_score ?? 0) < 40).length,
  }
  
  const masteryDistribution = Object.entries(masteryBuckets).map(([level, count]) => ({
    level,
    count,
    percentage: students.length > 0 ? Math.round((count / students.length) * 100) : 0
  }))

  // Engagement distribution
  const engagementBuckets = {
    "High (>70%)": students.filter(s => (s.engagement_index ?? s.engagement_index_score ?? 50) > 70).length,
    "Medium (40-70%)": students.filter(s => (s.engagement_index ?? s.engagement_index_score ?? 50) >= 40 && (s.engagement_index ?? s.engagement_index_score ?? 50) <= 70).length,
    "Low (<40%)": students.filter(s => (s.engagement_index ?? s.engagement_index_score ?? 50) < 40).length,
  }
  
  const engagementDistribution = Object.entries(engagementBuckets).map(([level, count]) => ({
    level,
    count,
    percentage: students.length > 0 ? Math.round((count / students.length) * 100) : 0
  }))

  // At-risk students (low mastery OR low engagement)
  const atRiskCount = students.filter(s => 
    (s.overall_mastery ?? s.overall_mastery_score ?? 0) < 50 || (s.engagement_index ?? s.engagement_index_score ?? 50) < 40
  ).length

  // Teacher metrics
  const activeTeachers = teachers.filter(t => 
    t.updated_at && new Date(t.updated_at) >= sevenDaysAgo
  )

  // Get lesson counts from localStorage (since we use localStorage for lessons)
  let lessonsCreated = 0
  let projectsCreated = 0
  let pollsConducted = 0
  let interventionsLogged = 0
  
  if (typeof window !== "undefined") {
    try {
      const lessonsData = localStorage.getItem("adaptiq_lessons_v1")
      if (lessonsData) {
        const lessons = JSON.parse(lessonsData)
        lessonsCreated = Object.values(lessons).flat().length
      }
      
      const projectsData = localStorage.getItem("adaptiq_projects_v2")
      if (projectsData) {
        const projects = JSON.parse(projectsData)
        projectsCreated = Object.values(projects).flat().length
      }
      
      const pollsData = localStorage.getItem("adaptiq_polls_v1")
      if (pollsData) {
        pollsConducted = JSON.parse(pollsData).length
      }
      
      const interventionsData = localStorage.getItem("adaptiq_interventions_v1")
      if (interventionsData) {
        interventionsLogged = JSON.parse(interventionsData).length
      }
    } catch {}
  }

  // Get classes for average class size
  const { data: classes } = await supabase.from("classes").select("id")
  const { data: enrollments } = await supabase.from("class_students").select("class_id")
  
  const avgClassSize = (classes?.length || 0) > 0 && enrollments
    ? Math.round(enrollments.length / classes!.length)
    : 0

  // Calculate core metrics
  const masteryRate = students.length > 0
    ? Math.round((masteryBuckets["Mastery (80-100%)"] / students.length) * 100)
    : 0

  const teacherAdoptionRate = teachers.length > 0
    ? Math.round((activeTeachers.length / teachers.length) * 100)
    : 0

  // Admin confidence score (composite)
  // Based on: data quality, teacher adoption, student engagement, intervention rate
  const dataQualityScore = Math.min(100, (students.length + teachers.length + lessonsCreated) * 2)
  const interventionScore = atRiskCount > 0 && interventionsLogged > 0
    ? Math.min(100, (interventionsLogged / atRiskCount) * 100)
    : atRiskCount === 0 ? 100 : 0
  
  const adminConfidenceScore = Math.round(
    (teacherAdoptionRate * 0.3) +
    (avgEngagement * 0.25) +
    (Math.min(100, dataQualityScore) * 0.25) +
    (interventionScore * 0.2)
  )

  // Usage metrics (simulated based on activity)
  const dailyActiveUsers = activeStudents.length + activeTeachers.length
  const weeklyActiveUsers = Math.round(dailyActiveUsers * 1.5)
  const monthlyActiveUsers = students.length + teachers.length

  // Generate trends (last 30 days - simulated)
  const trends = generateTrends(avgMastery, avgEngagement, dailyActiveUsers)

  // Generate insights
  const insights = generateInsights({
    masteryRate,
    teacherAdoptionRate,
    avgEngagement,
    atRiskCount,
    activeStudents: activeStudents.length,
    totalStudents: students.length
  })

  // Generate recommendations
  const recommendations = generateRecommendations({
    masteryRate,
    teacherAdoptionRate,
    avgEngagement,
    atRiskCount,
    interventionsLogged,
    lessonsCreated
  })

  const metrics: InstitutionalMetrics = {
    masteryRate,
    teacherAdoptionRate,
    adminConfidenceScore,
    studentMetrics: {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      averageMastery: avgMastery,
      averageEngagement: avgEngagement,
      masteryDistribution,
      engagementDistribution,
      atRiskCount
    },
    teacherMetrics: {
      totalTeachers: teachers.length,
      activeTeachers: activeTeachers.length,
      lessonsCreated,
      projectsCreated,
      pollsConducted,
      interventionsLogged,
      averageClassSize: avgClassSize
    },
    usageMetrics: {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      avgSessionDuration: 25, // Placeholder
      lessonsCompleted: Math.round(lessonsCreated * 0.7),
      checkpointsAttempted: Math.round(lessonsCreated * 2.5),
      aiChatSessions: Math.round(activeStudents.length * 3),
      totalTimeSpent: Math.round(activeStudents.length * 5) // hours
    },
    trends,
    insights,
    recommendations,
    lastUpdated: new Date().toISOString()
  }

  cacheMetrics(metrics)
  return metrics
}

function generateTrends(
  baseMastery: number,
  baseEngagement: number,
  baseUsers: number
): InstitutionalMetrics["trends"] {
  const trends: InstitutionalMetrics["trends"] = []
  const now = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Add some variance
    const variance = (Math.random() - 0.5) * 10
    
    trends.push({
      date: date.toISOString().split("T")[0],
      mastery: Math.max(0, Math.min(100, baseMastery + variance + (29 - i) * 0.2)),
      engagement: Math.max(0, Math.min(100, baseEngagement + variance * 0.8)),
      activeUsers: Math.max(0, Math.round(baseUsers + variance * 2))
    })
  }
  
  return trends
}

function generateInsights(data: {
  masteryRate: number
  teacherAdoptionRate: number
  avgEngagement: number
  atRiskCount: number
  activeStudents: number
  totalStudents: number
}): string[] {
  const insights: string[] = []

  if (data.masteryRate >= 70) {
    insights.push("🎯 Strong mastery rate! Most students are achieving learning objectives.")
  } else if (data.masteryRate >= 50) {
    insights.push("📈 Mastery rate is progressing. Continued adaptive practice will help close gaps.")
  } else {
    insights.push("⚠️ Mastery rate needs attention. Consider targeted intervention strategies.")
  }

  if (data.teacherAdoptionRate >= 80) {
    insights.push("✅ Excellent teacher adoption! Platform is well-integrated into instruction.")
  } else if (data.teacherAdoptionRate >= 50) {
    insights.push("📊 Moderate teacher adoption. Professional development may boost usage.")
  } else {
    insights.push("🔔 Low teacher adoption. Training and support recommended.")
  }

  if (data.atRiskCount > 0) {
    const percentage = Math.round((data.atRiskCount / data.totalStudents) * 100)
    insights.push(`👀 ${data.atRiskCount} students (${percentage}%) identified as at-risk and need intervention.`)
  }

  if (data.avgEngagement >= 70) {
    insights.push("⚡ High overall engagement across the student population.")
  } else if (data.avgEngagement < 50) {
    insights.push("💡 Engagement levels indicate opportunity for more interactive content.")
  }

  const activityRate = data.totalStudents > 0 
    ? Math.round((data.activeStudents / data.totalStudents) * 100) 
    : 0
  if (activityRate >= 80) {
    insights.push(`🔥 ${activityRate}% of students active this week - strong platform engagement.`)
  }

  return insights
}

function generateRecommendations(data: {
  masteryRate: number
  teacherAdoptionRate: number
  avgEngagement: number
  atRiskCount: number
  interventionsLogged: number
  lessonsCreated: number
}): string[] {
  const recommendations: string[] = []

  if (data.masteryRate < 60) {
    recommendations.push("Implement weekly mastery review sessions using adaptive practice modules.")
  }

  if (data.teacherAdoptionRate < 70) {
    recommendations.push("Schedule platform training workshops for teachers.")
    recommendations.push("Share success stories from high-adoption teachers.")
  }

  if (data.atRiskCount > 0 && data.interventionsLogged < data.atRiskCount * 0.5) {
    recommendations.push("Increase intervention tracking to support at-risk students systematically.")
  }

  if (data.avgEngagement < 60) {
    recommendations.push("Encourage teachers to use live polls for real-time engagement.")
    recommendations.push("Promote project-based learning to increase active participation.")
  }

  if (data.lessonsCreated < 10) {
    recommendations.push("Expand content library with more lessons aligned to curriculum.")
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue current strategies - metrics are on track!")
    recommendations.push("Consider setting higher targets for the next quarter.")
  }

  return recommendations
}

/**
 * Get department-level breakdown
 */
export async function getDepartmentMetrics(): Promise<DepartmentMetrics[]> {
  // This would normally query by department
  // For now, return mock department data
  return [
    {
      department: "Mathematics",
      teacherCount: 5,
      studentCount: 120,
      averageMastery: 68,
      averageEngagement: 72,
      adoptionRate: 85
    },
    {
      department: "Science",
      teacherCount: 4,
      studentCount: 95,
      averageMastery: 65,
      averageEngagement: 70,
      adoptionRate: 75
    },
    {
      department: "English",
      teacherCount: 4,
      studentCount: 110,
      averageMastery: 72,
      averageEngagement: 68,
      adoptionRate: 80
    },
    {
      department: "Social Studies",
      teacherCount: 3,
      studentCount: 85,
      averageMastery: 70,
      averageEngagement: 65,
      adoptionRate: 60
    }
  ]
}

/**
 * Export metrics as CSV
 */
export function exportMetricsToCSV(metrics: InstitutionalMetrics): string {
  const lines = [
    "Metric,Value",
    `Mastery Rate,${metrics.masteryRate}%`,
    `Teacher Adoption Rate,${metrics.teacherAdoptionRate}%`,
    `Admin Confidence Score,${metrics.adminConfidenceScore}`,
    `Total Students,${metrics.studentMetrics.totalStudents}`,
    `Active Students,${metrics.studentMetrics.activeStudents}`,
    `Average Mastery,${metrics.studentMetrics.averageMastery}%`,
    `Average Engagement,${metrics.studentMetrics.averageEngagement}%`,
    `At-Risk Students,${metrics.studentMetrics.atRiskCount}`,
    `Total Teachers,${metrics.teacherMetrics.totalTeachers}`,
    `Active Teachers,${metrics.teacherMetrics.activeTeachers}`,
    `Lessons Created,${metrics.teacherMetrics.lessonsCreated}`,
    `Projects Created,${metrics.teacherMetrics.projectsCreated}`,
    `Polls Conducted,${metrics.teacherMetrics.pollsConducted}`,
    `Interventions Logged,${metrics.teacherMetrics.interventionsLogged}`,
    `Daily Active Users,${metrics.usageMetrics.dailyActiveUsers}`,
    `Weekly Active Users,${metrics.usageMetrics.weeklyActiveUsers}`,
    `Monthly Active Users,${metrics.usageMetrics.monthlyActiveUsers}`,
    `Last Updated,${metrics.lastUpdated}`
  ]
  
  return lines.join("\n")
}

export default {
  calculateInstitutionalMetrics,
  getDepartmentMetrics,
  exportMetricsToCSV
}
