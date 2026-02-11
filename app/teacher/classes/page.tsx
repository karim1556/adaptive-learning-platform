"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { getTeacherDashboard, createClass, getClassStudents, type Class, type ClassStudent } from "@/lib/data-service"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { TeacherHeader } from "@/components/teacher/header"
import { StudentInsights } from "@/components/teacher/student-insights"
import { getStudentProfile, type StudentProfile } from "@/lib/teacher-data"
import {
  Users,
  BookOpen,
  Plus,
  Copy,
  Check,
  TrendingUp,
  Zap,
  Search,
  MoreVertical,
  ChevronRight,
  X,
  Eye,
  Ear,
  BookText,
  Hand,
  User,
  ArrowRight
} from "lucide-react"

const VARK_CONFIG = {
  Visual: { icon: Eye, color: "bg-blue-500" },
  Auditory: { icon: Ear, color: "bg-purple-500" },
  Reading: { icon: BookText, color: "bg-emerald-500" },
  Kinesthetic: { icon: Hand, color: "bg-amber-500" },
}

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function TeacherClassesPage() {
  const { user, loading } = useRequireAuth(["teacher"])
  const [classes, setClasses] = useState<Class[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassName, setNewClassName] = useState("")
  const [newClassSubject, setNewClassSubject] = useState("")
  const [newClassCode, setNewClassCode] = useState("")
  const [copiedCode, setCopiedCode] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<StudentProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Fetch students when a class is selected
  useEffect(() => {
    if (!selectedClass) {
      setClassStudents([])
      return
    }
    
    ;(async () => {
      setLoadingStudents(true)
      try {
        const students = await getClassStudents(selectedClass.classCode)
        setClassStudents(students)
      } catch (e) {
        console.error("Error fetching students:", e)
      } finally {
        setLoadingStudents(false)
      }
    })()
  }, [selectedClass?.classCode])

  // Fetch student profile when selected
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudentProfile(null)
      return
    }

    ;(async () => {
      setLoadingProfile(true)
      try {
        // Find the student in classStudents to get their name
        const selectedStudent = classStudents.find(s => s.id === selectedStudentId)
        const profile = await getStudentProfile(selectedStudentId, selectedStudent?.name)
        setSelectedStudentProfile(profile)
      } catch (e) {
        console.error("Error fetching student profile:", e)
        setSelectedStudentProfile(null)
      } finally {
        setLoadingProfile(false)
      }
    })()
  }, [selectedStudentId])

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        console.log("Loading classes for teacher:", user.id)
        const data = await getTeacherDashboard(user.id)
        console.log("Teacher dashboard data:", data)
        if (data) {
          console.log("Classes found:", data.classes.length, data.classes)
          setClasses(data.classes)
        }
      } catch (e) {
        console.error("Error loading classes:", e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !user) return

    const code = newClassCode || generateClassCode()
    const result = await createClass(
      user.id,
      newClassName,
      newClassSubject || "General",
      ""
    )

    if (result.success && result.classCode) {
      const newClass: Class = {
        id: crypto.randomUUID(),
        classCode: result.classCode,
        className: newClassName,
        subject: newClassSubject || "General",
        grade: "",
        teacherId: user.id,
        studentCount: 0,
        averageMastery: 0,
        averageEngagement: 0,
        createdAt: new Date().toISOString(),
      }
      setClasses([...classes, newClass])
      setNewClassCode(result.classCode)
    }
  }

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const filteredClasses = classes.filter(
    (c) =>
      c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading || isLoading) {
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
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Classes</h1>
                <p className="text-slate-500 mt-1">Manage your classes and view student progress</p>
              </div>
              <button
                onClick={() => {
                  setNewClassName("")
                  setNewClassSubject("")
                  setNewClassCode(generateClassCode())
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                Create Class
              </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Classes Grid */}
            {filteredClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredClasses.map((classData) => (
                  <div
                    key={classData.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition cursor-pointer"
                    onClick={() => setSelectedClass(classData)}
                  >
                    {/* Color Header */}
                    <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />

                    <div className="p-5">
                      {/* Class Name */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{classData.className}</h3>
                            <p className="text-sm text-slate-500">{classData.subject}</p>
                          </div>
                        </div>
                      </div>

                      {/* Code */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-slate-400">Code:</span>
                        <code className="text-sm font-mono font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                          {classData.classCode}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyCode(classData.classCode)
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        >
                          {copiedCode ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {classData.studentCount || 0}
                          </div>
                          <div className="text-xs text-slate-500">Students</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="text-lg font-bold text-emerald-600">
                            {classData.averageMastery || 0}%
                          </div>
                          <div className="text-xs text-slate-500">Mastery</div>
                        </div>
                        <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="text-lg font-bold text-blue-600">
                            {classData.averageEngagement || 0}%
                          </div>
                          <div className="text-xs text-slate-500">Engage</div>
                        </div>
                      </div>

                      {/* View Button */}
                      <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                        View Class
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No classes yet</h3>
                <p className="text-slate-500 mb-4">Create your first class to get started</p>
                <button
                  onClick={() => {
                    setNewClassCode(generateClassCode())
                    setShowCreateModal(true)
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
                >
                  Create Class
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Create Class Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create New Class</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g., Math 101"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="e.g., Mathematics"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Class Code
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 font-mono text-lg text-center font-semibold text-indigo-600">
                      {newClassCode}
                    </code>
                    <button
                      onClick={() => handleCopyCode(newClassCode)}
                      className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      {copiedCode ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Share this code with students to join the class
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleCreateClass()
                    setShowCreateModal(false)
                  }}
                  disabled={!newClassName.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Class
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Class Detail Modal */}
        {selectedClass && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedClass.className}</h2>
                  <p className="text-sm text-slate-500">{selectedClass.subject}</p>
                </div>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                    <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {selectedClass.studentCount || 0}
                    </div>
                    <div className="text-sm text-slate-500">Students</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-emerald-600">{selectedClass.averageMastery || 0}%</div>
                    <div className="text-sm text-slate-500">Avg Mastery</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                    <Zap className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{selectedClass.averageEngagement || 0}%</div>
                    <div className="text-sm text-slate-500">Avg Engagement</div>
                  </div>
                </div>

                {/* Students */}
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Students</h3>
                {loadingStudents ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-slate-500">Loading students...</p>
                  </div>
                ) : classStudents.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {classStudents.map((student, index) => (
                      <button
                        key={student.id}
                        onClick={() => setSelectedStudentId(student.id)}
                        className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600/50 transition cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            {student.rollNumber && (
                              <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-medium">
                                Roll: {student.rollNumber}
                              </span>
                            )}
                            {student.dominantStyle && (
                              <span className="text-xs">{student.dominantStyle}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-emerald-600">{student.masteryScore}%</p>
                            <p className="text-xs text-slate-400">Mastery</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No students have joined yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Share code: <code className="font-mono text-indigo-600">{selectedClass.classCode}</code>
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setSelectedClass(null)}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student Insights Modal */}
        {selectedStudentId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Student Insights</h2>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingProfile ? (
                  <div className="text-center py-16">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Loading student profile...</p>
                  </div>
                ) : selectedStudentProfile ? (
                  <StudentInsights student={selectedStudentProfile} />
                ) : (
                  <div className="text-center py-16">
                    <p className="text-slate-500">Profile not found</p>
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
