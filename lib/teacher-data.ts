export interface ClassStudent {
  id: string
  name: string
  email?: string
  masteryScore: number
  engagementLevel: number
  dominantLearningStyle: string
  recentActivity: string
}

export interface ClassStudentRecord {
  id: string
  name: string
  email?: string
  dominantStyles: [string, string]
  masteryAverage: number
  engagementLevel: number
}

export interface ClassAnalytics {
  className: string
  classCode?: string
  studentCount: number
  averageMastery: number
  averageEngagement: number
  students: ClassStudent[]
}

// Persistent store key for simulated DB
const TEACHER_STORE_KEY = "adaptiq_teachers_v1"

function loadTeachersFromStore(): Record<string, TeacherDashboardData> | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(TEACHER_STORE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveTeachersToStore(data: Record<string, TeacherDashboardData>) {
  if (typeof window === "undefined") return
  localStorage.setItem(TEACHER_STORE_KEY, JSON.stringify(data))
}

function generateClassCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function createClass(teacherId: string, className: string, subject = "General", period = "A") {
  // Try persisting to Supabase first
  // We'll always write locally first (demo fallback). We'll also attempt to persist to Supabase asynchronously below.

  const store = loadTeachersFromStore() || {}
  const teacher = store[teacherId] || getTeacherData(teacherId)

  const classCode = generateClassCode()
  const newClass: ClassAnalytics = {
    className,
    classCode,
    studentCount: 0,
    averageMastery: 0,
    averageEngagement: 0,
    students: [],
  }

  teacher.classes = [...(teacher.classes || []), newClass]
  store[teacherId] = teacher
  saveTeachersToStore(store)

  // fire-and-forget attempt to persist to Supabase
  ;(async () => {
    try {
      const res = await createClassSupabase(teacherId, className, subject, period)
      if (res && res.success && res.classCode) {
        // If server code differs, we could update local record; keep local code as source for demo
      }
    } catch (e) {
      // ignore
    }
  })()

  return classCode
}

export async function addStudentToClass(classCode: string, student: ClassStudentRecord): Promise<{ success: boolean; className?: string }> {
  // Try Supabase path first
  try {
    const res = await addStudentToClassSupabase(classCode, student)
    if (res && res.success) {
      // try to fetch class name from classes table
      try {
        const { data: clsRow } = await supabase.from("classes").select("class_name").eq("class_code", classCode).maybeSingle()
        const className = clsRow?.class_name || undefined
        // update user metadata with joinedClasses
        try {
          const { data: authData } = await supabase.auth.getUser()
          const meta = (authData?.user?.user_metadata || {}) as any
          const joined = Array.isArray(meta.joinedClasses) ? meta.joinedClasses : []
          const already = joined.find((j: any) => j.classCode === classCode)
          if (!already) {
            joined.push({ classCode, className })
            await supabase.auth.updateUser({ data: { joinedClasses: joined } })
          }
        } catch (e) {
          // ignore metadata update failures
        }

        return { success: true, className }
      } catch (e) {
        return { success: true }
      }
    }
  } catch (e) {
    // continue to local fallback
  }

  // Local fallback: update teacher store and a local student meta store
  const store = loadTeachersFromStore() || {}
  const teacherIds = Object.keys(store)
  for (const tid of teacherIds) {
    const t = store[tid]
    const cls = t.classes.find((c) => c.classCode === classCode)
    if (cls) {
      const mapped: ClassStudent = {
        id: student.id,
        name: student.name,
        masteryScore: student.masteryAverage,
        engagementLevel: student.engagementLevel,
        dominantLearningStyle: (student.dominantStyles[0] || "") as string,
        recentActivity: "Added to class",
      }

      cls.students.push(mapped)
      cls.studentCount = cls.students.length
      cls.averageMastery = Math.round((cls.students.reduce((s, x) => s + x.masteryScore, 0) / cls.studentCount) * 10) / 10
      cls.averageEngagement = Math.round((cls.students.reduce((s, x) => s + x.engagementLevel, 0) / cls.studentCount) * 10) / 10

      store[tid] = t
      saveTeachersToStore(store)

      // update local student metadata store
      try {
        if (typeof window !== "undefined") {
          const STUDENT_STORE = "adaptiq_student_meta_v1"
          const raw = localStorage.getItem(STUDENT_STORE)
          const sStore = raw ? JSON.parse(raw) : {}
          const cur = sStore[student.id] || { joinedClasses: [] }
          if (!cur.joinedClasses.find((j: any) => j.classCode === classCode)) {
            cur.joinedClasses.push({ classCode, className: cls.className, teacherId: tid })
          }
          sStore[student.id] = cur
          localStorage.setItem(STUDENT_STORE, JSON.stringify(sStore))
        }
      } catch (e) {
        // ignore
      }

      return { success: true, className: cls.className }
    }
  }

  return { success: false }
}

export interface TeacherDashboardData {
  teacherId: string
  name: string
  department: string
  classes: ClassAnalytics[]
  learningStyleDistribution: Array<{
    name: string
    value: number
  }>
  engagementTrends: Array<{
    date: string
    avgEngagement: number
    avgMastery: number
  }>
  lowEngagementStudents: ClassStudent[]
  lowMasteryStudents: ClassStudent[]
}

export function getTeacherData(teacherId: string): TeacherDashboardData {
  // Prefer persisted store if available (simulates DB)
  const persisted = loadTeachersFromStore()
  if (persisted && persisted[teacherId]) {
    // sanitize persisted data: dedupe students by id/email and recompute counts/averages
    try {
      const copy = JSON.parse(JSON.stringify(persisted[teacherId])) as TeacherDashboardData
      copy.classes = (copy.classes || []).map((c) => {
        const seen = new Map<string, any>()
        for (const s of (c.students || [])) {
          const key = s.id || s.email || `${s.name}-${s.recentActivity}`
          if (!seen.has(key)) seen.set(key, s)
        }
        const students = Array.from(seen.values())
        const studentCount = students.length
        const averageMastery = studentCount ? Math.round((students.reduce((sum: number, x: any) => sum + (x.masteryScore || 0), 0) / studentCount) * 10) / 10 : 0
        const averageEngagement = studentCount ? Math.round((students.reduce((sum: number, x: any) => sum + (x.engagementLevel || 0), 0) / studentCount) * 10) / 10 : 0
        return {
          ...c,
          students,
          studentCount,
          averageMastery,
          averageEngagement,
        }
      })
      // Recompute learning style distribution across all classes from student dominant styles
      try {
        const styleKeys = ["Visual", "Auditory", "Reading", "Kinesthetic"]
        const styleCounts = new Map<string, number>()
        for (const c of copy.classes) {
          for (const s of (c.students || [])) {
            const key = (s.dominantLearningStyle || "").toString()
            if (!key) continue
            styleCounts.set(key, (styleCounts.get(key) || 0) + 1)
          }
        }
        const total = Array.from(styleCounts.values()).reduce((a, b) => a + b, 0)
        copy.learningStyleDistribution = styleKeys.map((name) => {
          const count = styleCounts.get(name) || 0
          const value = total ? Math.round((count / total) * 100) : 0
          return { name, value }
        })
      } catch (e) {
        // leave existing distribution if computation fails
      }
      return copy
    } catch (e) {
      return persisted[teacherId]
    }
  }

  // Return a fresh teacher profile with empty classes for new teachers
  // Each teacher gets their own isolated dashboard
  const newTeacherProfile: TeacherDashboardData = {
    teacherId,
    name: "Teacher",
    department: "General",
    classes: [],
    learningStyleDistribution: [
      { name: "Visual", value: 25 },
      { name: "Auditory", value: 25 },
      { name: "Reading", value: 25 },
      { name: "Kinesthetic", value: 25 },
    ],
    engagementTrends: [],
    lowEngagementStudents: [],
    lowMasteryStudents: [],
  }

  return newTeacherProfile
}

export function hasTeacherProfile(teacherId: string): boolean {
  const persisted = loadTeachersFromStore()
  if (!persisted) return false
  return !!persisted[teacherId]
}

export function saveTeacherProfile(data: TeacherDashboardData) {
  const persisted = loadTeachersFromStore() || {}
  persisted[data.teacherId] = data
  saveTeachersToStore(persisted)
}

export function createTeacherProfile(teacherId: string, name: string, department = "General") {
  const profile: TeacherDashboardData = {
    teacherId,
    name,
    department,
    classes: [],
    learningStyleDistribution: [
      { name: "Visual", value: 0 },
      { name: "Auditory", value: 0 },
      { name: "Reading", value: 0 },
      { name: "Kinesthetic", value: 0 },
    ],
    engagementTrends: [],
    lowEngagementStudents: [],
    lowMasteryStudents: [],
  }

  const store = loadTeachersFromStore() || {}
  store[teacherId] = profile
  saveTeachersToStore(store)
  return profile
}

export function deleteClass(teacherId: string, classCode: string) {
  const store = loadTeachersFromStore() || {}
  const teacher = store[teacherId]
  if (!teacher) return false
  const idx = teacher.classes.findIndex((c: any) => c.classCode === classCode)
  if (idx === -1) return false
  teacher.classes.splice(idx, 1)
  store[teacherId] = teacher
  saveTeachersToStore(store)
  return true
}

// Supabase persistence helpers (best-effort; falls back to localStorage if tables not available)
import { supabase } from "./supabaseClient"

export async function saveTeacherProfileToSupabase(firstName: string, lastName: string, department: string) {
  try {
    const { error } = await supabase.auth.updateUser({ data: { firstName, lastName, department, role: "teacher", teacherProfileComplete: true } })
    return error ? { success: false, error } : { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

export async function createClassSupabase(teacherId: string, className: string, subject = "General", period = "A") {
  try {
    const classCode = generateClassCode()
    const payload = { teacher_id: teacherId, class_name: className, class_code: classCode, subject, period }
    const { error } = await supabase.from("classes").insert([payload])
    if (error) return { success: false, error }
    return { success: true, classCode }
  } catch (e) {
    return { success: false, error: e }
  }
}

export async function addStudentToClassSupabase(classCode: string, student: ClassStudentRecord) {
  try {
    // First, ensure the student has a profile
    // If student.id exists in auth, use it; otherwise create placeholder
    const { data: existingProfile } = await supabase
      .from("student_profiles")
      .select("id, user_id")
      .eq("user_id", student.id)
      .maybeSingle()

    // If no profile exists, create one via the ensure API
    if (!existingProfile) {
      try {
        const res = await fetch('/api/teacher/ensure-student-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: [student.id] })
        })
        const json = await res.json()
        if (json.error) {
          console.error('Failed to ensure student profile:', json.error)
        }
      } catch (e) {
        console.error('Exception ensuring student profile:', e)
      }
    }

    // Now insert into class_students
    const payload = {
      class_code: classCode,
      student_id: student.id,
      name: student.name,
      mastery_average: student.masteryAverage,
      engagement_level: student.engagementLevel,
      dominant_styles: student.dominantStyles,
    }
    const { error } = await supabase.from("class_students").insert([payload])
    if (error) return { success: false, error }
    return { success: true }
  } catch (e) {
    return { success: false, error: e }
  }
}

export interface StudentProfile {
  id: string
  name: string
  masteryScore: number
  engagementLevel: number
  dominantStyle: string
  secondaryStyle: string
  varkScores: {
    visual: number
    auditory: number
    reading: number
    kinesthetic: number
  }
  masteryByTopic: Array<{
    topic: string
    score: number
  }>
  engagementHistory: Array<{
    date: string
    engagement: number
  }>
  aiChatFrequency: number
  projectsCompleted: number
}

export async function getStudentProfile(studentId: string, studentName?: string): Promise<StudentProfile | null> {
  try {
    // Use API route to fetch profile (bypasses RLS issues)
    const response = await fetch('/api/teacher/student-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName })
    })

    if (!response.ok) {
      console.error('API error fetching student profile:', response.status)
      return getDefaultProfile(studentId)
    }

    const { profile, masteryRecords, userName } = await response.json()

    if (!profile) {
      console.log('No profile found for student:', studentId)
      return getDefaultProfile(studentId, userName)
    }

    // Calculate mastery by topic
    const masteryByTopic = (masteryRecords || []).reduce((acc: any[], record: any) => {
      const existing = acc.find((item: any) => item.topic === record.topic)
      if (existing) {
        existing.scores = [...(existing.scores || []), record.mastery_level]
        existing.score = Math.round(existing.scores.reduce((a: number, b: number) => a + b, 0) / existing.scores.length)
      } else {
        acc.push({ topic: record.topic, score: record.mastery_level, scores: [record.mastery_level] })
      }
      return acc
    }, [])

    const avgMastery = masteryByTopic.length > 0
      ? Math.round(masteryByTopic.reduce((sum: number, t: any) => sum + t.score, 0) / masteryByTopic.length)
      : 0

    return buildProfileFromData(profile, studentId, userName || 'Student', masteryByTopic, avgMastery)
  } catch (err) {
    console.error('Failed to fetch student profile:', err)
    return getDefaultProfile(studentId)
  }
}

function getDefaultProfile(studentId: string, name: string = 'Student'): StudentProfile {
  return {
    id: studentId,
    name,
    masteryScore: 0,
    engagementLevel: 50,
    dominantStyle: 'Visual',
    secondaryStyle: 'Reading',
    varkScores: { visual: 25, auditory: 25, reading: 25, kinesthetic: 25 },
    masteryByTopic: [],
    engagementHistory: [
      { date: 'Jan 8', engagement: 50 },
      { date: 'Jan 9', engagement: 50 },
      { date: 'Jan 10', engagement: 50 },
      { date: 'Jan 11', engagement: 50 },
      { date: 'Jan 12', engagement: 50 },
      { date: 'Jan 13', engagement: 50 },
      { date: 'Jan 14', engagement: 50 },
    ],
    aiChatFrequency: 0,
    projectsCompleted: 0,
  }
}

function buildProfileFromData(profile: any, studentId: string, fallbackName: string, masteryByTopic: any[] = [], avgMastery: number = 0): StudentProfile {
  // VARK scores from profile
  const varkScores = {
    visual: profile.visual_score || 25,
    auditory: profile.auditory_score || 25,
    reading: profile.reading_score || 25,
    kinesthetic: profile.kinesthetic_score || 25,
  }

  // Determine dominant and secondary styles
  const varkEntries = Object.entries(varkScores).sort((a, b) => b[1] - a[1])
  const dominantStyle = varkEntries[0]?.[0] || "Visual"
  const secondaryStyle = varkEntries[1]?.[0] || "Reading"

  // Mock engagement history (could be fetched from activity logs)
  const engagementHistory = [
    { date: "Jan 8", engagement: 75 },
    { date: "Jan 9", engagement: 78 },
    { date: "Jan 10", engagement: 80 },
    { date: "Jan 11", engagement: 82 },
    { date: "Jan 12", engagement: 84 },
    { date: "Jan 13", engagement: 85 },
    { date: "Jan 14", engagement: profile.engagement_level || 75 },
  ]

  return {
    id: studentId,
    name: profile.full_name || fallbackName,
    masteryScore: avgMastery,
    engagementLevel: profile.engagement_level || 75,
    dominantStyle: dominantStyle.charAt(0).toUpperCase() + dominantStyle.slice(1),
    secondaryStyle: secondaryStyle.charAt(0).toUpperCase() + secondaryStyle.slice(1),
    varkScores,
    masteryByTopic: masteryByTopic.slice(0, 5),
    engagementHistory,
    aiChatFrequency: profile.ai_chat_frequency || 0,
    projectsCompleted: profile.projects_completed || 0,
  }
}

// Helpers for admin views
export function listAllTeachers(): TeacherDashboardData[] {
  const persisted = loadTeachersFromStore() || {}
  return Object.keys(persisted).map((k) => persisted[k])
}

export function listAllClasses(): Array<{
  teacherId: string
  teacherName?: string
  className: string
  classCode?: string
  studentCount: number
  averageMastery: number
}> {
  const out: Array<any> = []
  const persisted = loadTeachersFromStore() || {}
  for (const tid of Object.keys(persisted)) {
    const t = persisted[tid]
    const name = t.name || undefined
    for (const c of (t.classes || [])) {
      out.push({
        teacherId: tid,
        teacherName: name,
        className: c.className,
        classCode: c.classCode,
        studentCount: c.studentCount || 0,
        averageMastery: c.averageMastery || 0,
      })
    }
  }
  return out
}

export function getClassByCode(classCode: string) {
  const persisted = loadTeachersFromStore() || {}
  for (const tid of Object.keys(persisted)) {
    const t = persisted[tid]
    for (const c of (t.classes || [])) {
      if (c.classCode === classCode) {
        return { ...c, teacherId: tid, teacherName: t.name }
      }
    }
  }
  return null
}
