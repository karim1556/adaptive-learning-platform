import { deriveStudentMetrics, getEngagementStatus, resolveProgressScore } from "@/lib/student-metrics"
import { buildStudentBadgePortfolio, type MasteryBadge } from "@/lib/student-achievements"

type AdminClient = any

export interface StudentInsight {
  id: string
  userId: string
  name: string
  email: string | null
  overallMastery: number
  engagementIndex: number
  engagementLevel: number
  engagementStatus: "low" | "medium" | "high"
  varkProfile: {
    dominantStyle: string | null
    secondaryStyle: string | null
    visual: number
    auditory: number
    reading: number
    kinesthetic: number
  }
  enrolledClasses: Array<{
    classId: string | null
    classCode: string | null
    className: string
    teacherId: string | null
    subject: string | null
    enrolledAt: string | null
  }>
  masteryByTopic: Array<{
    topicId: string | null
    topicName: string
    score: number
    assessmentCount: number
    lastUpdated: string | null
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    durationMinutes?: number
  }>
  recommendations: string[]
  badges: MasteryBadge[]
  moduleFeedback: {
    averageRating: number
    totalResponses: number
    lowRatingCount: number
  }
  shareHistory: Array<{
    id: string
    subject: string | null
    deliveryStatus: string
    createdAt: string
    sentAt: string | null
  }>
  metrics: {
    modulesStarted: number
    modulesCompleted: number
    totalTimeSpent: number
    lastActivity: string | null
    needsAttention: boolean
  }
}

function uniqueById<T extends { id?: string | null }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.id || ""
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase()
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    message.includes("schema cache") ||
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("could not find the")
  )
}

function normalizeInsightLesson(record: any) {
  return {
    id: record.id,
    title: record.title || "Learning Module",
    concept_id: record.concept_id || null,
    concept_name: record.concept_name || record.title || "Learning Module",
    learning_mode: record.learning_mode || "reading",
    class_id: record.class_id || null,
    published: record.published ?? true,
  }
}

async function loadLessonsForInsight(adminClient: AdminClient) {
  const richResult = await adminClient
    .from("lessons")
    .select("id, title, concept_id, concept_name, learning_mode, class_id, published")
    .eq("published", true)

  if (!richResult.error) {
    return (richResult.data || []).map((lesson: any) => normalizeInsightLesson(lesson))
  }

  if (!isMissingColumnError(richResult.error)) {
    throw richResult.error
  }

  const fallbackResult = await adminClient
    .from("lessons")
    .select("id, title, class_id, published")
    .eq("published", true)

  if (fallbackResult.error) throw fallbackResult.error

  return (fallbackResult.data || []).map((lesson: any) => normalizeInsightLesson(lesson))
}

function normalizeInsightProgress(record: any) {
  const fallbackAttempts = Array.isArray(record.checkpoint_scores?.attempts) ? record.checkpoint_scores.attempts : []

  return {
    student_id: record.student_id,
    lesson_id: record.lesson_id,
    lesson_title: record.lesson_title || null,
    overall_score: record.overall_score,
    checkpoint_attempts: Array.isArray(record.checkpoint_attempts) ? record.checkpoint_attempts : fallbackAttempts,
    completed_at: record.completed_at,
    last_accessed_at: record.last_accessed_at,
    time_spent: record.time_spent,
  }
}

async function loadProgressForInsight(adminClient: AdminClient, candidateIds: string[]) {
  const richResult = await adminClient
    .from("lesson_progress")
    .select("student_id, lesson_id, lesson_title, overall_score, checkpoint_attempts, completed_at, last_accessed_at, time_spent")
    .in("student_id", candidateIds)
    .order("last_accessed_at", { ascending: false })

  if (!richResult.error) {
    return (richResult.data || []).map((row: any) => normalizeInsightProgress(row))
  }

  if (!isMissingColumnError(richResult.error)) {
    throw richResult.error
  }

  const fallbackResult = await adminClient
    .from("lesson_progress")
    .select("student_id, lesson_id, overall_score, checkpoint_scores, completed_at, last_accessed_at, time_spent")
    .in("student_id", candidateIds)
    .order("last_accessed_at", { ascending: false })

  if (fallbackResult.error) throw fallbackResult.error

  return (fallbackResult.data || []).map((row: any) => normalizeInsightProgress(row))
}

