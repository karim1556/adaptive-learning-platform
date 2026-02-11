/**
 * AdaptIQ Lesson Service
 * 
 * Handles lessons with embedded checkpoints for real mastery tracking.
 * - Lessons contain content blocks and checkpoint quizzes
 * - Student progress is tracked per-checkpoint
 * - Mastery is calculated from actual quiz performance
 */

import { supabase } from "./supabaseClient"

// Simple UUID detector to avoid sending numeric/mock ids to PostgREST
const isUuid = (s: string | undefined | null) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

// ============================================================================
// Types
// ============================================================================

export interface Question {
  id: string
  text: string
  type: "multiple_choice" | "true_false" | "short_answer"
  options?: string[]
  correctAnswer: string | number // index for multiple choice, text for short answer
  explanation?: string
  points: number
}

export async function getTeacherLessons(teacherId: string): Promise<Lesson[]> {
  try {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })

    if (data && data.length > 0) {
      return data.map((l: any) => ({
        id: l.id,
        title: l.title,
        description: l.description,
        conceptId: l.concept_id,
        conceptName: l.concept_name,
        teacherId: l.teacher_id,
        classId: l.class_id,
        learningMode: l.learning_mode,
        difficulty: l.difficulty,
        blocks: l.blocks || [],
        estimatedDuration: l.estimated_duration,
        published: l.published,
        publishedAt: l.published_at,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      }))
    }
  } catch (e) {
    console.warn('Supabase fetch failed for getTeacherLessons:', e)
  }

  // Fallback to localStorage
  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  return store[teacherId] || []
}

export interface Checkpoint {
  id: string
  title: string
  questions: Question[]
  passingScore: number // percentage needed to pass (e.g., 70)
  videoTimestamp?: number // For in-video checkpoints: time in seconds when quiz should appear
}

export interface ContentBlock {
  id: string
  type: "text" | "video" | "image" | "embed" | "pdf" | "document"
  content: string // HTML for text, URL for video/image/embed/pdf
  fileName?: string // Original file name for documents
  duration?: number // estimated time in minutes
  videoCheckpoints?: Checkpoint[] // In-video quizzes that pause the video
}

export interface LessonBlock {
  id: string
  order: number
  type: "content" | "checkpoint"
  contentBlock?: ContentBlock
  checkpoint?: Checkpoint
}

