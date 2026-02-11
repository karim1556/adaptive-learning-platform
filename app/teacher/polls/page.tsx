"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { TeacherHeader } from "@/components/teacher/header-new"
import { TeacherSidebar } from "@/components/teacher/sidebar-new"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { getTeacherClasses, type Class } from "@/lib/data-service"
import {
  createPoll,
  getTeacherPolls,
  closePoll,
  deletePoll,
  calculatePollResults,
  pollTemplates,
  type Poll,
  type PollResults
} from "@/lib/polls-service"
import {
  BarChart3,
  Plus,
  X,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  Zap,
  TrendingUp,
  PieChart,
  ListChecks,
  Type,
  Star
} from "lucide-react"

type PollType = Poll["type"]

const pollTypeConfig: Record<PollType, { icon: React.ElementType; label: string; description: string }> = {
  "multiple-choice": { icon: ListChecks, label: "Multiple Choice", description: "Students choose from options" },
  "yes-no": { icon: CheckCircle, label: "Yes/No", description: "Simple binary choice" },
  "scale": { icon: Star, label: "Scale (1-5)", description: "Rating scale response" },
  "word-cloud": { icon: Type, label: "Word Cloud", description: "One-word responses" },
  "open-ended": { icon: MessageSquare, label: "Open Ended", description: "Free text response" }
}

