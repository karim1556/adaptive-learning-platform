"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { TeacherHeader } from "@/components/teacher/header"
import { createClass, getTeacherClasses, type Class } from "@/lib/data-service"
import { supabase } from "@/lib/supabaseClient"
import { 
  Settings, 
  BookOpen, 
  Users, 
  Plus, 
  Copy, 
  Check, 
  Trash2,
  Bell,
  Palette,
  Moon,
  Sun,
  X
} from "lucide-react"

export default function TeacherSettingsPage() {
  const router = useRouter()
  const { user, loading } = useRequireAuth(["teacher"])
  const [classes, setClasses] = useState<Class[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassName, setNewClassName] = useState("")
  const [newSubject, setNewSubject] = useState("")
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const data = await getTeacherClasses(user.id)
      setClasses(data)
    })()
  }, [user?.id])

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !user) return
    setIsCreating(true)

    const result = await createClass(user.id, newClassName.trim(), newSubject.trim() || "General")
    if (result.success && result.classCode) {
      setCreatedCode(result.classCode)
      // Refresh classes
      const data = await getTeacherClasses(user.id)
      setClasses(data)
    }
    setIsCreating(false)
  }

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDeleteClass = async (classCode: string) => {
    try {
      await supabase.from("classes").delete().eq("class_code", classCode)
      setClasses(classes.filter(c => c.classCode !== classCode))
    } catch (e) {
      console.error("Error deleting class:", e)
    }
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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-slate-500 mt-1">Manage your classes and preferences</p>
            </div>

            {/* Class Management */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">Class Management</h3>
                    <p className="text-sm text-slate-500">{classes.length} classes</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setNewClassName("")
                    setNewSubject("")
                    setCreatedCode(null)
                    setShowCreateModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Class
                </button>
              </div>

              {classes.length > 0 ? (
                <div className="space-y-3">
                  {classes.map((classData) => (
                    <div
                      key={classData.classCode}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{classData.className}</p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <code className="font-mono text-indigo-600">{classData.classCode}</code>
                            <span>•</span>
                            <span>{classData.studentCount} students</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyCode(classData.classCode)}
                          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition"
                        >
                          {copiedCode === classData.classCode ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClass(classData.classCode)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No classes yet</p>
                  <p className="text-sm text-slate-400">Create your first class to get started</p>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  <p className="text-sm text-slate-500">Manage alert preferences</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Low Mastery Alerts", desc: "When a student's mastery drops below 50%" },
                  { label: "Low Engagement Alerts", desc: "When a student hasn't been active" },
                  { label: "New Student Joined", desc: "When a student joins your class" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
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
                  <p className="text-sm text-slate-500">Customize the look</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => document.documentElement.classList.remove("dark")}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Light</span>
                </button>
                <button 
                  onClick={() => document.documentElement.classList.add("dark")}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Moon className="w-5 h-5 text-indigo-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Dark</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Create Class Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create New Class</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6">
                {createdCode ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Class Created!</h3>
                    <p className="text-slate-500 mb-4">Share this code with your students:</p>
                    <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
                      <code className="text-2xl font-mono font-bold text-indigo-600">{createdCode}</code>
                      <button onClick={() => handleCopyCode(createdCode)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg">
                        {copiedCode === createdCode ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-500" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="mt-6 w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Class Name</label>
                      <input
                        type="text"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        placeholder="e.g. Algebra 1"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="e.g. Mathematics"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <button
                      onClick={handleCreateClass}
                      disabled={!newClassName.trim() || isCreating}
                      className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isCreating ? "Creating..." : "Create Class"}
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
