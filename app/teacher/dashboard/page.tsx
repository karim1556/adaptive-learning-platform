"use client"

import { useState, useEffect, Suspense } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useSearchParams, useRouter } from "next/navigation"
import { TeacherHeader } from "@/components/teacher/header-new"
import { TeacherSidebar } from "@/components/teacher/sidebar-new"
import { supabase } from "@/lib/supabaseClient"
import { 
  getTeacherDashboard, 
  createClass,
  type TeacherDashboard as TeacherDashboardType,
  type Class
} from "@/lib/data-service"
import { getTeacherLessons, getClassLessonProgress, type Lesson } from "@/lib/lesson-service"
import {
  Users,
  TrendingUp,
  Zap,
  AlertTriangle,
  ChevronRight,
  Plus,
  Copy,
  Check,
  X,
  Eye,
  Ear,
  BookText,
  Hand,
  BookOpen
} from "lucide-react"
import Link from "next/link"

const VARK_COLORS = {
  Visual: { bg: "bg-blue-500", light: "bg-blue-50 text-blue-700" },
  Auditory: { bg: "bg-purple-500", light: "bg-purple-50 text-purple-700" },
  Reading: { bg: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700" },
  Kinesthetic: { bg: "bg-amber-500", light: "bg-amber-50 text-amber-700" },
}

function CreateClassModal({ 
  isOpen, 
  onClose, 
  onCreated 
}: { 
  isOpen: boolean
  onClose: () => void
  onCreated: (classCode: string, className: string) => void 
}) {
  const { user } = useRequireAuth(["teacher"])
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [grade, setGrade] = useState("")
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !user) return
    setLoading(true)
    
    const result = await createClass(user.id, name, subject || "General", grade)
    
    if (result.success && result.classCode) {
      setCreatedCode(result.classCode)
      onCreated(result.classCode, name)
    }
    setLoading(false)
  }

  const handleCopy = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setName("")
    setSubject("")
    setGrade("")
    setCreatedCode(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {createdCode ? "Class Created!" : "Create New Class"}
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {createdCode ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Share this code with your students to join:
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="px-6 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-mono text-2xl font-bold text-slate-900 dark:text-white">
                  {createdCode}
                </div>
                <button 
                  onClick={handleCopy}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={handleClose}
                className="mt-6 w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-xl transition"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Algebra 101"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Grade/Level
                </label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., Grade 9"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Create Class
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TeacherDashboardContent() {
  const { user, loading: authLoading } = useRequireAuth(["teacher"])
  const searchParams = useSearchParams()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<TeacherDashboardType | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [profileData, setProfileData] = useState({ firstName: "", lastName: "", department: "" })

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreateModal(true)
      router.replace("/teacher/dashboard")
    }
  }, [searchParams])

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        // Check if profile is complete
        const { data } = await supabase.auth.getUser()
        const meta = data?.user?.user_metadata || {}
        
        if (!meta.teacherProfileComplete) {
          setShowProfileSetup(true)
          setProfileData({
            firstName: meta.firstName || "",
            lastName: meta.lastName || "",
            department: meta.department || ""
          })
        }

        const [dashboardData, lessonsData] = await Promise.all([
          getTeacherDashboard(user.id),
          getTeacherLessons(user.id)
        ])
        setDashboard(dashboardData)
        setLessons(lessonsData)
      } catch (e) {
        console.error("Error loading dashboard:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Listen for progress updates from students
    const handleProgressUpdate = () => {
      console.log("Teacher dashboard: Student progress updated, reloading data")
      loadData()
    }
    window.addEventListener("progress:updated", handleProgressUpdate)

    return () => {
      window.removeEventListener("progress:updated", handleProgressUpdate)
    }
  }, [user?.id])

  const handleProfileSave = async () => {
    if (!profileData.firstName.trim()) return
    
    await supabase.auth.updateUser({
      data: {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        department: profileData.department,
        teacherProfileComplete: true
      }
    })
    
    setShowProfileSetup(false)
    // Refresh dashboard
    if (user) {
      const dashboardData = await getTeacherDashboard(user.id)
      setDashboard(dashboardData)
    }
  }

  const handleClassCreated = (classCode: string, className: string) => {
    // Refresh dashboard
    if (user) {
      getTeacherDashboard(user.id).then(setDashboard)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
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
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Profile Setup Modal */}
            {showProfileSetup && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    Complete Your Profile
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="First Name"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                        className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <input
                        placeholder="Last Name"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                        className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <input
                      placeholder="Department (e.g., Mathematics)"
                      value={profileData.department}
                      onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <button
                      onClick={handleProfileSave}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Welcome{dashboard?.name ? `, ${dashboard.name.split(" ")[0]}` : ""}!
                </h1>
                <p className="text-slate-500 mt-1">
                  {dashboard?.department || "Teacher"} • {dashboard?.totalStudents || 0} students across {dashboard?.classes.length || 0} classes
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                New Class
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{dashboard?.totalStudents || 0}</div>
                <p className="text-sm text-slate-500">Total Students</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{lessons.length}</div>
                <p className="text-sm text-slate-500">Lessons</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{dashboard?.averageMastery || 0}%</div>
                <p className="text-sm text-slate-500">Avg. Mastery</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{dashboard?.averageEngagement || 0}%</div>
                <p className="text-sm text-slate-500">Avg. Engagement</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(dashboard?.alerts.lowMasteryStudents.length || 0) + (dashboard?.alerts.lowEngagementStudents.length || 0)}
                </div>
                <p className="text-sm text-slate-500">Need Attention</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Classes */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 dark:text-white">Your Classes</h2>
                  <Link href="/teacher/classes" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="p-5">
                  {dashboard?.classes && dashboard.classes.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.classes.slice(0, 4).map((cls) => (
                        <div key={cls.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer">
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-900 dark:text-white">{cls.className}</h3>
                            <p className="text-sm text-slate-500">{cls.subject} • {cls.studentCount} students</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{cls.averageMastery}%</div>
                            <div className="text-xs text-slate-500">mastery</div>
                          </div>
                          <div className="px-3 py-1 bg-slate-200 dark:bg-slate-600 rounded-lg font-mono text-xs">
                            {cls.classCode}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No classes yet</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
                      >
                        Create Your First Class
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Learning Style Distribution & Alerts */}
              <div className="space-y-6">
                {/* Learning Styles */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Learning Styles</h2>
                  <div className="space-y-3">
                    {dashboard?.learningStyleDistribution?.map((style) => {
                      const colors = VARK_COLORS[style.name as keyof typeof VARK_COLORS] || { bg: "bg-slate-500", light: "bg-slate-100" }
                      return (
                        <div key={style.name} className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>
                            {style.name[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-700 dark:text-slate-300">{style.name}</span>
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{style.value}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full ${colors.bg} rounded-full`} style={{ width: `${style.value}%` }} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Alerts */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Students Need Attention</h2>
                  {(() => {
                    // Combine and deduplicate students by ID
                    const lowMastery = dashboard?.alerts.lowMasteryStudents || []
                    const lowEngagement = dashboard?.alerts.lowEngagementStudents || []
                    const allAlerts = [...lowMastery, ...lowEngagement]
                    const uniqueStudents = Array.from(
                      new Map(allAlerts.map(s => [s.id, s])).values()
                    )
                    
                    return uniqueStudents.length > 0 ? (
                      <div className="space-y-2">
                        {uniqueStudents.slice(0, 5).map((student) => {
                          const hasLowMastery = lowMastery.some(s => s.id === student.id)
                          const hasLowEngagement = lowEngagement.some(s => s.id === student.id)
                          
                          return (
                            <div 
                              key={student.id} 
                              className={`flex items-center gap-3 p-3 rounded-xl ${
                                hasLowMastery ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                hasLowMastery ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                              }`}>
                                {hasLowMastery ? (
                                  <TrendingUp className="w-4 h-4 text-red-600" />
                                ) : (
                                  <Zap className="w-4 h-4 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{student.name}</p>
                                {hasLowMastery && hasLowEngagement ? (
                                  <p className="text-xs text-red-600">Mastery: {student.masteryScore}% • Low engagement</p>
                                ) : hasLowMastery ? (
                                  <p className="text-xs text-red-600">Mastery: {student.masteryScore}%</p>
                                ) : (
                                  <p className="text-xs text-amber-600">Low engagement</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 text-sm py-4">
                        All students are on track! 🎉
                      </p>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </main>

        <CreateClassModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)}
          onCreated={handleClassCreated}
        />
      </div>
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    }>
      <TeacherDashboardContent />
    </Suspense>
  )
}
