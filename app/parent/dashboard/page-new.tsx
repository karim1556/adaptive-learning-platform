"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { ParentSidebar } from "@/components/parent/sidebar-new"
import { supabase } from "@/lib/supabaseClient"
import { getChildrenOverview, type ChildOverview } from "@/lib/data-service"
import {
  Bell,
  Search,
  Moon,
  Sun,
  TrendingUp,
  Zap,
  Eye,
  Ear,
  BookText,
  Hand,
  Lightbulb,
  ChevronRight,
  Plus,
  UserPlus,
  X
} from "lucide-react"

const VARK_INFO = {
  Visual: { icon: Eye, color: "bg-blue-500" },
  Auditory: { icon: Ear, color: "bg-purple-500" },
  Reading: { icon: BookText, color: "bg-emerald-500" },
  Kinesthetic: { icon: Hand, color: "bg-amber-500" },
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
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
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
  const [children, setChildren] = useState<ChildOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkEmail, setLinkEmail] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linkSuccess, setLinkSuccess] = useState(false)

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const data = await getChildrenOverview(user.id)
        setChildren(data)
      } catch (e) {
        console.error("Error loading children:", e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  const handleLinkChild = async () => {
    if (!linkEmail.trim()) return
    setLinkError("")

    try {
      // In a real implementation, this would send a link request
      // For now, we'll simulate by storing in metadata
      const { data } = await supabase.auth.getUser()
      const existing = data?.user?.user_metadata?.linkedChildren || []
      
      // Simulate finding the child (in real app, would query by email)
      setLinkSuccess(true)
      setTimeout(() => {
        setShowLinkModal(false)
        setLinkEmail("")
        setLinkSuccess(false)
      }, 2000)
    } catch (e: any) {
      setLinkError(e.message || "Failed to link child")
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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <ParentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Welcome */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome, {user.firstName || "Parent"}!
                </h1>
                <p className="text-slate-500 mt-1">
                  Monitor your children's learning progress
                </p>
              </div>
              <button
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition"
              >
                <UserPlus className="w-4 h-4" />
                Link Child
              </button>
            </div>

            {/* Children Cards */}
            {children.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {children.map((child) => {
                  const primaryStyle = child.varkProfile.dominantStyle
                  const secondaryStyle = child.varkProfile.secondaryStyle
                  const primaryInfo = VARK_INFO[primaryStyle as keyof typeof VARK_INFO]
                  const secondaryInfo = VARK_INFO[secondaryStyle as keyof typeof VARK_INFO]
                  const PrimaryIcon = primaryInfo?.icon || Eye
                  const SecondaryIcon = secondaryInfo?.icon || Ear

                  return (
                    <div key={child.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      {/* Child Header */}
                      <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                            {child.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{child.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 ${primaryInfo?.color || "bg-blue-500"} text-white text-xs font-medium rounded`}>
                                {primaryStyle}
                              </span>
                              <span className={`px-2 py-0.5 ${secondaryInfo?.color || "bg-purple-500"} text-white text-xs font-medium rounded opacity-75`}>
                                {secondaryStyle}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="p-4 border-r border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">Mastery</span>
                          </div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {child.overallMastery}%
                          </div>
                          <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                child.overallMastery >= 70 ? "bg-emerald-500" :
                                child.overallMastery >= 50 ? "bg-blue-500" :
                                child.overallMastery >= 30 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${child.overallMastery}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs">Engagement</span>
                          </div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {child.engagementLevel}%
                          </div>
                          <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            child.engagementStatus === "high" ? "bg-emerald-100 text-emerald-700" :
                            child.engagementStatus === "medium" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {child.engagementStatus} engagement
                          </div>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white mb-3">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">How You Can Help</span>
                        </div>
                        <div className="space-y-2">
                          {child.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No children linked yet</h3>
                <p className="text-slate-500 mb-4 max-w-sm mx-auto">
                  Link your child's account to monitor their learning progress and get personalized recommendations.
                </p>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
                >
                  Link Your Child
                </button>
              </div>
            )}

            {/* Tips Section */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">💡 Parent Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-medium mb-1">Understanding VARK</h4>
                  <p className="text-sm text-emerald-100">
                    Your child learns best through their dominant style. Use matching activities at home!
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <h4 className="font-medium mb-1">Engagement Matters</h4>
                  <p className="text-sm text-emerald-100">
                    Regular study habits boost retention. Even 15 minutes daily makes a difference.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Link Child Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Link Your Child</h2>
                <button onClick={() => setShowLinkModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6">
                {linkSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">Link request sent!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Enter your child's email address to request access to their learning progress.
                    </p>
                    <input
                      type="email"
                      value={linkEmail}
                      onChange={(e) => setLinkEmail(e.target.value)}
                      placeholder="child@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    {linkError && (
                      <p className="text-sm text-red-600">{linkError}</p>
                    )}
                    <button
                      onClick={handleLinkChild}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition"
                    >
                      Send Link Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
