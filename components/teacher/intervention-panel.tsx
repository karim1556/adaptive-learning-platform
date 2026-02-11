"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare,
  Users,
  BookOpen,
  Phone,
  FileEdit,
  UserCheck,
  Target,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Lightbulb,
  Activity
} from "lucide-react"
import {
  createIntervention,
  getStudentInterventions,
  getInterventionSummary,
  getSuggestedInterventions,
  updateInterventionStatus,
  recordPostMetrics,
  addInterventionNote,
  type Intervention,
  type InterventionSummary
} from "@/lib/intervention-service"

interface InterventionPanelProps {
  teacherId: string
  studentId: string
  studentName: string
  classId: string
  currentMastery: number
  currentEngagement: number
  learningStyle?: string
  onInterventionCreated?: () => void
}

const interventionTypeConfig: Record<Intervention["type"], { icon: typeof MessageSquare; label: string; color: string }> = {
  "one-on-one": { icon: UserCheck, label: "One-on-One", color: "bg-blue-100 text-blue-800" },
  "small-group": { icon: Users, label: "Small Group", color: "bg-purple-100 text-purple-800" },
  "resource-sharing": { icon: BookOpen, label: "Resource Sharing", color: "bg-green-100 text-green-800" },
  "parent-contact": { icon: Phone, label: "Parent Contact", color: "bg-orange-100 text-orange-800" },
  "modified-assignment": { icon: FileEdit, label: "Modified Assignment", color: "bg-yellow-100 text-yellow-800" },
  "tutoring": { icon: Target, label: "Tutoring", color: "bg-indigo-100 text-indigo-800" },
  "other": { icon: MessageSquare, label: "Other", color: "bg-slate-100 text-slate-800" }
}

const statusConfig = {
  "planned": { color: "bg-slate-100 text-slate-800", label: "Planned" },
  "in-progress": { color: "bg-blue-100 text-blue-800", label: "In Progress" },
  "completed": { color: "bg-green-100 text-green-800", label: "Completed" },
  "follow-up-needed": { color: "bg-orange-100 text-orange-800", label: "Follow-up Needed" }
}

