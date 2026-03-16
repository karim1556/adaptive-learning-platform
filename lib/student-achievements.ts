import { supabase } from "@/lib/supabaseClient"
import type { Lesson, LessonProgress, StudentMasteryData } from "@/lib/lesson-service"

const STORAGE_KEY = "adaptiq_student_badges_v1"

export interface MasteryBadge {
  id: string
  name: string
  description: string
  icon: "brain" | "sparkles" | "target" | "trophy" | "flame" | "book-open"
  accent: string
  earned: boolean
  awardedAt?: string
  progress: number
  progressLabel: string
}

interface StoredBadgeState {
  [studentId: string]: Record<string, string>
}

function computeBadgePortfolio(params: {
  lessons: Lesson[]
  lessonProgress: LessonProgress[]
  masteryData: StudentMasteryData[]
  dominantStyle?: string
  awardedAtByKey?: Record<string, string | undefined>
}): MasteryBadge[] {
  const completedLessons = params.lessonProgress.filter((lesson) => lesson.completedAt)
  const lessonModeById = new Map(params.lessons.map((lesson) => [lesson.id, lesson.learningMode]))

  const styleBuckets = completedLessons.reduce<Record<string, { count: number; totalScore: number }>>((acc, item) => {
    const mode = lessonModeById.get(item.lessonId)
    if (!mode) return acc

    acc[mode] = acc[mode] || { count: 0, totalScore: 0 }
    acc[mode].count += 1
    acc[mode].totalScore += item.overallScore || 0
    return acc
  }, {})

  const dominantBucket =
    params.dominantStyle && styleBuckets[params.dominantStyle.toLowerCase()]
      ? styleBuckets[params.dominantStyle.toLowerCase()]
      : undefined
  const dominantStyleScore =
    dominantBucket && dominantBucket.count > 0 ? dominantBucket.totalScore / dominantBucket.count : 0
  const overallMastery =
    params.masteryData.length > 0
      ? params.masteryData.reduce((sum, topic) => sum + topic.masteryScore, 0) / params.masteryData.length
      : 0
  const masteredTopics = params.masteryData.filter((topic) => topic.masteryScore >= 80).length
  const stylesExplored = Object.values(styleBuckets).filter((bucket) => bucket.count > 0).length

  const badges: MasteryBadge[] = [
    {
      id: "first-win",
      name: "First Win",
      description: "Complete your first adaptive module.",
      icon: "sparkles",
      accent: "from-blue-500 to-indigo-600",
      earned: completedLessons.length >= 1,
      progress: clamp((completedLessons.length / 1) * 100),
      progressLabel: `${completedLessons.length}/1 module completed`,
    },
    {
      id: "style-specialist",
      name: "VARK Specialist",
      description: "Reach 80% average mastery in your strongest learning mode.",
      icon: "brain",
      accent: "from-emerald-500 to-teal-600",
      earned: dominantStyleScore >= 80,
      progress: clamp((dominantStyleScore / 80) * 100),
      progressLabel: `${Math.round(dominantStyleScore)}% in ${params.dominantStyle || "your top"} mode`,
    },
    {
      id: "mastery-builder",
      name: "Mastery Builder",
      description: "Maintain 75% overall mastery across tracked topics.",
      icon: "target",
      accent: "from-amber-500 to-orange-600",
      earned: overallMastery >= 75,
      progress: clamp((overallMastery / 75) * 100),
      progressLabel: `${Math.round(overallMastery)}% overall mastery`,
    },
    {
      id: "topic-champion",
      name: "Topic Champion",
      description: "Master at least 3 topics at 80% or above.",
      icon: "trophy",
      accent: "from-fuchsia-500 to-pink-600",
      earned: masteredTopics >= 3,
      progress: clamp((masteredTopics / 3) * 100),
      progressLabel: `${masteredTopics}/3 topics mastered`,
    },
    {
      id: "adaptive-explorer",
      name: "Adaptive Explorer",
      description: "Complete lessons across at least 2 VARK modes.",
      icon: "book-open",
      accent: "from-cyan-500 to-sky-600",
      earned: stylesExplored >= 2,
      progress: clamp((stylesExplored / 2) * 100),
      progressLabel: `${stylesExplored}/2 modes explored`,
    },
    {
      id: "consistency-flame",
      name: "Consistency Flame",
      description: "Finish 5 modules to build momentum.",
      icon: "flame",
      accent: "from-rose-500 to-red-600",
      earned: completedLessons.length >= 5,
      progress: clamp((completedLessons.length / 5) * 100),
      progressLabel: `${completedLessons.length}/5 completed modules`,
    },
  ]

  return badges.map((badge) => ({
    ...badge,
    earned: badge.earned || Boolean(params.awardedAtByKey?.[badge.id]),
    awardedAt: params.awardedAtByKey?.[badge.id],
  }))
}

function getStoredAwards(): StoredBadgeState {
  if (typeof window === "undefined") return {}

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredBadgeState) : {}
  } catch {
    return {}
  }
}

function persistAwards(studentId: string, badges: MasteryBadge[]) {
  if (typeof window === "undefined") return

  const store = getStoredAwards()
  const current = store[studentId] || {}

  badges.forEach((badge) => {
    if (badge.earned && !current[badge.id]) {
      current[badge.id] = new Date().toISOString()
    }
  })

  store[studentId] = current

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore storage errors
  }
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function getStudentBadges(params: {
  studentId: string
  lessons: Lesson[]
  lessonProgress: LessonProgress[]
  masteryData: StudentMasteryData[]
  dominantStyle?: string
}): MasteryBadge[] {
  const storedAwards = getStoredAwards()[params.studentId] || {}
  const badges = computeBadgePortfolio({
    lessons: params.lessons,
    lessonProgress: params.lessonProgress,
    masteryData: params.masteryData,
    dominantStyle: params.dominantStyle,
    awardedAtByKey: storedAwards,
  })

  persistAwards(params.studentId, badges)

  return badges.map((badge) => ({
    ...badge,
    awardedAt: badge.awardedAt || (badge.earned ? getStoredAwards()[params.studentId]?.[badge.id] : undefined),
  }))
}

export function buildAchievementShareText(params: {
  studentName: string
  badges: MasteryBadge[]
  overallMastery: number
}) {
  const earned = params.badges.filter((badge) => badge.earned)
  const recentBadgeNames = earned.slice(0, 2).map((badge) => badge.name)
  const badgeLine =
    recentBadgeNames.length > 0 ? `Unlocked ${recentBadgeNames.join(" + ")}` : "Made new learning progress"

  return `${badgeLine} on AMEP with ${Math.round(params.overallMastery)}% mastery this week. Personalized VARK learning is paying off. #AdaptiveMastery #AMEP`
}

export async function syncStudentBadges(studentId: string, badges: MasteryBadge[]) {
  const earnedBadges = badges.filter((badge) => badge.earned)
  if (earnedBadges.length === 0) return

  try {
    await supabase.from("student_badges").upsert(
      earnedBadges.map((badge) => ({
        student_id: studentId,
        badge_key: badge.id,
        badge_name: badge.name,
        description: badge.description,
        icon: badge.icon,
        awarded_at: badge.awardedAt || new Date().toISOString(),
        metadata: {
          progress: badge.progress,
          progressLabel: badge.progressLabel,
          accent: badge.accent,
        },
      })),
      { onConflict: "student_id,badge_key" },
    )
  } catch (error) {
    console.warn("Failed to sync badges to Supabase:", error)
  }
}

export { computeBadgePortfolio as buildStudentBadgePortfolio }
