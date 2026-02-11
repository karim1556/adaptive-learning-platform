/**
 * AdaptIQ Data Service
 * 
 * Centralized data access layer that handles:
 * - Supabase persistence (primary)
 * - LocalStorage fallback (demo/offline)
 * - Data transformations and caching
 */

import { supabase } from "./supabaseClient"
import { calculateMasteryScore, type MasteryInputs } from "./intelligence/masteryEngine"
import { calculateEngagementIndex, type EngagementInputs } from "./intelligence/engagementEngine"
import { updateVARKProfile, type VARKProfile } from "./intelligence/varkEngine"
import { getAllStudentProgress, getPublishedLessons } from "./lesson-service"
import { ReactNode } from "react"

// Utility: normalize date strings like 'dd/mm/yyyy' to ISO string
function normalizeDateInput(d?: string | null) {
  if (!d) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d
  const m = String(d).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T00:00:00Z`
  return d
}

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "student" | "teacher" | "parent" | "admin"
  varkComplete?: boolean
  varkProfile?: VARKProfileData
  createdAt?: string
}

export interface VARKProfileData {
  visual: number
  auditory: number
  reading: number
  kinesthetic: number
  dominantStyle: string
  secondaryStyle: string
  dominantStyles: [string, string]
}

export interface StudentData {
  id: string
  userId: string
  name: string
  email: string
  overallMastery: number
  engagementIndex: number
  engagementLevel: "low" | "medium" | "high"
  varkProfile: VARKProfileData
  enrolledClasses: ClassEnrollment[]
  masteryByTopic: TopicMastery[]
  recentActivity: Activity[]
}

export interface ClassEnrollment {
  classId: string
  classCode: string
  className: string
  teacherId: string
  teacherName?: string
  subject?: string
  enrolledAt: string
}

export interface TopicMastery {
  topicId: string
  topicName: string
  score: number
  assessmentCount: number
  lastUpdated: string
  trend: "up" | "down" | "stable"
}

export interface Activity {
  id: string
  type: "content_view" | "assessment" | "ai_chat" | "project" | "login"
  description: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface Class {
  name: ReactNode
  id: string
  classCode: string
  className: string
  subject: string
  grade: string
  teacherId: string
  teacherName?: string
  studentCount: number
  averageMastery: number
  averageEngagement: number
  createdAt: string
}

export interface ClassStudent {
  id: string
  name: string
  email: string
  rollNumber?: string
  masteryScore: number
  engagementLevel: number
  engagementStatus: "low" | "medium" | "high"
  dominantStyle: string
  secondaryStyle: string
  varkScores: VARKProfile
  lastActive: string
  flags: {
    lowMastery: boolean
    lowEngagement: boolean
    needsSupport: boolean
  }
}

export interface Content {
  id: string
  title: string
  description: string
  conceptId: string
  conceptName: string
  difficulty: number // 0-100
  learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
  contentUrl?: string
  contentBody?: string
  createdBy: string
  createdAt: string
}

export interface Project {
  id: string
  title: string
  description: string
  teacherId: string
  classId?: string
  conceptId?: string
  conceptName?: string
  dueDate: string
  difficulty?: "Easy" | "Medium" | "Hard"
  learningStyles: string[]
  milestones: Milestone[]
  teams: Team[]
  createdAt: string
}

export interface Milestone {
  id: string
  title: string
  dueDate: string
  completed: boolean
}

export interface Team {
  id: string
  name: string
  members: { id: string; name: string }[]
  progress: number
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  STUDENTS: "adaptiq_students_v2",
  TEACHERS: "adaptiq_teachers_v2",
  CLASSES: "adaptiq_classes_v2",
  CONTENT: "adaptiq_content_v2",
  PROJECTS: "adaptiq_projects_v2",
  ACTIVITIES: "adaptiq_activities_v2",
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

function getEngagementStatus(score: number): "low" | "medium" | "high" {
  if (score < 40) return "low"
  if (score > 70) return "high"
  return "medium"
}

// ============================================================================
// Student Services
// ============================================================================

export async function getStudentData(userId: string): Promise<StudentData | null> {
  // Try Supabase first
  try {
    const { data: authData } = await supabase.auth.getUser()
    const meta = authData?.user?.user_metadata || {}
    // Ensure a student_profiles row exists (idempotent upsert on user_id)
    try {
      await supabase.from('student_profiles').upsert([
        { user_id: userId, updated_at: new Date().toISOString() }
      ], { onConflict: ['user_id'] })
    } catch (upsertErr) {
      // ignore upsert errors here; we'll continue to read existing data
      console.warn('ensureStudentProfile upsert failed', upsertErr)
    }
    
    // Get profile from Supabase
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()

    // Get enrolled classes
    const { data: enrollments } = await supabase
      .from("class_students")
      .select("*, classes(*)")
      .eq("student_id", userId)

    // Get mastery records
    const { data: masteryRecords } = await supabase
      .from("mastery_records")
      .select("*, learning_concepts(*)")
      .eq("student_id", userId)

    if (profile || meta.varkProfile) {
      const varkProfile = profile?.vark_profile || meta.varkProfile || {
        visual: 25,
        auditory: 25,
        reading: 25,
        kinesthetic: 25,
        dominantStyle: "",
        secondaryStyle: "",
        dominantStyles: ["", ""],
      }

      return {
        id: userId,
        userId,
        name: profile?.full_name || `${meta.firstName || ""} ${meta.lastName || ""}`.trim() || "Student",
        email: authData?.user?.email || "",
        overallMastery: profile?.overall_mastery ?? profile?.overall_mastery_score ?? 0,
        engagementIndex: profile?.engagement_index ?? profile?.engagement_index_score ?? 50,
        engagementLevel: getEngagementStatus(profile?.engagement_index || 50),
        varkProfile: {
          visual: varkProfile.visual || varkProfile.scores?.visual || 25,
          auditory: varkProfile.auditory || varkProfile.scores?.auditory || 25,
          reading: varkProfile.reading || varkProfile.scores?.reading || 25,
          kinesthetic: varkProfile.kinesthetic || varkProfile.scores?.kinesthetic || 25,
          dominantStyle: varkProfile.dominantStyle || "",
          secondaryStyle: varkProfile.secondaryStyle || "",
          dominantStyles: varkProfile.dominantStyles || [varkProfile.dominantStyle || "", varkProfile.secondaryStyle || ""],
        },
        enrolledClasses: (enrollments || []).map((e: any) => ({
          classId: e.class_id || e.classes?.id,
          classCode: e.class_code || e.classes?.class_code,
          className: e.classes?.class_name || "Unknown Class",
          teacherId: e.classes?.teacher_id || "",
          subject: e.classes?.subject,
          enrolledAt: e.created_at,
        })),
        masteryByTopic: (masteryRecords || []).map((m: any) => ({
          topicId: m.concept_id,
          topicName: m.learning_concepts?.name || "Unknown Topic",
          score: m.mastery_score || 0,
          assessmentCount: m.assessment_count || 0,
          lastUpdated: m.last_updated,
          trend: "stable" as const,
        })),
        recentActivity: profile?.recent_activity || [],
      }
    }
  } catch (e) {
    console.warn("Supabase fetch failed, falling back to localStorage:", e)
  }

  // Fallback to localStorage
  const store = getFromStorage<Record<string, StudentData>>(STORAGE_KEYS.STUDENTS)
  return store?.[userId] || null
}

export async function updateStudentVARK(userId: string, varkProfile: VARKProfileData): Promise<boolean> {
  try {
    // Update auth metadata
    await supabase.auth.updateUser({
      data: { varkProfile, varkComplete: true }
    })

    // Try to update profile table
    await supabase.from("profiles").upsert({
      id: userId,
      vark_profile: varkProfile,
      updated_at: new Date().toISOString(),
    }, { onConflict: ['id'] })

    return true
  } catch (e) {
    // Fallback to localStorage
    const store = getFromStorage<Record<string, Partial<StudentData>>>(STORAGE_KEYS.STUDENTS) || {}
    store[userId] = { ...store[userId], varkProfile }
    setToStorage(STORAGE_KEYS.STUDENTS, store)
    return true
  }
}

export async function logActivity(userId: string, activity: Omit<Activity, "id" | "timestamp">): Promise<void> {
  const newActivity: Activity = {
    id: generateId(),
    ...activity,
    timestamp: new Date().toISOString(),
  }

  try {
    await supabase.from("engagement_logs").insert({
      student_id: userId,
      activity_type: activity.type,
      activity_description: activity.description,
      timestamp: newActivity.timestamp,
    })
  } catch (e) {
    // Fallback to localStorage
    const store = getFromStorage<Record<string, Activity[]>>(STORAGE_KEYS.ACTIVITIES) || {}
    store[userId] = [...(store[userId] || []), newActivity].slice(-100)
    setToStorage(STORAGE_KEYS.ACTIVITIES, store)
  }
}

// ============================================================================
// Class Services
// ============================================================================

export async function createClass(
  teacherId: string,
  className: string,
  subject: string = "General",
  grade: string = ""
): Promise<{ success: boolean; classCode?: string; error?: string }> {
  const classCode = generateClassCode()
  const classId = generateId()
  const now = new Date().toISOString()

  const newClass: Class = {
      id: classId,
      classCode,
      className,
      subject,
      grade,
      teacherId,
      studentCount: 0,
      averageMastery: 0,
      averageEngagement: 0,
      createdAt: now,
      name: undefined
  }

  try {
    const { error } = await supabase.from("classes").insert({
      id: classId,
      class_code: classCode,
      class_name: className,
      subject,
      grade,
      teacher_id: teacherId,
      created_at: now,
    })

    if (error) throw error

    // Also save to localStorage for immediate access
    const store = getFromStorage<Record<string, Class[]>>(STORAGE_KEYS.CLASSES) || {}
    store[teacherId] = [...(store[teacherId] || []), newClass]
    setToStorage(STORAGE_KEYS.CLASSES, store)

    return { success: true, classCode }
  } catch (e: any) {
    // Fallback to localStorage only
    const store = getFromStorage<Record<string, Class[]>>(STORAGE_KEYS.CLASSES) || {}
    store[teacherId] = [...(store[teacherId] || []), newClass]
    setToStorage(STORAGE_KEYS.CLASSES, store)
    return { success: true, classCode }
  }
}

export async function getTeacherClasses(teacherId: string): Promise<Class[]> {
  // First check localStorage for immediate results
  const store = getFromStorage<Record<string, Class[]>>(STORAGE_KEYS.CLASSES) || {}
  let localClasses = store[teacherId] || []
  
  // If no classes found for this teacherId, search all stored classes
  // (handles case where class was stored with different ID format)
  if (localClasses.length === 0) {
    for (const key of Object.keys(store)) {
      const classes = store[key]
      if (classes && classes.length > 0) {
        // Check if any class has a matching teacherId or was created by this user
        const matchingClasses = classes.filter(c => c.teacherId === teacherId)
        if (matchingClasses.length > 0) {
          localClasses = [...localClasses, ...matchingClasses]
        }
      }
    }
  }
  
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*, class_students(count)")
      .eq("teacher_id", teacherId)

    if (!error && data && data.length > 0) {
      // Compute student counts separately (some environments don't return aggregated counts)
      const classIds = data.map((c: any) => c.id).filter(Boolean)
      const classCodes = data.map((c: any) => c.class_code).filter(Boolean)

      // Fetch students for these classes using both class_id and class_code to be robust
      const studentRows: any[] = []
      try {
        if (classIds.length > 0) {
          const { data: rows1, error: err1 } = await supabase
            .from("class_students")
            .select("class_id, class_code")
            .in("class_id", classIds)
          if (rows1 && rows1.length) studentRows.push(...rows1)
          if (err1) console.warn("Error fetching class_students by class_id:", err1)
        }
        if (classCodes.length > 0) {
          const { data: rows2, error: err2 } = await supabase
            .from("class_students")
            .select("class_id, class_code")
            .in("class_code", classCodes)
          if (rows2 && rows2.length) studentRows.push(...rows2)
          if (err2) console.warn("Error fetching class_students by class_code:", err2)
        }
      } catch (e) {
        console.warn("Error fetching class_students for counts:", e)
      }

      const countsMap: Record<string, number> = {}
      for (const row of studentRows) {
        // Prefer class_id when available, otherwise map via class_code
        const key = row.class_id || row.class_code
        if (!key) continue
        countsMap[key] = (countsMap[key] || 0) + 1
      }

      const supabaseClasses = data.map((c: any) => ({
        id: c.id,
        classCode: c.class_code,
        className: c.class_name,
        name: c.class_name,
        subject: c.subject || "General",
        grade: c.grade || "",
        teacherId: c.teacher_id,
        studentCount: countsMap[c.id] || countsMap[c.class_code] || 0,
        averageMastery: c.average_mastery || 0,
        averageEngagement: c.average_engagement || 0,
        createdAt: c.created_at,
      }))
      
      // Merge with localStorage classes (avoid duplicates by classCode)
      const allClasses = [...supabaseClasses]
      const existingCodes = new Set(supabaseClasses.map(c => c.classCode))
      for (const localClass of localClasses) {
        if (!existingCodes.has(localClass.classCode)) {
          allClasses.push(localClass)
        }
      }
      return allClasses
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback to localStorage only
  return localClasses
}

export async function getStudentClasses(studentId: string): Promise<Class[]> {
  try {
    const { data, error } = await supabase
      .from("class_students")
      .select("*, classes(*)")
      .eq("student_id", studentId)

    if (!error && data && data.length > 0) {
      return data.map((enrollment: any) => ({
        id: enrollment.classes?.id || enrollment.class_id,
        classCode: enrollment.classes?.class_code || "",
        className: enrollment.classes?.class_name || "Unknown Class",
        name: enrollment.classes?.class_name || "Unknown Class",
        subject: enrollment.classes?.subject || "General",
        grade: enrollment.classes?.grade || "",
        teacherId: enrollment.classes?.teacher_id || "",
        studentCount: 0,
        averageMastery: 0,
        averageEngagement: 0,
        createdAt: enrollment.classes?.created_at || new Date().toISOString(),
      }))
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback: check all localStorage classes for student's enrolled classes
  const studentData = await getStudentData(studentId)
  if (studentData?.enrolledClasses) {
    return studentData.enrolledClasses.map(ec => ({
      id: ec.classId,
      classCode: ec.classCode,
      className: ec.className,
      name: ec.className as ReactNode,
      subject: ec.subject || "General",
      grade: "",
      teacherId: ec.teacherId,
      studentCount: 0,
      averageMastery: 0,
      averageEngagement: 0,
      createdAt: ec.enrolledAt,
    }))
  }

  return []
}

export async function getClassStudents(classCode: string): Promise<ClassStudent[]> {
  // First check localStorage for immediate results
  const store = getFromStorage<Record<string, ClassStudent[]>>(STORAGE_KEYS.CLASSES + "_students") || {}
  const localStudents = store[classCode] || []
  
  // Helper to enrich student data with their profile info and real progress
  const enrichStudentData = async (students: ClassStudent[]): Promise<ClassStudent[]> => {
    const enriched: ClassStudent[] = []
    
    for (const student of students) {
      // Get student's actual lesson progress to compute real mastery/engagement
      try {
        const progressData = await getAllStudentProgress(student.id)
        const completedLessons = progressData.filter(p => p.completedAt)
        
        // Calculate real mastery from completed lessons
        if (completedLessons.length > 0) {
          const avgScore = Math.round(
            completedLessons.reduce((sum, p) => sum + (p.overallScore || 0), 0) / completedLessons.length
          )
          student.masteryScore = avgScore
        }
        
        // Calculate real engagement from lesson activity
        const allLessons = await getPublishedLessons()
        const lessonsStarted = progressData.length
        if (allLessons.length > 0) {
          const engagementScore = Math.round(
            (lessonsStarted / allLessons.length) * 50 + 
            (completedLessons.length / Math.max(1, allLessons.length)) * 50
          )
          student.engagementLevel = engagementScore
          student.engagementStatus = getEngagementStatus(engagementScore)
        }
        
        // Update flags based on real data
        student.flags = {
          lowMastery: student.masteryScore < 50,
          lowEngagement: student.engagementLevel < 40,
          needsSupport: student.masteryScore < 50 || student.engagementLevel < 40,
        }
      } catch (e) {
        console.warn("Error computing student progress:", e)
      }
      
      // If name is generic or missing, try to get from user's profile
      if (!student.name || student.name === "Student" || student.name === "Unknown") {
        try {
          // Check localStorage for user data
          const storedUser = localStorage.getItem("user")
          if (storedUser) {
            const userData = JSON.parse(storedUser)
            if (userData.id === student.id && userData.studentDetails) {
              const firstName = userData.studentDetails.firstName || userData.firstName || ""
              const lastName = userData.studentDetails.lastName || userData.lastName || ""
              const fullName = `${firstName} ${lastName}`.trim()
              if (fullName) {
                student.name = fullName
                student.rollNumber = userData.studentDetails.rollNumber || student.rollNumber
              }
            }
          }
        } catch (e) {
          console.warn("Error enriching student data:", e)
        }
      }
      enriched.push(student)
    }
    
    // Update localStorage with enriched data
    if (enriched.length > 0) {
      store[classCode] = enriched
      setToStorage(STORAGE_KEYS.CLASSES + "_students", store)
    }
    
    return enriched
  }
  
  try {
    const { data, error } = await supabase
      .from("class_students")
      .select("*")
      .eq("class_code", classCode)

    if (!error && data && data.length > 0) {
      const supabaseStudents: ClassStudent[] = data.map((s: any) => ({
        id: s.student_id,
        name: s.name || "Unknown",
        email: s.email || "",
        rollNumber: s.roll_number || undefined,
        masteryScore: s.mastery_average || 0,
        engagementLevel: s.engagement_level || 50,
        engagementStatus: getEngagementStatus(s.engagement_level || 50),
        dominantStyle: s.dominant_styles?.[0] || "",
        secondaryStyle: s.dominant_styles?.[1] || "",
        varkScores: {
          visual: 25,
          auditory: 25,
          reading: 25,
          kinesthetic: 25,
        },
        lastActive: s.last_active || s.created_at,
        flags: {
          lowMastery: (s.mastery_average || 0) < 50,
          lowEngagement: (s.engagement_level || 50) < 40,
          needsSupport: (s.mastery_average || 0) < 50 || (s.engagement_level || 50) < 40,
        },
      }))
      
      // Merge with localStorage students (avoid duplicates by id)
      const allStudents = [...supabaseStudents]
      const existingIds = new Set(supabaseStudents.map(s => s.id))
      for (const localStudent of localStudents) {
        if (!existingIds.has(localStudent.id)) {
          allStudents.push(localStudent)
        }
      }

      // Enrich data then group/merge duplicates. Grouping key preference:
      // 1) email (case-insensitive), 2) rollNumber, 3) normalized name.
      // For each group we merge fields and prefer the highest masteryScore
      // and engagementLevel while preserving rollNumber and other details.
      const enriched = await enrichStudentData(allStudents)

      // Cluster students by matching email, rollNumber, or normalized name
      const normalize = (s: string) => (s || "").trim().toLowerCase()
      const n = enriched.length
      const parent = new Array<number>(n).fill(0).map((_, i) => i)
      const find = (a: number): number => parent[a] === a ? a : (parent[a] = find(parent[a]))
      const union = (a: number, b: number) => { const pa = find(a); const pb = find(b); if (pa !== pb) parent[pb] = pa }

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = enriched[i]
          const b = enriched[j]
          const emailA = normalize(a.email)
          const emailB = normalize(b.email)
          const rollA = (a.rollNumber || "").toString().trim()
          const rollB = (b.rollNumber || "").toString().trim()
          const nameA = normalize(a.name)
          const nameB = normalize(b.name)

          // consider same if emails match and non-empty, or roll numbers match and non-empty,
          // or names match exactly (fallback)
          if ((emailA && emailA === emailB) || (rollA && rollA === rollB) || (nameA && nameA === nameB)) {
            union(i, j)
          }
        }
      }

      const buckets = new Map<number, ClassStudent[]>()
      for (let i = 0; i < n; i++) {
        const r = find(i)
        const arr = buckets.get(r) || []
        arr.push(enriched[i])
        buckets.set(r, arr)
      }

      const merged: ClassStudent[] = []
      for (const bucket of buckets.values()) {
        const base = { ...bucket[0] }
        for (let k = 1; k < bucket.length; k++) {
          const cur = bucket[k]
          if (!base.name && cur.name) base.name = cur.name
          if ((!base.email || base.email === "") && cur.email) base.email = cur.email
          if ((!base.rollNumber || base.rollNumber === "") && cur.rollNumber) base.rollNumber = cur.rollNumber
          base.masteryScore = Math.max(base.masteryScore || 0, cur.masteryScore || 0)
          base.engagementLevel = Math.max(base.engagementLevel || 0, cur.engagementLevel || 0)
          if ((!base.dominantStyle || base.dominantStyle === "") && cur.dominantStyle) base.dominantStyle = cur.dominantStyle
          if ((!base.secondaryStyle || base.secondaryStyle === "") && cur.secondaryStyle) base.secondaryStyle = cur.secondaryStyle
          const curV = cur.varkScores || { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 }
          const baseV = base.varkScores || { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 }
          base.varkScores = {
            visual: baseV.visual || curV.visual || 25,
            auditory: baseV.auditory || curV.auditory || 25,
            reading: baseV.reading || curV.reading || 25,
            kinesthetic: baseV.kinesthetic || curV.kinesthetic || 25,
          }
          if (new Date(cur.lastActive || 0) > new Date(base.lastActive || 0)) base.lastActive = cur.lastActive
        }
        base.engagementStatus = getEngagementStatus(base.engagementLevel || 50)
        base.flags = {
          lowMastery: (base.masteryScore || 0) < 50,
          lowEngagement: (base.engagementLevel || 50) < 40,
          needsSupport: (base.masteryScore || 0) < 50 || (base.engagementLevel || 50) < 40,
        }
        merged.push(base)
      }

      return merged
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback to localStorage only - enrich the data
  return enrichStudentData(localStudents)
}

export async function joinClass(
  classCode: string,
  studentId: string,
  studentName: string,
  studentEmail: string,
  varkProfile?: VARKProfileData,
  rollNumber?: string
): Promise<{ success: boolean; className?: string; error?: string }> {
  const normalizedCode = classCode.trim().toUpperCase()

  try {
    // Find the class
    const { data: classData } = await supabase
      .from("classes")
      .select("*")
      .eq("class_code", normalizedCode)
      .maybeSingle()

    if (!classData) {
      // Try localStorage
      const store = getFromStorage<Record<string, Class[]>>(STORAGE_KEYS.CLASSES) || {}
      const allClasses = Object.values(store).flat()
      const foundClass = allClasses.find(c => c.classCode === normalizedCode)
      
      if (!foundClass) {
        return { success: false, error: "Class not found" }
      }

      // Add to localStorage class
      const studentStore = getFromStorage<Record<string, ClassStudent[]>>(STORAGE_KEYS.CLASSES + "_students") || {}
      const existing = studentStore[normalizedCode] || []
      
      if (!existing.find(s => s.id === studentId)) {
        existing.push({
          id: studentId,
          name: studentName,
          email: studentEmail,
          rollNumber: rollNumber || "",
          masteryScore: 0,
          engagementLevel: 50,
          engagementStatus: "medium",
          dominantStyle: varkProfile?.dominantStyle || "",
          secondaryStyle: varkProfile?.secondaryStyle || "",
          varkScores: varkProfile || { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 },
          lastActive: new Date().toISOString(),
          flags: { lowMastery: false, lowEngagement: false, needsSupport: false },
        })
        studentStore[normalizedCode] = existing
        setToStorage(STORAGE_KEYS.CLASSES + "_students", studentStore)
      }

      // Update student's enrolled classes
      await supabase.auth.updateUser({
        data: {
          joinedClasses: [{ id: foundClass.id, classCode: normalizedCode, className: foundClass.className, subject: foundClass.subject }]
        }
      })

      return { success: true, className: foundClass.className }
    }

    // Add student to Supabase class
    const { error: insertError } = await supabase.from("class_students").insert({
      class_code: normalizedCode,
      class_id: classData.id,
      student_id: studentId,
      name: studentName,
      email: studentEmail,
      dominant_styles: varkProfile?.dominantStyles || [],
      mastery_average: 0,
      engagement_level: 50,
    })

    if (insertError && !insertError.message.includes("duplicate")) {
      throw insertError
    }

    // Update student's enrolled classes in auth metadata
    const { data: authData } = await supabase.auth.getUser()
    const existingClasses = (authData?.user?.user_metadata?.joinedClasses || []) as any[]
    if (!existingClasses.find((c: any) => c.classCode === normalizedCode)) {
      await supabase.auth.updateUser({
        data: {
          joinedClasses: [...existingClasses, { 
            id: classData.id, 
            classCode: normalizedCode, 
            className: classData.class_name,
            subject: classData.subject 
          }]
        }
      })
    }

    return { success: true, className: classData.class_name }
  } catch (e: any) {
    console.error("Error joining class:", e)
    return { success: false, error: e.message || "Failed to join class" }
  }
}

// ============================================================================
// Content Services
// ============================================================================

export async function createContent(
  teacherId: string,
  content: Omit<Content, "id" | "createdBy" | "createdAt">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = generateId()
  const now = new Date().toISOString()

  // Normalize date inputs like 'dd/mm/yyyy' to ISO where possible
  const normalizeDateInput = (d?: string) => {
    if (!d) return null
    // Already ISO-ish
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d
    // dd/mm/yyyy -> YYYY-MM-DD
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}T00:00:00Z`
    return d
  }
  const newContent: Content = {
    id,
    ...content,
    createdBy: teacherId,
    createdAt: now,
  }

  try {
    const { error } = await supabase.from("learning_content").insert({
      id,
      title: content.title,
      description: content.description,
      concept_id: content.conceptId,
      difficulty_level: content.difficulty < 33 ? "beginner" : content.difficulty < 66 ? "intermediate" : "advanced",
      learning_mode: content.learningMode,
      content_url: content.contentUrl,
      created_by: teacherId,
      created_at: now,
    })

    if (error) throw error
  } catch (e) {
    // Fallback to localStorage
    const store = getFromStorage<Content[]>(STORAGE_KEYS.CONTENT) || []
    store.push(newContent)
    setToStorage(STORAGE_KEYS.CONTENT, store)
  }

  return { success: true, id }
}

