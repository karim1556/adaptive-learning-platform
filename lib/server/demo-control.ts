import getAdminSupabaseClient from "@/lib/server/admin-supabase"
import { getStudentInsight } from "@/lib/server/student-insights"

const BADGE_CATALOG = [
  { id: "first-win", name: "First Win", description: "Complete your first adaptive module.", icon: "sparkles" },
  { id: "style-specialist", name: "VARK Specialist", description: "Excel in your top learning mode.", icon: "brain" },
  { id: "mastery-builder", name: "Mastery Builder", description: "Maintain strong overall mastery.", icon: "target" },
  { id: "topic-champion", name: "Topic Champion", description: "Master multiple topics.", icon: "trophy" },
  { id: "adaptive-explorer", name: "Adaptive Explorer", description: "Explore multiple VARK modes.", icon: "book-open" },
  { id: "consistency-flame", name: "Consistency Flame", description: "Build momentum across modules.", icon: "flame" },
] as const

const STYLE_OPTIONS = ["Visual", "Auditory", "Reading", "Kinesthetic"] as const
export const DEMO_FALLBACK_KEY = "AMEP-DEMO"

function generateDemoCode(prefix: string, length = 6) {
  return `${prefix}${Math.random().toString(36).slice(2, 2 + length).toUpperCase()}`
}

export interface DemoStudentSummary {
  id: string
  userId: string
  name: string
  email: string | null
  overallMastery: number
  engagementIndex: number
  currentClass: string | null
}

export interface DemoOverrideInput {
  studentId: string
  overallMastery: number
  engagementIndex: number
  modulesStarted: number
  modulesCompleted: number
  totalTimeSpent: number
  dominantStyle: string
  secondaryStyle: string
  topicScores: Array<{ topicId?: string | null; topicName: string; score: number }>
  feedbackAverage: number
  feedbackResponses: number
  badges: string[]
  activityNotes: string[]
  resetExisting?: boolean
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function normalizeStyle(value?: string | null) {
  const candidate = String(value || "").trim().toLowerCase()
  if (candidate.startsWith("v")) return "Visual"
  if (candidate.startsWith("a")) return "Auditory"
  if (candidate.startsWith("r")) return "Reading"
  if (candidate.startsWith("k")) return "Kinesthetic"
  return "Visual"
}

function buildVarkScores(dominantStyle: string, secondaryStyle: string) {
  const dominant = normalizeStyle(dominantStyle)
  const secondary = normalizeStyle(secondaryStyle === dominant ? "Reading" : secondaryStyle)
  const base = { Visual: 15, Auditory: 15, Reading: 15, Kinesthetic: 15 }
  base[dominant] = 40
  base[secondary] = 30

  return {
    dominantStyle: dominant,
    secondaryStyle: secondary,
    visual: base.Visual,
    auditory: base.Auditory,
    reading: base.Reading,
    kinesthetic: base.Kinesthetic,
  }
}

function buildCheckpointAttempts(score: number, completed: boolean) {
  const adjusted = clamp(score)
  const first = clamp(completed ? adjusted - 4 : adjusted - 10)
  return [
    { checkpointId: `demo-a`, percentage: first, score: first, maxScore: 100, completedAt: new Date().toISOString() },
    { checkpointId: `demo-b`, percentage: adjusted, score: adjusted, maxScore: 100, completedAt: new Date().toISOString() },
  ]
}

function buildDemoFeedbackRatings(average: number, count: number) {
  const safeCount = Math.max(0, Math.min(8, Math.round(count)))
  const base = Math.max(1, Math.min(5, Number(average || 0)))
  return Array.from({ length: safeCount }, (_, index) => {
    const offset = index % 3 === 0 ? 0 : index % 3 === 1 ? -0.5 : 0.5
    return Math.max(1, Math.min(5, Math.round(base + offset)))
  })
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || "")
  return error?.code === "PGRST204" || message.toLowerCase().includes("schema cache")
}

function normalizeDemoLessonRecord(record: any, fallbackMode = "reading") {
  return {
    id: record.id,
    title: record.title || "Demo Module",
    concept_id: record.concept_id || null,
    concept_name: record.concept_name || record.title || "Learning Module",
    class_id: record.class_id || null,
    class_code: record.class_code || null,
    learning_mode: record.learning_mode || fallbackMode,
    teacher_id: record.teacher_id || null,
    subject: record.subject || "Adaptive Learning",
  }
}

