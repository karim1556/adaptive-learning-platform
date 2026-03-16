import { supabase } from "@/lib/supabaseClient"

const STORAGE_KEY = "adaptiq_module_feedback_v1"

export interface ModuleFeedbackRecord {
  id: string
  studentId: string
  lessonId: string
  conceptId?: string
  conceptName: string
  learningMode: string
  rating: number
  comment?: string
  createdAt: string
}

export interface ModuleFeedbackAggregate {
  averageRating: number
  totalResponses: number
  conceptName?: string
  lessonId?: string
  lowRatingCount: number
  commonRequests: string[]
  promptSummary: string
}

function getFromStorage(): ModuleFeedbackRecord[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ModuleFeedbackRecord[]) : []
  } catch {
    return []
  }
}

function saveToStorage(records: ModuleFeedbackRecord[]) {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-250)))
  } catch {
    // ignore storage errors
  }
}

function generateId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function extractCommonRequests(records: ModuleFeedbackRecord[]) {
  const keywords = new Map<string, number>()

  records.forEach((record) => {
    const normalized = (record.comment || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3)

    normalized.forEach((token) => {
      keywords.set(token, (keywords.get(token) || 0) + 1)
    })
  })

  return [...keywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([token]) => token)
}

export async function saveModuleFeedback(input: Omit<ModuleFeedbackRecord, "id" | "createdAt">) {
  const record: ModuleFeedbackRecord = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...input,
  }

  const stored = getFromStorage().filter(
    (existing) => !(existing.studentId === record.studentId && existing.lessonId === record.lessonId),
  )
  stored.push(record)
  saveToStorage(stored)

  try {
    await supabase.from("module_feedback").upsert(
      {
        id: record.id,
        student_id: record.studentId,
        lesson_id: record.lessonId,
        concept_id: record.conceptId || null,
        concept_name: record.conceptName,
        learning_mode: record.learningMode,
        rating: record.rating,
        comment: record.comment || null,
        created_at: record.createdAt,
      },
      { onConflict: "student_id,lesson_id" },
    )
  } catch (error) {
    console.warn("Failed to persist module feedback to Supabase:", error)
  }

  return record
}

export async function getStudentLessonFeedback(studentId: string, lessonId: string) {
  try {
    const { data } = await supabase
      .from("module_feedback")
      .select("*")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .maybeSingle()

    if (data) {
      return {
        id: data.id,
        studentId: data.student_id,
        lessonId: data.lesson_id,
        conceptId: data.concept_id || undefined,
        conceptName: data.concept_name,
        learningMode: data.learning_mode,
        rating: data.rating,
        comment: data.comment || undefined,
        createdAt: data.created_at,
      } as ModuleFeedbackRecord
    }
  } catch (error) {
    console.warn("Failed to load lesson feedback from Supabase:", error)
  }

  return getFromStorage().find((record) => record.studentId === studentId && record.lessonId === lessonId) || null
}

export async function getModuleFeedbackAggregate(filters: {
  conceptId?: string
  conceptName?: string
  lessonId?: string
}): Promise<ModuleFeedbackAggregate> {
  let records: ModuleFeedbackRecord[] = []

  try {
    let query = supabase.from("module_feedback").select("*")

    if (filters.lessonId) query = query.eq("lesson_id", filters.lessonId)
    if (filters.conceptId) query = query.eq("concept_id", filters.conceptId)
    if (filters.conceptName) query = query.ilike("concept_name", filters.conceptName)

    const { data } = await query.limit(100)
    if (data && data.length > 0) {
      records = data.map((record: any) => ({
        id: record.id,
        studentId: record.student_id,
        lessonId: record.lesson_id,
        conceptId: record.concept_id || undefined,
        conceptName: record.concept_name,
        learningMode: record.learning_mode,
        rating: Number(record.rating || 0),
        comment: record.comment || undefined,
        createdAt: record.created_at,
      }))
    }
  } catch (error) {
    console.warn("Failed to aggregate module feedback from Supabase:", error)
  }

  if (records.length === 0) {
    records = getFromStorage().filter((record) => {
      if (filters.lessonId && record.lessonId !== filters.lessonId) return false
      if (filters.conceptId && record.conceptId !== filters.conceptId) return false
      if (filters.conceptName && record.conceptName.toLowerCase() !== filters.conceptName.toLowerCase()) return false
      return true
    })
  }

  const totalResponses = records.length
  const averageRating =
    totalResponses > 0
      ? Number((records.reduce((sum, record) => sum + record.rating, 0) / totalResponses).toFixed(1))
      : 0
  const lowRatingCount = records.filter((record) => record.rating <= 3).length
  const commonRequests = extractCommonRequests(records)
  const conceptName = records[0]?.conceptName || filters.conceptName

  const promptSummary =
    totalResponses > 0
      ? `Recent module feedback for ${conceptName || "this topic"} averages ${averageRating}/5 across ${totalResponses} responses. Common student requests: ${commonRequests.length > 0 ? commonRequests.join(", ") : "more examples and clearer scaffolding"}.`
      : "There is no module feedback yet, so keep explanations clear, syllabus-aligned, and example-driven."

  return {
    averageRating,
    totalResponses,
    conceptName,
    lessonId: filters.lessonId,
    lowRatingCount,
    commonRequests,
    promptSummary,
  }
}