export async function getContent(filters?: {
  conceptId?: string
  learningMode?: string
  difficulty?: string
}): Promise<Content[]> {
  try {
    let query = supabase.from("learning_content").select("*, learning_concepts(name)")

    if (filters?.conceptId) {
      query = query.eq("concept_id", filters.conceptId)
    }
    if (filters?.learningMode) {
      query = query.eq("learning_mode", filters.learningMode)
    }

    const { data } = await query

    if (data) {
      return data.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description || "",
        conceptId: c.concept_id,
        conceptName: c.learning_concepts?.name || "",
        difficulty: c.difficulty_level === "beginner" ? 25 : c.difficulty_level === "intermediate" ? 50 : 75,
        learningMode: c.learning_mode || "reading",
        contentUrl: c.content_url,
        contentBody: c.content_body,
        createdBy: c.created_by,
        createdAt: c.created_at,
      }))
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback to localStorage
  let content = getFromStorage<Content[]>(STORAGE_KEYS.CONTENT) || []
  
  if (filters?.conceptId) {
    content = content.filter(c => c.conceptId === filters.conceptId)
  }
  if (filters?.learningMode) {
    content = content.filter(c => c.learningMode === filters.learningMode)
  }

  return content
}

export async function getAdaptiveContent(
  studentId: string,
  varkProfile: VARKProfileData,
  limit: number = 10
): Promise<Content[]> {
  const allContent = await getContent()
  const dominantStyles = [varkProfile.dominantStyle?.toLowerCase(), varkProfile.secondaryStyle?.toLowerCase()].filter(Boolean)

  // Filter and rank content for the student's top 2 styles
  const ranked = allContent
    .filter(c => dominantStyles.includes(c.learningMode))
    .sort((a, b) => {
      const aStyleIndex = dominantStyles.indexOf(a.learningMode)
      const bStyleIndex = dominantStyles.indexOf(b.learningMode)
      return aStyleIndex - bStyleIndex
    })

  // If not enough content in top 2 styles, include others
  if (ranked.length < limit) {
    const others = allContent.filter(c => !dominantStyles.includes(c.learningMode))
    ranked.push(...others.slice(0, limit - ranked.length))
  }

  return ranked.slice(0, limit)
}

