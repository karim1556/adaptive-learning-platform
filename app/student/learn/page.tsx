"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { StudentSidebar } from "@/components/student/sidebar"
import {
  Brain,
  Search,
  BookOpen,
  Video,
  FileText,
  Headphones,
  Users,
  Clock,
  CheckCircle,
  Play,
  Filter,
  Sparkles,
  Moon,
  Sun,
  Bell,
} from "lucide-react"
import Link from "next/link"
import { getPublishedLessons, getAllStudentProgress, type Lesson, type LessonProgress } from "@/lib/lesson-service"
import { supabase } from "@/lib/supabaseClient"

interface JoinedClass {
  id?: string
  classCode?: string
  className?: string
  name?: string
  subject?: string
}

interface LessonWithClass extends Lesson {
  className?: string
  classSubject?: string
  progress?: LessonProgress
}

// Simple inline header to avoid prop issues
function SimpleHeader() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])
  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark")
    setIsDark(!isDark)
  }
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <button className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition relative">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

const varkLabels = {
  visual: { label: "Visual", icon: Video, color: "bg-blue-500" },
  auditory: { label: "Auditory", icon: Headphones, color: "bg-purple-500" },
  reading: { label: "Reading", icon: FileText, color: "bg-green-500" },
  kinesthetic: { label: "Kinesthetic", icon: Brain, color: "bg-orange-500" },
}