async function selectPublishedLessonsForDemo(adminClient: any, classIds: string[], fallbackMode: string) {
  const buildQuery = (selectClause: string) => {
    let query = adminClient.from("lessons").select(selectClause).eq("published", true)
    if (classIds.length > 0) {
      query = query.in("class_id", classIds)
    }
    return query.limit(12)
  }

  const richResult = await buildQuery("id, title, concept_id, concept_name, class_id, class_code, learning_mode, teacher_id, subject")
  if (!richResult.error) {
    return (richResult.data || []).map((record: any) => normalizeDemoLessonRecord(record, fallbackMode))
  }
  if (!isMissingColumnError(richResult.error)) {
    throw richResult.error
  }

  const fallbackResult = await buildQuery("id, title, class_id, class_code, teacher_id, subject")
  if (fallbackResult.error) throw fallbackResult.error

  return (fallbackResult.data || []).map((record: any) => normalizeDemoLessonRecord(record, fallbackMode))
}

async function insertDemoLessonsForDemo(adminClient: any, lessonRows: any[], fallbackMode: string) {
  const richInsert = await adminClient
    .from("lessons")
    .insert(lessonRows)
    .select("id, title, concept_id, concept_name, class_id, class_code, learning_mode, teacher_id, subject")

  if (!richInsert.error) {
    return (richInsert.data || []).map((record: any) => normalizeDemoLessonRecord(record, fallbackMode))
  }

  if (!isMissingColumnError(richInsert.error)) {
    throw richInsert.error
  }

  const fallbackRows = lessonRows.map((row) => ({
    title: row.title,
    description: row.description,
    class_id: row.class_id,
    class_code: row.class_code,
    teacher_id: row.teacher_id,
    subject: row.subject,
    difficulty: row.difficulty,
    estimated_time: row.estimated_duration || 20,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))

  const fallbackInsert = await adminClient
    .from("lessons")
    .insert(fallbackRows)
    .select("id, title, class_id, class_code, teacher_id, subject")

  if (fallbackInsert.error) throw fallbackInsert.error
  return (fallbackInsert.data || []).map((record: any) => normalizeDemoLessonRecord(record, fallbackMode))
}

async function upsertDemoLessonProgress(adminClient: any, progressRows: any[]) {
  const richResult = await adminClient.from("lesson_progress").upsert(progressRows, { onConflict: "lesson_id,student_id" })
  if (!richResult.error) return
  if (!isMissingColumnError(richResult.error)) throw richResult.error

  const fallbackRows = progressRows.map((row) => ({
    lesson_id: row.lesson_id,
    student_id: row.student_id,
    current_block_index: row.current_block_index,
    completed_blocks: row.completed_blocks,
    checkpoint_scores: {
      attempts: row.checkpoint_attempts,
      overallScore: row.overall_score,
    },
    overall_score: row.overall_score,
    time_spent: row.time_spent,
    started_at: row.started_at,
    last_accessed_at: row.last_accessed_at,
    completed_at: row.completed_at,
  }))

  const fallbackResult = await adminClient.from("lesson_progress").upsert(fallbackRows, { onConflict: "lesson_id,student_id" })
  if (fallbackResult.error) throw fallbackResult.error
}

async function resolveAuthProfile(adminClient: any, profile: any, user: any) {
  const candidateIds = uniqueIds([profile?.user_id, profile?.id])

  for (const candidateId of candidateIds) {
    const { data } = await adminClient.from("profiles").select("id, email, full_name").eq("id", candidateId).maybeSingle()
    if (data?.id) {
      return data
    }
  }

  const email = String(user?.email || "").trim().toLowerCase()
  if (email) {
    const { data } = await adminClient.from("profiles").select("id, email, full_name").eq("email", email).maybeSingle()
    if (data?.id) {
      return data
    }
  }

  return null
}

export function validateDemoAdminKey(input?: string | null) {
  const expected = process.env.DEMO_ADMIN_KEY || process.env.AMEP_DEMO_ADMIN_KEY || ""
  if (expected) {
    return input === expected
  }

  return input === DEMO_FALLBACK_KEY
}

export function getDemoControlMeta() {
  const expected = process.env.DEMO_ADMIN_KEY || process.env.AMEP_DEMO_ADMIN_KEY || ""
  return {
    usesConfiguredKey: Boolean(expected),
    fallbackKey: expected ? null : DEMO_FALLBACK_KEY,
  }
}

export function getDemoAdminClient() {
  const client = getAdminSupabaseClient()
  if (!client) {
    throw new Error("Service role key is not configured.")
  }

  return client
}

export function getDemoBadgeCatalog() {
  return BADGE_CATALOG.map((badge) => ({ ...badge }))
}

export function getDemoStyleOptions() {
  return [...STYLE_OPTIONS]
}

export async function listDemoStudents(search?: string): Promise<DemoStudentSummary[]> {
  const adminClient = getDemoAdminClient()
  const { data: profiles, error } = await adminClient
    .from("student_profiles")
    .select("id, user_id, overall_mastery_score, engagement_index, current_class, updated_at")
    .order("updated_at", { ascending: false })
    .limit(120)

  if (error) throw error

  const userIds = (profiles || []).map((profile: any) => profile.user_id).filter(Boolean)
  const { data: users } = userIds.length
    ? await adminClient.from("users").select("id, first_name, last_name, email").in("id", userIds)
    : { data: [] }

  const userMap = new Map((users || []).map((user: any) => [user.id, user]))
  const query = String(search || "").trim().toLowerCase()

  const summaries = (profiles || []).map((profile: any) => {
    const user = userMap.get(profile.user_id)
    const name =
      user?.first_name || user?.last_name
        ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
        : user?.email || "Student"

    return {
      id: profile.id,
      userId: profile.user_id,
      name,
      email: user?.email || null,
      overallMastery: Number(profile.overall_mastery_score || 0),
      engagementIndex: Number(profile.engagement_index || 50),
      currentClass: profile.current_class || null,
    }
  })

  if (!query) return summaries

  const filtered = summaries.filter((student) =>
    [student.name, student.email, student.currentClass]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  )

  if (filtered.length > 0) return filtered

  return filtered
}

export async function listDemoStudentsWithFallback(search?: string): Promise<DemoStudentSummary[]> {
  const adminClient = getDemoAdminClient()
  const query = String(search || "").trim().toLowerCase()

  const primary = await listDemoStudents(search)
  if (primary.length > 0) return primary

  const { data: users, error } = await adminClient
    .from("users")
    .select("id, first_name, last_name, email, role")
    .eq("role", "student")
    .limit(120)

  if (error) throw error

  const userIds = (users || []).map((user: any) => user.id)
  const [{ data: publicProfiles }, { data: studentProfiles }] = await Promise.all([
    userIds.length ? adminClient.from("profiles").select("id, overall_mastery, engagement_index").in("id", userIds) : { data: [] },
    userIds.length ? adminClient.from("student_profiles").select("id, user_id, current_class").in("user_id", userIds) : { data: [] },
  ])

  const publicProfileMap = new Map((publicProfiles || []).map((profile: any) => [profile.id, profile]))
  const studentProfileMap = new Map((studentProfiles || []).map((profile: any) => [profile.user_id, profile]))

  const fallbackSummaries = (users || []).map((user: any) => {
    const publicProfile = publicProfileMap.get(user.id)
    const studentProfile = studentProfileMap.get(user.id)
    const name =
      user?.first_name || user?.last_name
        ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
        : user?.email || "Student"

    return {
      id: studentProfile?.id || user.id,
      userId: user.id,
      name,
      email: user.email || null,
      overallMastery: Number(publicProfile?.overall_mastery || 0),
      engagementIndex: Number(publicProfile?.engagement_index || 50),
      currentClass: studentProfile?.current_class || null,
    }
  })

  if (!query) return fallbackSummaries

  return fallbackSummaries.filter((student) =>
    [student.name, student.email, student.currentClass]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  )
}

async function resolveStudent(adminClient: any, studentId: string) {
  let profile = null as any

  const { data: byProfile } = await adminClient.from("student_profiles").select("*").eq("id", studentId).maybeSingle()
  if (byProfile) profile = byProfile

  if (!profile) {
    const { data: byUser } = await adminClient.from("student_profiles").select("*").eq("user_id", studentId).maybeSingle()
    if (byUser) profile = byUser
  }

  if (!profile) {
    const { data: userRow } = await adminClient.from("users").select("id").eq("id", studentId).eq("role", "student").maybeSingle()
    if (userRow?.id) {
      const { data: createdProfile, error: createErr } = await adminClient
        .from("student_profiles")
        .upsert(
          {
            user_id: userRow.id,
            enrollment_date: new Date().toISOString(),
            overall_mastery_score: 0,
            engagement_index: 50,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .maybeSingle()

      if (createErr) throw createErr
      if (createdProfile) {
        profile = createdProfile
      }
    }
  }

  if (!profile) {
    throw new Error("Student profile not found.")
  }

  const { data: user } = await adminClient.from("users").select("id, first_name, last_name, email").eq("id", profile.user_id).maybeSingle()
  const authProfile = await resolveAuthProfile(adminClient, profile, user)
  const authUserId = authProfile?.id || null
  const candidateStudentIds = uniqueIds([authUserId, profile.id, profile.user_id])

  return { profile, user, authProfile, authUserId, candidateStudentIds }
}

export async function getDemoStudentDetail(studentId: string) {
  const adminClient = getDemoAdminClient()
  const { profile, authUserId } = await resolveStudent(adminClient, studentId)
  return getStudentInsight(adminClient, { studentProfileId: profile.id, userId: authUserId || profile.user_id })
}

async function ensureDemoConcepts(adminClient: any) {
  let { data: concepts } = await adminClient.from("learning_concepts").select("id, name").limit(12)

  if (concepts && concepts.length > 0) {
    return concepts
  }

  const seedNames = [
    "Adaptive Foundations",
    "Applied Problem Solving",
    "Mastery Revision",
    "Confidence Builder",
  ]

  const { error } = await adminClient.from("learning_concepts").insert(
    seedNames.map((name) => ({
      name,
      description: "Demo concept generated for showcase mode",
      category: "Demo",
    })),
  )

  if (error) throw error

  const refreshed = await adminClient.from("learning_concepts").select("id, name").limit(12)
  return refreshed.data || []
}

async function ensureDemoEnrollment(params: {
  adminClient: any
  profile: any
  user: any
  authUserId: string | null
  candidateStudentIds: string[]
  styles: ReturnType<typeof buildVarkScores>
  overallMastery: number
  engagementIndex: number
}) {
  const { adminClient, profile, user, authUserId, candidateStudentIds, styles, overallMastery, engagementIndex } = params

  const { data: existingRows } = await adminClient
    .from("class_students")
    .select("class_id, class_code, student_id, classes(id, class_name, class_code, subject, teacher_id)")
    .in("student_id", candidateStudentIds)

  if (existingRows && existingRows.length > 0) {
    return existingRows
  }

  const { data: reusableClass } = await adminClient
    .from("classes")
    .select("id, class_name, class_code, subject, teacher_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: teacherProfile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "teacher")
    .limit(1)
    .maybeSingle()

  const classCode = generateDemoCode("DMO", 4)
  const className = `${user?.first_name || user?.email || "Student"} Demo Cohort`

  let createdClass = reusableClass || null

  if (!createdClass) {
    const { data: insertedClass, error: classError } = await adminClient
      .from("classes")
      .insert({
        class_code: classCode,
        class_name: className,
        subject: "Adaptive Learning",
        grade: "Demo",
        teacher_id: teacherProfile?.id || null,
        description: "Auto-generated demo class for AMEP showcase mode",
      })
      .select("id, class_name, class_code, subject, teacher_id")
      .maybeSingle()

    if (classError) throw classError
    createdClass = insertedClass
  }

  if (!authUserId) {
    return [
      {
        class_id: createdClass?.id || null,
        class_code: createdClass?.class_code || reusableClass?.class_code || classCode,
        student_id: profile.user_id,
        classes: createdClass,
      },
    ]
  }

  const { error: enrollmentError } = await adminClient.from("class_students").upsert(
    {
      class_id: createdClass?.id || null,
      class_code: createdClass?.class_code || reusableClass?.class_code || classCode,
      student_id: authUserId,
      name:
        user?.first_name || user?.last_name
          ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
          : user?.email || "Student",
      email: user?.email || null,
      dominant_styles: [styles.dominantStyle, styles.secondaryStyle],
      mastery_average: overallMastery,
      engagement_level: engagementIndex,
      last_active: new Date().toISOString(),
    },
    { onConflict: "class_code,student_id" },
  )

  if (enrollmentError) throw enrollmentError

  return [
    {
      class_id: createdClass?.id || null,
      class_code: createdClass?.class_code || classCode,
      student_id: authUserId,
      classes: createdClass,
    },
  ]
}

async function ensureDemoLessons(params: {
  adminClient: any
  classRows: any[]
  user: any
  styles: ReturnType<typeof buildVarkScores>
}) {
  const { adminClient, classRows, user, styles } = params
  const classIds = (classRows || [])
    .map((row: any) => row.class_id || row.classes?.id)
    .filter(Boolean)
  const fallbackMode = styles.dominantStyle.toLowerCase()
  const existingLessons = await selectPublishedLessonsForDemo(adminClient, classIds, fallbackMode)
  if (existingLessons && existingLessons.length > 0) {
    return existingLessons
  }

  const concepts = await ensureDemoConcepts(adminClient)
  const primaryClass = classRows?.[0]
  const classId = primaryClass?.class_id || primaryClass?.classes?.id || null
  const classCode = primaryClass?.class_code || primaryClass?.classes?.class_code || null
  const teacherId = primaryClass?.classes?.teacher_id || null
  const subject = primaryClass?.classes?.subject || "Adaptive Learning"
  const lessonModes = [
    styles.dominantStyle.toLowerCase(),
    styles.secondaryStyle.toLowerCase(),
    "reading",
  ]

  const lessonRows = Array.from({ length: 3 }).map((_, index) => {
    const concept = concepts[index % concepts.length]
    return {
      title: `${user?.first_name || "Student"} Demo Module ${index + 1}`,
      description: "Auto-generated demo lesson for showcase mode.",
      class_id: classId,
      class_code: classCode,
      teacher_id: teacherId,
      subject,
      difficulty: "beginner",
      estimated_duration: 20,
      published: true,
      concept_id: concept?.id || null,
      concept_name: concept?.name || `Demo Topic ${index + 1}`,
      learning_mode: lessonModes[index % lessonModes.length],
      blocks: [],
      checkpoints: [],
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  })

  return insertDemoLessonsForDemo(adminClient, lessonRows, fallbackMode)
}

export async function applyDemoOverrides(input: DemoOverrideInput) {
  const adminClient = getDemoAdminClient()
  const { profile, user, authUserId, candidateStudentIds } = await resolveStudent(adminClient, input.studentId)

  const now = new Date()
  const nowIso = now.toISOString()
  const overallMastery = clamp(input.overallMastery)
  const engagementIndex = clamp(input.engagementIndex)
  const modulesStarted = Math.max(0, Math.min(8, Math.round(input.modulesStarted)))
  const modulesCompleted = Math.max(0, Math.min(modulesStarted, Math.round(input.modulesCompleted)))
  const totalTimeSpent = Math.max(0, Math.round(input.totalTimeSpent))
  const feedbackAverage = Math.max(1, Math.min(5, Number(input.feedbackAverage || 0)))
  const feedbackResponses = Math.max(0, Math.min(8, Math.round(input.feedbackResponses)))
  const styles = buildVarkScores(input.dominantStyle, input.secondaryStyle)

  const classRows = await ensureDemoEnrollment({
    adminClient,
    profile,
    user,
    authUserId,
    candidateStudentIds,
    styles,
    overallMastery,
    engagementIndex,
  })
  const lessons = await ensureDemoLessons({
    adminClient,
    classRows,
    user,
    styles,
  })

  const selectedLessons = lessons.slice(0, Math.max(modulesStarted, feedbackResponses, 3))

  if (input.resetExisting !== false) {
    const resetOps = [
      adminClient.from("mastery_records").delete().eq("student_id", profile.id),
      adminClient.from("engagement_logs").delete().in("student_id", [profile.id, profile.user_id]),
    ]

    if (authUserId) {
      resetOps.push(
        adminClient.from("lesson_progress").delete().eq("student_id", authUserId),
        adminClient.from("student_badges").delete().eq("student_id", authUserId),
        adminClient.from("module_feedback").delete().eq("student_id", authUserId),
      )
    }

    await Promise.all(resetOps)
  }

  const progressRows = authUserId
    ? selectedLessons.slice(0, modulesStarted).map((lesson: any, index: number) => {
        const completed = index < modulesCompleted
        const scoreVariance = [6, 2, -4, 4, -2, 8, -6, 0][index] || 0
        const lessonScore = clamp(overallMastery + scoreVariance - (completed ? 0 : 8))
        const minutes = Math.max(8, Math.round(totalTimeSpent / Math.max(1, modulesStarted)))
        const startedAt = new Date(now.getTime() - (modulesStarted - index) * 24 * 60 * 60 * 1000).toISOString()
        const lastAccessedAt = new Date(now.getTime() - index * 4 * 60 * 60 * 1000).toISOString()

        return {
          lesson_id: lesson.id,
          student_id: authUserId,
          lesson_title: lesson.title,
          current_block_index: completed ? 3 : 1,
          completed_blocks: [],
          checkpoint_attempts: buildCheckpointAttempts(lessonScore, completed),
          overall_score: lessonScore,
          time_spent: minutes,
          started_at: startedAt,
          last_accessed_at: lastAccessedAt,
          completed_at: completed ? lastAccessedAt : null,
        }
      })
    : []

  if (progressRows.length > 0) {
    await upsertDemoLessonProgress(adminClient, progressRows)
  }

  const topicInputs = input.topicScores
    .filter((topic) => topic.topicName.trim())
    .slice(0, 6)

  const concepts = await ensureDemoConcepts(adminClient)
  const conceptsByName = new Map((concepts || []).map((concept: any) => [String(concept.name).toLowerCase(), concept]))

  const masteryRows = topicInputs.map((topic, index) => {
    const matchingLesson = selectedLessons[index] || selectedLessons[0]
    const concept =
      (topic.topicId && (concepts || []).find((item: any) => item.id === topic.topicId)) ||
      conceptsByName.get(topic.topicName.toLowerCase()) ||
      (matchingLesson?.concept_id ? { id: matchingLesson.concept_id, name: matchingLesson.concept_name || topic.topicName } : null) ||
      concepts?.[index]

    return concept
      ? {
          student_id: profile.id,
          concept_id: concept.id,
          mastery_score: clamp(topic.score),
          assessment_count: 2,
          checkpoints_passed: clamp(topic.score) >= 70 ? 2 : 1,
          total_checkpoints: 2,
          lessons_completed: modulesCompleted > index ? 1 : 0,
          total_lessons: 1,
          last_activity: nowIso,
          last_updated: nowIso,
        }
      : null
  }).filter(Boolean)

  if (masteryRows.length > 0) {
    const { error } = await adminClient.from("mastery_records").upsert(masteryRows, { onConflict: "student_id,concept_id" })
    if (error) throw error
  }

  const varkPayload = {
    student_id: profile.id,
    visual_score: styles.visual,
    auditory_score: styles.auditory,
    reading_score: styles.reading,
    kinesthetic_score: styles.kinesthetic,
    dominant_style: styles.dominantStyle,
    secondary_style: styles.secondaryStyle,
    last_updated: nowIso,
  }

  try {
    await adminClient.from("vark_profiles").upsert(varkPayload, { onConflict: "student_id" })
  } catch (error) {
    console.warn("Demo control could not update vark_profiles:", error)
  }

  if (authUserId) {
    const profilePayload = {
      id: authUserId,
      overall_mastery: overallMastery,
      engagement_index: engagementIndex,
      vark_profile: {
        visual: styles.visual,
        auditory: styles.auditory,
        reading: styles.reading,
        kinesthetic: styles.kinesthetic,
        dominantStyle: styles.dominantStyle,
        secondaryStyle: styles.secondaryStyle,
      },
      updated_at: nowIso,
    }

    await adminClient.from("profiles").upsert(profilePayload, { onConflict: "id" })
  }

  await adminClient.from("student_profiles").upsert(
    {
      id: profile.id,
      user_id: profile.user_id,
      current_class: (classRows?.[0] as any)?.classes?.class_name || profile.current_class || null,
      overall_mastery_score: overallMastery,
      engagement_index: engagementIndex,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  )

  if (classRows && classRows.length > 0) {
    await adminClient
      .from("class_students")
      .update({
        mastery_average: overallMastery,
        engagement_level: engagementIndex,
        dominant_styles: [styles.dominantStyle, styles.secondaryStyle],
        last_active: nowIso,
      })
      .in("student_id", candidateStudentIds)
  }

  const feedbackRatings = buildDemoFeedbackRatings(feedbackAverage, feedbackResponses)
  if (feedbackRatings.length > 0 && authUserId) {
    const feedbackRows = feedbackRatings.map((rating, index) => {
      const lesson = selectedLessons[index % selectedLessons.length]
      return {
        student_id: authUserId,
        lesson_id: lesson.id,
        concept_id: lesson.concept_id || null,
        concept_name: lesson.concept_name || lesson.title,
        learning_mode: lesson.learning_mode || styles.dominantStyle.toLowerCase(),
        rating,
        comment: `Demo feedback: ${rating >= 4 ? "clear and engaging" : "needs a little more guidance"}.`,
        created_at: new Date(now.getTime() - index * 60 * 60 * 1000).toISOString(),
      }
    })

    try {
      await adminClient.from("module_feedback").upsert(feedbackRows, { onConflict: "student_id,lesson_id" })
    } catch (error) {
      console.warn("Demo control could not update module feedback:", error)
    }
  }

  const selectedBadges = BADGE_CATALOG.filter((badge) => input.badges.includes(badge.id))
  if (selectedBadges.length > 0 && authUserId) {
    try {
      await adminClient.from("student_badges").upsert(
        selectedBadges.map((badge) => ({
          student_id: authUserId,
          badge_key: badge.id,
          badge_name: badge.name,
          description: badge.description,
          icon: badge.icon,
          awarded_at: nowIso,
          metadata: { source: "demo-control" },
        })),
        { onConflict: "student_id,badge_key" },
      )
    } catch (error) {
      console.warn("Demo control could not update badges:", error)
    }
  }

  const activityNotes = input.activityNotes.filter((note) => note.trim()).slice(0, 4)
  const activityRows = activityNotes.map((note, index) => ({
    student_id: profile.id,
    activity_type: index === 0 ? "module_complete" : "study_session",
    activity_description: note,
    duration_minutes: Math.max(10, Math.round(totalTimeSpent / Math.max(1, activityNotes.length))),
    timestamp: new Date(now.getTime() - index * 2 * 60 * 60 * 1000).toISOString(),
  }))

  if (activityRows.length > 0) {
    await adminClient.from("engagement_logs").insert(activityRows)
  }

  try {
    const { data: parentLinks } = await adminClient.from("parent_student").select("parent_id").eq("student_id", profile.id).limit(1)
    const parentId = parentLinks?.[0]?.parent_id
    if (parentId) {
      const { data: parentProfile } = await adminClient.from("parent_profiles").select("user_id").eq("id", parentId).maybeSingle()
      const { data: parentUser } = parentProfile?.user_id
        ? await adminClient.from("users").select("email, first_name").eq("id", parentProfile.user_id).maybeSingle()
        : { data: null }

      if (authUserId) {
        await adminClient.from("parent_progress_shares").insert({
          student_id: authUserId,
          parent_email: parentUser?.email || "parent@example.com",
          parent_name: parentUser?.first_name || "Parent",
          delivery_status: "sent",
          subject: `AMEP Weekly Snapshot for ${user?.first_name || user?.email || "Student"}`,
          snapshot: {
            summary: `Demo snapshot set to ${overallMastery}% mastery and ${engagementIndex}% engagement.`,
          },
          sent_at: nowIso,
        })
      }
    }
  } catch (error) {
    console.warn("Demo control could not create parent share history:", error)
  }

  return getStudentInsight(adminClient, { studentProfileId: profile.id, userId: authUserId || profile.user_id })
}
