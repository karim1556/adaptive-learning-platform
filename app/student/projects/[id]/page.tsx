"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { ArrowLeft, Upload, FileText, CheckCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { PeerReviewPanel } from "@/components/pbl/peer-review-panel"
import {
  getProjectById,
  submitProjectWork,
  getStudentSubmission,
  getMilestoneCompletions,
  setMilestoneCompletion,
  type Project,
} from "@/lib/data-service"

export default function StudentProjectDetailPage() {
  const { user, loading } = useRequireAuth(["student"])
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [milestoneStatus, setMilestoneStatus] = useState<Record<string, { completed: boolean; completedAt?: string; notes?: string }>>({})
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [showMilestoneModal, setShowMilestoneModal] = useState<string | null>(null)
  const [milestoneNotes, setMilestoneNotes] = useState("")

  useEffect(() => {
    if (!user || !projectId) return
    const loadData = async () => {
      const [proj, sub] = await Promise.all([
        getProjectById(projectId),
        getStudentSubmission(projectId, user.id)
      ])
      const completions = await getMilestoneCompletions(projectId, user.id)
      setProject(proj)
      setSubmission(sub)
      setMilestoneStatus(completions)
      if (sub) {
        setContent(sub.content || "")
        setFileUrl(sub.file_url || "")
      }
    }
    loadData()
  }, [user, projectId])

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  const handleMilestoneToggle = async (milestoneId: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      // Show modal to add notes when marking as complete
      setShowMilestoneModal(milestoneId)
      setMilestoneNotes("")
    } else {
      // Unmark without notes
      const res = await setMilestoneCompletion(projectId, milestoneId, user.id, false)
      if (res.success) {
        setMilestoneStatus(prev => ({ ...prev, [milestoneId]: { completed: false } }))
      } else {
        alert(`Could not update milestone: ${res.error}`)
      }
    }
  }

  const handleSaveMilestoneCompletion = async () => {
    if (!showMilestoneModal) return
    const res = await setMilestoneCompletion(projectId, showMilestoneModal, user.id, true, milestoneNotes)
    if (res.success) {
      setMilestoneStatus(prev => ({ 
        ...prev, 
        [showMilestoneModal]: { 
          completed: true, 
          completedAt: new Date().toISOString(),
          notes: milestoneNotes 
        } 
      }))
      setShowMilestoneModal(null)
      setMilestoneNotes("")
    } else {
      alert(`Could not update milestone: ${res.error}`)
    }
  }

  const handleSubmit = async () => {
    if (!user || !projectId) return
    setSubmitting(true)
    const result = await submitProjectWork(projectId, user.id, {
      content,
      fileUrl,
    })
    if (result.success) {
      const updatedSub = await getStudentSubmission(projectId, user.id)
      setSubmission(updatedSub)
      alert("Work submitted successfully!")
    } else {
      alert(`Submission failed: ${result.error}`)
    }
    setSubmitting(false)
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <StudentSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <StudentHeader user={user} />
          <main className="flex-1 overflow-auto p-6">
            <p className="text-slate-400">Loading project...</p>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.push("/student/projects")}
              className="mb-4 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>

            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-2xl">{project.title}</CardTitle>
                {submission?.submitted_at && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Submitted on {new Date(submission.submitted_at).toLocaleString()}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Description</p>
                  <p className="text-slate-200">{project.description || "No description provided"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">Due Date</p>
                    <p className="text-white font-semibold">
                      {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Difficulty</p>
                    <p className="text-white font-semibold">{project.difficulty || "-"}</p>
                  </div>
                </div>
                {project.milestones && project.milestones.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Milestones</p>
                    <ul className="space-y-2">
                      {project.milestones.map((m) => {
                        const status = milestoneStatus[m.id]
                        const completed = !!status?.completed
                        return (
                          <li key={m.id} className="flex items-center justify-between text-slate-300 text-sm">
                            <div className="flex-1">
                              <span className={`mr-2 ${completed ? "line-through text-slate-500" : ""}`}>• {m.title}</span>
                              {status?.completedAt && (
                                <span className="text-xs text-slate-500 ml-2">(done {new Date(status.completedAt).toLocaleDateString()})</span>
                              )}
                              {status?.notes && (
                                <p className="text-xs text-slate-400 ml-4 mt-1 italic">&quot;{status.notes}&quot;</p>
                              )}
                            </div>
                            <div>
                              <button
                                className={`text-xs px-2 py-1 rounded ${completed ? "bg-green-600 text-white" : "bg-slate-700 text-slate-200"}`}
                                onClick={() => handleMilestoneToggle(m.id, completed)}
                              >
                                {completed ? "Completed" : "Mark done"}
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Your Submission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-2">
                    Description / Notes
                  </label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe your work, findings, or upload links..."
                    className="bg-slate-900 border-slate-600 text-white min-h-[150px]"
                    disabled={submission?.submitted_at && submission?.status !== 'rejected'}
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-2">
                    File URL (optional)
                  </label>
                  <Input
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or other file link"
                    className="bg-slate-900 border-slate-600 text-white"
                    disabled={submission?.submitted_at && submission?.status !== 'rejected'}
                  />
                </div>
                {submission?.feedback && (
                  <div className="bg-blue-900/20 border border-blue-700 rounded p-4">
                    <p className="text-blue-300 text-sm font-semibold mb-1">Teacher Feedback</p>
                    <p className="text-slate-300 text-sm">{submission.feedback}</p>
                  </div>
                )}
                {submission?.teacher_feedback && submission.status === 'rejected' && (
                  <div className="bg-red-900/20 border border-red-700 rounded p-4">
                    <p className="text-red-300 text-sm font-semibold mb-1">⚠️ Submission Returned</p>
                    <p className="text-slate-300 text-sm">{submission.teacher_feedback}</p>
                    <p className="text-red-400 text-xs mt-2">Please make the requested changes and resubmit.</p>
                  </div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !content || (!!submission?.submitted_at && submission?.status !== 'rejected')}
                  className="w-full"
                >
                  {submitting ? "Submitting..." : submission?.status === 'rejected' ? "Resubmit Work" : submission?.submitted_at ? "Already Submitted" : "Submit Work"}
                </Button>
              </CardContent>
            </Card>

            {/* Peer Review Panel */}
            {submission?.submitted_at && (
              <div className="mt-6">
                <PeerReviewPanel
                  projectId={projectId}
                  studentId={user.id}
                  studentName={`${user.firstName} ${user.lastName}`}
                  isTeacher={false}
                  teamMembers={project.teams && project.teams.length > 0 
                    ? project.teams.flatMap(t => t.members || [])
                    : []}
                  classId={project.classId}
                  onReviewComplete={() => {
                    alert("Review submitted!")
                  }}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Milestone Completion Modal */}
      <Dialog open={!!showMilestoneModal} onOpenChange={(open) => !open && setShowMilestoneModal(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Complete Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Add notes about what you completed for this milestone (optional):
            </p>
            <Textarea
              value={milestoneNotes}
              onChange={(e) => setMilestoneNotes(e.target.value)}
              placeholder="Describe what you did, any challenges, or key learnings..."
              className="bg-slate-900 border-slate-600 text-white min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMilestoneModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMilestoneCompletion}>
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
