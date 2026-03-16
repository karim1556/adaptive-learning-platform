export interface StudentMetricsProgressInput {
  lessonId: string
  overallScore?: number | null
  completedAt?: string | null
  lastAccessedAt?: string | null
  timeSpent?: number | null
  checkpointAttempts?: Array<{ percentage?: number | null }> | null
}

export interface StudentMetricsLessonInput {
  id: string
  title?: string | null
  conceptId?: string | null
  conceptName?: string | null
  classId?: string | null
  learningMode?: string | null
}

export interface DerivedTopicMetric {
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

export interface DerivedStudentMetrics {
  overallMastery: number
  engagementIndex: number
  modulesStarted: number
  modulesCompleted: number
  totalTimeSpent: number
  lastActivity: string | null
  masteryByTopic: DerivedTopicMetric[]
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeConceptName(value?: string | null) {
  return value?.trim() || "Learning Module"
}

export function getEngagementStatus(score: number): "low" | "medium" | "high" {
  if (score < 40) return "low"
  if (score > 70) return "high"
  return "medium"
}

export function resolveProgressScore(progress: StudentMetricsProgressInput) {
  if (typeof progress.overallScore === "number" && Number.isFinite(progress.overallScore)) {
    return clampPercent(progress.overallScore)
  }

  const attempts = progress.checkpointAttempts || []
  if (attempts.length > 0) {
    const total = attempts.reduce((sum, attempt) => sum + Number(attempt?.percentage || 0), 0)
    return clampPercent(total / attempts.length)
  }

  return progress.completedAt ? 100 : 0
}

export function deriveStudentMetrics(params: {
  progress: StudentMetricsProgressInput[]
  lessons: StudentMetricsLessonInput[]
  fallbackMastery?: number
  fallbackEngagement?: number
}): DerivedStudentMetrics {
  const lessonById = new Map(params.lessons.map((lesson) => [lesson.id, lesson]))
  const completedProgress = params.progress.filter((item) => Boolean(item.completedAt))
  const totalTimeSpent = params.progress.reduce((sum, item) => sum + Number(item.timeSpent || 0), 0)

  const topicBuckets: Record<
    string,
    {
      conceptId: string
      conceptName: string
      scoreParts: number[]
      checkpointResults: number[]
      lessons: number[]
      lastActivity: string
    }
  > = {}

  params.progress.forEach((item) => {
    const lesson = lessonById.get(item.lessonId)
    const conceptKey = lesson?.conceptId || item.lessonId
    const conceptName = normalizeConceptName(lesson?.conceptName || lesson?.title)
    const score = resolveProgressScore(item)
    const lastActivity = item.lastAccessedAt || item.completedAt || new Date(0).toISOString()
    const attempts = item.checkpointAttempts || []

    if (!topicBuckets[conceptKey]) {
      topicBuckets[conceptKey] = {
        conceptId: conceptKey,
        conceptName,
        scoreParts: [],
        checkpointResults: [],
        lessons: [],
        lastActivity,
      }
    }

    const bucket = topicBuckets[conceptKey]

    if (attempts.length > 0) {
      attempts.forEach((attempt) => {
        const percentage = clampPercent(Number(attempt?.percentage || 0))
        bucket.scoreParts.push(percentage)
        bucket.checkpointResults.push(percentage >= 70 ? 1 : 0)
      })
    } else if (item.completedAt) {
      bucket.scoreParts.push(score)
    }

    bucket.lessons.push(item.completedAt ? 1 : 0)

    if (lastActivity > bucket.lastActivity) {
      bucket.lastActivity = lastActivity
    }
  })

  const masteryByTopic = Object.values(topicBuckets).map((bucket) => {
    const masteryScore =
      bucket.scoreParts.length > 0
        ? clampPercent(bucket.scoreParts.reduce((sum, score) => sum + score, 0) / bucket.scoreParts.length)
        : 0
    const checkpointsPassed = bucket.checkpointResults.filter((value) => value === 1).length
    const totalCheckpoints = bucket.checkpointResults.length
    const lessonsCompleted = bucket.lessons.filter((value) => value === 1).length
    const totalLessons = bucket.lessons.length

    return {
      conceptId: bucket.conceptId,
      conceptName: bucket.conceptName,
      masteryScore,
      checkpointsPassed,
      totalCheckpoints,
      lessonsCompleted,
      totalLessons,
      lastActivity: bucket.lastActivity,
      needsAttention:
        masteryScore < 60 ||
        (totalCheckpoints > 0 && checkpointsPassed / Math.max(1, totalCheckpoints) < 0.5),
    }
  })

  masteryByTopic.sort((a, b) => {
    if (b.masteryScore !== a.masteryScore) return b.masteryScore - a.masteryScore
    return b.lastActivity.localeCompare(a.lastActivity)
  })

  const lastActivity =
    params.progress
      .map((item) => item.lastAccessedAt || item.completedAt || "")
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null

  const totalAvailableLessons = Math.max(params.lessons.length, params.progress.length, 1)
  const modulesStarted = params.progress.length
  const modulesCompleted = completedProgress.length
  const timeRatio = Math.min(totalTimeSpent / Math.max(totalAvailableLessons * 12, 12), 1)
  const recencyBonus = lastActivity
    ? Math.max(
        0,
        10 - Math.min(10, Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))),
      )
    : 0

  const computedEngagement =
    modulesStarted > 0
      ? clampPercent(
          (modulesStarted / totalAvailableLessons) * 45 +
            (modulesCompleted / totalAvailableLessons) * 35 +
            timeRatio * 15 +
            recencyBonus,
        )
      : clampPercent(params.fallbackEngagement ?? 50)

  const completedScores = completedProgress.map((item) => resolveProgressScore(item))
  const overallMastery =
    masteryByTopic.length > 0
      ? clampPercent(masteryByTopic.reduce((sum, topic) => sum + topic.masteryScore, 0) / masteryByTopic.length)
      : completedScores.length > 0
        ? clampPercent(completedScores.reduce((sum, score) => sum + score, 0) / completedScores.length)
        : clampPercent(params.fallbackMastery ?? 0)

  return {
    overallMastery,
    engagementIndex: computedEngagement,
    modulesStarted,
    modulesCompleted,
    totalTimeSpent,
    lastActivity,
    masteryByTopic,
  }
}
