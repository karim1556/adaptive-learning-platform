"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { StudentSidebar } from "@/components/student/sidebar"
import { StudentHeader } from "@/components/student/header"
import { 
  Settings, 
  Bell, 
  Lock, 
  Palette, 
  Moon, 
  Sun,
  ChevronRight,
  Users
} from "lucide-react"
import { joinClass } from "@/lib/data-service"

export default function StudentSettingsPage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["student"])
  const [joinCode, setJoinCode] = useState("")
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Settings state
  const [notifications, setNotifications] = useState({
    reminders: true,
    achievements: true,
    teacherMessages: true,
  })

  const handleJoinClass = async () => {
    if (!joinCode.trim() || !user) return
    setIsJoining(true)
    setJoinResult(null)

    try {
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Student"
      const result = await joinClass(joinCode.trim().toUpperCase(), user.id, fullName, user.email || "")
      if (result.success) {
        setJoinResult({ success: true, message: `Joined ${result.className}!` })
        setJoinCode("")
      } else {
        setJoinResult({ success: false, message: result.error || "Class not found" })
      }
    } catch (e: any) {
      setJoinResult({ success: false, message: e.message || "Failed to join class" })
    } finally {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-slate-500 mt-1">Manage your preferences and account</p>
            </div>

            {/* Join Class */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Join a Class</h3>
                  <p className="text-sm text-slate-500">Enter a class code from your teacher</p>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter class code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="flex-1 px-4 py-3 font-mono text-center uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleJoinClass}
                  disabled={!joinCode.trim() || isJoining}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isJoining ? "Joining..." : "Join"}
                </button>
              </div>

              {joinResult && (
                <p className={`mt-3 text-sm ${joinResult.success ? "text-emerald-600" : "text-red-600"}`}>
                  {joinResult.message}
                </p>
              )}
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  <p className="text-sm text-slate-500">Manage how you receive updates</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: "reminders", label: "Learning Reminders", desc: "Daily study reminders" },
                  { key: "achievements", label: "Achievements", desc: "When you earn badges or milestones" },
                  { key: "teacherMessages", label: "Teacher Messages", desc: "Messages from your teachers" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Privacy & Security</h3>
                  <p className="text-sm text-slate-500">Manage your privacy settings</p>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                  <div className="text-left">
                    <p className="font-medium text-slate-900 dark:text-white">Change Password</p>
                    <p className="text-sm text-slate-500">Update your login credentials</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                  <div className="text-left">
                    <p className="font-medium text-slate-900 dark:text-white">Profile Visibility</p>
                    <p className="text-sm text-slate-500">Control who can see your profile</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Appearance</h3>
                  <p className="text-sm text-slate-500">Customize how the app looks</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => document.documentElement.classList.remove("dark")}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition border-2 border-transparent dark:border-transparent hover:border-blue-500"
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Light</span>
                </button>
                <button 
                  onClick={() => document.documentElement.classList.add("dark")}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition border-2 border-transparent dark:border-transparent hover:border-blue-500"
                >
                  <Moon className="w-5 h-5 text-indigo-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Dark</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
