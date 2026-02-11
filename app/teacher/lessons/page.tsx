"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeacherHeader } from "@/components/teacher/header"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { 
  createLesson, 
  getTeacherLessons, 
  deleteLesson,
  getTeacherLessonTimeline,
  type Lesson, 
  type LessonBlock,
  type ContentBlock,
  type Checkpoint,
  type Question,
  type LessonTimelineEvent
} from "@/lib/lesson-service"
import { getTeacherClasses } from "@/lib/data-service"
import {
  Plus,
  X,
  BookOpen,
  Eye,
  Ear,
  BookText,
  Hand,
  FileText,
  Video,
  Image,
  Link,
  HelpCircle,
  GripVertical,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Play,
  Settings,
  Calendar,
  UserCheck,
  AlertCircle,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const VARK_OPTIONS = [
  { id: "visual", label: "Visual", icon: Eye, color: "bg-blue-500" },
  { id: "auditory", label: "Auditory", icon: Ear, color: "bg-purple-500" },
  { id: "reading", label: "Reading", icon: BookText, color: "bg-emerald-500" },
  { id: "kinesthetic", label: "Kinesthetic", icon: Hand, color: "bg-amber-500" },
]

const CONTENT_TYPES = [
  { id: "text", label: "Text/Article", icon: FileText },
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: Image },
  { id: "pdf", label: "PDF Document", icon: FileText },
  { id: "embed", label: "Interactive Embed", icon: Link },
]

