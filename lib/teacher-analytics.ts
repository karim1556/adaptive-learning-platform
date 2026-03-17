import { supabase } from "@/lib/supabaseClient"
import type { Class, ClassStudent } from "@/lib/data-service"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const TIME_SLOTS = [
  { id: "06-09", label: "06:00-09:00", from: 6, to: 9 },
  { id: "09-12", label: "09:00-12:00", from: 9, to: 12 },
  { id: "12-15", label: "12:00-15:00", from: 12, to: 15 },
  { id: "15-18", label: "15:00-18:00", from: 15, to: 18 },
  { id: "18-21", label: "18:00-21:00", from: 18, to: 21 },
  { id: "21-24", label: "21:00-24:00", from: 21, to: 24 },
]

export interface EngagementHeatmapCell {
  day: string
  slot: string
  label: string
  activeLearners: number
  disengagementScore: number
  flagged: boolean
}

export interface TeacherAnalyticsSnapshot {
  engagementHeatmap: EngagementHeatmapCell[]
  engagementTrends: Array<{ date: string; avgEngagement: number; avgMastery: number }>
  varkDistribution: Array<{ name: string; value: number; count: number }>
  masteryBands: Array<{ name: string; value: number; count: number }>
  classSummaries: Array<{
    classCode: string
    className: string
    students: number
    avgMastery: number
    avgEngagement: number
    atRiskStudents: number
  }>
  flaggedMoments: Array<{ label: string; activeLearners: number; disengagementScore: number }>
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function styleLabel(style?: string) {
  const normalized = (style || "").trim().toLowerCase()
  if (normalized.startsWith("v")) return "Visual"
  if (normalized.startsWith("a")) return "Auditory"
  if (normalized.startsWith("r")) return "Reading"
  if (normalized.startsWith("k")) return "Kinesthetic"
  return "Unassigned"
}

function toDayLabel(dateString: string) {
  const day = new Date(dateString).getDay()
  return DAYS[(day + 6) % 7]
}

function toSlotLabel(dateString: string) {
  const hour = new Date(dateString).getHours()
  return TIME_SLOTS.find((slot) => hour >= slot.from && hour < slot.to)?.label || TIME_SLOTS[TIME_SLOTS.length - 1].label
}

function buildEmptyHeatmap() {
  return DAYS.flatMap((day) =>
    TIME_SLOTS.map((slot) => ({
      day,
      slot: slot.label,
      label: `${day} ${slot.label}`,
      activeLearners: 0,
      disengagementScore: 0,
      flagged: false,
    })),
  )
}

export async function buildTeacherAnalyticsSnapshot(params: {
  teacherId: string
  classes: Class[]
  students: ClassStudent[]
}): Promise<TeacherAnalyticsSnapshot> {
  const progressRows: any[] = []

  try {
    const classIds = params.classes.map((course) => course.id).filter(Boolean)
    const classCodes = params.classes.map((course) => course.classCode).filter(Boolean)
    const studentIds = params.students.map((student) => student.id).filter(Boolean)

    let lessonIds: string[] = []

    const { data: lessonsByTeacher } = await supabase.from("lessons").select("id").eq("teacher_id", params.teacherId)
    lessonIds.push(...(lessonsByTeacher || []).map((lesson: any) => lesson.id).filter(Boolean))

    if (lessonIds.length === 0 && classIds.length > 0) {
      const { data: lessonsByClassId, error: classIdError } = await supabase
        .from("lessons")
        .select("id")
        .in("class_id", classIds)

      if (classIdError) {
        console.warn("Lesson lookup by class_id failed:", classIdError)
      }

      lessonIds.push(...(lessonsByClassId || []).map((lesson: any) => lesson.id).filter(Boolean))
    }

    if (lessonIds.length === 0 && classCodes.length > 0) {
      const { data: lessonsByClassCode, error: classCodeError } = await supabase
        .from("lessons")
        .select("id")
        .in("class_code", classCodes)

      if (classCodeError) {
        console.warn("Lesson lookup by class_code failed:", classCodeError)
      }

      lessonIds.push(...(lessonsByClassCode || []).map((lesson: any) => lesson.id).filter(Boolean))
    }

    const uniqueLessonIds = [...new Set(lessonIds)]

    if (uniqueLessonIds.length > 0) {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id, student_id, current_block_index, overall_score, last_accessed_at, completed_at, time_spent, checkpoint_attempts")
        .in("lesson_id", uniqueLessonIds)

      if (data && data.length > 0) {
        progressRows.push(...data)
      }
    }

    // Final fallback: pull progress directly by students visible in this dashboard.
    if (progressRows.length === 0 && studentIds.length > 0) {
      const { data: byStudentProgress, error: byStudentError } = await supabase
        .from("lesson_progress")
        .select("lesson_id, student_id, current_block_index, overall_score, last_accessed_at, completed_at, time_spent, checkpoint_attempts")
        .in("student_id", studentIds)
        .limit(300)

      if (byStudentError) {
        console.warn("Lesson progress lookup by student_id failed:", byStudentError)
      }

      if (byStudentProgress && byStudentProgress.length > 0) {
        progressRows.push(...byStudentProgress)
      }
    }
  } catch (error) {
    console.warn("Failed to build teacher analytics snapshot from lesson progress:", error)
  }

  // RLS or schema differences can hide lesson_progress from teacher clients.
  // Build synthetic progress points from current class student metrics so heatmap still reflects demo values.
  if (progressRows.length === 0 && params.students.length > 0) {
    const now = Date.now()
    progressRows.push(
      ...params.students.map((student, index) => ({
        lesson_id: `synthetic-${index + 1}`,
        student_id: student.id,
        current_block_index: 1,
        overall_score: Number(student.masteryScore || 0),
        last_accessed_at: new Date(now - index * 45 * 60 * 1000).toISOString(),
        completed_at: Number(student.masteryScore || 0) >= 70 ? new Date(now - index * 45 * 60 * 1000).toISOString() : null,
        time_spent: Math.max(8, Math.round(Number(student.engagementLevel || 50) / 2)),
        checkpoint_attempts: [{ percentage: Number(student.masteryScore || 0) }],
      })),
    )
  }

  const heatmapSeed = buildEmptyHeatmap()
  const heatmap = new Map(heatmapSeed.map((cell) => [`${cell.day}-${cell.slot}`, cell]))
  const trendBuckets = new Map<string, { engaged: number[]; mastery: number[] }>()

  progressRows.forEach((row) => {
    const timestamp = row.last_accessed_at || row.completed_at || new Date().toISOString()
    const day = toDayLabel(timestamp)
    const slot = toSlotLabel(timestamp)
    const key = `${day}-${slot}`
    const cell = heatmap.get(key)

    const scorePenalty = 100 - Number(row.overall_score || 0)
    const incompletePenalty = row.completed_at ? 0 : 18
    const checkpointPenalty = (row.checkpoint_attempts || []).length === 0 ? 8 : 0
    const shortSessionPenalty = Number(row.time_spent || 0) < 5 ? 10 : 0
    const disengagementScore = clamp(scorePenalty * 0.5 + incompletePenalty + checkpointPenalty + shortSessionPenalty)
    const engagementScore = clamp(100 - disengagementScore)

    if (cell) {
      const totalLearners = cell.activeLearners + 1
      cell.disengagementScore = clamp(
        (cell.disengagementScore * cell.activeLearners + disengagementScore) / totalLearners,
      )
      cell.activeLearners = totalLearners
      cell.flagged = cell.disengagementScore >= 65 && totalLearners >= 1
    }

    const bucketKey = day
    const bucket = trendBuckets.get(bucketKey) || { engaged: [], mastery: [] }
    bucket.engaged.push(engagementScore)
    bucket.mastery.push(Number(row.overall_score || 0))
    trendBuckets.set(bucketKey, bucket)
  })

  const studentCount = Math.max(1, params.students.length)
  const styleCounts = params.students.reduce<Record<string, number>>(
    (acc, student) => {
      const label = styleLabel(student.dominantStyle)
      acc[label] = (acc[label] || 0) + 1
      return acc
    },
    { Visual: 0, Auditory: 0, Reading: 0, Kinesthetic: 0, Unassigned: 0 },
  )

  const varkDistribution = Object.entries(styleCounts)
    .filter(([name, count]) => !(name === "Unassigned" && count === 0))
    .map(([name, count]) => ({
      name,
      count,
      value: clamp((count / studentCount) * 100),
    }))

  const masteryBandCounts = params.students.reduce(
    (acc, student) => {
      const score = Number(student.masteryScore || 0)
      if (score >= 80) acc.mastered += 1
      else if (score >= 60) acc.proficient += 1
      else if (score >= 40) acc.developing += 1
      else acc.atRisk += 1
      return acc
    },
    { mastered: 0, proficient: 0, developing: 0, atRisk: 0 },
  )

  const masteryBands = [
    { name: "Mastered", count: masteryBandCounts.mastered },
    { name: "Proficient", count: masteryBandCounts.proficient },
    { name: "Developing", count: masteryBandCounts.developing },
    { name: "At Risk", count: masteryBandCounts.atRisk },
  ].map((band) => ({
    ...band,
    value: clamp((band.count / studentCount) * 100),
  }))

  const classSummaries = params.classes.map((course) => ({
    classCode: course.classCode,
    className: course.className,
    students: course.studentCount,
    avgMastery: Math.round(course.averageMastery || 0),
    avgEngagement: Math.round(course.averageEngagement || 0),
    atRiskStudents: Math.max(
      0,
      params.students.filter((student) => student.flags.needsSupport).length,
    ),
  }))

  const engagementTrends = DAYS.map((day) => {
    const bucket = trendBuckets.get(day)
    const avgEngagement =
      bucket && bucket.engaged.length > 0
        ? clamp(bucket.engaged.reduce((sum, score) => sum + score, 0) / bucket.engaged.length)
        : clamp(params.students.reduce((sum, student) => sum + student.engagementLevel, 0) / studentCount)
    const avgMastery =
      bucket && bucket.mastery.length > 0
        ? clamp(bucket.mastery.reduce((sum, score) => sum + score, 0) / bucket.mastery.length)
        : clamp(params.students.reduce((sum, student) => sum + student.masteryScore, 0) / studentCount)

    return {
      date: day,
      avgEngagement,
      avgMastery,
    }
  })

  const engagementHeatmap = [...heatmap.values()]
  const flaggedMoments = engagementHeatmap
    .filter((cell) => cell.flagged)
    .sort((a, b) => b.disengagementScore - a.disengagementScore)
    .slice(0, 5)
    .map((cell) => ({
      label: cell.label,
      activeLearners: cell.activeLearners,
      disengagementScore: cell.disengagementScore,
    }))

  return {
    engagementHeatmap,
    engagementTrends,
    varkDistribution,
    masteryBands,
    classSummaries,
    flaggedMoments,
  }
}

export function exportTeacherAnalyticsCsv(snapshot: TeacherAnalyticsSnapshot) {
  const rows = [
    ["Section", "Label", "Value", "Extra"],
    ...snapshot.classSummaries.map((course) => [
      "Class Summary",
      `${course.className} (${course.classCode})`,
      `${course.avgMastery}% mastery / ${course.avgEngagement}% engagement`,
      `${course.students} students`,
    ]),
    ...snapshot.varkDistribution.map((style) => [
      "VARK Distribution",
      style.name,
      `${style.value}%`,
      `${style.count} students`,
    ]),
    ...snapshot.masteryBands.map((band) => [
      "Mastery Bands",
      band.name,
      `${band.value}%`,
      `${band.count} students`,
    ]),
    ...snapshot.flaggedMoments.map((moment) => [
      "Heatmap Alert",
      moment.label,
      `${moment.disengagementScore}% disengagement`,
      `${moment.activeLearners} active learners`,
    ]),
  ]

  return rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n")
}