export function InterventionPanel({
  teacherId,
  studentId,
  studentName,
  classId,
  currentMastery,
  currentEngagement,
  learningStyle,
  onInterventionCreated
}: InterventionPanelProps) {
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [summary, setSummary] = useState<InterventionSummary | null>(null)
  const [suggestions, setSuggestions] = useState<ReturnType<typeof getSuggestedInterventions>>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [showRecordOutcome, setShowRecordOutcome] = useState<Intervention | null>(null)
  
  // Form state
  const [selectedType, setSelectedType] = useState<Intervention["type"]>("one-on-one")
  const [description, setDescription] = useState("")
  const [reason, setReason] = useState("")
  const [postMastery, setPostMastery] = useState(0)
  const [postEngagement, setPostEngagement] = useState(0)
  const [outcomeNotes, setOutcomeNotes] = useState("")

  useEffect(() => {
    loadData()
  }, [studentId, teacherId])

  function loadData() {
    const interventionData = getStudentInterventions(studentId)
    setInterventions(interventionData)
    
    const summaryData = getInterventionSummary(teacherId)
    setSummary(summaryData)
    
    const suggestionsData = getSuggestedInterventions(currentMastery, currentEngagement, learningStyle)
    setSuggestions(suggestionsData)
  }

  async function handleCreateIntervention() {
    if (!description.trim()) return

    const result = createIntervention({
      teacherId,
      studentId,
      studentName,
      classId,
      type: selectedType,
      description: description.trim(),
      reason: reason.trim() || "No reason specified",
      preMetrics: {
        masteryScore: currentMastery,
        engagementLevel: currentEngagement
      }
    })

    if (result.success) {
      setShowNewForm(false)
      setDescription("")
      setReason("")
      loadData()
      onInterventionCreated?.()
    }
  }

  function handleRecordOutcome() {
    if (!showRecordOutcome) return

    const result = recordPostMetrics(showRecordOutcome.id, {
      masteryScore: postMastery,
      engagementLevel: postEngagement
    })

    if (result.success && outcomeNotes.trim()) {
      addInterventionNote(showRecordOutcome.id, outcomeNotes.trim())
    }

    setShowRecordOutcome(null)
    setPostMastery(0)
    setPostEngagement(0)
    setOutcomeNotes("")
    loadData()
  }

  function handleUseSuggestion(suggestion: typeof suggestions[0]) {
    setSelectedType(suggestion.type)
    setDescription(suggestion.description)
    setShowNewForm(true)
  }

  const activeInterventions = interventions.filter((i) => i.status === "planned" || i.status === "in-progress")
  const completedInterventions = interventions.filter((i) => i.status === "completed")

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {summary && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{summary.totalInterventions}</div>
                <div className="text-sm text-slate-600">Total Interventions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{summary.activeInterventions}</div>
                <div className="text-sm text-slate-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{summary.successRate}%</div>
                <div className="text-sm text-slate-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${summary.averageImprovement.mastery >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {summary.averageImprovement.mastery >= 0 ? "+" : ""}{summary.averageImprovement.mastery}%
                </div>
                <div className="text-sm text-slate-600">Avg Mastery Change</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Suggested Interventions
            </CardTitle>
            <CardDescription>
              Based on {studentName}&apos;s current performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((suggestion, idx) => {
              const config = interventionTypeConfig[suggestion.type]
              const Icon = config.icon
              return (
                <div
                  key={idx}
                  className={`p-4 border rounded-lg ${
                    suggestion.priority === "high" 
                      ? "border-red-200 bg-red-50 dark:bg-red-900/10" 
                      : suggestion.priority === "medium"
                      ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.label}</span>
                          <Badge variant="outline" className={
                            suggestion.priority === "high" ? "text-red-600" :
                            suggestion.priority === "medium" ? "text-yellow-600" : ""
                          }>
                            {suggestion.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUseSuggestion(suggestion)}
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Interventions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Active Interventions ({activeInterventions.length})
              </CardTitle>
              <CardDescription>Currently ongoing interventions for {studentName}</CardDescription>
            </div>
            <Button onClick={() => setShowNewForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Intervention
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeInterventions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active interventions</p>
            </div>
          ) : (
            activeInterventions.map((intervention) => {
              const config = interventionTypeConfig[intervention.type]
              const Icon = config.icon
              return (
                <div key={intervention.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.label}</span>
                          <Badge className={statusConfig[intervention.status].color}>
                            {statusConfig[intervention.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {intervention.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                          Started {new Date(intervention.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowRecordOutcome(intervention)
                          setPostMastery(intervention.preMetrics.masteryScore)
                          setPostEngagement(intervention.preMetrics.engagementLevel)
                        }}
                      >
                        Record Outcome
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Completed Interventions */}
      {completedInterventions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Completed Interventions ({completedInterventions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedInterventions.slice(0, 5).map((intervention) => {
              const config = interventionTypeConfig[intervention.type]
              const Icon = config.icon
              const masteryChange = intervention.postMetrics
                ? intervention.postMetrics.masteryScore - intervention.preMetrics.masteryScore
                : 0
              const engagementChange = intervention.postMetrics
                ? intervention.postMetrics.engagementLevel - intervention.preMetrics.engagementLevel
                : 0

              return (
                <div key={intervention.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-medium">{config.label}</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {intervention.description}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className={masteryChange >= 0 ? "text-green-600" : "text-red-600"}>
                            Mastery: {masteryChange >= 0 ? "+" : ""}{masteryChange}%
                          </span>
                          <span className={engagementChange >= 0 ? "text-green-600" : "text-red-600"}>
                            Engagement: {engagementChange >= 0 ? "+" : ""}{engagementChange}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {intervention.outcome === "significant-improvement" && (
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Significant Improvement
                        </Badge>
                      )}
                      {intervention.outcome === "moderate-improvement" && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Moderate Improvement
                        </Badge>
                      )}
                      {intervention.outcome === "no-change" && (
                        <Badge className="bg-slate-100 text-slate-800">
                          No Change
                        </Badge>
                      )}
                      {intervention.outcome === "declined" && (
                        <Badge className="bg-red-100 text-red-800">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          Declined
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* New Intervention Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>New Intervention for {studentName}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowNewForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Current: Mastery {currentMastery}%, Engagement {currentEngagement}%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Intervention Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(interventionTypeConfig).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type as Intervention["type"])}
                        className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                          selectedType === type
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                            : "hover:border-slate-300"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{config.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe the intervention..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Reason (Optional)</label>
                <Input
                  placeholder="Why is this intervention needed?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowNewForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateIntervention} 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  disabled={!description.trim()}
                >
                  Create Intervention
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Outcome Modal */}
      {showRecordOutcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Record Outcome</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowRecordOutcome(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Record the post-intervention metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Post-Intervention Mastery (%)</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={postMastery}
                    onChange={(e) => setPostMastery(Number(e.target.value))}
                    className="w-24"
                  />
                  <div className="flex-1 text-sm text-slate-500">
                    Pre: {showRecordOutcome.preMetrics.masteryScore}% →
                    Change: {postMastery - showRecordOutcome.preMetrics.masteryScore >= 0 ? "+" : ""}
                    {postMastery - showRecordOutcome.preMetrics.masteryScore}%
                  </div>
                </div>
                <Progress value={postMastery} className="h-2 mt-2" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Post-Intervention Engagement (%)</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={postEngagement}
                    onChange={(e) => setPostEngagement(Number(e.target.value))}
                    className="w-24"
                  />
                  <div className="flex-1 text-sm text-slate-500">
                    Pre: {showRecordOutcome.preMetrics.engagementLevel}% →
                    Change: {postEngagement - showRecordOutcome.preMetrics.engagementLevel >= 0 ? "+" : ""}
                    {postEngagement - showRecordOutcome.preMetrics.engagementLevel}%
                  </div>
                </div>
                <Progress value={postEngagement} className="h-2 mt-2" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Textarea
                  placeholder="Any observations or notes about the outcome..."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowRecordOutcome(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordOutcome}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Outcome
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default InterventionPanel