export interface Lesson {
  id: string
  title: string
  description: string
  conceptId: string
  conceptName: string
  teacherId: string
  classId?: string
  learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
  difficulty: number // 0-100
  blocks: LessonBlock[]
  estimatedDuration: number // minutes
  published: boolean
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CheckpointAttempt {
  checkpointId: string
  score: number
  maxScore: number
  percentage: number
  answers: Record<string, string | number>
  completedAt: string
}

export interface LessonProgress {
  lessonId: string
  lessonTitle: string
  studentId: string
  currentBlockIndex: number
  completedBlocks: string[] // block IDs
  checkpointAttempts: CheckpointAttempt[]
  startedAt: string
  lastAccessedAt: string
  completedAt?: string
  overallScore: number // calculated from checkpoints
  timeSpent: number // minutes
}

export interface StudentMasteryData {
  conceptId: string
  conceptName: string
  masteryScore: number
  checkpointsPassed: number
  totalCheckpoints: number
  lessonsCompleted: number
  totalLessons: number
  lastActivity: string
  needsAttention: boolean
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  LESSONS: "adaptiq_lessons_v1",
  PROGRESS: "adaptiq_lesson_progress_v1",
  MASTERY: "adaptiq_student_mastery_v1",
} as const

// ============================================================================
// Helper Functions
// ============================================================================

function getFromStorage<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

function generateId(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function generateClassCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createLesson(
  teacherId: string,
  lessonData: {
    title: string
    description: string
    conceptId: string
    conceptName: string
    teacherId: string
    classId?: string
    learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
    difficulty: number
    blocks: LessonBlock[]
    published: boolean
  }
): Promise<{ success: boolean; lessonId?: string }> {
  const lessonId = generateId()
  const now = new Date().toISOString()

  const lesson: Lesson = {
    id: lessonId,
    title: lessonData.title,
    description: lessonData.description,
    conceptId: lessonData.conceptId,
    conceptName: lessonData.conceptName,
    teacherId: lessonData.teacherId,
    classId: lessonData.classId,
    learningMode: lessonData.learningMode,
    difficulty: lessonData.difficulty,
    blocks: lessonData.blocks,
    estimatedDuration: lessonData.blocks.reduce((acc, b) => acc + (b.contentBlock?.duration || 5), 0),
    published: lessonData.published,
    publishedAt: lessonData.published ? now : undefined,
    createdAt: now,
    updatedAt: now,
  }

  try {
    const { error } = await supabase.from("lessons").insert({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      concept_id: lesson.conceptId,
      concept_name: lesson.conceptName,
      teacher_id: lesson.teacherId,
      class_id: lesson.classId,
      learning_mode: lesson.learningMode,
      difficulty: lesson.difficulty,
      blocks: lesson.blocks,
      estimated_duration: lesson.estimatedDuration,
      published: lesson.published,
      published_at: lesson.publishedAt,
      created_at: lesson.createdAt,
      updated_at: lesson.updatedAt,
    })

    if (!error) {
      return { success: true, lessonId }
    }
  } catch (e) {
    console.warn("Supabase insert failed:", e)
  }

  // Fallback to localStorage
  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  store[teacherId] = [...(store[teacherId] || []), lesson]
  setToStorage(STORAGE_KEYS.LESSONS, store)

  return { success: true, lessonId }
}

export async function deleteLesson(
  lessonId: string,
  teacherId: string
): Promise<{ success: boolean }> {
  try {
    await supabase.from("lessons").delete().eq("id", lessonId)
  } catch (e) {
    console.warn("Supabase delete failed:", e)
  }

  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  if (store[teacherId]) {
    store[teacherId] = store[teacherId].filter(l => l.id !== lessonId)
    setToStorage(STORAGE_KEYS.LESSONS, store)
  }

  return { success: true }
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  try {
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", lessonId)
      .maybeSingle()

    if (data) {
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        conceptId: data.concept_id,
        conceptName: data.concept_name,
        teacherId: data.teacher_id,
        classId: data.class_id,
        learningMode: data.learning_mode,
        difficulty: data.difficulty,
        blocks: data.blocks || [],
        estimatedDuration: data.estimated_duration,
        published: data.published,
        publishedAt: data.published_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Search localStorage
  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  for (const lessons of Object.values(store)) {
    const found = lessons.find(l => l.id === lessonId)
    if (found) return found
  }
  return null
}

export async function getPublishedLessons(classId?: string): Promise<Lesson[]> {
  try {
    let query = supabase
      .from("lessons")
      .select("*")
      .eq("published", true)
    
    if (classId) {
      query = query.eq("class_id", classId)
    }

    const { data } = await query.order("created_at", { ascending: false })

    if (data && data.length > 0) {
      return data.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        conceptId: l.concept_id,
        conceptName: l.concept_name,
        teacherId: l.teacher_id,
        classId: l.class_id,
        learningMode: l.learning_mode,
        difficulty: l.difficulty,
        blocks: l.blocks || [],
        estimatedDuration: l.estimated_duration,
        published: l.published,
        publishedAt: l.published_at,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
      }))
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback: get all published lessons from localStorage
  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  const allLessons = Object.values(store).flat()
  const published = allLessons.filter(l => l.published && (!classId || l.classId === classId))
  return published
}

// ============================================================================
// Student Progress Tracking
// ============================================================================

export async function getStudentProgress(
  studentId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  try {
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .maybeSingle()

    if (data) {
      // Compute a safe overall score: prefer stored value, otherwise derive from checkpoint attempts
      const attempts = data.checkpoint_attempts || []
      let overall = data.overall_score
      if ((overall === null || overall === undefined) && attempts.length > 0) {
        const total = attempts.reduce((s: number, a: any) => s + (a.percentage || 0), 0)
        overall = Math.round(total / attempts.length)
      }
      if ((overall === null || overall === undefined) && attempts.length === 0) {
        // No checkpoints: treat as full score when completed, otherwise 0
        overall = data.completed_at ? 100 : 0
      }

      return {
        lessonId: data.lesson_id,
        lessonTitle: data.lesson_title,
        studentId: data.student_id,
        currentBlockIndex: data.current_block_index,
        completedBlocks: data.completed_blocks || [],
        checkpointAttempts: attempts,
        startedAt: data.started_at,
        lastAccessedAt: data.last_accessed_at,
        completedAt: data.completed_at,
        overallScore: overall,
        timeSpent: data.time_spent,
      }
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback to localStorage
  const store = getFromStorage<Record<string, LessonProgress[]>>(STORAGE_KEYS.PROGRESS) || {}
  const studentProgress = store[studentId] || []
  return studentProgress.find(p => p.lessonId === lessonId) || null
}

export async function getAllStudentProgress(studentId: string): Promise<LessonProgress[]> {
  try {
    if (!isUuid(studentId)) {
      console.warn('Skipping Supabase lesson_progress list query: invalid studentId UUID', studentId)
    } else {
      const { data } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("student_id", studentId)
        .order("last_accessed_at", { ascending: false })

      if (data && data.length > 0) {
        return data.map(p => {
          const attempts = p.checkpoint_attempts || []
          let overall = p.overall_score
          if ((overall === null || overall === undefined) && attempts.length > 0) {
            const total = attempts.reduce((s: number, a: any) => s + (a.percentage || 0), 0)
            overall = Math.round(total / attempts.length)
          }
          if ((overall === null || overall === undefined) && attempts.length === 0) {
            overall = p.completed_at ? 100 : 0
          }

          return {
            lessonId: p.lesson_id,
            lessonTitle: p.lesson_title,
            studentId: p.student_id,
            currentBlockIndex: p.current_block_index,
            completedBlocks: p.completed_blocks || [],
            checkpointAttempts: attempts,
            startedAt: p.started_at,
            lastAccessedAt: p.last_accessed_at,
            completedAt: p.completed_at,
            overallScore: overall,
            timeSpent: p.time_spent,
          }
        })
      }
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  const store = getFromStorage<Record<string, LessonProgress[]>>(STORAGE_KEYS.PROGRESS) || {}
  return store[studentId] || []
}

export async function startLesson(
  studentId: string,
  lesson: Lesson
): Promise<LessonProgress> {
  const now = new Date().toISOString()
  
  // Check if already started
  const existing = await getStudentProgress(studentId, lesson.id)
  if (existing) {
    // Update last accessed
    existing.lastAccessedAt = now
    await saveProgress(existing)
    return existing
  }

  const progress: LessonProgress = {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    studentId,
    currentBlockIndex: 0,
    completedBlocks: [],
    checkpointAttempts: [],
    startedAt: now,
    lastAccessedAt: now,
    overallScore: 0,
    timeSpent: 0,
  }

  await saveProgress(progress)
  return progress
}

export async function saveProgress(progress: LessonProgress): Promise<void> {
  const now = new Date().toISOString()
  progress.lastAccessedAt = now

  // Calculate overall score from checkpoint attempts
  if (progress.checkpointAttempts.length > 0) {
    const totalPercentage = progress.checkpointAttempts.reduce((sum, a) => sum + a.percentage, 0)
    progress.overallScore = Math.round(totalPercentage / progress.checkpointAttempts.length)
  }

  try {
    await supabase.from("lesson_progress").upsert({
      student_id: progress.studentId,
      lesson_id: progress.lessonId,
      lesson_title: progress.lessonTitle,
      current_block_index: progress.currentBlockIndex,
      completed_blocks: progress.completedBlocks,
      checkpoint_attempts: progress.checkpointAttempts,
      started_at: progress.startedAt,
      last_accessed_at: now,
      completed_at: progress.completedAt,
      overall_score: progress.overallScore,
      time_spent: progress.timeSpent,
    })
  } catch (e) {
    console.warn("Supabase upsert failed:", e)
  }

  // Always save to localStorage
  const store = getFromStorage<Record<string, LessonProgress[]>>(STORAGE_KEYS.PROGRESS) || {}
  const studentProgress = store[progress.studentId] || []
  const existingIndex = studentProgress.findIndex(p => p.lessonId === progress.lessonId)
  
  if (existingIndex >= 0) {
    studentProgress[existingIndex] = progress
  } else {
    studentProgress.push(progress)
  }
  
  store[progress.studentId] = studentProgress
  setToStorage(STORAGE_KEYS.PROGRESS, store)
  // Notify other parts of the app that progress changed (helps UI update)
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("progress:updated", { detail: { studentId: progress.studentId, lessonId: progress.lessonId } }))
    }
  } catch (e) {
    // ignore
  }

  // Update mastery data
  await updateStudentMastery(progress.studentId)
}

export async function submitCheckpoint(
  progress: LessonProgress,
  checkpointId: string,
  answers: Record<string, string | number>,
  checkpoint: Checkpoint
): Promise<{ passed: boolean; score: number; percentage: number }> {
  // Grade the checkpoint
  let score = 0
  let maxScore = 0

  for (const question of checkpoint.questions) {
    maxScore += question.points
    const studentAnswer = answers[question.id]
    
    if (question.type === "multiple_choice" || question.type === "true_false") {
      if (studentAnswer === question.correctAnswer) {
        score += question.points
      }
    } else if (question.type === "short_answer") {
      // Simple string match (could be enhanced with fuzzy matching)
      const correct = String(question.correctAnswer).toLowerCase().trim()
      const answer = String(studentAnswer || "").toLowerCase().trim()
      if (answer === correct) {
        score += question.points
      }
    }
  }

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed = percentage >= checkpoint.passingScore

  // Record the attempt
  const attempt: CheckpointAttempt = {
    checkpointId,
    score,
    maxScore,
    percentage,
    answers,
    completedAt: new Date().toISOString(),
  }

  // Update or add attempt (keep best score)
  const existingIndex = progress.checkpointAttempts.findIndex(a => a.checkpointId === checkpointId)
  if (existingIndex >= 0) {
    // Keep the better score
    if (percentage > progress.checkpointAttempts[existingIndex].percentage) {
      progress.checkpointAttempts[existingIndex] = attempt
    }
  } else {
    progress.checkpointAttempts.push(attempt)
  }

  // Mark checkpoint block as completed if passed
  if (passed) {
    const blockId = `checkpoint-${checkpointId}`
    if (!progress.completedBlocks.includes(blockId)) {
      progress.completedBlocks.push(blockId)
    }
  }

  // Recalculate overall score from all checkpoint attempts
  if (progress.checkpointAttempts.length > 0) {
    const totalPercentage = progress.checkpointAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0)
    progress.overallScore = Math.round(totalPercentage / progress.checkpointAttempts.length)
  }

  await saveProgress(progress)

  return { passed, score, percentage }
}

export async function completeContentBlock(
  progress: LessonProgress,
  blockId: string,
  timeSpent: number
): Promise<void> {
  if (!progress.completedBlocks.includes(blockId)) {
    progress.completedBlocks.push(blockId)
  }
  // `timeSpent` passed from the UI is in seconds; store progress.timeSpent in minutes
  const minutes = Math.round((timeSpent || 0) / 60)
  progress.timeSpent += minutes
  // Don't increment here - the component handles navigation
  
  await saveProgress(progress)
}

export async function completeLesson(progress: LessonProgress): Promise<void> {
  progress.completedAt = new Date().toISOString()
  
  // Calculate overall score from checkpoint attempts
  if (progress.checkpointAttempts.length > 0) {
    const totalPercentage = progress.checkpointAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0)
    progress.overallScore = Math.round(totalPercentage / progress.checkpointAttempts.length)
  } else {
    // No checkpoints = 100% completion score
    progress.overallScore = 100
  }
  
  await saveProgress(progress)
}

// ============================================================================
// Mastery Calculation
// ============================================================================

export async function updateStudentMastery(studentId: string): Promise<void> {
  const allProgress = await getAllStudentProgress(studentId)
  
  // Group by concept with lesson metadata
  const conceptData: Record<string, { 
    conceptName: string
    scores: number[]
    checkpoints: number[]
    lessons: number[]
    lastActivity: string
  }> = {}
  
  for (const progress of allProgress) {
    const lesson = await getLesson(progress.lessonId)
    if (!lesson) continue
    
    const conceptId = lesson.conceptId
    if (!conceptData[conceptId]) {
      conceptData[conceptId] = { 
        conceptName: lesson.conceptName || conceptId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        scores: [], 
        checkpoints: [], 
        lessons: [],
        lastActivity: progress.lastAccessedAt
      }
    }
    
    // Update last activity
    if (progress.lastAccessedAt > conceptData[conceptId].lastActivity) {
      conceptData[conceptId].lastActivity = progress.lastAccessedAt
    }
    
    // Add lesson score - use checkpoint attempts if available, otherwise use overallScore for completed lessons
    if (progress.checkpointAttempts.length > 0) {
      // Has checkpoints - add each checkpoint score
      for (const attempt of progress.checkpointAttempts) {
        conceptData[conceptId].scores.push(attempt.percentage)
        conceptData[conceptId].checkpoints.push(attempt.percentage >= 70 ? 1 : 0)
      }
    } else if (progress.completedAt) {
      // No checkpoints but completed - count as 100%
      conceptData[conceptId].scores.push(progress.overallScore || 100)
    }
    
    // Track lesson completion
    if (progress.completedAt) {
      conceptData[conceptId].lessons.push(1)
    } else {
      conceptData[conceptId].lessons.push(0)
    }
  }

  // Calculate mastery per concept
  const masteryData: StudentMasteryData[] = []
  
  for (const [conceptId, data] of Object.entries(conceptData)) {
    const avgScore = data.scores.length > 0 
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : 0
    const checkpointsPassed = data.checkpoints.filter(c => c === 1).length
    const lessonsCompleted = data.lessons.filter(l => l === 1).length

    masteryData.push({
      conceptId,
      conceptName: data.conceptName,
      masteryScore: avgScore,
      checkpointsPassed,
      totalCheckpoints: data.checkpoints.length,
      lessonsCompleted,
      totalLessons: data.lessons.length,
      lastActivity: data.lastActivity,
      needsAttention: avgScore < 60 || (data.checkpoints.length > 0 && checkpointsPassed / data.checkpoints.length < 0.5),
    })
  }

  // Save mastery data
  const store = getFromStorage<Record<string, StudentMasteryData[]>>(STORAGE_KEYS.MASTERY) || {}
  store[studentId] = masteryData
  setToStorage(STORAGE_KEYS.MASTERY, store)

  // Also update the main student profile
  try {
    const overallMastery = masteryData.length > 0
      ? Math.round(masteryData.reduce((sum, m) => sum + m.masteryScore, 0) / masteryData.length)
      : 0

    await supabase.from("profiles").upsert({
      id: studentId,
      overall_mastery: overallMastery,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  } catch (e) {
    console.warn("Could not update profile mastery:", e)
  }
}

export async function getStudentMastery(studentId: string): Promise<StudentMasteryData[]> {
  console.debug("[getStudentMastery] Starting fetch for student:", studentId)

  // Map auth user id -> student_profiles.id if necessary
  let profileId = studentId
  let createdProfile = false
  try {
    const { data: sp, error: spError } = await supabase
      .from("student_profiles")
      .select("id")
      .eq("user_id", studentId)
      .maybeSingle()

    if (spError) {
      console.debug("[getStudentMastery] Error looking up student_profile by user_id:", spError)
    }
    if (sp && (sp as any).id) {
      profileId = (sp as any).id
      console.debug("[getStudentMastery] Resolved user id to student_profile id:", profileId)
    } else {
      // Create a student_profiles row for this auth user so mastery_records can be associated
      // Use upsert to avoid 409 conflicts if the row already exists
      try {
        const now = new Date().toISOString()
        const { data: newSp, error: createErr } = await supabase
          .from("student_profiles")
          .upsert(
            { user_id: studentId, current_class: null, enrollment_date: now, overall_mastery_score: 0, engagement_index: 50 },
            { onConflict: 'user_id', ignoreDuplicates: false }
          )
          .select("id")
          .maybeSingle()

        if (createErr) {
          console.debug("[getStudentMastery] Could not upsert student_profile:", createErr)
        }
        if (newSp && (newSp as any).id) {
          profileId = (newSp as any).id
          createdProfile = true
          console.debug("[getStudentMastery] Upserted student_profile for user, id:", profileId)
        } else {
          console.debug("[getStudentMastery] Student_profile not found and could not be upserted; will use supplied id:", studentId)
        }
      } catch (e) {
        console.debug("[getStudentMastery] Exception upserting student_profile:", e)
      }
    }
  } catch (e) {
    console.debug("[getStudentMastery] Exception while resolving student_profile:", e)
  }

  // First try to fetch mastery records from Supabase using the resolved student profile id
  try {
    const { data: masteryRecords, error } = await supabase
      .from("mastery_records")
      .select(`*, learning_concepts(id, name, category)`)
      .eq("student_id", profileId)

    console.debug("[getStudentMastery] Supabase query result:", { recordCount: masteryRecords?.length, error })

    if (error) {
      console.error("[getStudentMastery] Supabase error:", error)
    }

    if (masteryRecords && masteryRecords.length > 0) {
      const masteryData: StudentMasteryData[] = masteryRecords.map((record: any) => ({
        conceptId: record.concept_id,
        conceptName: record.learning_concepts?.name || `Concept ${record.concept_id}`,
        masteryScore: record.mastery_score || 0,
        checkpointsPassed: record.checkpoints_passed || 0,
        totalCheckpoints: record.total_checkpoints || 0,
        lessonsCompleted: record.lessons_completed || 0,
        totalLessons: record.total_lessons || 1,
        lastActivity: record.last_activity || new Date().toISOString(),
        needsAttention: (record.mastery_score || 0) < 70
      }))

      console.debug("[getStudentMastery] Returning Supabase data:", masteryData)
      return masteryData
    }
    // If we created a new profile and there are no mastery rows yet, populate sample mastery for this profile
    if ((createdProfile || false) && (!masteryRecords || masteryRecords.length === 0)) {
      try {
        console.debug("[getStudentMastery] Populating sample mastery for new profile:", profileId)
        // Fetch up to 12 concept ids
        const { data: concepts } = await supabase.from("learning_concepts").select("id").limit(12)
        const rows: any[] = (concepts || []).map((c: any) => ({
          student_id: profileId,
          concept_id: c.id,
          mastery_score: Math.floor(30 + Math.random() * 50),
          checkpoints_passed: Math.floor(Math.random() * 3),
          total_checkpoints: 3,
          lessons_completed: Math.random() < 0.6 ? 1 : 0,
          total_lessons: 1,
          last_activity: new Date().toISOString()
        }))
        if (rows.length > 0) {
          const { error: insertErr } = await supabase.from("mastery_records").insert(rows)
          if (insertErr) console.debug("[getStudentMastery] Error inserting sample mastery:", insertErr)
          else console.debug("[getStudentMastery] Inserted sample mastery rows for profile:", profileId)
          // Re-query the mastery records for this profile
          const { data: newRecords } = await supabase.from("mastery_records").select(`*, learning_concepts(id, name, category)`).eq("student_id", profileId)
          if (newRecords && newRecords.length > 0) {
            const masteryData: StudentMasteryData[] = newRecords.map((record: any) => ({
              conceptId: record.concept_id,
              conceptName: record.learning_concepts?.name || `Concept ${record.concept_id}`,
              masteryScore: record.mastery_score || 0,
              checkpointsPassed: record.checkpoints_passed || 0,
              totalCheckpoints: record.total_checkpoints || 0,
              lessonsCompleted: record.lessons_completed || 0,
              totalLessons: record.total_lessons || 1,
              lastActivity: record.last_activity || new Date().toISOString(),
              needsAttention: (record.mastery_score || 0) < 70
            }))
            console.debug("[getStudentMastery] Returning newly populated Supabase data:", masteryData)
            return masteryData
          }
        }
      } catch (e) {
        console.debug("[getStudentMastery] Exception populating sample mastery:", e)
      }
    }
  } catch (e) {
    console.error("[getStudentMastery] Exception fetching from Supabase:", e)
  }

  // Fallback: try to calculate from progress and localStorage
  console.debug("[getStudentMastery] No Supabase data, updating from progress...")
  await updateStudentMastery(studentId)

  const store = getFromStorage<Record<string, StudentMasteryData[]>>(STORAGE_KEYS.MASTERY) || {}
  const localData = store[studentId] || []
  console.debug("[getStudentMastery] Returning localStorage data:", localData)
  return localData
}

// ============================================================================
// Teacher Analytics
// ============================================================================

export interface LessonAnalytics {
  lessonId: string
  lessonTitle: string
  totalStudents: number
  completedStudents: number
  averageScore: number
  averageTimeSpent: number
  checkpointAnalytics: {
    checkpointId: string
    checkpointTitle: string
    attempts: number
    passRate: number
    averageScore: number
    commonMistakes: { questionId: string; wrongAnswerCount: number }[]
  }[]
  studentsNeedingAttention: {
    studentId: string
    studentName: string
    score: number
    stuckAt: string
  }[]
}

export async function getLessonAnalytics(lessonId: string): Promise<LessonAnalytics | null> {
  const lesson = await getLesson(lessonId)
  if (!lesson) return null

  // Get all progress for this lesson from both Supabase and localStorage
  const allProgress: LessonProgress[] = []
  
  // Try Supabase first
  try {
    const { data } = await supabase
      .from("lesson_progress")
      .select("*")
      .eq("lesson_id", lessonId)
    
    if (data && data.length > 0) {
      allProgress.push(...data.map(p => {
        const attempts = p.checkpoint_attempts || []
        let overall = p.overall_score
        if ((overall === null || overall === undefined) && attempts.length > 0) {
          const total = attempts.reduce((s: number, a: any) => s + (a.percentage || 0), 0)
          overall = Math.round(total / attempts.length)
        }
        if ((overall === null || overall === undefined) && attempts.length === 0) {
          overall = p.completed_at ? 100 : 0
        }
        
        return {
          lessonId: p.lesson_id,
          lessonTitle: p.lesson_title,
          studentId: p.student_id,
          currentBlockIndex: p.current_block_index,
          completedBlocks: p.completed_blocks || [],
          checkpointAttempts: attempts,
          startedAt: p.started_at,
          lastAccessedAt: p.last_accessed_at,
          completedAt: p.completed_at,
          overallScore: overall,
          timeSpent: p.time_spent,
        }
      }))
    }
  } catch (e) {
    console.warn("Error fetching analytics from Supabase:", e)
  }
  
  // Also check localStorage
  const allProgressStore = getFromStorage<Record<string, LessonProgress[]>>(STORAGE_KEYS.PROGRESS) || {}
  const existingIds = new Set(allProgress.map(p => p.studentId))
  
  for (const studentProgress of Object.values(allProgressStore)) {
    const lessonProgress = studentProgress.find(p => p.lessonId === lessonId)
    if (lessonProgress && !existingIds.has(lessonProgress.studentId)) {
      allProgress.push(lessonProgress)
    }
  }

  if (allProgress.length === 0) {
    return {
      lessonId,
      lessonTitle: lesson.title,
      totalStudents: 0,
      completedStudents: 0,
      averageScore: 0,
      averageTimeSpent: 0,
      checkpointAnalytics: [],
      studentsNeedingAttention: [],
    }
  }

  // Calculate metrics
  const completedStudents = allProgress.filter(p => p.completedAt).length
  
  // For lessons with no checkpoints, completed lessons should count as 100%
  const hasCheckpoints = lesson.blocks.some(b => b.type === "checkpoint")
  const progressWithScores = allProgress.map(p => {
    let score = p.overallScore || 0
    // If no checkpoints and completed, should be 100%
    if (!hasCheckpoints && p.completedAt && score === 0) {
      score = 100
    }
    return { ...p, overallScore: score }
  })
  
  const averageScore = Math.round(
    progressWithScores.reduce((sum, p) => sum + (p.overallScore || 0), 0) / progressWithScores.length
  )
  const averageTimeSpent = Math.round(
    allProgress.reduce((sum, p) => sum + p.timeSpent, 0) / allProgress.length
  )

  // Checkpoint analytics
  const checkpointBlocks = lesson.blocks.filter(b => b.type === "checkpoint" && b.checkpoint)
  const checkpointAnalytics = checkpointBlocks.map(block => {
    const checkpoint = block.checkpoint!
    const attempts = allProgress.flatMap(p => 
      p.checkpointAttempts.filter(a => a.checkpointId === checkpoint.id)
    )

    const passCount = attempts.filter(a => a.percentage >= checkpoint.passingScore).length
    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
      : 0

    return {
      checkpointId: checkpoint.id,
      checkpointTitle: checkpoint.title,
      attempts: attempts.length,
      passRate: attempts.length > 0 ? Math.round((passCount / attempts.length) * 100) : 0,
      averageScore: avgScore,
      commonMistakes: [], // Could be calculated from answers
    }
  })

  // Students needing attention with real names
  const needAttentionProgress = progressWithScores
    .filter(p => (p.overallScore || 0) < 60 || (!p.completedAt && p.timeSpent > lesson.estimatedDuration * 1.5))
  
  const studentsNeedingAttention = await Promise.all(
    needAttentionProgress.map(async (p) => {
      let studentName = "Student"
      
      // Try to get student name from profiles
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", p.studentId)
          .maybeSingle()
        
        if (profile?.full_name) {
          studentName = profile.full_name
        }
      } catch (e) {
        // Fallback to localStorage
        const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            if (userData.id === p.studentId && userData.studentDetails) {
              const firstName = userData.studentDetails.firstName || userData.firstName || ""
              const lastName = userData.studentDetails.lastName || userData.lastName || ""
              const fullName = `${firstName} ${lastName}`.trim()
              if (fullName) studentName = fullName
            }
          } catch {}
        }
      }
      
      return {
        studentId: p.studentId,
        studentName,
        score: p.overallScore || 0,
        stuckAt: lesson.blocks[p.currentBlockIndex]?.type === "checkpoint" 
          ? "Checkpoint" 
          : `Block ${p.currentBlockIndex + 1}`,
      }
    })
  )

  return {
    lessonId,
    lessonTitle: lesson.title,
    totalStudents: allProgress.length,
    completedStudents,
    averageScore,
    averageTimeSpent,
    checkpointAnalytics,
    studentsNeedingAttention,
  }
}

export async function getClassLessonProgress(
  classId: string
): Promise<{ lessonId: string; title: string; avgScore: number; completionRate: number }[]> {
  const lessons = await getPublishedLessons(classId)
  const results = []

  for (const lesson of lessons) {
    const analytics = await getLessonAnalytics(lesson.id)
    if (analytics) {
      results.push({
        lessonId: lesson.id,
        title: lesson.title,
        avgScore: analytics.averageScore,
        completionRate: analytics.totalStudents > 0 
          ? Math.round((analytics.completedStudents / analytics.totalStudents) * 100)
          : 0,
      })
    }
  }

  return results
}

// ============================================================================
// Timeline Data Functions
// ============================================================================

export interface LessonTimelineEvent {
  id: string
  type: "published" | "started" | "completed" | "checkpoint_passed" | "checkpoint_failed"
  lessonId: string
  lessonTitle: string
  studentId?: string
  studentName?: string
  date: string
  score?: number
  checkpointTitle?: string
}

export interface LessonTimeline {
  lessonId: string
  lessonTitle: string
  publishedAt: string
  totalStudents: number
  completedStudents: number
  events: LessonTimelineEvent[]
  completionsByDate: { date: string; count: number }[]
}

/**
 * Get timeline data for a specific lesson
 * Shows when it was published and student completion timeline
 */
export async function getLessonTimeline(lessonId: string): Promise<LessonTimeline | null> {
  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  const allLessons = Object.values(store).flat()
  const lesson = allLessons.find(l => l.id === lessonId)
  if (!lesson) return null

  const progressStore = getFromStorage<Record<string, LessonProgress[]>>(STORAGE_KEYS.PROGRESS) || {}
  const allProgress = Object.values(progressStore).flat()
  const lessonProgress = allProgress.filter(p => p.lessonId === lessonId)

  // Build events list
  const events: LessonTimelineEvent[] = []
  
  // Add publish event
  if (lesson.published && lesson.publishedAt) {
    events.push({
      id: `pub-${lessonId}`,
      type: "published",
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      date: lesson.publishedAt,
    })
  }

  // Add student progress events
  lessonProgress.forEach(progress => {
    // Started event
    if (progress.startedAt) {
      events.push({
        id: `start-${progress.lessonId}-${progress.studentId}`,
        type: "started",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        studentId: progress.studentId,
        date: progress.startedAt,
      })
    }

    // Completed event
    if (progress.completedAt) {
      events.push({
        id: `complete-${progress.lessonId}-${progress.studentId}`,
        type: "completed",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        studentId: progress.studentId,
        date: progress.completedAt,
        score: progress.overallScore,
      })
    }

    // Checkpoint events
    progress.checkpointAttempts.forEach(attempt => {
      const checkpoint = lesson.blocks
        .find(b => b.type === "checkpoint" && b.checkpoint?.id === attempt.checkpointId)
        ?.checkpoint
      
      events.push({
        id: `cp-${attempt.checkpointId}-${progress.studentId}-${attempt.completedAt}`,
        type: attempt.percentage >= (checkpoint?.passingScore || 70) ? "checkpoint_passed" : "checkpoint_failed",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        studentId: progress.studentId,
        date: attempt.completedAt,
        score: attempt.percentage,
        checkpointTitle: checkpoint?.title || "Checkpoint",
      })
    })
  })

  // Sort events by date
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Calculate completions by date
  const completionsByDate: Record<string, number> = {}
  lessonProgress
    .filter(p => p.completedAt)
    .forEach(p => {
      const date = new Date(p.completedAt!).toISOString().split('T')[0]
      completionsByDate[date] = (completionsByDate[date] || 0) + 1
    })

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    publishedAt: lesson.publishedAt || lesson.createdAt,
    totalStudents: lessonProgress.length,
    completedStudents: lessonProgress.filter(p => p.completedAt).length,
    events,
    completionsByDate: Object.entries(completionsByDate).map(([date, count]) => ({ date, count })),
  }
}

/**
 * Get timeline for all lessons by a teacher
 * Provides an overview of recent activity
 */
export async function getTeacherLessonTimeline(teacherId: string): Promise<LessonTimelineEvent[]> {
  const store = getFromStorage<Record<string, Lesson[]>>(STORAGE_KEYS.LESSONS) || {}
  const teacherLessons = store[teacherId] || []
  
  const allEvents: LessonTimelineEvent[] = []
  
  for (const lesson of teacherLessons) {
    const timeline = await getLessonTimeline(lesson.id)
    if (timeline) {
      allEvents.push(...timeline.events)
    }
  }
  
  // Sort by date, most recent first
  allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  return allEvents.slice(0, 50) // Return last 50 events
}
