"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-auth"
import { ParentSidebar } from "@/components/parent/sidebar-new"
import {
  ChevronLeft,
  Bell,
  Moon,
  Sun,
  TrendingUp,
  Zap,
  Star,
  Clock3,
  BadgeCheck,
  Lightbulb,
  GraduationCap,
} from "lucide-react"

type ParentChildDetail = {
  id: string
  name: string
  email: string | null
  overallMastery: number
  engagementIndex: number
  engagementStatus: "low" | "medium" | "high"
  varkProfile: {
    dominantStyle: string | null
    secondaryStyle: string | null
  }
  enrolledClasses: Array<{
    classId: string | null
    classCode: string | null
    className: string
    subject: string | null
  }>
  masteryByTopic: Array<{
    topicId: string | null
    topicName: string
    score: number
  }>
  recentActivity: Array<{
    id: string
    description: string
    timestamp: string
  }>
  recommendations: string[]
  badges: Array<{
    id: string
    name: string
    earned: boolean
  }>
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

function ParentHeader({ user }: { user: any }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "P"
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Parent"

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="relative p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-900 dark:text-white">{fullName}</div>
            <div className="text-xs text-slate-500">Parent</div>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}

export default function ParentStudentDetail() {
  const params = useParams()
  const id = params?.id as string
  const { user, loading } = useRequireAuth(["parent"])
  const [student, setStudent] = useState<ParentChildDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user || !id) return

    ;(async () => {
      try {
        setError("")
        const response = await fetch("/api/parent/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, studentId: id }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load child details")
        }

        setStudent((data?.children || [])[0] || null)
      } catch (err: any) {
        console.error("Failed to load child detail:", err)
        setError(err?.message || "Unable to load this child right now.")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user, id])

  const earnedBadges = useMemo(() => student?.badges.filter((badge) => badge.earned) || [], [student])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  if (!student) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
        <ParentSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ParentHeader user={user} />
          <main className="flex-1 overflow-auto p-8">
            <div className="max-w-3xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Child not found</h1>
              <p className="mt-2 text-sm text-slate-500">{error || "This child is not linked to your account."}</p>
              <Link
                href="/parent/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to dashboard
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <ParentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  href="/parent/dashboard"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 dark:hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to parent dashboard
                </Link>
                <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{student.name}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {student.email || "Linked learner profile"} • {student.varkProfile.dominantStyle || "Learning style in progress"}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Mastery</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{student.overallMastery}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Engagement</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{student.engagementIndex}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Modules</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {student.metrics.modulesCompleted}/{student.metrics.modulesStarted}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Feedback</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                    {student.moduleFeedback.averageRating > 0 ? `${student.moduleFeedback.averageRating}/5` : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            )}

            <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Mastery by topic</h2>
                  </div>
                  <div className="mt-5 space-y-4">
                    {student.masteryByTopic.length > 0 ? (
                      student.masteryByTopic.map((topic) => (
                        <div key={`${topic.topicId || topic.topicName}`} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-900 dark:text-white">{topic.topicName}</span>
                            <span className="text-slate-500">{Math.round(topic.score)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-500"
                              style={{ width: `${Math.round(topic.score)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Topic-level mastery will appear after more module attempts.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <Clock3 className="w-4 h-4 text-sky-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent learning activity</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {student.recentActivity.length > 0 ? (
                      student.recentActivity.map((activity) => (
                        <div key={activity.id} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.description}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(activity.timestamp).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No recent activity recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Badges and motivation</h2>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {earnedBadges.length > 0 ? (
                      earnedBadges.map((badge) => (
                        <span
                          key={badge.id}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                          {badge.name}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Badges will unlock here as mastery thresholds are reached.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Module feedback pulse</h2>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Average</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                        {student.moduleFeedback.averageRating > 0 ? `${student.moduleFeedback.averageRating}/5` : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Responses</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{student.moduleFeedback.totalResponses}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/20 p-4">
                      <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Low ratings</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{student.moduleFeedback.lowRatingCount}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Linked classes</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {student.enrolledClasses.length > 0 ? (
                      student.enrolledClasses.map((course) => (
                        <div key={`${course.classId || course.classCode}`} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                          <p className="font-medium text-slate-900 dark:text-white">{course.className}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {[course.classCode, course.subject].filter(Boolean).join(" • ") || "Learning cohort"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Class enrollment will appear here once synced.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Parent action plan</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {student.recommendations.length > 0 ? (
                      student.recommendations.map((recommendation, index) => (
                        <div key={`${student.id}-${index}`} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 text-sm text-slate-700 dark:text-slate-300">
                          {recommendation}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Support suggestions will appear as more learning signals arrive.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Snapshot history</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {student.shareHistory.length > 0 ? (
                      student.shareHistory.map((share) => (
                        <div key={share.id} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{share.subject || "Parent snapshot"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {share.deliveryStatus} • {new Date(share.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">Weekly snapshot shares will appear here after the first send.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