// ============================================================================
// Project Services
// ============================================================================

export async function createProject(
  teacherId: string,
  project: Omit<Project, "id" | "teacherId" | "createdAt" | "teams"> & { milestones?: { title: string; dueDate: string }[] }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const id = generateId()
  const now = new Date().toISOString()

  // Validate concept_id - only include if it's a valid UUID format
  const isValidUUID = (str: string | undefined) => {
    if (!str) return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  const insertData = {
    id,
    title: project.title,
    description: project.description || "",
    teacher_id: teacherId,
    class_id: project.classId || null,
    concept_id: isValidUUID(project.conceptId) ? project.conceptId : null,
    due_date: project.dueDate || now,
    difficulty: project.difficulty || null,
    learning_styles: project.learningStyles || [],
    created_at: now,
  }

  console.log("Creating project in Supabase:", insertData)

  const { data, error } = await supabase.from("projects").insert(insertData).select()

  if (error) {
    console.error("Supabase project insert FAILED:", error)
    console.error("Error details:", JSON.stringify(error, null, 2))
    console.error("Error message:", error.message)
    console.error("Error code:", error.code)
    console.error("Error hint:", error.hint)
    console.error("Error details:", error.details)
    return { success: false, error: error.message || "Unknown database error" }
  }

  // Insert milestones if provided
  if (project.milestones && project.milestones.length > 0) {
    const milestoneInserts = project.milestones.map(m => ({
      id: generateId(),
      project_id: id,
      milestone_name: m.title,
      due_date: normalizeDateInput(m.dueDate) || now,
      created_at: now,
    }))
    
    const { error: milestoneError } = await supabase.from("project_milestones").insert(milestoneInserts)
    if (milestoneError) {
      console.error("Failed to insert milestones:", milestoneError)
    }
  }

  console.log("Project created successfully in Supabase:", data)
  return { success: true, id }
}

export async function getProjects(teacherId: string): Promise<Project[]> {
  console.log("Fetching projects for teacher:", teacherId)
  
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_milestones(*), project_teams(*, project_team_members(*))")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Supabase projects fetch error:", error)
    return []
  }

  console.log("Projects from Supabase:", data)

  if (data && data.length > 0) {
    return data.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description || "",
      teacherId: p.teacher_id,
      classId: p.class_id,
      conceptId: p.concept_id,
      dueDate: p.due_date,
      difficulty: p.difficulty,
      learningStyles: p.learning_styles || [],
      milestones: (p.project_milestones || []).map((m: any) => ({
        id: m.id,
        title: m.milestone_name,
        dueDate: m.due_date,
        completed: false,
      })),
      teams: (p.project_teams || []).map((t: any) => ({
        id: t.id,
        name: t.team_name,
        members: (t.project_team_members || []).map((m: any) => ({
          id: m.student_id,
          name: m.name || "Student",
        })),
        progress: 0,
      })),
      createdAt: p.created_at,
    }))
  }

  return []
}