export default function LessonBuilderPage() {
  const { user, loading: authLoading } = useRequireAuth(["teacher"])
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [timelineEvents, setTimelineEvents] = useState<LessonTimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)

  // Lesson form state
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonDescription, setLessonDescription] = useState("")
  const [conceptName, setConceptName] = useState("")
  const [selectedClass, setSelectedClass] = useState("")
  const [learningMode, setLearningMode] = useState<"visual" | "auditory" | "reading" | "kinesthetic">("visual")
  const [difficulty, setDifficulty] = useState(50)
  const [blocks, setBlocks] = useState<LessonBlock[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Block editing state
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)
  const [showAddBlock, setShowAddBlock] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user) return
    const [lessonsData, classesData, timeline] = await Promise.all([
      getTeacherLessons(user.id),
      getTeacherClasses(user.id),
      getTeacherLessonTimeline(user.id)
    ])
    setLessons(lessonsData)
    setClasses(classesData)
    setTimelineEvents(timeline)
    setIsLoading(false)
  }

  const resetForm = () => {
    setLessonTitle("")
    setLessonDescription("")
    setConceptName("")
    setSelectedClass("")
    setLearningMode("visual")
    setDifficulty(50)
    setBlocks([])
    setIsPublished(false)
    setEditingLesson(null)
    setEditingBlockIndex(null)
  }

  const handleCreateNew = () => {
    resetForm()
    setShowBuilder(true)
  }

  const handleEdit = (lesson: Lesson) => {
    setLessonTitle(lesson.title)
    setLessonDescription(lesson.description)
    setConceptName(lesson.conceptName)
    setSelectedClass(lesson.classId || "")
    setLearningMode(lesson.learningMode)
    setDifficulty(lesson.difficulty)
    setBlocks(lesson.blocks)
    setIsPublished(lesson.published)
    setEditingLesson(lesson)
    setShowBuilder(true)
  }

  const handleDelete = async (lessonId: string) => {
    if (!user) return
    if (confirm("Are you sure you want to delete this lesson?")) {
      await deleteLesson(lessonId, user.id)
      await loadData()
    }
  }

  const addContentBlock = (type: "text" | "video" | "image" | "embed") => {
    const newBlock: LessonBlock = {
      id: `block-${Date.now()}`,
      order: blocks.length,
      type: "content",
      contentBlock: {
        id: `content-${Date.now()}`,
        type,
        content: "",
        duration: 5
      }
    }
    setBlocks([...blocks, newBlock])
    setEditingBlockIndex(blocks.length)
    setShowAddBlock(false)
  }

  const addCheckpoint = () => {
    const newBlock: LessonBlock = {
      id: `block-${Date.now()}`,
      order: blocks.length,
      type: "checkpoint",
      checkpoint: {
        id: `checkpoint-${Date.now()}`,
        title: `Checkpoint ${blocks.filter(b => b.type === "checkpoint").length + 1}`,
        questions: [],
        passingScore: 70
      }
    }
    setBlocks([...blocks, newBlock])
    setEditingBlockIndex(blocks.length)
    setShowAddBlock(false)
  }

  const updateBlock = (index: number, updates: Partial<LessonBlock>) => {
    const newBlocks = [...blocks]
    newBlocks[index] = { ...newBlocks[index], ...updates }
    setBlocks(newBlocks)
  }

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index))
    setEditingBlockIndex(null)
  }

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newBlocks = [...blocks]
      ;[newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]]
      setBlocks(newBlocks)
    } else if (direction === "down" && index < blocks.length - 1) {
      const newBlocks = [...blocks]
      ;[newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]]
      setBlocks(newBlocks)
    }
  }

  const addQuestion = (blockIndex: number) => {
    const block = blocks[blockIndex]
    if (block.type !== "checkpoint" || !block.checkpoint) return

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      text: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 10
    }

    const updatedCheckpoint = {
      ...block.checkpoint,
      questions: [...block.checkpoint.questions, newQuestion]
    }

    updateBlock(blockIndex, { checkpoint: updatedCheckpoint })
  }

  const updateQuestion = (blockIndex: number, questionIndex: number, updates: Partial<Question>) => {
    const block = blocks[blockIndex]
    if (block.type !== "checkpoint" || !block.checkpoint) return

    const newQuestions = [...block.checkpoint.questions]
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], ...updates }

    updateBlock(blockIndex, { 
      checkpoint: { ...block.checkpoint, questions: newQuestions }
    })
  }

  const removeQuestion = (blockIndex: number, questionIndex: number) => {
    const block = blocks[blockIndex]
    if (block.type !== "checkpoint" || !block.checkpoint) return

    const newQuestions = block.checkpoint.questions.filter((_, i) => i !== questionIndex)
    updateBlock(blockIndex, {
      checkpoint: { ...block.checkpoint, questions: newQuestions }
    })
  }

  const handleSave = async (publish: boolean = false) => {
    if (!user || !lessonTitle.trim() || !conceptName.trim()) return

    setIsSaving(true)

    const lessonData = {
      title: lessonTitle,
      description: lessonDescription,
      conceptId: conceptName.toLowerCase().replace(/\s+/g, "-"),
      conceptName,
      teacherId: user.id,
      classId: selectedClass || undefined,
      learningMode,
      difficulty,
      blocks: blocks.map((b, i) => ({ ...b, order: i })),
      published: publish
    }

    const result = await createLesson(user.id, lessonData)

    if (result.success) {
      await loadData()
      setShowBuilder(false)
      resetForm()
    }

    setIsSaving(false)
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
      <TeacherSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader user={user} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            {!showBuilder ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-6 h-6 text-indigo-500" />
                      Lesson Builder
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Create interactive lessons with embedded checkpoints
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={showTimeline ? "default" : "outline"}
                      onClick={() => setShowTimeline(!showTimeline)}
                      className={showTimeline ? "bg-indigo-600" : ""}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Timeline
                    </Button>
                    <Button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Lesson
                    </Button>
                  </div>
                </div>

                {/* Timeline Section */}
                {showTimeline && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      Recent Activity Timeline
                    </h2>
                    {timelineEvents.length === 0 ? (
                      <p className="text-slate-500 text-sm">No activity yet. Timeline will show student completions once lessons are published.</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                        <div className="space-y-4">
                          {timelineEvents.slice(0, 10).map((event) => (
                            <div key={event.id} className="relative flex items-start gap-4 pl-10">
                              <div className={`absolute left-2.5 w-3 h-3 rounded-full ${
                                event.type === "published" ? "bg-indigo-500" :
                                event.type === "completed" ? "bg-emerald-500" :
                                event.type === "started" ? "bg-blue-500" :
                                event.type === "checkpoint_passed" ? "bg-green-500" :
                                "bg-amber-500"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.type === "published" && (
                                    <>
                                      <Calendar className="w-4 h-4 text-indigo-500" />
                                      <span className="font-medium text-slate-900 dark:text-white">Lesson published</span>
                                    </>
                                  )}
                                  {event.type === "started" && (
                                    <>
                                      <Play className="w-4 h-4 text-blue-500" />
                                      <span className="font-medium text-slate-900 dark:text-white">Student started</span>
                                    </>
                                  )}
                                  {event.type === "completed" && (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                                      <span className="font-medium text-slate-900 dark:text-white">Student completed</span>
                                      {event.score !== undefined && (
                                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                          {event.score}%
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {event.type === "checkpoint_passed" && (
                                    <>
                                      <UserCheck className="w-4 h-4 text-green-500" />
                                      <span className="font-medium text-slate-900 dark:text-white">Checkpoint passed</span>
                                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded-full">
                                        {event.score}%
                                      </span>
                                    </>
                                  )}
                                  {event.type === "checkpoint_failed" && (
                                    <>
                                      <AlertCircle className="w-4 h-4 text-amber-500" />
                                      <span className="font-medium text-slate-900 dark:text-white">Checkpoint needs retry</span>
                                      <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full">
                                        {event.score}%
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                  {event.lessonTitle}
                                  {event.checkpointTitle && ` • ${event.checkpointTitle}`}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  {new Date(event.date).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lessons List */}
                {lessons.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                    <BookOpen className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      No Lessons Yet
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                      Create your first interactive lesson with embedded quizzes to track student mastery
                    </p>
                    <Button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Lesson
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl ${VARK_OPTIONS.find(v => v.id === lesson.learningMode)?.color || 'bg-slate-500'} flex items-center justify-center`}>
                            {(() => {
                              const Icon = VARK_OPTIONS.find(v => v.id === lesson.learningMode)?.icon || BookOpen
                              return <Icon className="w-5 h-5 text-white" />
                            })()}
                          </div>
                          <div className="flex items-center gap-1">
                            {lesson.published ? (
                              <span className="px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                                Published
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{lesson.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
                          {lesson.description || "No description"}
                        </p>

                        {/* Date info */}
                        <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                          {lesson.publishedAt ? (
                            <span>Published {new Date(lesson.publishedAt).toLocaleDateString()}</span>
                          ) : (
                            <span>Created {new Date(lesson.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.estimatedDuration} min
                          </span>
                          <span className="flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            {lesson.blocks.filter(b => b.type === "checkpoint").length} checkpoints
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEdit(lesson)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/teacher/lessons/${lesson.id}/analytics`)}
                          >
                            <BarChart3 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(lesson.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Lesson Builder */
              <div className="space-y-6">
                {/* Builder Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {editingLesson ? "Edit Lesson" : "Create New Lesson"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Build your lesson with content blocks and checkpoints
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => { setShowBuilder(false); resetForm(); }}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>

                {/* Lesson Details */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Lesson Details</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Lesson Title *
                      </label>
                      <Input
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="e.g., Introduction to Linear Equations"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={lessonDescription}
                        onChange={(e) => setLessonDescription(e.target.value)}
                        placeholder="What will students learn in this lesson?"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Concept/Topic *
                      </label>
                      <Input
                        value={conceptName}
                        onChange={(e) => setConceptName(e.target.value)}
                        placeholder="e.g., Linear Equations"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Assign to Class
                      </label>
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        <option value="">All Classes</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.className}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Learning Style
                      </label>
                      <div className="flex gap-2">
                        {VARK_OPTIONS.map((vark) => {
                          const Icon = vark.icon
                          return (
                            <button
                              key={vark.id}
                              onClick={() => setLearningMode(vark.id as any)}
                              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                learningMode === vark.id
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <Icon className={`w-5 h-5 mx-auto ${learningMode === vark.id ? "text-indigo-600" : "text-slate-400"}`} />
                              <p className={`text-xs mt-1 ${learningMode === vark.id ? "text-indigo-600 font-medium" : "text-slate-500"}`}>
                                {vark.label}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Difficulty: {difficulty < 35 ? "Beginner" : difficulty < 70 ? "Intermediate" : "Advanced"}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={difficulty}
                        onChange={(e) => setDifficulty(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Lesson Blocks */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-slate-900 dark:text-white">Lesson Content</h2>
                    <div className="relative">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAddBlock(!showAddBlock)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Block
                      </Button>
                      
                      {showAddBlock && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-10 overflow-hidden">
                          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 uppercase">Content</p>
                          </div>
                          {CONTENT_TYPES.map((type) => {
                            const Icon = type.icon
                            return (
                              <button
                                key={type.id}
                                onClick={() => addContentBlock(type.id as any)}
                                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                              >
                                <Icon className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">{type.label}</span>
                              </button>
                            )
                          })}
                          <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-500 uppercase">Assessment</p>
                          </div>
                          <button
                            onClick={addCheckpoint}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                          >
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Checkpoint Quiz</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {blocks.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                      <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 mb-2">No content blocks yet</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Add content blocks and checkpoints to build your lesson
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blocks.map((block, index) => (
                        <div
                          key={block.id}
                          className={`border rounded-xl overflow-hidden ${
                            editingBlockIndex === index 
                              ? "border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {/* Block Header */}
                          <div 
                            className={`p-3 flex items-center justify-between cursor-pointer ${
                              block.type === "checkpoint" 
                                ? "bg-amber-50 dark:bg-amber-900/20" 
                                : "bg-slate-50 dark:bg-slate-700/50"
                            }`}
                            onClick={() => setEditingBlockIndex(editingBlockIndex === index ? null : index)}
                          >
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-slate-400" />
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                block.type === "checkpoint" ? "bg-amber-500" : "bg-slate-400"
                              }`}>
                                {block.type === "checkpoint" ? (
                                  <HelpCircle className="w-4 h-4 text-white" />
                                ) : (
                                  (() => {
                                    const Icon = CONTENT_TYPES.find(t => t.id === block.contentBlock?.type)?.icon || FileText
                                    return <Icon className="w-4 h-4 text-white" />
                                  })()
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                  {block.type === "checkpoint" 
                                    ? block.checkpoint?.title 
                                    : block.contentBlock?.type === "text" 
                                      ? "Text Content"
                                      : block.contentBlock?.type === "video"
                                        ? "Video"
                                        : block.contentBlock?.type === "image"
                                          ? "Image"
                                          : "Embed"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {block.type === "checkpoint" 
                                    ? `${block.checkpoint?.questions.length || 0} questions`
                                    : `${block.contentBlock?.duration || 5} min`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveBlock(index, "up"); }}
                                disabled={index === 0}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveBlock(index, "down"); }}
                                disabled={index === blocks.length - 1}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeBlock(index); }}
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Block Editor */}
                          {editingBlockIndex === index && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                              {block.type === "content" && block.contentBlock && (
                                <ContentBlockEditor
                                  block={block.contentBlock}
                                  onChange={(updates) => updateBlock(index, { 
                                    contentBlock: { ...block.contentBlock!, ...updates }
                                  })}
                                />
                              )}
                              {block.type === "checkpoint" && block.checkpoint && (
                                <CheckpointEditor
                                  checkpoint={block.checkpoint}
                                  onUpdate={(updates) => updateBlock(index, {
                                    checkpoint: { ...block.checkpoint!, ...updates }
                                  })}
                                  onAddQuestion={() => addQuestion(index)}
                                  onUpdateQuestion={(qi, updates) => updateQuestion(index, qi, updates)}
                                  onRemoveQuestion={(qi) => removeQuestion(index, qi)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Actions */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="text-sm text-slate-500">
                    {blocks.length} blocks • ~{blocks.reduce((sum, b) => {
                      if (b.type === "content") return sum + (b.contentBlock?.duration || 5)
                      if (b.type === "checkpoint") return sum + (b.checkpoint?.questions.length || 0) * 2
                      return sum
                    }, 0)} min estimated
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSave(false)}
                      disabled={isSaving || !lessonTitle.trim() || !conceptName.trim()}
                    >
                      Save as Draft
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => handleSave(true)}
                      disabled={isSaving || !lessonTitle.trim() || !conceptName.trim() || blocks.length === 0}
                    >
                      {isSaving ? "Saving..." : "Publish Lesson"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function ContentBlockEditor({ 
  block, 
  onChange 
}: { 
  block: ContentBlock
  onChange: (updates: Partial<ContentBlock>) => void 
}) {
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Insert HTML tag at cursor position
  const insertTag = (tag: string, closeTag?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = block.content.substring(start, end)
    const before = block.content.substring(0, start)
    const after = block.content.substring(end)

    const openTag = `<${tag}>`
    const close = closeTag || `</${tag}>`
    const newContent = before + openTag + selectedText + close + after

    onChange({ content: newContent })
    
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length)
    }, 0)
  }

  // Insert special elements
  const insertElement = (html: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const before = block.content.substring(0, start)
    const after = block.content.substring(start)
    
    onChange({ content: before + html + after })
  }

  // Get YouTube video ID for preview
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  return (
    <div className="space-y-4">
      {block.type === "text" && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Content
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-indigo-600 hover:text-indigo-700"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
          </div>

          {/* Formatting Toolbar */}
          {!showPreview && (
            <div className="flex flex-wrap gap-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-t-lg border border-b-0 border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => insertTag("h2")}
                className="px-2 py-1 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Heading"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertTag("h3")}
                className="px-2 py-1 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Subheading"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => insertTag("strong")}
                className="px-2 py-1 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertTag("em")}
                className="px-2 py-1 text-xs italic hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertTag("u")}
                className="px-2 py-1 text-xs underline hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Underline"
              >
                U
              </button>
              <span className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
              <button
                type="button"
                onClick={() => insertTag("ul")}
                className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Bullet List"
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => insertTag("ol")}
                className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Numbered List"
              >
                1. List
              </button>
              <button
                type="button"
                onClick={() => insertElement("\n<li></li>\n")}
                className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="List Item"
              >
                + Item
              </button>
              <span className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
              <button
                type="button"
                onClick={() => insertTag("blockquote")}
                className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Quote"
              >
                " Quote
              </button>
              <button
                type="button"
                onClick={() => insertTag("code")}
                className="px-2 py-1 text-xs font-mono hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Code"
              >
                {'</>'}
              </button>
              <button
                type="button"
                onClick={() => insertElement('\n<div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">\n  <strong>💡 Key Point:</strong> \n</div>\n')}
                className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Callout Box"
              >
                💡 Callout
              </button>
              <button
                type="button"
                onClick={() => insertElement('\n<div class="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">\n  <strong>⚠️ Important:</strong> \n</div>\n')}
                className="px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                title="Warning Box"
              >
                ⚠️ Warning
              </button>
            </div>
          )}

          {showPreview ? (
            <div 
              className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[200px]"
              dangerouslySetInnerHTML={{ __html: block.content || "<p class='text-slate-400'>No content yet...</p>" }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="Enter your lesson content here. Use the toolbar above for formatting, or write HTML directly..."
              className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none font-mono text-sm ${showPreview ? "rounded-lg" : "rounded-b-lg"}`}
              rows={12}
            />
          )}
        </div>
      )}

      {(block.type === "video" || block.type === "image" || block.type === "embed" || block.type === "pdf") && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {block.type === "video" ? "Video URL (YouTube, Vimeo, or direct video link)" : 
             block.type === "image" ? "Image URL" : 
             block.type === "pdf" ? "PDF URL (Google Drive, Dropbox, or direct link)" :
             "Embed URL (interactive content, simulations, etc.)"}
          </label>
          <Input
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder={
              block.type === "video" ? "https://youtube.com/watch?v=..." : 
              block.type === "pdf" ? "https://drive.google.com/file/d/..." :
              "https://..."
            }
          />
          
          {block.type === "pdf" && (
            <p className="text-xs text-slate-500 mt-1">
              Tip: For Google Drive PDFs, use the preview link format: https://drive.google.com/file/d/FILE_ID/preview
            </p>
          )}
          
          {/* Live Preview */}
          {block.content && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">Preview:</p>
              {block.type === "image" && (
                <img src={block.content} alt="Preview" className="max-h-48 rounded-lg object-cover" />
              )}
              {block.type === "video" && (
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 max-w-md">
                  {getYouTubeId(block.content) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(block.content)}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : block.content && (block.content.includes("/api/videos/embed/") || block.content.includes("/embed/")) ? (
                    <iframe
                      src={block.content}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : (
                    <video src={block.content} controls className="w-full h-full" />
                  )}
                </div>
              )}
              {block.type === "pdf" && (
                <div className="h-96 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <iframe 
                    src={block.content} 
                    className="w-full h-full" 
                    title="PDF Preview"
                  />
                </div>
              )}
              {block.type === "embed" && (
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-w-md">
                  <iframe src={block.content} className="w-full h-full" allowFullScreen />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Estimated Duration (minutes)
        </label>
        <Input
          type="number"
          min="1"
          max="60"
          value={block.duration || 5}
          onChange={(e) => onChange({ duration: Number(e.target.value) })}
          className="w-32"
        />
      </div>

      {/* In-Video Checkpoints for Videos */}
      {block.type === "video" && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              In-Video Checkpoints
              <span className="block text-xs text-slate-500 mt-1">Add quizzes that pause the video at specific times</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newCheckpoint: Checkpoint = {
                  id: `cp-${Date.now()}`,
                  title: "Video Quiz",
                  questions: [],
                  passingScore: 70,
                  videoTimestamp: Math.floor((block.duration || 5) * 30) // Default to middle of video
                }
                onChange({ 
                  videoCheckpoints: [...(block.videoCheckpoints || []), newCheckpoint] 
                })
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Video Checkpoint
            </Button>
          </div>

          {(block.videoCheckpoints || []).length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              No in-video checkpoints yet. Add checkpoints to quiz students during the video.
            </p>
          ) : (
            <div className="space-y-4">
              {(block.videoCheckpoints || []).map((cp, idx) => (
                <div key={cp.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Checkpoint Title
                        </label>
                        <Input
                          value={cp.title}
                          onChange={(e) => {
                            const updated = [...(block.videoCheckpoints || [])]
                            updated[idx] = { ...cp, title: e.target.value }
                            onChange({ videoCheckpoints: updated })
                          }}
                          placeholder="e.g., Key Concept Check"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Time (seconds)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={(block.duration || 5) * 60}
                          value={cp.videoTimestamp || 0}
                          onChange={(e) => {
                            const updated = [...(block.videoCheckpoints || [])]
                            updated[idx] = { ...cp, videoTimestamp: Number(e.target.value) }
                            onChange({ videoCheckpoints: updated })
                          }}
                          placeholder="60"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = (block.videoCheckpoints || []).filter((_, i) => i !== idx)
                        onChange({ videoCheckpoints: updated })
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Passing Score (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={cp.passingScore}
                      onChange={(e) => {
                        const updated = [...(block.videoCheckpoints || [])]
                        updated[idx] = { ...cp, passingScore: Number(e.target.value) }
                        onChange({ videoCheckpoints: updated })
                      }}
                      className="w-24 text-sm"
                    />
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Questions</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newQuestion: Question = {
                            id: `q-${Date.now()}`,
                            text: "",
                            type: "multiple_choice",
                            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                            correctAnswer: 0,
                            points: 1
                          }
                          const updated = [...(block.videoCheckpoints || [])]
                          updated[idx] = { ...cp, questions: [...cp.questions, newQuestion] }
                          onChange({ videoCheckpoints: updated })
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Question
                      </Button>
                    </div>

                    {cp.questions.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-3 bg-slate-50 dark:bg-slate-800 rounded">
                        No questions yet. Click "Add Question" to create quiz questions.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {cp.questions.map((q, qIdx) => (
                          <div key={q.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                            {/* Question Header */}
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-medium text-slate-500">Q{qIdx + 1}</span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={q.type}
                                  onChange={(e) => {
                                    const updated = [...(block.videoCheckpoints || [])]
                                    const newType = e.target.value as Question["type"]
                                    let newQuestion = { ...q, type: newType }
                                    
                                    // Set defaults based on type
                                    if (newType === "multiple_choice") {
                                      newQuestion.options = q.options || ["Option 1", "Option 2", "Option 3", "Option 4"]
                                      newQuestion.correctAnswer = 0
                                    } else if (newType === "true_false") {
                                      newQuestion.options = undefined
                                      newQuestion.correctAnswer = "true"
                                    } else {
                                      newQuestion.options = undefined
                                      newQuestion.correctAnswer = ""
                                    }
                                    
                                    const questions = [...cp.questions]
                                    questions[qIdx] = newQuestion
                                    updated[idx] = { ...cp, questions }
                                    onChange({ videoCheckpoints: updated })
                                  }}
                                  className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
                                >
                                  <option value="multiple_choice">Multiple Choice</option>
                                  <option value="true_false">True/False</option>
                                  <option value="short_answer">Short Answer</option>
                                </select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updated = [...(block.videoCheckpoints || [])]
                                    updated[idx] = { 
                                      ...cp, 
                                      questions: cp.questions.filter((_, i) => i !== qIdx) 
                                    }
                                    onChange({ videoCheckpoints: updated })
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </Button>
                              </div>
                            </div>

                            {/* Question Text */}
                            <Input
                              value={q.text}
                              onChange={(e) => {
                                const updated = [...(block.videoCheckpoints || [])]
                                const questions = [...cp.questions]
                                questions[qIdx] = { ...q, text: e.target.value }
                                updated[idx] = { ...cp, questions }
                                onChange({ videoCheckpoints: updated })
                              }}
                              placeholder="Enter question text..."
                              className="text-sm"
                            />

                            {/* Multiple Choice Options */}
                            {q.type === "multiple_choice" && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-600 dark:text-slate-400">Options (click to mark correct):</p>
                                {(q.options || []).map((option, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...(block.videoCheckpoints || [])]
                                        const questions = [...cp.questions]
                                        questions[qIdx] = { ...q, correctAnswer: oIdx }
                                        updated[idx] = { ...cp, questions }
                                        onChange({ videoCheckpoints: updated })
                                      }}
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        q.correctAnswer === oIdx
                                          ? "border-emerald-500 bg-emerald-500"
                                          : "border-slate-300 dark:border-slate-600"
                                      }`}
                                    >
                                      {q.correctAnswer === oIdx && (
                                        <CheckCircle className="w-3 h-3 text-white" />
                                      )}
                                    </button>
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const updated = [...(block.videoCheckpoints || [])]
                                        const questions = [...cp.questions]
                                        const newOptions = [...(q.options || [])]
                                        newOptions[oIdx] = e.target.value
                                        questions[qIdx] = { ...q, options: newOptions }
                                        updated[idx] = { ...cp, questions }
                                        onChange({ videoCheckpoints: updated })
                                      }}
                                      placeholder={`Option ${oIdx + 1}`}
                                      className="text-sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* True/False */}
                            {q.type === "true_false" && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-600 dark:text-slate-400">Correct answer:</p>
                                <div className="flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(block.videoCheckpoints || [])]
                                      const questions = [...cp.questions]
                                      questions[qIdx] = { ...q, correctAnswer: "true" }
                                      updated[idx] = { ...cp, questions }
                                      onChange({ videoCheckpoints: updated })
                                    }}
                                    className={`px-4 py-2 text-sm rounded-lg border-2 ${
                                      q.correctAnswer === "true"
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                                        : "border-slate-300 dark:border-slate-600"
                                    }`}
                                  >
                                    True
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...(block.videoCheckpoints || [])]
                                      const questions = [...cp.questions]
                                      questions[qIdx] = { ...q, correctAnswer: "false" }
                                      updated[idx] = { ...cp, questions }
                                      onChange({ videoCheckpoints: updated })
                                    }}
                                    className={`px-4 py-2 text-sm rounded-lg border-2 ${
                                      q.correctAnswer === "false"
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                                        : "border-slate-300 dark:border-slate-600"
                                    }`}
                                  >
                                    False
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Short Answer */}
                            {q.type === "short_answer" && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-600 dark:text-slate-400">Correct answer:</p>
                                <Input
                                  value={String(q.correctAnswer || "")}
                                  onChange={(e) => {
                                    const updated = [...(block.videoCheckpoints || [])]
                                    const questions = [...cp.questions]
                                    questions[qIdx] = { ...q, correctAnswer: e.target.value }
                                    updated[idx] = { ...cp, questions }
                                    onChange({ videoCheckpoints: updated })
                                  }}
                                  placeholder="Enter the correct answer..."
                                  className="text-sm"
                                />
                              </div>
                            )}

                            {/* Explanation (optional) */}
                            <div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Explanation (optional):</p>
                              <Input
                                value={q.explanation || ""}
                                onChange={(e) => {
                                  const updated = [...(block.videoCheckpoints || [])]
                                  const questions = [...cp.questions]
                                  questions[qIdx] = { ...q, explanation: e.target.value }
                                  updated[idx] = { ...cp, questions }
                                  onChange({ videoCheckpoints: updated })
                                }}
                                placeholder="Explain why this is the correct answer..."
                                className="text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CheckpointEditor({
  checkpoint,
  onUpdate,
  onAddQuestion,
  onUpdateQuestion,
  onRemoveQuestion
}: {
  checkpoint: Checkpoint
  onUpdate: (updates: Partial<Checkpoint>) => void
  onAddQuestion: () => void
  onUpdateQuestion: (index: number, updates: Partial<Question>) => void
  onRemoveQuestion: (index: number) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Checkpoint Title
          </label>
          <Input
            value={checkpoint.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="e.g., Knowledge Check 1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Passing Score (%)
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={checkpoint.passingScore}
            onChange={(e) => onUpdate({ passingScore: Number(e.target.value) })}
            className="w-32"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-900 dark:text-white">Questions</h4>
          <Button variant="outline" size="sm" onClick={onAddQuestion}>
            <Plus className="w-3 h-3 mr-1" />
            Add Question
          </Button>
        </div>

        {checkpoint.questions.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No questions yet. Add questions to create the checkpoint quiz.
          </p>
        ) : (
          <div className="space-y-4">
            {checkpoint.questions.map((question, qi) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={qi}
                onUpdate={(updates) => onUpdateQuestion(qi, updates)}
                onRemove={() => onRemoveQuestion(qi)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionEditor({
  question,
  index,
  onUpdate,
  onRemove
}: {
  question: Question
  index: number
  onUpdate: (updates: Partial<Question>) => void
  onRemove: () => void
}) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">Question {index + 1}</span>
        <div className="flex items-center gap-2">
          <select
            value={question.type}
            onChange={(e) => onUpdate({ type: e.target.value as any })}
            className="text-xs px-2 py-1 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
          >
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="short_answer">Short Answer</option>
          </select>
          <button onClick={onRemove} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter your question..."
        />

        {question.type === "multiple_choice" && (
          <div className="space-y-2">
            {(question.options || ["", "", "", ""]).map((option, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate({ correctAnswer: oi })}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    question.correctAnswer === oi
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {question.correctAnswer === oi && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </button>
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(question.options || [])]
                    newOptions[oi] = e.target.value
                    onUpdate({ options: newOptions })
                  }}
                  placeholder={`Option ${oi + 1}`}
                  className="flex-1"
                />
              </div>
            ))}
            <p className="text-xs text-slate-500">Click the circle to mark the correct answer</p>
          </div>
        )}

        {question.type === "true_false" && (
          <div className="flex gap-4">
            <button
              onClick={() => onUpdate({ correctAnswer: "true" })}
              className={`px-4 py-2 rounded-lg border-2 ${
                question.correctAnswer === "true"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                  : "border-slate-200 dark:border-slate-600"
              }`}
            >
              True
            </button>
            <button
              onClick={() => onUpdate({ correctAnswer: "false" })}
              className={`px-4 py-2 rounded-lg border-2 ${
                question.correctAnswer === "false"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                  : "border-slate-200 dark:border-slate-600"
              }`}
            >
              False
            </button>
          </div>
        )}

        {question.type === "short_answer" && (
          <Input
            value={String(question.correctAnswer || "")}
            onChange={(e) => onUpdate({ correctAnswer: e.target.value })}
            placeholder="Enter the correct answer..."
          />
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Points:</label>
            <Input
              type="number"
              min="1"
              max="100"
              value={question.points}
              onChange={(e) => onUpdate({ points: Number(e.target.value) })}
              className="w-20"
            />
          </div>
          <div className="flex-1">
            <Input
              value={question.explanation || ""}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              placeholder="Explanation (shown after answering)"
              className="text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
