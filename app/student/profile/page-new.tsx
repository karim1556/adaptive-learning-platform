"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { StudentSidebar } from "@/components/student/sidebar"
import { StudentHeader } from "@/components/student/header"
import { 
  User, 
  Mail, 
  Eye, 
  Ear, 
  BookText, 
  Hand, 
  RefreshCw, 
  LogOut,
  Settings,
  Shield
} from "lucide-react"

const VARK_CONFIG = {
  Visual: { icon: Eye, color: "bg-blue-500", textColor: "text-blue-600", bgLight: "bg-blue-50", description: "You learn best through images, diagrams, charts, and visual representations." },
  Auditory: { icon: Ear, color: "bg-purple-500", textColor: "text-purple-600", bgLight: "bg-purple-50", description: "You learn best through listening, discussions, and verbal explanations." },
  Reading: { icon: BookText, color: "bg-emerald-500", textColor: "text-emerald-600", bgLight: "bg-emerald-50", description: "You learn best through reading and writing text-based information." },
  Kinesthetic: { icon: Hand, color: "bg-amber-500", textColor: "text-amber-600", bgLight: "bg-amber-50", description: "You learn best through hands-on practice and physical experiences." },
}

export default function StudentProfilePage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["student"])
  const [varkProfile, setVarkProfile] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (!mounted) return
        setVarkProfile((data?.user?.user_metadata as any)?.varkProfile || null)
      } catch {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("authSession")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const primaryConfig = varkProfile ? VARK_CONFIG[varkProfile.dominantStyle as keyof typeof VARK_CONFIG] : null
  const secondaryConfig = varkProfile ? VARK_CONFIG[varkProfile.secondaryStyle as keyof typeof VARK_CONFIG] : null
  const PrimaryIcon = primaryConfig?.icon || Eye
  const SecondaryIcon = secondaryConfig?.icon || Ear

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
              <p className="text-slate-500 mt-1">Manage your account and learning preferences</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Avatar Section */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="text-white">
                    <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
                    <p className="text-blue-100">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">First Name</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{user.firstName || "—"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Last Name</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{user.lastName || "—"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl md:col-span-2">
                    <p className="text-xs text-slate-500 mb-1">Email Address</p>
                    <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* VARK Profile */}
            {varkProfile && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Learning Style Profile</h3>
                
                {/* Primary & Secondary Styles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Primary */}
                  <div className={`p-5 rounded-xl ${primaryConfig?.color || "bg-blue-500"} text-white`}>
                    <p className="text-xs uppercase tracking-wider opacity-75 mb-2">Primary Style</p>
                    <div className="flex items-center gap-3 mb-2">
                      <PrimaryIcon className="w-8 h-8" />
                      <span className="text-2xl font-bold">{varkProfile.dominantStyle}</span>
                    </div>
                    <p className="text-sm opacity-90">{primaryConfig?.description}</p>
                  </div>

                  {/* Secondary */}
                  <div className={`p-5 rounded-xl ${secondaryConfig?.bgLight || "bg-purple-50"} border-2 border-dashed ${secondaryConfig?.textColor?.replace("text-", "border-") || "border-purple-500"}`}>
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Secondary Style</p>
                    <div className={`flex items-center gap-3 mb-2 ${secondaryConfig?.textColor || "text-purple-600"}`}>
                      <SecondaryIcon className="w-8 h-8" />
                      <span className="text-2xl font-bold">{varkProfile.secondaryStyle}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{secondaryConfig?.description}</p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="mb-6">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Score Breakdown</p>
                  <div className="space-y-3">
                    {Object.entries(varkProfile.scores || {}).map(([style, score]: [string, any]) => {
                      const styleKey = style.charAt(0).toUpperCase() + style.slice(1) as keyof typeof VARK_CONFIG
                      const config = VARK_CONFIG[styleKey]
                      const Icon = config?.icon || Eye
                      const percentage = Math.round((score / 16) * 100)
                      
                      return (
                        <div key={style} className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${config?.bgLight || "bg-slate-100"} rounded-lg flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${config?.textColor || "text-slate-600"}`} />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-24 capitalize">{style}</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${config?.color || "bg-blue-500"} rounded-full transition-all`} 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white w-8 text-right">{score}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Retake Button */}
                <button
                  onClick={() => router.push("/student/vark-survey")}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 font-medium rounded-xl hover:border-blue-500 hover:text-blue-600 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake VARK Survey
                </button>
              </div>
            )}

            {/* Account Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Account</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => router.push("/student/settings")}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition text-left"
                >
                  <Settings className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Settings</p>
                    <p className="text-sm text-slate-500">Notifications, preferences</p>
                  </div>
                </button>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition text-left"
                >
                  <LogOut className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-600">Log Out</p>
                    <p className="text-sm text-red-500">Sign out of your account</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