export async function getStudentProjects(studentId: string, joinedClassIds: string[]): Promise<Project[]> {
  // Get projects for classes the student has joined
  if (joinedClassIds.length === 0) return []
  
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*, project_milestones(*), project_teams(*, project_team_members(*))")
      .in("class_id", joinedClassIds)
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Supabase projects fetch error:", error)
      throw error
    }

    if (data && data.length > 0) {
      return data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description || "",
        teacherId: p.teacher_id,
        classId: p.class_id,
        conceptId: p.concept_id,
        dueDate: p.due_date,
        difficulty: p.difficulty,
        learningStyles: p.learning_styles || [],
        milestones: (p.project_milestones || []).map((m: any) => ({
          id: m.id,
          title: m.milestone_name,
          dueDate: m.due_date,
          completed: false,
        })),
        teams: (p.project_teams || []).map((t: any) => ({
          id: t.id,
          name: t.team_name,
          members: (t.project_team_members || []).map((m: any) => ({
            id: m.student_id,
            name: m.name || "Student",
          })),
          progress: 0,
        })),
        createdAt: p.created_at,
      }))
    }
  } catch (e) {
    console.warn("Supabase fetch failed, falling back to localStorage:", e)
  }

  // Fallback to localStorage
  const store = getFromStorage<Project[]>(STORAGE_KEYS.PROJECTS) || []
  return store.filter(p => p.classId && joinedClassIds.includes(p.classId))
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "*, project_milestones(id, milestone_name, due_date, created_at), project_teams(*, project_team_members(*))"
      )
      .eq("id", projectId)
      .single()

    if (error) throw error

    if (data) {
      try {
        console.log("getProjectById: project_milestones:", data.project_milestones)
      } catch (e) {}
      return {
        id: data.id,
        title: data.title,
        description: data.description || "",
        teacherId: data.teacher_id,
        classId: data.class_id,
        conceptId: data.concept_id,
        dueDate: data.due_date,
        difficulty: data.difficulty,
        learningStyles: data.learning_styles || [],
        milestones: (data.project_milestones || []).map((m: any) => ({
          id: m.id,
          title: m.milestone_name,
          dueDate: m.due_date,
          completed: false,
        })),
        teams: (data.project_teams || []).map((t: any) => ({
          id: t.id,
          name: t.team_name,
          members: (t.project_team_members || []).map((m: any) => ({
            id: m.student_id,
            name: m.name || "Student",
          })),
          progress: 0,
        })),
        createdAt: data.created_at,
      }
    }
  } catch (e) {
    console.warn("Supabase fetch failed:", e)
  }

  // Fallback to localStorage
  const store = getFromStorage<Project[]>(STORAGE_KEYS.PROJECTS) || []
  return store.find(p => p.id === projectId) || null
}

