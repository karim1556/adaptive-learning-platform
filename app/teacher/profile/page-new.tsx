"use client"

import { useRequireAuth, useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { TeacherHeader } from "@/components/teacher/header"
import { supabase } from "@/lib/supabaseClient"
import { 
  User, 
  Mail, 
  Briefcase, 
  LogOut,
  Settings,
  Shield
} from "lucide-react"

export default function TeacherProfilePage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["teacher"])
  const { logout } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("authSession")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-3xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
              <p className="text-slate-500 mt-1">Manage your account and professional information</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Avatar Section */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="text-white">
                    <h2 className="text-xl font-semibold">{user.firstName} {user.lastName}</h2>
                    <p className="text-indigo-100">{user.email}</p>
                    <span className="inline-block mt-2 px-3 py-1 bg-white/20 text-sm rounded-full">
                      Educator
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Professional Information</h3>
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl md:col-span-2">
                    <p className="text-xs text-slate-500 mb-1">Role</p>
                    <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      Teacher / Educator
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Account</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => router.push("/teacher/settings")}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition text-left"
                >
                  <Settings className="w-5 h-5 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Settings</p>
                    <p className="text-sm text-slate-500">Manage classes, notifications</p>
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
