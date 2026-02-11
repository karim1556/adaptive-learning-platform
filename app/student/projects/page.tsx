"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { FolderOpen, Calendar, Users, Target, Clock, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { getStudentProjects, type Project } from "@/lib/data-service"
import Link from "next/link"

export default function StudentProjectsPage() {
  const { user, loading } = useRequireAuth(["student"])
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadProjects = async () => {
      try {
        console.log("Loading projects for student:", user.id)

        // 1) Try joined classes from class_students table
        let { data: enrollments, error } = await supabase
          .from("class_students")
          .select("class_id, class_code")
          .eq("student_id", user.id)

        if (error) {
          console.error("Error fetching enrollments:", error)
          console.error("Full error:", JSON.stringify(error, null, 2))
        }

        console.log("Student enrollments:", enrollments)

        let classIds = (enrollments || []).map((e: any) => e.class_id).filter(Boolean) || []
        console.log("Class IDs for project query (from class_students):", classIds)

        // 2) Fallback: if no enrollments found, try auth metadata `joinedClasses`
        if (classIds.length === 0) {
          try {
            const { data: authData } = await supabase.auth.getUser()
            const joined = (authData?.user?.user_metadata?.joinedClasses || []) as any[]
            const codesRaw = joined.map(c => c.classCode).filter(Boolean)
            const codes = codesRaw.map((s: string) => s.toString().trim().toUpperCase())
            console.log("Fallback joined class codes from auth metadata:", codesRaw, "=> normalized:", codes)

            if (codes.length > 0) {
              // Fetch all classes - only select columns that actually exist
              const { data: classesData, error: classesErr } = await supabase
                .from("classes")
                .select("id, class_code, class_name")
                .limit(200)

              if (classesErr) {
                console.warn("Warning fetching classes for fallback codes:", classesErr)
              }

              const rows = classesData || []
              console.log("All classes from DB:", rows)
              
              const matched = rows.filter((c: any) => {
                const candidate = (c.class_code || "").toString().trim().toUpperCase()
                const isMatch = codes.includes(candidate)
                console.log(`Comparing class_code "${c.class_code}" (normalized: "${candidate}") with codes ${JSON.stringify(codes)} = ${isMatch}`)
                return isMatch
              })

              classIds = matched.map((c: any) => c.id).filter(Boolean)
              console.log("Resolved fallback class IDs from classes table:", classIds, "matched classes:", matched)
            }
          } catch (af) {
            console.error("Auth metadata fallback failed:", af)
          }
        }

        // 3) If we have class IDs, fetch projects
        if (classIds.length > 0) {
          console.log("Fetching projects for class IDs:", classIds)
          const projectsList = await getStudentProjects(user.id, classIds)
          console.log("Projects found:", projectsList.length, projectsList)
          setProjects(projectsList)
        } else {
          console.log("No classes joined - student needs to join a class first")
        }
      } catch (e) {
        console.error("Error loading projects:", e)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProjects()
  }, [user])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const getDueDateStatus = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return { label: "Overdue", color: "text-red-600 bg-red-50" }
    if (daysLeft <= 3) return { label: `${daysLeft} days left`, color: "text-amber-600 bg-amber-50" }
    if (daysLeft <= 7) return { label: `${daysLeft} days left`, color: "text-blue-600 bg-blue-50" }
    return { label: `${daysLeft} days left`, color: "text-slate-600 bg-slate-100" }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projects</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Your project-based learning assignments
              </p>
            </div>

            {projects.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    No Projects Yet
                  </h3>
                  <p className="text-slate-500 mb-4">
                    Projects from your classes will appear here. Make sure you've joined a class first!
                  </p>
                  <Link href="/student/join-class">
                    <Button>Join a Class</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => {
                  const dueStatus = project.dueDate ? getDueDateStatus(project.dueDate) : null
                  
                  return (
                    <Card 
                      key={project.id} 
                      className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span>{project.title}</span>
                          </CardTitle>
                          {dueStatus && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${dueStatus.color}`}>
                              {dueStatus.label}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-300 text-sm">
                          {project.description || "No description provided"}
                        </p>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {project.dueDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-300">
                                Due {new Date(project.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {project.difficulty && (
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-slate-400" />
                              <span className={`font-medium ${
                                project.difficulty === "Easy" ? "text-green-600" :
                                project.difficulty === "Medium" ? "text-amber-600" :
                                "text-red-600"
                              }`}>
                                {project.difficulty}
                              </span>
                            </div>
                          )}
                          {project.teams?.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {project.teams.length} team(s)
                              </span>
                            </div>
                          )}
                        </div>

                        {project.learningStyles?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {project.learningStyles.map(style => (
                              <span 
                                key={style} 
                                className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
                              >
                                {style}
                              </span>
                            ))}
                          </div>
                        )}

                        {project.milestones?.length > 0 && (
                          <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
                            <p className="text-xs text-slate-500 mb-2">Milestones</p>
                            <div className="space-y-1">
                              {project.milestones.slice(0, 3).map((milestone) => (
                                <div 
                                  key={milestone.id} 
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <div className={`w-2 h-2 rounded-full ${
                                    milestone.completed ? "bg-green-500" : "bg-slate-300"
                                  }`} />
                                  <span className={milestone.completed ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-300"}>
                                    {milestone.title}
                                  </span>
                                </div>
                              ))}
                              {project.milestones.length > 3 && (
                                <p className="text-xs text-slate-400">
                                  +{project.milestones.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <Button 
                          className="w-full mt-2 group"
                          variant="outline"
                          onClick={() => router.push(`/student/projects/${project.id}`)}
                        >
                          View Project
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
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
