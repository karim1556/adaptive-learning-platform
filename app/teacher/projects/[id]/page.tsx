"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeacherHeader } from "@/components/teacher/header"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { FolderOpen, ArrowLeft, Edit, Trash2, Users, Plus, CheckCircle, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabaseClient"
import { 
  getProjectById,
  updateProject,
  deleteProject,
  getTeacherClasses,
  getProjectSubmissions,
  type Project,
  type Class 
} from "@/lib/data-service"

type MilestoneDraft = { id?: string; title: string; dueDate: string }

export default function ProjectDetailPage() {
  const { user, loading } = useRequireAuth(["teacher"])
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [milestoneCompletions, setMilestoneCompletions] = useState<any[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackAction, setFeedbackAction] = useState<'approve' | 'reject'>('approve')
  const [saving, setSaving] = useState(false)
  
  // Edit form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [concept, setConcept] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard" | "">("")
  const [learningStyles, setLearningStyles] = useState<string[]>([])
  const [selectedClassId, setSelectedClassId] = useState("")
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([])

  useEffect(() => {
    if (!user || !projectId) return
    const loadData = async () => {
      const [projectData, classesList, subs] = await Promise.all([
        getProjectById(projectId),
        getTeacherClasses(user.id),
        getProjectSubmissions(projectId)
      ])
      
      if (projectData) {
        setProject(projectData)
        setTitle(projectData.title)
        setDescription(projectData.description)
        setConcept(projectData.conceptId || "")
        setDueDate(projectData.dueDate ? projectData.dueDate.split('T')[0] : "")
        setDifficulty(projectData.difficulty || "")
        setLearningStyles(projectData.learningStyles || [])
        setSelectedClassId(projectData.classId || "")
        setMilestones((projectData.milestones || []).map(m => ({ id: m.id, title: m.title, dueDate: m.dueDate ? m.dueDate.split('T')[0] : "" })))
        
        // Fetch milestone completions (support both table names)
        let completions: any[] = []
        try {
          const res = await supabase
            .from("milestone_completions")
            .select("*, student_profiles(user_id)")
            .eq("project_id", projectId)
          if (!res.error && res.data) {
            completions = res.data as any[]
          } else {
            // try the project_milestone_completions variant
            const alt = await supabase
              .from("project_milestone_completions")
              .select("*, student_profiles(user_id)")
              .eq("project_id", projectId)
            if (!alt.error && alt.data) completions = alt.data as any[]
          }
        } catch (e) {
          console.warn('Could not read milestone completions:', e)
        }
        setMilestoneCompletions(completions || [])
      } else {
        router.push("/teacher/projects")
      }
      
      setClasses(classesList)
      setSubmissions(subs)
    }
    loadData()
  }, [user, projectId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !project) return null

  const projectClass = classes.find(c => c.id === project.classId)

  const handleEdit = async () => {
    if (!title) return
    setSaving(true)
    const result = await updateProject(projectId, {
      title,
      description,
      classId: selectedClassId || undefined,
      conceptId: concept || undefined,
      dueDate: dueDate || project.dueDate,
      difficulty: difficulty || undefined,
      learningStyles
    })
    if (result.success) {
      const updated = await getProjectById(projectId)
      if (updated) setProject(updated)
    }
    setSaving(false)
    setEditOpen(false)
  }

  const handleDelete = async () => {
    const result = await deleteProject(projectId)
    if (result.success) {
      router.push("/teacher/projects")
    }
  }

  const handleSubmissionFeedback = async (submissionId: string) => {
    setSaving(true)
    try {
      const status = feedbackAction === 'approve' ? 'approved' : 'rejected'

      // Prefer the `student_project_submissions` table used by the student UI.
      // Fall back to other table-name variants if not present.
      const payload: any = {
        status,
        teacher_feedback: feedbackText,
        reviewed_at: new Date().toISOString(),
      }

      // Only include `reviewed_by` if the reviewer exists in the public.users table,
      // otherwise omit to avoid foreign-key violations in databases where users are stored elsewhere.
      try {
        const { data: reviewer, error: reviewerErr } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single()
        if (!reviewerErr && reviewer) payload.reviewed_by = user.id
      } catch (e) {
        // ignore lookup errors and leave reviewed_by unset
        console.warn("Could not verify reviewer in public.users, skipping reviewed_by", e)
      }

      // Try student_project_submissions first
      let updated = await supabase.from("student_project_submissions").update(payload).eq("id", submissionId)
      if (updated.error) {
        // If table not present or not accessible, try older/newer variants
        if (updated.error.code === 'PGRST205' || updated.error.message?.includes('not found')) {
          const alt1 = await supabase.from("student_submissions").update(payload).eq("id", submissionId)
          if (alt1.error) {
            if (alt1.error.code === 'PGRST205' || alt1.error.message?.includes('not found')) {
              const alt2 = await supabase.from("project_submissions").update(payload).eq("id", submissionId)
              if (alt2.error) throw alt2.error
            } else {
              throw alt1.error
            }
          }
        } else {
          throw updated.error
        }
      }

      // Reload submissions
      const updatedSubs = await getProjectSubmissions(projectId)
      setSubmissions(updatedSubs)
      setFeedbackOpen(null)
      setFeedbackText("")
      alert(`Submission ${status}!`)
    } catch (e) {
      console.error("Error updating submission:", e)
      alert("Failed to update submission")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                className="mb-4"
                onClick={() => router.push("/teacher/projects")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <FolderOpen className="w-8 h-8 text-blue-400" />
                    {project.title}
                  </h1>
                  {projectClass && (
                    <p className="text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {projectClass.name} ({projectClass.classCode})
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Description</p>
                    <p className="text-slate-900 dark:text-white">{project.description || "No description"}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Concept</p>
                      <p className="text-slate-900 dark:text-white">{project.conceptId || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Difficulty</p>
                      <p className="text-slate-900 dark:text-white">{project.difficulty || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</p>
                      <p className="text-slate-900 dark:text-white">
                        {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Created</p>
                      <p className="text-slate-900 dark:text-white">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {project.learningStyles?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Learning Styles (VARK)</p>
                      <div className="flex gap-2 flex-wrap">
                        {project.learningStyles.map(style => (
                          <span key={style} className="text-sm bg-blue-600/20 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                            {style}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.teams?.length > 0 ? (
                    <div className="space-y-3">
                      {project.teams.map(team => (
                        <div key={team.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <p className="font-medium text-slate-900 dark:text-white">{team.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {team.members?.length || 0} members
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 dark:text-slate-400 text-sm">No teams yet</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Team
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student Submissions */}
              <Card className="lg:col-span-3 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Student Submissions ({submissions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400 text-center py-8">No submissions yet</p>
                  ) : (
                    <div className="space-y-4">
                      {submissions.map((sub) => (
                        <div key={sub.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-900 dark:text-white font-medium">
                              Student: {sub.student_id?.substring(0, 8)}...
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                                sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {sub.status || 'pending'}
                              </span>
                              <p className="text-slate-600 dark:text-slate-400 text-sm">
                                {new Date(sub.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 text-sm">{sub.content}</p>
                          {sub.file_url && (
                            <a 
                              href={sub.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm inline-block"
                            >
                              View Submission File →
                            </a>
                          )}
                          {sub.teacher_feedback && (
                            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded border-l-4 border-blue-500">
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Your Feedback:</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{sub.teacher_feedback}</p>
                            </div>
                          )}
                          {(!sub.status || sub.status === 'pending') && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  setFeedbackOpen(sub.id)
                                  setFeedbackAction('approve')
                                  setFeedbackText("")
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  setFeedbackOpen(sub.id)
                                  setFeedbackAction('reject')
                                  setFeedbackText("")
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                                Request Changes
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Milestone Completions */}
              {milestoneCompletions.length > 0 && (
                <Card className="lg:col-span-3 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Milestone Completions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {milestoneCompletions.map((comp) => {
                        const milestone = project?.milestones?.find(m => m.id === comp.milestone_id)
                        return (
                          <div key={comp.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {milestone?.title || 'Unknown Milestone'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Student: {comp.student_id?.substring(0, 8)}... • 
                                  Completed: {new Date(comp.completed_at).toLocaleDateString()}
                                </p>
                                {comp.notes && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
                                    &quot;{comp.notes}&quot;
                                  </p>
                                )}
                              </div>
                              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
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
                  {cls.name} ({cls.classCode})
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
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded h-24 dark:bg-slate-800 dark:border-slate-700"
            />
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="p-2 border rounded dark:bg-slate-800 dark:border-slate-700" 
              />
              <select 
                value={difficulty} 
                onChange={(e) => setDifficulty(e.target.value as any)} 
                className="p-2 border rounded dark:bg-slate-800 dark:border-slate-700"
              >
                <option value="">Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Learning Styles (VARK)</p>
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
            {/* Milestone editing UI */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Project Milestones</p>
              <div className="space-y-2">
                {milestones.map((m, idx) => (
                  <div key={m.id || idx} className="flex gap-2 items-center">
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
            <div className="flex gap-2 pt-2">
              <Button onClick={handleEdit} disabled={saving || !title}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project "{project.title}" and all associated teams, milestones, and submissions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackOpen} onOpenChange={(open) => !open && setFeedbackOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {feedbackAction === 'approve' ? 'Approve Submission' : 'Request Changes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {feedbackAction === 'approve' 
                ? 'Add optional feedback for the student (e.g., "Great work!" or suggestions for improvement):'
                : 'Explain what needs to be changed or improved:'}
            </p>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={feedbackAction === 'approve' 
                ? 'Enter your feedback (optional)...'
                : 'Enter what needs to be changed...'}
              className="min-h-[120px]"
              required={feedbackAction === 'reject'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => feedbackOpen && handleSubmissionFeedback(feedbackOpen)}
              disabled={saving || (feedbackAction === 'reject' && !feedbackText.trim())}
              className={feedbackAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {saving ? 'Saving...' : feedbackAction === 'approve' ? 'Approve' : 'Send Back'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