export async function updateProject(
  projectId: string,
  updates: Partial<Omit<Project, "id" | "teacherId" | "createdAt" | "teams">> & { milestones?: { id?: string; title: string; dueDate: string }[] }
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    
    const { error } = await supabase
      .from("projects")
      .update({
        title: updates.title,
        description: updates.description,
        class_id: updates.classId || null,
        concept_id: updates.conceptId || null,
        due_date: updates.dueDate,
        difficulty: updates.difficulty || null,
        learning_styles: updates.learningStyles || [],
        updated_at: now,
      })
      .eq("id", projectId)

    if (error) throw error
    
    // Handle milestone updates if provided
    if (updates.milestones !== undefined) {
      const normalizeDateInput = (d?: string) => {
        if (!d) return null
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d
        const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (m) return `${m[3]}-${m[2]}-${m[1]}T00:00:00Z`
        return d
      }
      // Delete all existing milestones for this project
      await supabase.from("project_milestones").delete().eq("project_id", projectId)
      
      // Insert new milestones
      if (updates.milestones.length > 0) {
        const milestoneInserts = updates.milestones.map(m => ({
          id: m.id || generateId(),
          project_id: projectId,
          milestone_name: m.title,
          due_date: normalizeDateInput(m.dueDate) || now,
          created_at: now,
        }))
        
        const { error: milestoneError } = await supabase.from("project_milestones").insert(milestoneInserts)
        if (milestoneError) {
          console.error("Failed to update milestones:", milestoneError)
        }
      }
    }
    
    return { success: true }
  } catch (e) {
    console.warn("Supabase update failed:", e)
    
    // Fallback to localStorage
    const store = getFromStorage<Project[]>(STORAGE_KEYS.PROJECTS) || []
    const index = store.findIndex(p => p.id === projectId)
    if (index !== -1) {
      store[index] = { ...store[index], ...updates }
      setToStorage(STORAGE_KEYS.PROJECTS, store)
      return { success: true }
    }
    return { success: false, error: "Project not found" }
  }
}

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)

    if (error) throw error
    return { success: true }
  } catch (e) {
    console.warn("Supabase delete failed:", e)
    
    // Fallback to localStorage
    const store = getFromStorage<Project[]>(STORAGE_KEYS.PROJECTS) || []
    const filtered = store.filter(p => p.id !== projectId)
    if (filtered.length < store.length) {
      setToStorage(STORAGE_KEYS.PROJECTS, filtered)
      return { success: true }
    }
    return { success: false, error: "Project not found" }
  }
}

