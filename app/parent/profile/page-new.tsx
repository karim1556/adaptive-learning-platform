"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ParentSidebar } from "@/components/parent/sidebar"
import { ParentHeader } from "@/components/parent/header"
import { User, Mail, Phone, MapPin, Calendar, LogOut, Shield, Bell } from "lucide-react"

export default function ParentProfilePage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["parent"])
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }
  
  if (!user) return null

  const handleLogout = () => {
    localStorage.removeItem("authSession")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <ParentSidebar />
      
      <div className="flex-1 flex flex-col">
        <ParentHeader user={user} />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-12">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-slate-800 shadow-lg">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="mb-2">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Parent Account</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm text-slate-500 dark:text-slate-400">First Name</label>
                  <p className="text-slate-900 dark:text-white font-medium">{user.firstName || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-500 dark:text-slate-400">Last Name</label>
                  <p className="text-slate-900 dark:text-white font-medium">{user.lastName || "Not set"}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">{user.email}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> Phone
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">Not provided</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> Location
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">Not provided</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Member Since
                  </label>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Linked Children */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Linked Children
              </h2>
              
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <p>No children linked yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push("/parent/children")}
                >
                  Link a Child
                </Button>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Actions</h2>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => router.push("/parent/settings")}
                >
                  <Bell className="w-4 h-4" />
                  Notification Settings
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
