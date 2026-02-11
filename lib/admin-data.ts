export interface AdminDashboardData {
  schoolName: string
  totalStudents: number
  totalTeachers: number
  totalClasses: number
  avgMasteryScore: number
  avgEngagementScore: number
  platformMetrics: {
    activeUsers: number
    contentItems: number
    aiInteractionsDaily: number
    projectsInProgress: number
  }
  masteryDistribution: Array<{
    range: string
    count: number
  }>
  engagementTrend: Array<{
    date: string
    engagement: number
  }>
  teacherAdoption: Array<{
    teacher: string
    adoptionScore: number
  }>
}

import { listAllTeachers, listAllClasses } from "./teacher-data"
import { listAllStudents } from "./student-data"

export function getAdminData(adminId: string): AdminDashboardData {
  // Try to compute live values from local demo stores when available (development/demo mode)
  try {
    if (typeof window !== "undefined") {
      const teachers = listAllTeachers() || []
      const classes = listAllClasses() || []
      const students = listAllStudents() || []

      // compute avg mastery across all students found in teacher stores
      let totalMastery = 0
      let masteryCount = 0
      for (const t of teachers) {
        for (const c of (t.classes || [])) {
          for (const s of (c.students || [])) {
            if (typeof s.masteryScore === "number") {
              totalMastery += s.masteryScore
              masteryCount += 1
            }
          }
        }
      }

      const avgMastery = masteryCount ? Math.round((totalMastery / masteryCount) * 10) / 10 : 0

      // Simple mastery distribution buckets
      const ranges = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"]
      const distCounts = [0, 0, 0, 0, 0]
      for (const t of teachers) {
        for (const c of (t.classes || [])) {
          for (const s of (c.students || [])) {
            const m = Number(s.masteryScore) || 0
            if (m <= 20) distCounts[0]++
            else if (m <= 40) distCounts[1]++
            else if (m <= 60) distCounts[2]++
            else if (m <= 80) distCounts[3]++
            else distCounts[4]++
          }
        }
      }

      const masteryDistribution = ranges.map((r, i) => ({ range: r, count: distCounts[i] }))

      // simple engagement trend: reuse teacher engagementTrends if present, otherwise dummy
      let engagementTrend: Array<{ date: string; engagement: number }> = []
      for (const t of teachers) {
        if (t.engagementTrends && t.engagementTrends.length) {
          engagementTrend = t.engagementTrends.map((e) => ({ date: e.date, engagement: e.avgEngagement }))
          break
        }
      }
      if (!engagementTrend.length) {
        engagementTrend = [
          { date: "Jan 8", engagement: 60 },
          { date: "Jan 9", engagement: 62 },
          { date: "Jan 10", engagement: 64 },
          { date: "Jan 11", engagement: 66 },
          { date: "Jan 12", engagement: 68 },
          { date: "Jan 13", engagement: 67 },
          { date: "Jan 14", engagement: 66 },
        ]
      }

      // teacher adoption: if teacher profiles include an adoption metric, use it; otherwise dummy
      const teacherAdoption = teachers.map((t) => ({ teacher: t.name || t.teacherId, adoptionScore: 80 }))

      return {
        schoolName: "Lincoln High School",
        totalStudents: students.length || teachers.reduce((sum, t) => sum + (t.classes?.reduce((s, c) => s + (c.studentCount || 0), 0) || 0), 0),
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        avgMasteryScore: avgMastery || 0,
        avgEngagementScore: 0,
        platformMetrics: {
          activeUsers: Math.min(200, students.length || 0),
          contentItems: 0,
          aiInteractionsDaily: 0,
          projectsInProgress: 0,
        },
        masteryDistribution,
        engagementTrend,
        teacherAdoption,
      }
    }
  } catch (e) {
    // fall through to static fallback
    // eslint-disable-next-line no-console
    console.warn('Failed to compute admin data from local stores, using static fallback', e)
  }

  // Static fallback when local/demo stores are not available
  return {
    schoolName: "Lincoln High School",
    totalStudents: 245,
    totalTeachers: 12,
    totalClasses: 18,
    avgMasteryScore: 72.3,
    avgEngagementScore: 68.5,
    platformMetrics: {
      activeUsers: 198,
      contentItems: 342,
      aiInteractionsDaily: 456,
      projectsInProgress: 24,
    },
    masteryDistribution: [
      { range: "0-20%", count: 5 },
      { range: "20-40%", count: 12 },
      { range: "40-60%", count: 38 },
      { range: "60-80%", count: 125 },
      { range: "80-100%", count: 65 },
    ],
    engagementTrend: [
      { date: "Jan 8", engagement: 62 },
      { date: "Jan 9", engagement: 64 },
      { date: "Jan 10", engagement: 66 },
      { date: "Jan 11", engagement: 68 },
      { date: "Jan 12", engagement: 70 },
      { date: "Jan 13", engagement: 69 },
      { date: "Jan 14", engagement: 68.5 },
    ],
    teacherAdoption: [
      { teacher: "Margaret Jones", adoptionScore: 92 },
      { teacher: "David Davis", adoptionScore: 85 },
      { teacher: "Sarah Wilson", adoptionScore: 78 },
      { teacher: "Robert Brown", adoptionScore: 88 },
    ],
  }
}
