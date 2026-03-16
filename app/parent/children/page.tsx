"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { ParentSidebar } from "@/components/parent/sidebar-new"
import { Bell, Moon, Sun, ExternalLink, BadgeCheck, TrendingUp, Zap } from "lucide-react"

type ParentChildListItem = {
  id: string
  name: string
  email: string | null
  overallMastery: number
  engagementIndex: number
  engagementStatus: "low" | "medium" | "high"
  badges: Array<{ id: string; name: string; earned: boolean }>
  enrolledClasses: Array<{ classId: string | null; classCode: string | null; className: string; subject: string | null }>
  metrics: { needsAttention: boolean }
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

export default function ParentChildrenPage() {
  const { user, loading } = useRequireAuth(["parent"])
  const [children, setChildren] = useState<ParentChildListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const response = await fetch("/api/parent/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load children")
        }

        setChildren((data?.children || []) as ParentChildListItem[])
      } catch (err: any) {
        console.error("Failed to load children list:", err)
        setError(err?.message || "Unable to load children right now.")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <ParentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Children</h1>
              <p className="mt-2 text-sm text-slate-500">
                Browse every linked child with live mastery, engagement, and badge progress.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {children.map((child) => {
                const earnedBadges = child.badges.filter((badge) => badge.earned)
                return (
                  <article
                    key={child.id}
                    className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{child.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">{child.email || "Linked learner profile"}</p>
                      </div>
                      {child.metrics.needsAttention && (
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                          Needs support
                        </span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <span className="text-xs uppercase tracking-wide">Mastery</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{child.overallMastery}%</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-xs uppercase tracking-wide">Engagement</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{child.engagementIndex}%</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Badge progress</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {earnedBadges.length > 0 ? (
                          earnedBadges.slice(0, 3).map((badge) => (
                            <span
                              key={badge.id}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                            >
                              {badge.name}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No badges earned yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-4">
                      <p className="text-sm text-slate-500">Current class</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                        {child.enrolledClasses[0]?.className || "No active class synced"}
                      </p>
                    </div>

                    <Link
                      href={`/parent/children/${child.id}`}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      Open detailed progress
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </article>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
