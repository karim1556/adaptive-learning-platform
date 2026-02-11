"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeacherHeader } from "@/components/teacher/header"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { FolderOpen, Plus, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  createProject, 
  getProjects, 
  getTeacherClasses,
  type Project,
  type Class 
} from "@/lib/data-service"

type MilestoneDraft = { title: string; dueDate: string }

export default function TeacherProjectsPage() {
  const { user, loading } = useRequireAuth(["teacher"])
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [concept, setConcept] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "">("")
  const [learningStyles, setLearningStyles] = useState<string[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([])

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      const [projectsList, classesList] = await Promise.all([
        getProjects(user.id),
        getTeacherClasses(user.id)
      ])
      setProjects(projectsList)
      setClasses(classesList)
    }
    loadData()
  }, [user])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setConcept("")
    setDueDate("")
    setDifficulty("")
    setLearningStyles([])
    setSelectedClassId("")
    setMilestones([])
  }

  const handleCreate = async () => {
    if (!user || !title) return
    setSaving(true)
    const result = await createProject(user.id, {
      title,
      description,
      classId: selectedClassId || undefined,
      conceptId: concept || undefined,
      dueDate: dueDate || new Date().toISOString(),
      difficulty: difficulty || undefined,
      learningStyles,
      milestones: milestones.filter(m => m.title.trim() !== "")
    })
    if (result.success) {
      const updatedProjects = await getProjects(user.id)
      setProjects(updatedProjects)
      resetForm()
      setCreateOpen(false)
    } else {
      alert(`Failed to create project: ${result.error}`)
    }
    setSaving(false)
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projects</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Manage project-based learning assignments</p>
              </div>

              <>
                <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Project
                </Button>

                <Dialog open={createOpen} onOpenChange={(v) => setCreateOpen(v)}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <input
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                      />
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                      >
                        <option value="">Select Class (Optional)</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.className || cls.name} ({cls.classCode})
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Concept"
                        value={concept}
                        onChange={(e) => setConcept(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
                      />
                      <textarea
                        placeholder="Short description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border rounded h-24 dark:bg-slate-800 dark:border-slate-700"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="p-2 border rounded dark:bg-slate-800 dark:border-slate-700" />
                        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className="p-2 border rounded dark:bg-slate-800 dark:border-slate-700">
                          <option value="">Difficulty</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium">Target Learning Styles (VARK)</p>
                        <div className="flex gap-2 flex-wrap">
                          {["Visual", "Auditory", "Reading", "Kinesthetic"].map((s) => (
                            <label key={s} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={learningStyles.includes(s)}
                                onChange={(e) => {
                                  if (e.target.checked) setLearningStyles((ls) => [...ls, s])
                                  else setLearningStyles((ls) => ls.filter((x) => x !== s))
                                }}
                              />
                              <span>{s}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Milestone creation UI */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Project Milestones</p>
                        <div className="space-y-2">
                          {milestones.map((m, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                placeholder="Milestone title"
                                value={m.title}
                                onChange={e => setMilestones(ms => ms.map((mm, i) => i === idx ? { ...mm, title: e.target.value } : mm))}
                                className="p-2 border rounded w-1/2 dark:bg-slate-800 dark:border-slate-700"
                              />
                              <input
                                type="date"
                                value={m.dueDate}
                                onChange={e => setMilestones(ms => ms.map((mm, i) => i === idx ? { ...mm, dueDate: e.target.value } : mm))}
                                className="p-2 border rounded w-1/3 dark:bg-slate-800 dark:border-slate-700"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setMilestones(ms => ms.filter((_, i) => i !== idx))}
                              >Remove</Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="mt-1"
                          onClick={() => setMilestones(ms => [...ms, { title: "", dueDate: "" }])}
                        >Add Milestone</Button>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Button onClick={handleCreate} disabled={saving || !title}>
                          {saving ? "Creating..." : "Create"}
                        </Button>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.length === 0 ? (
                <Card className="col-span-2 bg-slate-800/50 border-slate-700 p-8 text-center">
                  <FolderOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No projects yet. Create your first project!</p>
                </Card>
              ) : (
                projects.map((project) => {
                  const projectClass = classes.find(c => c.id === project.classId)
                  return (
                    <Card key={project.id} className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-blue-400" />
                          {project.title}
                        </CardTitle>
                        {projectClass && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Users className="w-4 h-4" />
                            {projectClass.name}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-slate-300 text-sm">{project.description || "No description"}</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-400">Due Date</p>
                            <p className="text-white font-semibold">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Concept</p>
                            <p className="text-white font-semibold">{project.conceptId || "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Difficulty</p>
                            <p className="text-white font-semibold">{project.difficulty || "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Teams</p>
                            <p className="text-white font-semibold">{project.teams?.length || 0}</p>
                          </div>
                        </div>
                        {project.learningStyles?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {project.learningStyles.map(style => (
                              <span key={style} className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                                {style}
                              </span>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full border-slate-600 text-white hover:bg-slate-700 bg-transparent"
                          onClick={() => router.push(`/teacher/projects/${project.id}`)}
                        >
                          View & Manage
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