// ============================================================================
// Teacher Dashboard Services
// ============================================================================

export interface TeacherDashboard {
  teacherId: string
  name: string
  department: string
  classes: Class[]
  totalStudents: number
  averageMastery: number
  averageEngagement: number
  learningStyleDistribution: { name: string; value: number }[]
  engagementTrends: { date: string; avgEngagement: number; avgMastery: number }[]
  alerts: {
    lowMasteryStudents: ClassStudent[]
    lowEngagementStudents: ClassStudent[]
  }
}

export async function getTeacherDashboard(teacherId: string): Promise<TeacherDashboard> {
  const classes = await getTeacherClasses(teacherId)
  
  let allStudents: ClassStudent[] = []
  // Update each class with actual student count and real mastery/engagement averages
  for (const cls of classes) {
    const students = await getClassStudents(cls.classCode)
    cls.studentCount = students.length // Update the student count
    
    // Recalculate class averages from enriched student data
    if (students.length > 0) {
      cls.averageMastery = Math.round(
        students.reduce((sum, s) => sum + s.masteryScore, 0) / students.length
      )
      cls.averageEngagement = Math.round(
        students.reduce((sum, s) => sum + s.engagementLevel, 0) / students.length
      )
    }
    
    allStudents = [...allStudents, ...students]
  }

  // Dedupe students by email when available (case-insensitive), preferring
  // the record with higher masteryScore. Fallback to id when no email.
  const emailMap = new Map<string, ClassStudent>()
  const idMap = new Map<string, ClassStudent>()
  for (const s of allStudents) {
    const emailKey = (s.email || "").toLowerCase()
    if (emailKey) {
      const existing = emailMap.get(emailKey)
      if (!existing || (s.masteryScore || 0) > (existing.masteryScore || 0)) {
        emailMap.set(emailKey, s)
      }
    } else if (s.id) {
      const existing = idMap.get(s.id)
      if (!existing || (s.masteryScore || 0) > (existing.masteryScore || 0)) {
        idMap.set(s.id, s)
      }
    }
  }
  const uniqueStudents = [...Array.from(idMap.values()), ...Array.from(emailMap.values())]

  // Calculate learning style distribution
  const styleCounts = { Visual: 0, Auditory: 0, Reading: 0, Kinesthetic: 0 }
  const normalizeStyle = (raw?: string) => {
    if (!raw) return undefined
    const r = raw.trim().toLowerCase()
    if (r.startsWith('v')) return 'Visual'
    if (r.startsWith('a')) return 'Auditory'
    if (r.startsWith('r')) return 'Reading'
    if (r.startsWith('k') || r.startsWith('kine')) return 'Kinesthetic'
    return undefined
  }

  uniqueStudents.forEach(s => {
    let resolved: string | undefined = normalizeStyle(s.dominantStyle)
    // fallback: infer from vark scores if available
    if (!resolved && s.varkScores) {
      const scores = s.varkScores
      const entries: [string, number][] = [
        ['Visual', scores.visual || 0],
        ['Auditory', scores.auditory || 0],
        ['Reading', scores.reading || 0],
        ['Kinesthetic', scores.kinesthetic || 0],
      ]
      entries.sort((a, b) => b[1] - a[1])
      if (entries[0] && entries[0][1] > 0) resolved = entries[0][0]
    }
    if (resolved && (resolved in styleCounts)) {
      ;(styleCounts as any)[resolved]++
    }
  })
  const total = uniqueStudents.length || 1
  const distribution = Object.entries(styleCounts).map(([name, count]) => ({
    name,
    value: Math.round((count / total) * 100),
  }))

  // Calculate averages from enriched student data
  const avgMastery = uniqueStudents.length
    ? Math.round(uniqueStudents.reduce((s, st) => s + st.masteryScore, 0) / uniqueStudents.length)
    : 0
  const avgEngagement = uniqueStudents.length
    ? Math.round(uniqueStudents.reduce((s, st) => s + st.engagementLevel, 0) / uniqueStudents.length)
    : 0

  // Get user metadata for name/department
  let name = "Teacher"
  let department = ""
  try {
    const { data } = await supabase.auth.getUser()
    const meta = data?.user?.user_metadata || {}
    name = `${meta.firstName || ""} ${meta.lastName || ""}`.trim() || "Teacher"
    department = meta.department || ""
  } catch {}

  return {
    teacherId,
    name,
    department,
    classes,
    totalStudents: uniqueStudents.length,
    averageMastery: avgMastery,
    averageEngagement: avgEngagement,
    learningStyleDistribution: distribution,
    engagementTrends: generateTrendData(avgEngagement, avgMastery),
    alerts: {
      lowMasteryStudents: uniqueStudents.filter(s => s.flags.lowMastery),
      lowEngagementStudents: uniqueStudents.filter(s => s.flags.lowEngagement),
    },
  }
}

