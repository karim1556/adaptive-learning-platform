"use client"

import { useEffect, useState } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { StudentSidebar } from "@/components/student/sidebar"
import { StudentHeader } from "@/components/student/header"
import { GraduationCap, BookOpen, Users, CheckCircle, Plus, ArrowRight } from "lucide-react"

export default function MyClassesPage() {
  const { user, loading } = useRequireAuth(["student"])
  const [classes, setClasses] = useState<any[]>([])
  const [activeClass, setActiveClassState] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    ;(async () => {
      // prefer server-side joinedClasses in user metadata
      try {
        const { data: authData } = await supabase.auth.getUser()
        const meta = (authData?.user?.user_metadata || {}) as any
        const joined = meta.joinedClasses || meta.joined_classes || null
        const active = meta.activeClass || null
        if (active) setActiveClassState(active)
        if (Array.isArray(joined)) {
          setClasses(joined)
          return
        }
      } catch (e) {
        // ignore
      }

      // fallback to localStorage
      try {
        const raw = localStorage.getItem("adaptiq_student_meta_v1")
        const s = raw ? JSON.parse(raw) : {}
        const joined = s && s[user.id] && s[user.id].joinedClasses
        const active = s && s[user.id] && s[user.id].activeClass
        if (active) setActiveClassState(active)
        setClasses(joined || [])
      } catch (e) {
        setClasses([])
      }
    })()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (!user) return null

  const setActive = async (c: any) => {
    // Persist active class to user metadata and localStorage
    try {
      const { error } = await supabase.auth.updateUser({ data: { activeClass: c } })
    } catch (e) {
      // ignore
    }

    try {
      const raw = localStorage.getItem("adaptiq_student_meta_v1")
      const s = raw ? JSON.parse(raw) : {}
      const cur = s[user.id] || {}
      cur.activeClass = c
      s[user.id] = cur
      localStorage.setItem("adaptiq_student_meta_v1", JSON.stringify(s))
    } catch (e) {
      // ignore
    }

    setActiveClassState(c)
    router.push("/student/dashboard")
  }

  const isActiveClass = (c: any) => {
    if (!activeClass) return false
    return (activeClass.classCode || activeClass.class_code) === (c.classCode || c.class_code)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      <StudentSidebar />
      
      <div className="flex-1 flex flex-col">
        <StudentHeader user={user} />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-blue-500" />
                  My Classes
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  View and manage your enrolled classes
                </p>
              </div>
              <Button 
                onClick={() => router.push("/student/join-class")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Join Class
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{classes.length}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Classes</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {activeClass ? 1 : 0}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Active Class</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0) || '—'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Classmates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Classes List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Enrolled Classes</h2>
              </div>
              
              {classes.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No Classes Yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    You haven't joined any classes yet. Get started by joining a class!
                  </p>
                  <Button 
                    onClick={() => router.push("/student/join-class")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Join Your First Class
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {classes.map((c: any) => (
                    <div 
                      key={c.classCode || c.class_code || c.className} 
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isActiveClass(c) 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {c.className || c.class_name || c.classCode || c.class_code}
                              </h3>
                              {isActiveClass(c) && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Code: {c.classCode || c.class_code}
                              {c.subject && ` • ${c.subject}`}
                              {c.grade && ` • Grade ${c.grade}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!isActiveClass(c) && (
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => setActive(c)}
                            >
                              Set Active
                            </Button>
                          )}
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/student/dashboard")}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