function buildRecommendations(input: {
  overallMastery: number
  engagementIndex: number
  dominantStyle?: string | null
  averageRating: number
  lowRatingCount: number
  badges: MasteryBadge[]
}) {
  const recommendations: string[] = []

  if (input.engagementIndex < 40) {
    recommendations.push("Schedule a short, consistent study block this week to rebuild momentum.")
  }
  if (input.overallMastery < 55) {
    recommendations.push("Review the lowest-scoring topics together before the next module unlock.")
  }

  const dominant = String(input.dominantStyle || "").toLowerCase()
  if (dominant === "visual") {
    recommendations.push("Use diagrams, color-coded notes, and worked examples during revision.")
  } else if (dominant === "auditory") {
    recommendations.push("Ask your child to explain concepts aloud and recap them conversationally.")
  } else if (dominant === "reading") {
    recommendations.push("Encourage written summaries and short reflection notes after each module.")
  } else if (dominant === "kinesthetic") {
    recommendations.push("Use hands-on practice, whiteboard work, and real-world examples.")
  }

  if (input.averageRating > 0 && input.averageRating < 3.5) {
    recommendations.push("Check in on which modules felt confusing and ask teachers for alternate explanations.")
  }

  if (input.lowRatingCount >= 2) {
    recommendations.push("Multiple low feedback ratings suggest a quick support conversation would help.")
  }

  if (input.badges.filter((badge) => badge.earned).length >= 2) {
    recommendations.push("Celebrate recent badge wins to reinforce progress and confidence.")
  }

  return recommendations.slice(0, 4)
}