function generateTrendData(engagement: number, mastery: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return days.map((date, i) => ({
    date,
    avgEngagement: Math.max(0, Math.min(100, engagement + (Math.random() - 0.5) * 10)),
    avgMastery: Math.max(0, Math.min(100, mastery + (Math.random() - 0.5) * 8)),
  }))
}

// ============================================================================
// Parent Services
// ============================================================================

export interface ChildOverview {
  id: string
  name: string
  overallMastery: number
  engagementLevel: number
  engagementStatus: "low" | "medium" | "high"
  varkProfile: VARKProfileData
  recentActivity: Activity[]
  recommendations: string[]
}

export async function getChildrenOverview(parentId: string): Promise<ChildOverview[]> {
  try {
    // Try to get linked children from parent_student table
    const { data: links } = await supabase
      .from("parent_student")
      .select("student_id")
      .eq("parent_id", parentId)

    if (links && links.length > 0) {
      const children: ChildOverview[] = []
      for (const link of links) {
        const student = await getStudentData(link.student_id)
        if (student) {
          children.push({
            id: student.id,
            name: student.name,
            overallMastery: student.overallMastery,
            engagementLevel: student.engagementIndex,
            engagementStatus: student.engagementLevel,
            varkProfile: student.varkProfile,
            recentActivity: student.recentActivity.slice(0, 5),
            recommendations: generateParentRecommendations(student),
          })
        }
      }
      return children
    }
  } catch (e) {
    console.warn("Error fetching children:", e)
  }

  // If no links found using the provided id, it's possible the caller
  // passed the auth `users.id` instead of `parent_profiles.id`. Try to
  // resolve a `parent_profiles` row for the given id and re-query.
  try {
    const { data: parentRow } = await supabase.from("parent_profiles").select("id, user_id").eq("user_id", parentId).maybeSingle()
    const resolvedParentId = parentRow?.id
    if (resolvedParentId) {
      const { data: links2 } = await supabase
        .from("parent_student")
        .select("student_id")
        .eq("parent_id", resolvedParentId)

      if (links2 && links2.length > 0) {
        const children: ChildOverview[] = []
        for (const link of links2) {
          const student = await getStudentData(link.student_id)
          if (student) {
            children.push({
              id: student.id,
              name: student.name,
              overallMastery: student.overallMastery,
              engagementLevel: student.engagementIndex,
              engagementStatus: student.engagementLevel,
              varkProfile: student.varkProfile,
              recentActivity: student.recentActivity.slice(0, 5),
              recommendations: generateParentRecommendations(student),
            })
          }
        }
        return children
      }
    }
  } catch (e) {
    console.warn("Error resolving parent_profiles for children overview:", e)
  }

  // Fallback to auth metadata
  try {
    const { data } = await supabase.auth.getUser()
    const linkedChildren = data?.user?.user_metadata?.linkedChildren || []
    const children: ChildOverview[] = []
    
    for (const childId of linkedChildren) {
      const student = await getStudentData(childId)
      if (student) {
        children.push({
          id: student.id,
          name: student.name,
          overallMastery: student.overallMastery,
          engagementLevel: student.engagementIndex,
          engagementStatus: student.engagementLevel,
          varkProfile: student.varkProfile,
          recentActivity: student.recentActivity.slice(0, 5),
          recommendations: generateParentRecommendations(student),
        })
      }
    }
    return children
  } catch {
    return []
  }
}

function generateParentRecommendations(student: StudentData): string[] {
  const recommendations: string[] = []
  
  if (student.engagementIndex < 40) {
    recommendations.push("Encourage regular study sessions - even 15 minutes daily helps!")
  }
  
  if (student.overallMastery < 50) {
    recommendations.push("Consider reviewing weak topics together or arranging additional practice.")
  }
  
  const dominantStyle = student.varkProfile.dominantStyle?.toLowerCase()
  if (dominantStyle === "visual") {
    recommendations.push("Use diagrams, charts, and videos when helping with homework.")
  } else if (dominantStyle === "auditory") {
    recommendations.push("Discuss concepts out loud and consider educational podcasts.")
  } else if (dominantStyle === "reading") {
    recommendations.push("Provide books and written materials for extra learning.")
  } else if (dominantStyle === "kinesthetic") {
    recommendations.push("Use hands-on activities and real-world examples when studying.")
  }
  
  if (student.engagementIndex > 70 && student.overallMastery > 70) {
    recommendations.push("Great progress! Consider challenging activities or advanced topics.")
  }
  
  return recommendations.slice(0, 3)
}