export default function LearnPage() {
  const [lessons, setLessons] = useState<LessonWithClass[]>([])
  const [filteredLessons, setFilteredLessons] = useState<LessonWithClass[]>([])
  const [joinedClasses, setJoinedClasses] = useState<JoinedClass[]>([])
  const [classFilter, setClassFilter] = useState<string>("all")
  const [varkFilter, setVarkFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [studentVark, setStudentVark] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterLessons()
  }, [lessons, classFilter, varkFilter, searchQuery])

  async function loadData() {
    try {
      // Get current user and their joined classes
      const { data: { user } } = await supabase.auth.getUser()
      
      let classes: JoinedClass[] = []
      let userVark: string | null = null
      let studentId = ""
      
      if (user) {
        classes = user.user_metadata?.joinedClasses || []
        
        // FIX: If classes don't have IDs, fetch them from Supabase
        if (classes.length > 0 && !classes[0].id) {
          console.log("⚠️ Joined classes missing IDs, fetching from database...")
          const classCodes = classes.map(c => c.classCode).filter(Boolean)
          
          if (classCodes.length > 0) {
            const { data: classData } = await supabase
              .from("classes")
              .select("id, class_code, class_name, subject")
              .in("class_code", classCodes)
            
            if (classData && classData.length > 0) {
              // Map class codes to IDs
              classes = classes.map(c => {
                const match = classData.find(cd => cd.class_code === c.classCode)
                return {
                  id: match?.id || c.id,
                  classCode: c.classCode,
                  name: match?.class_name || c.className || c.name,
                  subject: match?.subject || c.subject || ""
                }
              }).filter(c => c.id) // Only keep classes with IDs
              
              // Update user metadata with corrected class data
              await supabase.auth.updateUser({
                data: {
                  joinedClasses: classes
                }
              })
              console.log("✅ Updated joined classes with IDs:", classes)
            }
          }
        }
        
        userVark = user.user_metadata?.varkStyle || null
        studentId = user.id
      } else {
        // Fallback to localStorage for demo
        const stored = localStorage.getItem("user")
        if (stored) {
          const userData = JSON.parse(stored)
          classes = userData.joinedClasses || []
          userVark = userData.varkStyle || null
          studentId = userData.id || "demo-student"
        }
      }
      
      setJoinedClasses(classes)
      setStudentVark(userVark)
      
      // Get all published lessons (async)
      const allLessons = await getPublishedLessons()
      
      // Get student's progress for all lessons
      const allProgress = studentId ? await getAllStudentProgress(studentId) : []
      const progressMap = new Map(allProgress.map(p => [p.lessonId, p]))
      
      // Include lessons from joined classes OR lessons without a class (available to all)
      const classIds = classes.map(c => c.id)
      
      const lessonsWithProgress: LessonWithClass[] = allLessons
        .filter(lesson => !lesson.classId || classIds.includes(lesson.classId))
        .map(lesson => {
          const classInfo = lesson.classId ? classes.find(c => c.id === lesson.classId) : null
          const progress = progressMap.get(lesson.id)
          return {
            ...lesson,
            className: classInfo?.name || (lesson.classId ? "Unknown Class" : "General"),
            classSubject: classInfo?.subject || "",
            progress: progress || undefined,
          }
        })
      
      // Sort by VARK preference first, then by date
      lessonsWithProgress.sort((a, b) => {
        // Prioritize lessons matching student's learning style
        if (userVark) {
          const aMatchesVark = a.learningMode === userVark
          const bMatchesVark = b.learningMode === userVark
          if (aMatchesVark && !bMatchesVark) return -1
          if (!aMatchesVark && bMatchesVark) return 1
        }
        // Then sort by publish date (newest first)
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
        return dateB - dateA
      })
      
      setLessons(lessonsWithProgress)
    } catch (error) {
      console.error("Error loading learn data:", error)
    } finally {
      setLoading(false)
    }
  }

  function filterLessons() {
    let filtered = [...lessons]
    
    // Filter by class
    if (classFilter !== "all") {
      filtered = filtered.filter(l => l.classId === classFilter)
    }
    
    // Filter by VARK type
    if (varkFilter !== "all") {
      filtered = filtered.filter(l => l.learningMode === varkFilter)
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(l => 
        l.title.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query) ||
        l.className?.toLowerCase().includes(query)
      )
    }
    
    setFilteredLessons(filtered)
  }

  function getLessonStatus(lesson: LessonWithClass): { label: string; color: string } {
    if (lesson.progress?.completedAt) {
      return { label: "Completed", color: "bg-green-500" }
    }
    if (lesson.progress?.currentBlockIndex && lesson.progress.currentBlockIndex > 0) {
      return { label: "In Progress", color: "bg-blue-500" }
    }
    return { label: "Not Started", color: "bg-gray-400" }
  }

  function getProgressPercent(lesson: LessonWithClass): number {
    if (!lesson.progress) return 0
    if (lesson.progress.completedAt) return 100
    const totalBlocks = lesson.blocks.length
    if (totalBlocks === 0) return 0
    return Math.round((lesson.progress.currentBlockIndex / totalBlocks) * 100)
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const recommendedLessons = lessons.filter(l => 
    !l.progress?.completedAt && studentVark && l.learningMode === studentVark
  ).slice(0, 3)

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <StudentSidebar />
        <div className="flex-1">
          <SimpleHeader />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <StudentSidebar />
      <div className="flex-1">
        <SimpleHeader />
        <main className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Learning Center</h1>
              <p className="text-muted-foreground">
                Explore lessons from your classes
              </p>
            </div>
          </div>

          {/* VARK Personalization Banner */}
          {studentVark && recommendedLessons.length > 0 && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/20">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">
                      Recommended for your {varkLabels[studentVark as keyof typeof varkLabels]?.label || studentVark} learning style
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {recommendedLessons.length} lesson{recommendedLessons.length !== 1 ? "s" : ""} matching your preferences
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lessons..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={classFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setClassFilter("all")}
              >
                All Classes
              </Button>
              {joinedClasses.map((cls, idx) => (
                <span key={cls.id ?? `${cls.name}-${idx}`}>
                  <Button
                    variant={classFilter === cls.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setClassFilter(cls.id ?? "all")}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {cls.name}
                  </Button>
                </span>
              ))}
            </div>
          </div>

          {/* VARK Filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 mr-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Learning Style:</span>
            </div>
            <Button
              variant={varkFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setVarkFilter("all")}
            >
              All Styles
            </Button>
            {Object.entries(varkLabels).map(([key, { label, icon: Icon, color }]) => (
              <Button
                key={key}
                variant={varkFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setVarkFilter(key)}
                className="gap-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>

          {/* No Classes Message */}
          {joinedClasses.length === 0 && (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Classes Joined</h3>
              <p className="text-muted-foreground mb-4">
                Join a class to see lessons from your teachers.
              </p>
              <Link href="/student/join-class">
                <Button>Join a Class</Button>
              </Link>
            </Card>
          )}

          {/* Lessons Grid */}
          {joinedClasses.length > 0 && (
            <>
              {filteredLessons.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Lessons Found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || classFilter !== "all" || varkFilter !== "all"
                      ? "Try adjusting your filters or search query."
                      : "Your teachers haven't published any lessons yet."}
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredLessons.map((lesson) => {
                    const status = getLessonStatus(lesson)
                    const progress = getProgressPercent(lesson)
                    const VarkIcon = varkLabels[lesson.learningMode as keyof typeof varkLabels]?.icon || BookOpen
                    const varkColor = varkLabels[lesson.learningMode as keyof typeof varkLabels]?.color || "bg-gray-500"

                    return (
                      <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${varkColor}`}>
                                <VarkIcon className="h-4 w-4 text-white" />
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {lesson.className}
                              </Badge>
                            </div>
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                          <CardTitle className="text-lg mt-2">{lesson.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {lesson.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {lesson.blocks.length} blocks
                            </span>
                            {lesson.publishedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(lesson.publishedAt)}
                              </span>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {lesson.progress && progress > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}

                          {/* VARK Match Indicator */}
                          {studentVark && lesson.learningMode === studentVark && (
                            <div className="flex items-center gap-1 text-xs text-primary">
                              <Sparkles className="h-3 w-3" />
                              Matches your learning style
                            </div>
                          )}

                          <Link href={`/student/lessons/${lesson.id}`} className="block">
                            <Button className="w-full" variant={lesson.progress?.completedAt ? "outline" : "default"}>
                              {lesson.progress?.completedAt ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Review Lesson
                                </>
                              ) : lesson.progress ? (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Continue Lesson
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Lesson
                                </>
                              )}
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Stats Summary */}
          {lessons.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold">{lessons.length}</div>
                <div className="text-sm text-muted-foreground">Total Lessons</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lessons.filter(l => l.progress?.completedAt).length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {lessons.filter(l => l.progress && !l.progress.completedAt).length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {lessons.filter(l => !l.progress).length}
                </div>
                <div className="text-sm text-muted-foreground">Not Started</div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
