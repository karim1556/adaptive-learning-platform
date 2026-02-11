export interface StudentDashboardData {
  studentId: string
  name: string
  currentClass: string
  classes?: Array<{
    classCode: string
    className: string
    teacherId?: string
  }>
  overallMasteryScore: number
  engagementIndex: number
  vark: {
    visual: number
    auditory: number
    reading: number
    kinesthetic: number
    dominantStyle: string
    secondaryStyle: string
  }
  masteryByTopic: Array<{
    topicId: string
    topicName: string
    score: number
    assessmentCount: number
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: Date
  }>
}

// Mock data for student dashboard - generates unique data per student
export function getStudentData(studentId: string): StudentDashboardData {
  // Generate deterministic but unique data based on studentId
  const hash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const seed = hash % 100
  
  // Generate user-specific scores
  const masteryScore = 45 + (seed % 40) // 45-84
  const engagement = 50 + (seed % 35) // 50-84
  
  // Deterministic VARK based on user ID
  const varkTotal = 100
  const v = 15 + (hash % 25)
  const a = 15 + ((hash * 2) % 25)
  const r = 15 + ((hash * 3) % 25)
  const k = varkTotal - v - a - r > 0 ? varkTotal - v - a - r : 25
  
  const varkScores = { visual: v, auditory: a, reading: r, kinesthetic: k }
  const sorted = Object.entries(varkScores).sort(([,a], [,b]) => b - a)
  
  return {
    studentId,
    name: "Student", // Will be overridden by actual user name
    currentClass: "",
    overallMasteryScore: masteryScore,
    engagementIndex: engagement,
    vark: {
      ...varkScores,
      dominantStyle: sorted[0][0].charAt(0).toUpperCase() + sorted[0][0].slice(1),
      secondaryStyle: sorted[1][0].charAt(0).toUpperCase() + sorted[1][0].slice(1),
    },
    masteryByTopic: [
      {
        topicId: `topic-${studentId.slice(0, 8)}-1`,
        topicName: "Core Concepts",
        score: 50 + (seed % 35),
        assessmentCount: 2 + (seed % 5),
      },
      {
        topicId: `topic-${studentId.slice(0, 8)}-2`,
        topicName: "Applied Learning",
        score: 45 + ((seed * 2) % 40),
        assessmentCount: 1 + (seed % 3),
      },
      {
        topicId: `topic-${studentId.slice(0, 8)}-3`,
        topicName: "Advanced Topics",
        score: 40 + ((seed * 3) % 35),
        assessmentCount: seed % 4,
      },
    ],
    recentActivity: [],
  }
}

// Helper to list students from the local student meta store (used by admin views)
export function listAllStudents(): Array<{
  id: string
  joinedClasses?: Array<any>
}> {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("adaptiq_student_meta_v1")
    if (!raw) return []
    const sStore = JSON.parse(raw || "{}")
    return Object.keys(sStore).map((id) => ({ id, joinedClasses: sStore[id].joinedClasses || [] }))
  } catch (e) {
    return []
  }
}

export function getLocalStudentMeta(studentId: string) {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("adaptiq_student_meta_v1")
    if (!raw) return null
    const sStore = JSON.parse(raw || "{}")
    return sStore[studentId] || null
  } catch (e) {
    return null
  }
}

export interface LearningContent {
  id: string
  title: string
  description: string
  topicName: string
  difficulty: "beginner" | "intermediate" | "advanced"
  learningMode: "visual" | "auditory" | "reading" | "kinesthetic"
  masteryGap: number
  varkAlignment: number
}

export function getAdaptiveContent(): LearningContent[] {
  return [
    {
      id: "f0000000-0000-0000-0000-000000000001",
      title: "Linear Equations Explained",
      description: "Visual guide to solving linear equations step-by-step",
      topicName: "Linear Equations",
      difficulty: "beginner",
      learningMode: "visual",
      masteryGap: 15,
      varkAlignment: 95,
    },
    {
      id: "f0000000-0000-0000-0000-000000000003",
      title: "Step-by-Step Linear Solutions",
      description: "Kinesthetic practice with interactive problem-solving",
      topicName: "Linear Equations",
      difficulty: "intermediate",
      learningMode: "kinesthetic",
      masteryGap: 10,
      varkAlignment: 15,
    },
    {
      id: "f0000000-0000-0000-0000-000000000004",
      title: "Quadratic Deep Dive",
      description: "Advanced visual analysis of parabolas and quadratic functions",
      topicName: "Quadratic Functions",
      difficulty: "advanced",
      learningMode: "visual",
      masteryGap: 28,
      varkAlignment: 95,
    },
    {
      id: "f0000000-0000-0000-0000-000000000006",
      title: "Newton Laws Explained",
      description: "Comprehensive text-based guide to Newton's laws",
      topicName: "Newton Laws",
      difficulty: "intermediate",
      learningMode: "reading",
      masteryGap: 20,
      varkAlignment: 30,
    },
  ]
}
