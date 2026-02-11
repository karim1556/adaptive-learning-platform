"use client"

import { useState } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ParentSidebar } from "@/components/parent/sidebar"
import { ParentHeader } from "@/components/parent/header"
import { 
  Settings, 
  Users, 
  Bell, 
  Mail, 
  Shield, 
  Palette,
  Moon,
  Sun,
  Link,
  AlertCircle,
  TrendingDown,
  Calendar,
  MessageSquare,
  Plus
} from "lucide-react"
import { useTheme } from "next-themes"

export default function ParentSettingsPage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["parent"])
  const { theme, setTheme } = useTheme()
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [childCode, setChildCode] = useState("")

  // Notification preferences
  const [notifications, setNotifications] = useState({
    weeklyReports: true,
    lowEngagement: true,
    gradeAlerts: true,
    teacherMessages: true,
    dailyDigest: false
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }
  
  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <ParentSidebar />
      
      <div className="flex-1 flex flex-col">
        <ParentHeader user={user} />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-emerald-500" />
                Settings
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Manage your account and notification preferences
              </p>
            </div>

            {/* Child Management */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                Child Management
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Link className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Link New Child</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Connect your child's account using their code
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLinkModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Manage Children</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        View and manage linked children
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/parent/children")}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>

            {/* Link Child Modal */}
            {showLinkModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Link Child Account
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Enter the link code provided by your child or their teacher
                  </p>
                  <Input
                    placeholder="Enter child's link code"
                    value={childCode}
                    onChange={(e) => setChildCode(e.target.value)}
                    className="mb-4"
                  />
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowLinkModal(false)
                        setChildCode("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        // Link child logic here
                        setShowLinkModal(false)
                        setChildCode("")
                      }}
                    >
                      Link Account
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-500" />
                Notification Preferences
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Weekly Progress Reports</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Receive weekly summaries of your child's progress
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, weeklyReports: !prev.weeklyReports }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.weeklyReports ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.weeklyReports ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Low Engagement Alerts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Get notified when engagement drops
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, lowEngagement: !prev.lowEngagement }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.lowEngagement ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.lowEngagement ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Grade Alerts</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Notify when grades fall below threshold
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, gradeAlerts: !prev.gradeAlerts }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.gradeAlerts ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.gradeAlerts ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Teacher Messages</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Receive messages from teachers
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, teacherMessages: !prev.teacherMessages }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.teacherMessages ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.teacherMessages ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Daily Digest</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Daily email summary of all activities
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, dailyDigest: !prev.dailyDigest }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.dailyDigest ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.dailyDigest ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Privacy & Security
              </h2>
              
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Two-Factor Authentication
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Data Export
                </Button>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-500" />
                Appearance
              </h2>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    theme === "light" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                      : "border-slate-200 dark:border-slate-600"
                  }`}
                >
                  <Sun className={`w-6 h-6 mx-auto mb-2 ${
                    theme === "light" ? "text-emerald-600" : "text-slate-400"
                  }`} />
                  <p className={`text-sm font-medium ${
                    theme === "light" ? "text-emerald-600" : "text-slate-600 dark:text-slate-400"
                  }`}>Light</p>
                </button>
                
                <button
                  onClick={() => setTheme("dark")}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    theme === "dark" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                      : "border-slate-200 dark:border-slate-600"
                  }`}
                >
                  <Moon className={`w-6 h-6 mx-auto mb-2 ${
                    theme === "dark" ? "text-emerald-400" : "text-slate-400"
                  }`} />
                  <p className={`text-sm font-medium ${
                    theme === "dark" ? "text-emerald-400" : "text-slate-600 dark:text-slate-400"
                  }`}>Dark</p>
                </button>
                
                <button
                  onClick={() => setTheme("system")}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    theme === "system" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                      : "border-slate-200 dark:border-slate-600"
                  }`}
                >
                  <div className={`w-6 h-6 mx-auto mb-2 flex ${
                    theme === "system" ? "text-emerald-500" : "text-slate-400"
                  }`}>
                    <Sun className="w-3 h-6" />
                    <Moon className="w-3 h-6" />
                  </div>
                  <p className={`text-sm font-medium ${
                    theme === "system" ? "text-emerald-500" : "text-slate-600 dark:text-slate-400"
                  }`}>System</p>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
