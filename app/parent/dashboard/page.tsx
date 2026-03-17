"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { ParentSidebar } from "@/components/parent/sidebar-new"
import { supabase } from "@/lib/supabaseClient"
import {
  Bell,
  Moon,
  Sun,
  UserPlus,
  X,
  TrendingUp,
  Zap,
  ShieldAlert,
  BadgeCheck,
  Eye,
  Ear,
  BookText,
  Hand,
  Lightbulb,
  ChevronRight,
  Sparkles,
  Clock3,
  Star,
  ExternalLink,
  BarChart3,
  GraduationCap,
} from "lucide-react"

type ParentChild = {
  id: string
  userId: string
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
    type: string
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

const VARK_INFO = {
  Visual: { icon: Eye, pill: "bg-blue-500/15 text-blue-700 dark:text-blue-300", accent: "from-blue-500 to-cyan-500" },
  Auditory: { icon: Ear, pill: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300", accent: "from-fuchsia-500 to-violet-500" },
  Reading: { icon: BookText, pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", accent: "from-emerald-500 to-teal-500" },
  Kinesthetic: { icon: Hand, pill: "bg-amber-500/15 text-amber-700 dark:text-amber-300", accent: "from-amber-500 to-orange-500" },
} as const

function formatRelativeDate(dateString: string | null | undefined) {
  if (!dateString) return "No recent activity"

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "No recent activity"

  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return "Active today"
  if (diffDays === 1) return "Active yesterday"
  if (diffDays < 7) return `Active ${diffDays} days ago`
  return date.toLocaleDateString()
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

export default function ParentDashboard() {
  const { user, loading: authLoading } = useRequireAuth(["parent"])
  const [children, setChildren] = useState<ParentChild[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkEmail, setLinkEmail] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linkSuccess, setLinkSuccess] = useState("")

  const loadChildren = async (parentUserId: string) => {
    const response = await fetch("/api/parent/children", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parentUserId }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || "Unable to load linked children")
    }

    setChildren((data?.children || []) as ParentChild[])
  }

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        setError("")
        await loadChildren(user.id)
      } catch (err: any) {
        console.error("Error loading parent dashboard:", err)
        setError(err?.message || "Unable to load your dashboard right now.")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  const summary = useMemo(() => {
    const linkedChildren = children.length
    const averageMastery =
      linkedChildren > 0
        ? Math.round(children.reduce((sum, child) => sum + child.overallMastery, 0) / linkedChildren)
        : 0
    const averageEngagement =
      linkedChildren > 0
        ? Math.round(children.reduce((sum, child) => sum + child.engagementIndex, 0) / linkedChildren)
        : 0
    const attentionCount = children.filter((child) => child.metrics.needsAttention).length
    const earnedBadges = children.reduce(
      (sum, child) => sum + child.badges.filter((badge) => badge.earned).length,
      0,
    )

    return { linkedChildren, averageMastery, averageEngagement, attentionCount, earnedBadges }
  }, [children])

  const handleLinkChild = async () => {
    if (!linkEmail.trim()) return

    setLinkError("")
    setLinkSuccess("")

    try {
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", linkEmail.trim().toLowerCase())
        .maybeSingle()

      if (userErr) throw userErr
      if (!userRow?.id) {
        setLinkError("No student account found with that email address.")
        return
      }

      const { data: studentProfile, error: studentErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", userRow.id)
        .maybeSingle()

      if (studentErr) throw studentErr
      if (!studentProfile?.id) {
        setLinkError("That student exists, but their learning profile is not ready yet.")
        return
      }

      const { data: authData } = await supabase.auth.getUser()
      const authUserId = authData?.user?.id
      const authEmail = authData?.user?.email

      let appUserId: string | undefined
      if (authUserId) {
        const { data: byId } = await supabase.from("users").select("id").eq("id", authUserId).maybeSingle()
        appUserId = byId?.id
      }

      if (!appUserId && authEmail) {
        const { data: byEmail } = await supabase.from("users").select("id").eq("email", authEmail).maybeSingle()
        appUserId = byEmail?.id
      }

      if (!appUserId) {
        const meta = authData?.user?.user_metadata || {}
        const insertPayload: Record<string, any> = {
          email: authEmail || null,
          password_hash: "oauth",
          first_name: meta.firstName || meta.first_name || null,
          last_name: meta.lastName || meta.last_name || null,
          role: "parent",
        }
        if (authUserId) {
          insertPayload.id = authUserId
        }

        const { data: createdUser, error: createUserError } = await supabase
          .from("users")
          .insert([insertPayload])
          .select("id")
          .maybeSingle()

        if (createUserError) throw createUserError
        appUserId = createdUser?.id
      }

      if (!appUserId) {
        setLinkError("Unable to resolve your parent account.")
        return
      }

      const { data: existingParent, error: parentError } = await supabase
        .from("parent_profiles")
        .select("id")
        .eq("user_id", appUserId)
        .maybeSingle()

      if (parentError) throw parentError

      let parentId = existingParent?.id
      if (!parentId) {
        const { data: createdParent, error: createParentError } = await supabase
          .from("parent_profiles")
          .insert([{ user_id: appUserId }])
          .select("id")
          .maybeSingle()

        if (createParentError) throw createParentError
        parentId = createdParent?.id
      }

      if (!parentId) {
        setLinkError("Unable to create your parent profile.")
        return
      }

      const { error: linkErr } = await supabase
        .from("parent_student")
        .insert([{ parent_id: parentId, student_id: studentProfile.id }])

      if (linkErr) {
        const msg = (linkErr.message || "").toLowerCase()
        if (msg.includes("duplicate") || msg.includes("unique")) {
          setLinkError("This child is already linked to your account.")
          return
        }
        throw linkErr
      }

      if (!user) return
      await loadChildren(user.id)
      setLinkSuccess("Child linked successfully. Their live progress is now on your dashboard.")
      setLinkEmail("")
      setTimeout(() => {
        setShowLinkModal(false)
        setLinkSuccess("")
      }, 1800)
    } catch (err: any) {
      console.error("Failed to link child:", err)
      setLinkError(err?.message || "Unable to link child right now.")
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <ParentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl space-y-6 px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
            <section className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 dark:border-emerald-900/60 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_40%),linear-gradient(135deg,#0f172a_0%,#13253f_55%,#0b3b38_100%)] p-6 lg:p-8 text-white">
              <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle,_rgba(255,255,255,0.12),_transparent_60%)]" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    Family Progress Hub
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                      Keep every child’s mastery, motivation, and momentum in one place.
                    </h1>
                    <p className="mt-3 max-w-xl text-sm lg:text-base text-slate-200">
                      AMEP now pulls live lesson progress, badges, micro-survey feedback, and weekly snapshot history into a
                      parent-ready command center.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400"
                  >
                    <UserPlus className="w-4 h-4" />
                    Link Child
                  </button>
                  <Link
                    href="/parent/children"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Explore Details
                  </Link>
                </div>
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-sm text-slate-500">Linked children</p>
                <div className="mt-2 flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{summary.linkedChildren}</h2>
                  <GraduationCap className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-sm text-slate-500">Average mastery</p>
                <div className="mt-2 flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{summary.averageMastery}%</h2>
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-sm text-slate-500">Average engagement</p>
                <div className="mt-2 flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{summary.averageEngagement}%</h2>
                  <Zap className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-sm text-slate-500">Support alerts</p>
                <div className="mt-2 flex items-end justify-between">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{summary.attentionCount}</h2>
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                </div>
                <p className="mt-3 text-xs text-slate-500">{summary.earnedBadges} badge wins celebrated this week.</p>
              </div>
            </section>

            {children.length > 0 ? (
              <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {children.map((child) => {
                  const primaryStyle = child.varkProfile.dominantStyle || "Visual"
                  const secondaryStyle = child.varkProfile.secondaryStyle
                  const primaryInfo = VARK_INFO[primaryStyle as keyof typeof VARK_INFO] || VARK_INFO.Visual
                  const secondaryInfo =
                    (secondaryStyle && VARK_INFO[secondaryStyle as keyof typeof VARK_INFO]) || null
                  const PrimaryIcon = primaryInfo.icon
                  const SecondaryIcon = secondaryInfo?.icon
                  const earnedBadges = child.badges.filter((badge) => badge.earned)
                  const strongestTopic = [...child.masteryByTopic].sort((a, b) => b.score - a.score)[0]
                  const supportTopic = [...child.masteryByTopic].sort((a, b) => a.score - b.score)[0]

                  return (
                    <article
                      key={child.id}
                      className="overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
                    >
                      <div className={`bg-gradient-to-br ${primaryInfo.accent} p-6 text-white`}>
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold">
                              {child.name.charAt(0)}
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold">{child.name}</h2>
                              <p className="text-sm text-white/80">{child.email || "Linked learner profile"}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                                  <PrimaryIcon className="w-3.5 h-3.5" />
                                  {primaryStyle}
                                </span>
                                {secondaryStyle && secondaryInfo && SecondaryIcon && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                                    <SecondaryIcon className="w-3.5 h-3.5" />
                                    {secondaryStyle}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Last seen</p>
                            <p className="mt-1 text-sm font-medium">{formatRelativeDate(child.metrics.lastActivity)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Mastery</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{child.overallMastery}%</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Engagement</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{child.engagementIndex}%</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Modules</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                              {child.metrics.modulesCompleted}/{child.metrics.modulesStarted}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Badge wins</p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{earnedBadges.length}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
                          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Live student stats</h3>
                                <p className="text-sm text-slate-500">Mapped from lesson progress, badges, and module feedback.</p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  child.engagementStatus === "high"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : child.engagementStatus === "medium"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                }`}
                              >
                                {child.engagementStatus} engagement
                              </span>
                            </div>

                            <div className="mt-5 space-y-4">
                              <div>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                  <span className="text-slate-500">Mastery progress</span>
                                  <span className="font-medium text-slate-900 dark:text-white">{child.overallMastery}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-teal-500"
                                    style={{ width: `${child.overallMastery}%` }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                  <span className="text-slate-500">Engagement pulse</span>
                                  <span className="font-medium text-slate-900 dark:text-white">{child.engagementIndex}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                                    style={{ width: `${child.engagementIndex}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                                <p className="text-slate-500">Strongest topic</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                  {strongestTopic ? `${strongestTopic.topicName} (${Math.round(strongestTopic.score)}%)` : "Still building"}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                                <p className="text-slate-500">Needs support</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                                  {supportTopic ? `${supportTopic.topicName} (${Math.round(supportTopic.score)}%)` : "No weak topic flagged"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500" />
                              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Adaptive extras</h3>
                            </div>

                            <div className="mt-4 space-y-3">
                              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 p-4">
                                <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Module feedback pulse</p>
                                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                                  {child.moduleFeedback.averageRating > 0 ? `${child.moduleFeedback.averageRating}/5` : "No ratings"}
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                  {child.moduleFeedback.totalResponses} survey responses captured
                                </p>
                              </div>

                              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 p-4">
                                <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Weekly snapshot status</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                                  {child.shareHistory[0]
                                    ? `${child.shareHistory[0].deliveryStatus} ${new Date(child.shareHistory[0].createdAt).toLocaleDateString()}`
                                    : "Ready to share from student dashboard"}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Study time</p>
                                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{child.metrics.totalTimeSpent} min</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
                          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="w-4 h-4 text-emerald-500" />
                              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Badge shelf</h3>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
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
                                <p className="text-sm text-slate-500">Badges will appear here as mastery milestones are reached.</p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2">
                              <Clock3 className="w-4 h-4 text-sky-500" />
                              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent activity</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                              {child.recentActivity.length > 0 ? (
                                child.recentActivity.slice(0, 3).map((activity) => (
                                  <div key={activity.id} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.description}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">Activity will appear after the next module session.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
                          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-indigo-500" />
                              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Linked classes</h3>
                            </div>
                            <div className="mt-4 space-y-2">
                              {child.enrolledClasses.length > 0 ? (
                                child.enrolledClasses.map((course) => (
                                  <div key={`${course.classId || course.classCode}`} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                                    <p className="font-medium text-slate-900 dark:text-white">{course.className}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {[course.classCode, course.subject].filter(Boolean).join(" • ") || "Active learning cohort"}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No class enrollment synced yet.</p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                              <Lightbulb className="w-4 h-4 text-amber-500" />
                              <h3 className="text-base font-semibold">How you can help this week</h3>
                            </div>
                            <div className="mt-4 space-y-3">
                              {child.recommendations.length > 0 ? (
                                child.recommendations.map((recommendation, index) => (
                                  <div key={`${child.id}-tip-${index}`} className="flex items-start gap-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{recommendation}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">Support tips will appear as the system detects patterns.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/parent/children/${child.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                          >
                            View detailed progress
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          {child.metrics.needsAttention && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Parent attention recommended
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </section>
            ) : (
              <section className="rounded-[28px] border border-dashed border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-6 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <UserPlus className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                </div>
                <h2 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">No linked children yet</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Link your child’s student email to unlock mastery trends, feedback pulse, badges, and weekly snapshot visibility.
                </p>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Link Your Child
                </button>
              </section>
            )}
          </div>
        </main>

        {showLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Link Child</h2>
                  <p className="text-sm text-slate-500">Connect a student profile by email.</p>
                </div>
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4 text-sm text-slate-600 dark:text-slate-300">
                  Use the child’s student login email. Once linked, the parent dashboard will automatically pull mastery, engagement,
                  badges, feedback, and snapshot history.
                </div>

                <input
                  type="email"
                  value={linkEmail}
                  onChange={(event) => setLinkEmail(event.target.value)}
                  placeholder="child@student.com"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white"
                />

                {linkError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                    {linkError}
                  </div>
                )}

                {linkSuccess && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                    {linkSuccess}
                  </div>
                )}

                <button
                  onClick={handleLinkChild}
                  disabled={!linkEmail.trim()}
                  className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Link child now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
