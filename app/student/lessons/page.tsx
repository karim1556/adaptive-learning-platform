"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { 
  getPublishedLessons, 
  getAllStudentProgress,
  type Lesson,
  type LessonProgress
} from "@/lib/lesson-service"
import {
  BookOpen,
  Eye,
  Ear,
  BookText,
  Hand,
  Clock,
  HelpCircle,
  CheckCircle,
  Play,
  RotateCcw,
  Trophy,
  Target,
  Flame
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const VARK_OPTIONS = [
  { id: "visual", label: "Visual", icon: Eye, color: "bg-blue-500", gradient: "from-blue-500 to-blue-600" },
  { id: "auditory", label: "Auditory", icon: Ear, color: "bg-purple-500", gradient: "from-purple-500 to-purple-600" },
  { id: "reading", label: "Reading", icon: BookText, color: "bg-emerald-500", gradient: "from-emerald-500 to-emerald-600" },
  { id: "kinesthetic", label: "Kinesthetic", icon: Hand, color: "bg-amber-500", gradient: "from-amber-500 to-amber-600" },
]

export default function StudentLessonsPage() {
  const { user, loading: authLoading } = useRequireAuth(["student"])
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all")
  const [styleFilter, setStyleFilter] = useState<string>("all")

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user?.id])

  // Listen for progress updates from other pages/components
  useEffect(() => {
    const handler = (e: any) => {
      if (!user) return
      // Only refresh for this user
      if (!e?.detail || e.detail.studentId !== user.id) return
      loadData()
    }
    window.addEventListener("progress:updated", handler)
    return () => window.removeEventListener("progress:updated", handler)
  }, [user?.id])

  const loadData = async () => {
    if (!user) return
    
    // Get student's joined classes from metadata
    const { data: authData } = await supabase.auth.getUser()
    const joinedClasses = (authData?.user?.user_metadata?.joinedClasses || []) as { classCode: string; className: string }[]
    
    // Get lessons for all joined classes + lessons without a class (available to all)
    let allLessons: Lesson[] = []
    
    // Get lessons without class restriction (available to everyone)
    const publicLessons = await getPublishedLessons()
    allLessons = publicLessons.filter(l => !l.classId)
    
    // Get lessons for each joined class
    for (const joinedClass of joinedClasses) {
      // Need to get class ID from class code
      const classLessons = publicLessons.filter(l => {
        // Match by classId if available
        return l.classId && joinedClasses.some(jc => jc.classCode)
      })
      allLessons = [...allLessons, ...classLessons]
    }
    
    // Remove duplicates
    const uniqueLessons = Array.from(new Map(allLessons.map(l => [l.id, l])).values())
    
    const progressData = await getAllStudentProgress(user.id)
    
    setLessons(uniqueLessons.length > 0 ? uniqueLessons : publicLessons)
    
    // Convert progress array to object keyed by lessonId
    const progressMap: Record<string, LessonProgress> = {}
    progressData.forEach(p => {
      progressMap[p.lessonId] = p
    })
    setProgress(progressMap)
    setIsLoading(false)
  }

  const getLessonStatus = (lesson: Lesson) => {
    const p = progress[lesson.id]
    if (!p) return "not-started"
    if (p.completedAt) return "completed"
    return "in-progress"
  }

  const getLessonProgress = (lesson: Lesson) => {
    const p = progress[lesson.id]
    if (!p) return 0
    if (p.completedAt) return 100
    return Math.round((p.completedBlocks.length / lesson.blocks.length) * 100)
  }

  const filteredLessons = lessons.filter(lesson => {
    const status = getLessonStatus(lesson)
    
    // Status filter
    if (filter !== "all" && status !== filter) return false
    
    // Style filter
    if (styleFilter !== "all" && lesson.learningMode !== styleFilter) return false
    
    return true
  })

  // Stats
  const stats = {
    total: lessons.length,
    completed: lessons.filter(l => getLessonStatus(l) === "completed").length,
    inProgress: lessons.filter(l => getLessonStatus(l) === "in-progress").length,
    avgScore: Object.values(progress).filter(p => p.completedAt).reduce((sum, p) => sum + (p.overallScore || 0), 0) / 
              Math.max(1, Object.values(progress).filter(p => p.completedAt).length)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                My Lessons
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Interactive lessons with quizzes to track your progress
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                    <p className="text-xs text-slate-500">Total Lessons</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
                    <p className="text-xs text-slate-500">Completed</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.inProgress}</p>
                    <p className="text-xs text-slate-500">In Progress</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(stats.avgScore)}%</p>
                    <p className="text-xs text-slate-500">Avg Score</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                {[
                  { id: "all", label: "All" },
                  { id: "in-progress", label: "In Progress" },
                  { id: "completed", label: "Completed" },
                  { id: "not-started", label: "Not Started" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      filter === f.id
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setStyleFilter("all")}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    styleFilter === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  All Styles
                </button>
                {VARK_OPTIONS.map((vark) => {
                  const Icon = vark.icon
                  return (
                    <button
                      key={vark.id}
                      onClick={() => setStyleFilter(vark.id)}
                      className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${
                        styleFilter === vark.id
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lessons List */}
            {filteredLessons.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {lessons.length === 0 ? "No Lessons Available" : "No Matching Lessons"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {lessons.length === 0 
                    ? "Your teacher hasn't published any lessons yet"
                    : "Try adjusting your filters to see more lessons"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLessons.map((lesson) => {
                  const status = getLessonStatus(lesson)
                  const progressValue = getLessonProgress(lesson)
                  const p = progress[lesson.id]
                  const vark = VARK_OPTIONS.find(v => v.id === lesson.learningMode)
                  const Icon = vark?.icon || BookOpen

                  return (
                    <div
                      key={lesson.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      {/* Top Banner */}
                      <div className={`h-2 bg-gradient-to-r ${vark?.gradient || "from-slate-400 to-slate-500"}`} />

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl ${vark?.color || "bg-slate-500"} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex items-center gap-1">
                            {status === "completed" && (
                              <span className="px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                              </span>
                            )}
                            {status === "in-progress" && (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                                In Progress
                              </span>
                            )}
                            {status === "not-started" && (
                              <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                                New
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{lesson.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                          {lesson.description || "No description"}
                        </p>

                        {/* Posted date */}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                          Posted {lesson.publishedAt 
                            ? new Date(lesson.publishedAt).toLocaleDateString() 
                            : new Date(lesson.createdAt).toLocaleDateString()}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.estimatedDuration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            {lesson.blocks.filter(b => b.type === "checkpoint").length} quizzes
                          </span>
                          <span className="capitalize">{lesson.learningMode}</span>
                        </div>

                        {/* Progress Bar */}
                        {status !== "not-started" && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500">Progress</span>
                              <span className="font-medium text-slate-900 dark:text-white">{progressValue}%</span>
                            </div>
                            <Progress value={progressValue} className="h-2" />
                            {p?.overallScore !== undefined && status === "completed" && (
                              <p className="text-xs text-slate-500 mt-1">
                                Score: <span className="font-medium text-emerald-600">{Math.round(p.overallScore)}%</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Action Button */}
                        <Button
                          className={`w-full ${
                            status === "completed"
                              ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                          onClick={() => router.push(`/student/lessons/${lesson.id}`)}
                        >
                          {status === "completed" ? (
                            <>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Review Lesson
                            </>
                          ) : status === "in-progress" ? (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Continue
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Start Lesson
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
