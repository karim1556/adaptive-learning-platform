"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { TeacherHeader } from "@/components/teacher/header-new"
import { TeacherSidebar } from "@/components/teacher/sidebar-new"
import { createContent, getContent, type Content } from "@/lib/data-service"
import {
  Plus,
  X,
  BookOpen,
  Eye,
  Ear,
  BookText,
  Hand,
  Search,
  Filter,
  ExternalLink
} from "lucide-react"

const VARK_OPTIONS = [
  { id: "visual", label: "Visual", icon: Eye, color: "bg-blue-500" },
  { id: "auditory", label: "Auditory", icon: Ear, color: "bg-purple-500" },
  { id: "reading", label: "Reading", icon: BookText, color: "bg-emerald-500" },
  { id: "kinesthetic", label: "Kinesthetic", icon: Hand, color: "bg-amber-500" },
]

const DIFFICULTY_LABELS = [
  { value: 25, label: "Beginner" },
  { value: 50, label: "Intermediate" },
  { value: 75, label: "Advanced" },
]

export default function TeacherContentPage() {
  const { user, loading: authLoading } = useRequireAuth(["teacher"])
  const [content, setContent] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    conceptName: "",
    difficulty: 50,
    learningMode: "visual" as "visual" | "auditory" | "reading" | "kinesthetic",
    contentUrl: "",
    contentBody: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    loadContent()
  }, [user?.id])

  const loadContent = async () => {
    const data = await getContent()
    setContent(data)
    setIsLoading(false)
  }

  const handleCreate = async () => {
    if (!formData.title.trim() || !user) return
    setIsSubmitting(true)

    const result = await createContent(user.id, {
      title: formData.title,
      description: formData.description,
      conceptId: formData.conceptName.toLowerCase().replace(/\s+/g, "-"),
      conceptName: formData.conceptName,
      difficulty: formData.difficulty,
      learningMode: formData.learningMode,
      contentUrl: formData.contentUrl,
      contentBody: formData.contentBody
    })

    if (result.success) {
      await loadContent()
      setFormData({
        title: "",
        description: "",
        conceptName: "",
        difficulty: 50,
        learningMode: "visual",
        contentUrl: "",
        contentBody: ""
      })
      setShowCreateModal(false)
    }
    setIsSubmitting(false)
  }

  const filteredContent = content.filter(c => {
    const matchesSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.conceptName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = !filterMode || c.learningMode === filterMode
    return matchesSearch && matchesFilter
  })

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

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Learning Content</h1>
                <p className="text-slate-500 mt-1">Create and manage content for your students</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                Add Content
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode(null)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    !filterMode 
                      ? "bg-indigo-600 text-white" 
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  All
                </button>
                {VARK_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setFilterMode(filterMode === opt.id ? null : opt.id)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                        filterMode === opt.id 
                          ? `${opt.color} text-white` 
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content Grid */}
            {filteredContent.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContent.map(item => {
                  const varkOpt = VARK_OPTIONS.find(v => v.id === item.learningMode)
                  const Icon = varkOpt?.icon || BookOpen
                  const diffLabel = DIFFICULTY_LABELS.find(d => 
                    item.difficulty <= d.value + 12 && item.difficulty >= d.value - 13
                  )?.label || "Intermediate"

                  return (
                    <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition">
                      <div className={`h-2 ${varkOpt?.color || "bg-slate-500"}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 ${varkOpt?.color || "bg-slate-500"} rounded-xl flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg">
                            {diffLabel}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{item.conceptName || "General"}</span>
                          {item.contentUrl && (
                            <a 
                              href={item.contentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No content yet</h3>
                <p className="text-slate-500 mb-4">Create learning materials tailored to different VARK styles</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
                >
                  Add Your First Content
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add Learning Content</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., Introduction to Linear Equations"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of the content..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none"
                  />
                </div>

                {/* Concept */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Concept/Topic</label>
                  <input
                    type="text"
                    value={formData.conceptName}
                    onChange={(e) => setFormData({...formData, conceptName: e.target.value})}
                    placeholder="e.g., Algebra, Photosynthesis"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Learning Style */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Learning Style (VARK) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VARK_OPTIONS.map(opt => {
                      const Icon = opt.icon
                      const isSelected = formData.learningMode === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormData({...formData, learningMode: opt.id as any})}
                          className={`p-3 rounded-xl border-2 flex items-center gap-3 transition ${
                            isSelected 
                              ? `border-transparent ${opt.color} text-white` 
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <Icon className={`w-5 h-5 ${isSelected ? "text-white" : "text-slate-500"}`} />
                          <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>
                            {opt.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Difficulty: {DIFFICULTY_LABELS.find(d => formData.difficulty <= d.value + 12 && formData.difficulty >= d.value - 13)?.label || "Intermediate"}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: Number(e.target.value)})}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Beginner</span>
                    <span>Intermediate</span>
                    <span>Advanced</span>
                  </div>
                </div>

                {/* Content URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Content URL (optional)</label>
                  <input
                    type="url"
                    value={formData.contentUrl}
                    onChange={(e) => setFormData({...formData, contentUrl: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!formData.title.trim() || isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Content
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
