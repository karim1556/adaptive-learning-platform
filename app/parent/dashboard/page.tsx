"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { ParentSidebar } from "@/components/parent/sidebar-new"
import { supabase } from "@/lib/supabaseClient"
import type { ChildOverview } from "@/lib/data-service"
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
  const [debugData, setDebugData] = useState<any>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkEmail, setLinkEmail] = useState("")
  const [linkError, setLinkError] = useState("")
  const [linkSuccess, setLinkSuccess] = useState(false)

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const res = await fetch('/api/parent/children', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        })
        const json = await res.json()
        const data = json?.children || []
        console.debug('parent children API returned:', data)
        // Normalize server response to match ChildOverview expected shape
        const mapped = (data as any[]).map((c) => {
          const overallMastery = Number(c.overallMastery ?? c.overall_mastery_score ?? 0)
          const engagementLevel = Number(c.engagementIndex ?? c.engagement_index ?? 0)
          const engagementStatus = engagementLevel >= 70 ? 'high' : engagementLevel >= 50 ? 'medium' : 'low'
          const vark = c.varkProfile || {}
          // Simple recommendation generator (keeps parity with server-side logic)
          const recommendations: string[] = []
          if (engagementLevel < 40) recommendations.push('Encourage regular study sessions - even 15 minutes daily helps!')
          if (overallMastery < 50) recommendations.push('Consider reviewing weak topics together or arranging additional practice.')
          const dominant = (vark.dominant_style || vark.dominantStyle || '')?.toLowerCase()
          if (dominant === 'visual') recommendations.push('Use diagrams, charts, and videos when helping with homework.')
          else if (dominant === 'auditory') recommendations.push('Discuss concepts out loud and consider educational podcasts.')
          else if (dominant === 'reading') recommendations.push('Provide books and written materials for extra learning.')
          else if (dominant === 'kinesthetic') recommendations.push('Use hands-on activities and real-world examples when studying.')

          return {
            id: c.id,
            name: c.name || (c.email ?? 'Student'),
            overallMastery,
            engagementLevel,
            engagementStatus,
            varkProfile: {
              dominantStyle: vark.dominant_style || vark.dominantStyle || null,
              secondaryStyle: vark.secondary_style || vark.secondaryStyle || null,
            },
            recentActivity: c.recentActivity || [],
            recommendations: recommendations.slice(0, 3),
          }
        })

        setChildren(mapped)
        setDebugData(mapped)
      } catch (e) {
        console.error('Error loading children via server API:', e)
        setDebugData({ error: String(e) })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  const handleLinkChild = async () => {
    if (!linkEmail.trim()) return
    setLinkError("")
    try {
      // Find the user record for the provided email
      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", linkEmail)
        .maybeSingle()

      if (userErr) throw userErr
      if (!userRow || !userRow.id) {
        setLinkError("No student account found with that email")
        return
      }

      // Get the student's profile
      const { data: studentProfile, error: spErr } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", userRow.id)
        .maybeSingle()

      if (spErr) throw spErr
      if (!studentProfile || !studentProfile.id) {
        setLinkError("No student profile found for that account")
        return
      }


      // Resolve app `users` row for the current authenticated user
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
        // Try to create a local `users` row for this authenticated account so
        // foreign key constraints (parent_profiles.user_id) can be satisfied.
        try {
          const meta = authData?.user?.user_metadata || {}
          const insertPayload: any = {
            email: authEmail || null,
            password_hash: 'oauth', // placeholder for externally-authenticated users
            first_name: meta.firstName || meta.first_name || null,
            last_name: meta.lastName || meta.last_name || null,
            role: 'parent',
          }
          // If we have an auth UID, reuse it so FKs align with auth records
          if (authUserId) insertPayload.id = authUserId

          const { data: createdUser, error: createErr } = await supabase
            .from('users')
            .insert([insertPayload])
            .select()
            .maybeSingle()

          if (createErr) {
            console.error('Failed to create local users row:', createErr)
            setLinkError('No local user record found and automatic creation failed. Contact support.')
            return
          }

          appUserId = createdUser?.id
        } catch (e) {
          console.error('Create local user failed', e)
          setLinkError('No local user record found and automatic creation failed. Contact support.')
          return
        }
      }

      // Ensure parent_profiles exists for app user id
      const { data: parentProfile, error: ppErr } = await supabase
        .from("parent_profiles")
        .select("id")
        .eq("user_id", appUserId)
        .maybeSingle()

      if (ppErr) throw ppErr

      let parentIdToUse: string | undefined = parentProfile?.id
      if (!parentIdToUse) {
        const { data: created, error: createErr } = await supabase
          .from("parent_profiles")
          .insert([{ user_id: appUserId }])
          .select()
          .maybeSingle()

        if (createErr) throw createErr
        parentIdToUse = created?.id
      }

      if (!parentIdToUse) {
        setLinkError("Unable to determine parent profile")
        return
      }

      // Create link in parent_student (will error if duplicate due to unique constraint)
      const { error: linkErr } = await supabase
        .from("parent_student")
        .insert([{ parent_id: parentIdToUse, student_id: studentProfile.id }])

      if (linkErr) {
        // Duplicate linkage
        const msg = linkErr.message || "Failed to create link"
        if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
          setLinkError("This child is already linked to your account")
          return
        }
        throw linkErr
      }

      // Refresh children list
      try {
        const data = await getChildrenOverview(user.id)
        setChildren(data)
      } catch (e) {
        console.warn("Failed to refresh children after linking:", e)
      }

      setLinkSuccess(true)
      setTimeout(() => {
        setShowLinkModal(false)
        setLinkEmail("")
        setLinkSuccess(false)
      }, 2000)
    } catch (e: any) {
      setLinkError(e?.message || "Failed to link child")
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
                {/* Dev debug panel - shows raw response when no children */}
                {debugData && (
                  <pre className="mt-4 text-left max-w-lg mx-auto text-xs text-slate-600 bg-slate-50 p-3 rounded">{JSON.stringify(debugData, null, 2)}</pre>
                )}
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