export async function getStudentInsight(
  adminClient: AdminClient,
  input: { studentProfileId?: string; userId?: string },
): Promise<StudentInsight | null> {
  let studentProfile: any = null

  if (input.studentProfileId) {
    const { data } = await adminClient.from("student_profiles").select("*").eq("id", input.studentProfileId).maybeSingle()
    if (data) studentProfile = data
  }

  if (!studentProfile && input.userId) {
    const { data } = await adminClient.from("student_profiles").select("*").eq("user_id", input.userId).maybeSingle()
    if (data) studentProfile = data
  }

  const resolvedUserId = input.userId || studentProfile?.user_id
  if (!resolvedUserId) return null
  const publicUserId = studentProfile?.user_id || null

  const candidateIds = uniqueById(
    [studentProfile?.id, resolvedUserId, publicUserId]
      .filter((value): value is string => Boolean(value))
      .map((id) => ({ id })),
  ).map((item) => item.id as string)

  const userLookupId = publicUserId || resolvedUserId
  const lessonPromise = loadLessonsForInsight(adminClient)
  const progressPromise = loadProgressForInsight(adminClient, candidateIds)
  const [
    userRes,
    profileRes,
    varkRes,
    classesRes,
    progressRows,
    masteryRes,
    feedbackRes,
    badgeRes,
    shareRes,
    activityRes,
    lessonRows,
  ] = await Promise.all([
    adminClient.from("users").select("first_name, last_name, email").eq("id", userLookupId).maybeSingle(),
    adminClient.from("profiles").select("*").eq("id", resolvedUserId).maybeSingle(),
    adminClient.from("vark_profiles").select("*").in("student_id", candidateIds),
    adminClient.from("class_students").select("*, classes(*)").in("student_id", candidateIds),
    progressPromise,
    adminClient.from("mastery_records").select("*, learning_concepts(*)").in("student_id", candidateIds),
    adminClient.from("module_feedback").select("*").eq("student_id", resolvedUserId).order("created_at", { ascending: false }).limit(25),
    adminClient.from("student_badges").select("*").eq("student_id", resolvedUserId).order("awarded_at", { ascending: false }).limit(12),
    adminClient
      .from("parent_progress_shares")
      .select("id, subject, delivery_status, created_at, sent_at")
      .eq("student_id", resolvedUserId)
      .order("created_at", { ascending: false })
      .limit(5),
    adminClient.from("engagement_logs").select("*").in("student_id", candidateIds).order("timestamp", { ascending: false }).limit(8),
    lessonPromise,
  ])

  const userRow = userRes?.data
  const profileRow = profileRes?.data
  const varkRows = (varkRes?.data || []) as any[]
  const classRows = (classesRes?.data || []) as any[]
  const masteryRows = (masteryRes?.data || []) as any[]
  const feedbackRows = (feedbackRes?.data || []) as any[]
  const badgeRows = (badgeRes?.data || []) as any[]
  const shareRows = (shareRes?.data || []) as any[]
  const activityRows = (activityRes?.data || []) as any[]

  const progressMap = new Map<string, any>()
  progressRows.forEach((row) => {
    const key = `${row.lesson_id}`
    const existing = progressMap.get(key)
    if (!existing || String(row.last_accessed_at || "") > String(existing.last_accessed_at || "")) {
      progressMap.set(key, row)
    }
  })

  const uniqueProgress = [...progressMap.values()]

  const classLessons =
    classRows.length > 0
      ? lessonRows.filter((lesson) =>
          classRows.some((entry) => {
            const classId = entry.class_id || entry.classes?.id
            return Boolean(classId) && classId === lesson.class_id
          }),
        )
      : lessonRows

  const metrics = deriveStudentMetrics({
    progress: uniqueProgress.map((row) => ({
      lessonId: row.lesson_id,
      overallScore: row.overall_score,
      completedAt: row.completed_at,
      lastAccessedAt: row.last_accessed_at,
      timeSpent: row.time_spent,
      checkpointAttempts: row.checkpoint_attempts || [],
    })),
    lessons: classLessons.length > 0 ? classLessons : lessonRows,
    fallbackMastery: Number(profileRow?.overall_mastery ?? studentProfile?.overall_mastery_score ?? 0),
    fallbackEngagement: Number(profileRow?.engagement_index ?? studentProfile?.engagement_index ?? 50),
  })

  const primaryVark = varkRows[0]
  const authVark = profileRow?.vark_profile || {}
  const dominantStyle =
    primaryVark?.dominant_style ||
    authVark?.dominantStyle ||
    authVark?.dominant_style ||
    null
  const secondaryStyle =
    primaryVark?.secondary_style ||
    authVark?.secondaryStyle ||
    authVark?.secondary_style ||
    null

  const masteryByTopic =
    masteryRows.length > 0
      ? masteryRows.map((record) => ({
          topicId: record.concept_id,
          topicName: record.learning_concepts?.name || "Learning Topic",
          score: Number(record.mastery_score || 0),
          assessmentCount: Number(record.assessment_count || record.total_checkpoints || 0),
          lastUpdated: record.last_activity || record.last_updated || record.created_at || null,
        }))
      : metrics.masteryByTopic.map((topic) => ({
          topicId: topic.conceptId,
          topicName: topic.conceptName,
          score: topic.masteryScore,
          assessmentCount: topic.totalCheckpoints,
          lastUpdated: topic.lastActivity,
        }))

  const recentActivity =
    activityRows.length > 0
      ? activityRows.map((row) => ({
          id: row.id,
          type: row.activity_type || "activity",
          description: row.activity_description || "Learning activity recorded",
          timestamp: row.timestamp,
          durationMinutes: row.duration_minutes || undefined,
        }))
      : uniqueProgress.slice(0, 5).map((row) => {
          const score = resolveProgressScore({
            lessonId: row.lesson_id,
            overallScore: row.overall_score,
            completedAt: row.completed_at,
            checkpointAttempts: row.checkpoint_attempts || [],
          })
          return {
            id: `${row.lesson_id}-${row.last_accessed_at || row.completed_at || "activity"}`,
            type: row.completed_at ? "module_complete" : "module_progress",
            description: row.completed_at
              ? `Completed ${row.lesson_title || "a module"} with ${score}% mastery`
              : `Worked on ${row.lesson_title || "a module"}`,
            timestamp: row.last_accessed_at || row.completed_at || new Date().toISOString(),
            durationMinutes: Number(row.time_spent || 0),
          }
        })

  const badgeAwardMap = badgeRows.reduce<Record<string, string>>((acc, badge) => {
    acc[String(badge.badge_key)] = badge.awarded_at
    return acc
  }, {})

  const badgePortfolio = buildStudentBadgePortfolio({
    lessons: lessonRows.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      conceptId: lesson.concept_id,
      conceptName: lesson.concept_name,
      classId: lesson.class_id,
      learningMode: lesson.learning_mode,
      teacherId: "",
      description: "",
      difficulty: 0,
      blocks: [],
      estimatedDuration: 0,
      published: true,
      createdAt: "",
      updatedAt: "",
    })),
    lessonProgress: uniqueProgress.map((row) => ({
      lessonId: row.lesson_id,
      lessonTitle: row.lesson_title || "Module",
      studentId: resolvedUserId,
      currentBlockIndex: 0,
      completedBlocks: [],
      checkpointAttempts: row.checkpoint_attempts || [],
      startedAt: row.last_accessed_at || row.completed_at || new Date().toISOString(),
      lastAccessedAt: row.last_accessed_at || row.completed_at || new Date().toISOString(),
      completedAt: row.completed_at,
      overallScore: resolveProgressScore({
        lessonId: row.lesson_id,
        overallScore: row.overall_score,
        completedAt: row.completed_at,
        checkpointAttempts: row.checkpoint_attempts || [],
      }),
      timeSpent: Number(row.time_spent || 0),
    })),
    masteryData: metrics.masteryByTopic.map((topic) => ({
      conceptId: topic.conceptId,
      conceptName: topic.conceptName,
      masteryScore: topic.masteryScore,
      checkpointsPassed: topic.checkpointsPassed,
      totalCheckpoints: topic.totalCheckpoints,
      lessonsCompleted: topic.lessonsCompleted,
      totalLessons: topic.totalLessons,
      lastActivity: topic.lastActivity,
      needsAttention: topic.needsAttention,
    })),
    dominantStyle: dominantStyle || undefined,
    awardedAtByKey: badgeAwardMap,
  })

  const averageRating =
    feedbackRows.length > 0
      ? Number((feedbackRows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / feedbackRows.length).toFixed(1))
      : 0
  const lowRatingCount = feedbackRows.filter((row) => Number(row.rating || 0) <= 3).length

  const name =
    userRow?.first_name || userRow?.last_name
      ? `${userRow?.first_name || ""} ${userRow?.last_name || ""}`.trim()
      : profileRow?.full_name || "Student"

  return {
    id: studentProfile?.id || input.studentProfileId || resolvedUserId,
    userId: resolvedUserId,
    name,
    email: userRow?.email || null,
    overallMastery: metrics.overallMastery,
    engagementIndex: metrics.engagementIndex,
    engagementLevel: metrics.engagementIndex,
    engagementStatus: getEngagementStatus(metrics.engagementIndex),
    varkProfile: {
      dominantStyle,
      secondaryStyle,
      visual: Number(primaryVark?.visual_score ?? authVark?.visual ?? authVark?.scores?.visual ?? 25),
      auditory: Number(primaryVark?.auditory_score ?? authVark?.auditory ?? authVark?.scores?.auditory ?? 25),
      reading: Number(primaryVark?.reading_score ?? authVark?.reading ?? authVark?.scores?.reading ?? 25),
      kinesthetic: Number(primaryVark?.kinesthetic_score ?? authVark?.kinesthetic ?? authVark?.scores?.kinesthetic ?? 25),
    },
    enrolledClasses: classRows.map((row) => ({
      classId: row.class_id || row.classes?.id || null,
      classCode: row.class_code || row.classes?.class_code || null,
      className: row.classes?.class_name || "Learning Cohort",
      teacherId: row.classes?.teacher_id || null,
      subject: row.classes?.subject || null,
      enrolledAt: row.created_at || null,
    })),
    masteryByTopic,
    recentActivity,
    recommendations: buildRecommendations({
      overallMastery: metrics.overallMastery,
      engagementIndex: metrics.engagementIndex,
      dominantStyle,
      averageRating,
      lowRatingCount,
      badges: badgePortfolio,
    }),
    badges: badgePortfolio,
    moduleFeedback: {
      averageRating,
      totalResponses: feedbackRows.length,
      lowRatingCount,
    },
    shareHistory: shareRows.map((row) => ({
      id: row.id,
      subject: row.subject || null,
      deliveryStatus: row.delivery_status || "drafted",
      createdAt: row.created_at,
      sentAt: row.sent_at || null,
    })),
    metrics: {
      modulesStarted: metrics.modulesStarted,
      modulesCompleted: metrics.modulesCompleted,
      totalTimeSpent: metrics.totalTimeSpent,
      lastActivity: metrics.lastActivity,
      needsAttention:
        metrics.overallMastery < 55 ||
        metrics.engagementIndex < 40 ||
        metrics.masteryByTopic.some((topic) => topic.needsAttention),
    },
  }
}