// Update student info in all their enrolled classes
export async function updateStudentInClasses(
  studentId: string,
  name: string,
  rollNumber?: string
): Promise<void> {
  console.log("updateStudentInClasses called:", { studentId, name, rollNumber })
  
  try {
    // Update in localStorage - check all classes
    const store = getFromStorage<Record<string, ClassStudent[]>>(STORAGE_KEYS.CLASSES + "_students") || {}
    console.log("Current class students store keys:", Object.keys(store))
    
    let updated = false
    for (const classCode of Object.keys(store)) {
      const students = store[classCode]
      console.log(`Checking class ${classCode}, students:`, students.map(s => ({ id: s.id, name: s.name })))
      
      // Try to find by ID first
      let studentIndex = students.findIndex(s => s.id === studentId)
      
      // If not found by ID, try to find by old name "Student" (fallback for when IDs don't match)
      if (studentIndex === -1) {
        studentIndex = students.findIndex(s => s.name === "Student" || s.name === "Unknown")
        if (studentIndex !== -1) {
          console.log(`Found student with generic name at index ${studentIndex}, updating ID to ${studentId}`)
          students[studentIndex].id = studentId // Update the ID too
        }
      }
      
      if (studentIndex !== -1) {
        console.log(`Found student at index ${studentIndex}, updating name from "${students[studentIndex].name}" to "${name}"`)
        students[studentIndex].name = name
        if (rollNumber) {
          students[studentIndex].rollNumber = rollNumber
        }
        updated = true
      }
    }
    
    if (updated) {
      setToStorage(STORAGE_KEYS.CLASSES + "_students", store)
      console.log("Successfully updated store")
    } else {
      console.log("Student not found in any class")
    }
    
    // Update in Supabase - try updating by `student_id` first, then fall back to `id`
    try {
      const { error: updateErr } = await supabase
        .from("class_students")
        .update({
          name: name,
          roll_number: rollNumber || null,
        })
        .eq("student_id", studentId)

      if (updateErr) {
        console.warn("Update by student_id failed, trying by id:", updateErr)
        const { error: updateErr2 } = await supabase
          .from("class_students")
          .update({
            name: name,
            roll_number: rollNumber || null,
          })
          .eq("id", studentId)

        if (updateErr2) {
          console.warn("Update by id also failed:", updateErr2)
        } else {
          console.log("Updated class_students row by id successfully")
        }
      } else {
        console.log("Updated class_students row by student_id successfully")
      }
    } catch (e) {
      console.warn("Error updating class_students in Supabase:", e)
    }
      
  } catch (e) {
    console.warn("Error updating student in classes:", e)
  }
}

export async function submitProjectWork(
  projectId: string,
  studentId: string,
  submission: { content: string; fileUrl?: string }
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString()

  const payload = {
    id: generateId(),
    project_id: projectId,
    student_id: studentId,
    content: submission.content,
    file_url: submission.fileUrl || null,
    submitted_at: now,
    updated_at: now,
    // On resubmit, reset status to pending and clear previous teacher feedback/review metadata
    status: 'pending',
    teacher_feedback: null,
    reviewed_at: null,
    reviewed_by: null,
  }

  const { error } = await supabase.from("student_project_submissions").upsert(payload, { onConflict: "project_id,student_id" })

  // Use upsert on project_id,student_id so resubmissions overwrite the existing row
  // instead of inserting duplicate rows.
  // Note: Supabase/PostgREST accepts an `onConflict` option for upsert.

  if (error) {
    console.error("Failed to submit project work:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getStudentSubmission(projectId: string, studentId: string): Promise<any> {
  const { data, error } = await supabase
    .from("student_project_submissions")
    .select("*")
    .eq("project_id", projectId)
    .eq("student_id", studentId)
    .single()

  if (error) {
    // PGRST116 means "no rows found" which is normal when student hasn't submitted yet
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching submission:", error.message, error.code)
    return null
  }

  return data
}

export async function getProjectSubmissions(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("student_project_submissions")
    .select("*")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false })

  if (error) {
    console.error("Error fetching project submissions:", error.message, error.code)
    return []
  }

  return data || []
}

/**
 * Get milestone completion records for a project for a given student.
 * Returns a map of milestoneId -> { completed: boolean, completedAt?: string }
 */
export async function getMilestoneCompletions(projectId: string, studentId: string): Promise<Record<string, { completed: boolean; completedAt?: string; notes?: string }>> {
  try {
    const { data, error } = await supabase
      .from("project_milestone_completions")
      .select("*")
      .eq("project_id", projectId)
      .eq("student_id", studentId)

    if (error) {
      console.error("Error fetching milestone completions:", error)
      return {}
    }

    const map: Record<string, { completed: boolean; completedAt?: string; notes?: string }> = {}
    if (Array.isArray(data)) {
      data.forEach((r: any) => {
        map[r.milestone_id] = { 
          completed: !!r.completed, 
          completedAt: r.completed_at || undefined,
          notes: r.notes || undefined
        }
      })
    }
    return map
  } catch (e) {
    console.error("Exception fetching milestone completions:", e)
    return {}
  }
}

/**
 * Toggle (set) milestone completion for a student.
 * Upserts a row in `project_milestone_completions` with completed boolean, timestamp, and optional notes.
 */
export async function setMilestoneCompletion(
  projectId: string,
  milestoneId: string,
  studentId: string,
  completed: boolean,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    const payload: any = {
      project_id: projectId,
      milestone_id: milestoneId,
      student_id: studentId,
      completed: completed,
      completed_at: completed ? now : null,
      updated_at: now,
    }
    
    if (completed && notes) {
      payload.notes = notes
    }

    const { error } = await supabase.from("project_milestone_completions").upsert(payload, { onConflict: "project_id,milestone_id,student_id" })
    if (error) {
      console.error("Failed to upsert milestone completion:", error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e: any) {
    console.error("Exception setting milestone completion:", e)
    return { success: false, error: String(e) }
  }
}

export default {
  getStudentData,
  updateStudentVARK,
  logActivity,
  createClass,
  getTeacherClasses,
  getStudentClasses,
  getClassStudents,
  joinClass,
  createContent,
  getContent,
  getAdaptiveContent,
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getStudentProjects,
  submitProjectWork,
  getStudentSubmission,
  getProjectSubmissions,
  getTeacherDashboard,
  getChildrenOverview,
  updateStudentInClasses,
}