export default function TeacherPollsPage() {
  const { user, loading } = useRequireAuth(["teacher"])
  const [polls, setPolls] = useState<Poll[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null)
  const [pollResults, setPollResults] = useState<PollResults | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Form state
  const [selectedClass, setSelectedClass] = useState("")
  const [pollTitle, setPollTitle] = useState("")
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollType, setPollType] = useState<PollType>("multiple-choice")
  const [options, setOptions] = useState(["", "", "", ""])
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      const [pollsData, classesData] = await Promise.all([
        getTeacherPolls(user!.id),
        getTeacherClasses(user!.id)
      ])
      setPolls(pollsData || [])
      setClasses(classesData || [])
    } catch (error) {
      console.error("Error loading polls:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function applyTemplate(templateKey: keyof typeof pollTemplates) {
    const template = pollTemplates[templateKey]
    setPollTitle(template.title)
    setPollQuestion(template.question)
    setPollType(template.type)
    setIsAnonymous(template.isAnonymous)
    if ("options" in template && template.options) {
      setOptions([...template.options, "", ""].slice(0, 4))
    }
  }

  async function handleCreatePoll() {
    if (!selectedClass || !pollQuestion || !user) return
    setIsSubmitting(true)

    const result = await createPoll(user.id, selectedClass, {
      title: pollTitle || "Quick Poll",
      question: pollQuestion,
      type: pollType,
      options: pollType === "multiple-choice" ? options.filter(o => o.trim()) : undefined,
      isAnonymous
    })

    if (result.success) {
      await loadData()
      resetForm()
      setShowCreateModal(false)
    }
    setIsSubmitting(false)
  }

  function resetForm() {
    setPollTitle("")
    setPollQuestion("")
    setPollType("multiple-choice")
    setOptions(["", "", "", ""])
    setIsAnonymous(true)
    setSelectedClass("")
  }

  function viewPollResults(poll: Poll) {
    setSelectedPoll(poll)
    const classStudentCount = classes.find(c => c.id === poll.classId)?.studentCount || 20
    const results = calculatePollResults(poll, classStudentCount)
    setPollResults(results)
  }

  async function handleClosePoll(pollId: string) {
    closePoll(pollId)
    await loadData()
    if (selectedPoll?.id === pollId) {
      const updated = polls.find(p => p.id === pollId)
      if (updated) {
        setSelectedPoll({ ...updated, isActive: false })
      }
    }
  }

  async function handleDeletePoll(pollId: string) {
    if (!confirm("Are you sure you want to delete this poll?")) return
    deletePoll(pollId)
    await loadData()
    if (selectedPoll?.id === pollId) {
      setSelectedPoll(null)
      setPollResults(null)
    }
  }

  function copyPollLink(pollId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/student/polls/${pollId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const activePolls = polls.filter(p => p.isActive)
  const closedPolls = polls.filter(p => !p.isActive)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                  Live Polls
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Capture real-time student engagement and feedback
                </p>
              </div>
              <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Polls List */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Polls */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    Active Polls ({activePolls.length})
                  </h2>
                  {activePolls.length === 0 ? (
                    <Card className="text-center py-8">
                      <CardContent>
                        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No active polls. Create one to engage your students!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {activePolls.map((poll) => (
                        <Card 
                          key={poll.id} 
                          className={`cursor-pointer hover:shadow-md transition-all ${
                            selectedPoll?.id === poll.id ? "ring-2 ring-indigo-500" : ""
                          }`}
                          onClick={() => viewPollResults(poll)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    Live
                                  </Badge>
                                  <Badge variant="outline" className="capitalize">
                                    {pollTypeConfig[poll.type].label}
                                  </Badge>
                                  {poll.isAnonymous && (
                                    <Badge variant="secondary">Anonymous</Badge>
                                  )}
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {poll.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {poll.question}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {poll.responses.length} responses
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(poll.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); copyPollLink(poll.id) }}
                                >
                                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleClosePoll(poll.id) }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Closed Polls */}
                {closedPolls.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-slate-400" />
                      Closed Polls ({closedPolls.length})
                    </h2>
                    <div className="space-y-3">
                      {closedPolls.slice(0, 5).map((poll) => (
                        <Card 
                          key={poll.id} 
                          className={`cursor-pointer hover:shadow-md transition-all opacity-75 ${
                            selectedPoll?.id === poll.id ? "ring-2 ring-indigo-500 opacity-100" : ""
                          }`}
                          onClick={() => viewPollResults(poll)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {poll.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {poll.responses.length} responses • Closed {new Date(poll.closedAt!).toLocaleDateString()}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDeletePoll(poll.id) }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Results Panel */}
              <div>
                {selectedPoll && pollResults ? (
                  <Card className="sticky top-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Poll Results</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPoll(null); setPollResults(null) }}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardDescription>{selectedPoll.question}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Participation */}
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Participation</span>
                          <span className="text-2xl font-bold text-indigo-600">
                            {pollResults.participationRate}%
                          </span>
                        </div>
                        <Progress value={pollResults.participationRate} className="h-2" />
                        <p className="text-xs text-slate-500 mt-1">
                          {pollResults.totalResponses} of {pollResults.totalStudents} students
                        </p>
                      </div>

                      {/* Response Distribution */}
                      {(selectedPoll.type === "multiple-choice" || selectedPoll.type === "yes-no") && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Responses</h4>
                          <div className="space-y-2">
                            {Object.entries(pollResults.responseDistribution).map(([option, count]) => {
                              const percentage = pollResults.totalResponses > 0 
                                ? Math.round((count / pollResults.totalResponses) * 100) 
                                : 0
                              return (
                                <div key={option}>
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="truncate">{option}</span>
                                    <span className="font-medium">{percentage}%</span>
                                  </div>
                                  <Progress value={percentage} className="h-2" />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Scale Average */}
                      {selectedPoll.type === "scale" && pollResults.averageScore !== undefined && (
                        <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                          <p className="text-sm text-slate-600 dark:text-slate-400">Average Score</p>
                          <p className="text-4xl font-bold text-indigo-600">{pollResults.averageScore}</p>
                          <p className="text-xs text-slate-500">out of {selectedPoll.scaleMax}</p>
                        </div>
                      )}

                      {/* Word Cloud (simplified) */}
                      {(selectedPoll.type === "word-cloud" || selectedPoll.type === "open-ended") && pollResults.wordFrequency && (
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Top Words</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(pollResults.wordFrequency)
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 10)
                              .map(([word, count]) => (
                                <Badge 
                                  key={word} 
                                  variant="secondary"
                                  style={{ fontSize: `${Math.max(12, Math.min(20, 12 + count * 2))}px` }}
                                >
                                  {word} ({count})
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Insights */}
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-indigo-600" />
                          Insights
                        </h4>
                        <ul className="space-y-2">
                          {pollResults.insights.map((insight, idx) => (
                            <li key={idx} className="text-sm text-slate-600 dark:text-slate-400">
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <PieChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Select a poll to view results</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create New Poll</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); resetForm() }}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Templates */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Quick Templates
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pollTemplates).map(([key, template]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(key as keyof typeof pollTemplates)}
                    >
                      {template.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Class Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Select Class *
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-transparent"
                >
                  <option value="">Choose a class...</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.studentCount || 0} students)
                    </option>
                  ))}
                </select>
              </div>

              {/* Poll Type */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Poll Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(pollTypeConfig).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setPollType(type as PollType)}
                        className={`p-3 border rounded-lg text-left transition-all ${
                          pollType === type 
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                            : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1 text-indigo-600" />
                        <p className="font-medium text-sm">{config.label}</p>
                        <p className="text-xs text-slate-500">{config.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Poll Title
                </label>
                <Input
                  value={pollTitle}
                  onChange={(e) => setPollTitle(e.target.value)}
                  placeholder="Quick Check"
                />
              </div>

              {/* Question */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                  Question *
                </label>
                <Textarea
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="What would you like to ask?"
                  rows={2}
                />
              </div>

              {/* Options (for multiple choice) */}
              {pollType === "multiple-choice" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Options
                  </label>
                  <div className="space-y-2">
                    {options.map((option, idx) => (
                      <Input
                        key={idx}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...options]
                          newOptions[idx] = e.target.value
                          setOptions(newOptions)
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Anonymous toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Anonymous Responses</p>
                  <p className="text-xs text-slate-500">Student names won't be shown</p>
                </div>
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    isAnonymous ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    isAnonymous ? "translate-x-6" : "translate-x-0.5"
                  }`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreateModal(false); resetForm() }}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreatePoll}
                disabled={!selectedClass || !pollQuestion || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Launch Poll"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
