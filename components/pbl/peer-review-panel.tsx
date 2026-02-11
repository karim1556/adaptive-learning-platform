"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  assignPeerReviews,
  submitPeerReview,
  getPendingReviews,
  getReceivedReviews,
  calculateReviewSummary,
  softSkillRubrics,
  feedbackOptions,
  type PeerReview,
  type PeerReviewSummary,
  type PeerReviewAssignment
} from "@/lib/peer-review-service"
import {
  Users,
  Star,
  CheckCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Award,
  Sparkles,
  TrendingUp
} from "lucide-react"

interface PeerReviewPanelProps {
  projectId: string
  studentId: string
  studentName: string
  isTeacher?: boolean
  teamMembers?: { id: string; name: string }[]
  classId?: string
  onReviewComplete?: () => void
}

export function PeerReviewPanel({
  projectId,
  studentId,
  studentName,
  isTeacher = false,
  teamMembers = [],
  classId,
  onReviewComplete
}: PeerReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "received" | "summary">("pending")
  const [pendingAssignments, setPendingAssignments] = useState<PeerReviewAssignment[]>([])
  const [receivedReviews, setReceivedReviews] = useState<PeerReview[]>([])
  const [reviewSummary, setReviewSummary] = useState<PeerReviewSummary | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<PeerReviewAssignment | null>(null)
  const [currentSkillIndex, setCurrentSkillIndex] = useState(0)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([])
  const [selectedImprovements, setSelectedImprovements] = useState<string[]>([])
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])

  useEffect(() => {
    loadReviews()
    loadSubmissions()
  }, [studentId, projectId])

  async function loadSubmissions() {
    // Load all submissions for this project
    try {
      const { getProjectSubmissions } = await import("@/lib/data-service")
      const subs = await getProjectSubmissions(projectId)
      // Filter out the current student's submission
      setAllSubmissions(subs.filter((s: any) => s.student_id !== studentId))
    } catch (e) {
      console.error("Failed to load submissions:", e)
    }
  }

  function loadReviews() {
    const pending = getPendingReviews(studentId)
      .filter(a => a.projectId === projectId)
    const received = getReceivedReviews(studentId, projectId)
    const summary = calculateReviewSummary(studentId, projectId)
    
    setPendingAssignments(pending)
    setReceivedReviews(received)
    setReviewSummary(summary)
  }

  function startReview(assignment: PeerReviewAssignment) {
    setSelectedAssignment(assignment)
    setCurrentSkillIndex(0)
    setScores({})
    setSelectedStrengths([])
    setSelectedImprovements([])
    setComment("")
  }

  function handleScoreSelect(skillId: string, score: number) {
    setScores(prev => ({ ...prev, [skillId]: score }))
  }

  function toggleStrength(strength: string) {
    setSelectedStrengths(prev => 
      prev.includes(strength) 
        ? prev.filter(s => s !== strength)
        : [...prev, strength].slice(0, 3)
    )
  }

  function toggleImprovement(improvement: string) {
    setSelectedImprovements(prev =>
      prev.includes(improvement)
        ? prev.filter(i => i !== improvement)
        : [...prev, improvement].slice(0, 3)
    )
  }

  function nextSkill() {
    if (currentSkillIndex < softSkillRubrics.length - 1) {
      setCurrentSkillIndex(prev => prev + 1)
    }
  }

  function prevSkill() {
    if (currentSkillIndex > 0) {
      setCurrentSkillIndex(prev => prev - 1)
    }
  }

  async function submitReviewHandler() {
    if (!selectedAssignment) return
    
    setIsSubmitting(true)
    
    const ratings = Object.entries(scores).map(([skill, score]) => ({
      skill,
      score,
      comment: ""
    }))

    // Find submission for reviewee name
    const revieweeSubmission = allSubmissions.find(s => s.student_id === selectedAssignment.revieweeId)
    const revieweeName = revieweeSubmission ? `Student ${selectedAssignment.revieweeId.substring(0, 8)}` : "Classmate"

    submitPeerReview({
      projectId: selectedAssignment.projectId,
      reviewerId: studentId,
      reviewerName: studentName,
      revieweeId: selectedAssignment.revieweeId,
      revieweeName,
      isAnonymous: true,
      ratings,
      overallComment: comment,
      strengths: selectedStrengths,
      improvements: selectedImprovements
    })
    
    setSelectedAssignment(null)
    loadReviews()
    loadSubmissions()
    setIsSubmitting(false)
    onReviewComplete?.()
  }

  const currentRubric = softSkillRubrics[currentSkillIndex]
  const allSkillsRated = softSkillRubrics.every(rubric => scores[rubric.id] !== undefined)

  // Teacher view - assign reviews
  if (isTeacher) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Peer Review Management
          </CardTitle>
          <CardDescription>
            Assign peer reviews for team-based soft skill assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Peer reviews help assess soft skills like teamwork, communication, and leadership.
              Each student will review their teammates anonymously.
            </p>
            <Button 
              onClick={() => {
                if (teamMembers.length >= 2) {
                  assignPeerReviews(projectId, teamMembers)
                  alert("Peer reviews have been assigned to team members!")
                } else {
                  alert("Need at least 2 team members to assign peer reviews")
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Users className="w-4 h-4 mr-2" />
              Assign Peer Reviews
            </Button>
          </div>

          {/* Review Status */}
          <div>
            <h4 className="font-semibold mb-3">Review Status</h4>
            <div className="space-y-2">
              {teamMembers.map(member => {
                const memberReceived = getReceivedReviews(member.id, projectId)
                const memberSummary = calculateReviewSummary(member.id, projectId)
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{member.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {memberReceived.length} reviews received
                      </span>
                      {memberSummary && (
                        <Badge className="bg-indigo-100 text-indigo-800">
                          Avg: {memberSummary.overallScore.toFixed(1)}/5
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Student currently reviewing someone
  if (selectedAssignment) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review Your Teammate</CardTitle>
            <Badge variant="secondary">
              {currentSkillIndex + 1} / {softSkillRubrics.length}
            </Badge>
          </div>
          <Progress 
            value={((currentSkillIndex + 1) / softSkillRubrics.length) * 100} 
            className="h-2 mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white capitalize mb-1">
              {currentRubric.name}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {currentRubric.description}
            </p>
          </div>

          {/* Rating Scale */}
          <div className="space-y-3 mb-6">
            {currentRubric.levels.map((level) => (
              <button
                key={level.score}
                onClick={() => handleScoreSelect(currentRubric.id, level.score)}
                className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                  scores[currentRubric.id] === level.score
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex gap-1">
                    {[...Array(level.score)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          scores[currentRubric.id] === level.score 
                            ? "fill-yellow-500 text-yellow-500" 
                            : "fill-slate-200 text-slate-200"
                        }`} 
                      />
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{level.label}</p>
                    <p className="text-xs text-slate-500">{level.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevSkill}
              disabled={currentSkillIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {currentSkillIndex === softSkillRubrics.length - 1 ? (
              <div className="flex-1 mx-4 space-y-3">
                {/* Strengths Selection */}
                <div>
                  <p className="text-sm font-medium mb-2">Strengths (select up to 3)</p>
                  <div className="flex flex-wrap gap-1">
                    {feedbackOptions.strengths.slice(0, 6).map(s => (
                      <Badge
                        key={s}
                        variant={selectedStrengths.includes(s) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleStrength(s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add an optional comment about your teammate..."
                  rows={2}
                  className="text-sm"
                />
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={submitReviewHandler}
                  disabled={!allSkillsRated || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={nextSkill}
                disabled={scores[currentRubric.id] === undefined}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Student main view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Peer Reviews
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "pending"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Pending ({pendingAssignments.length})
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "received"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Received ({receivedReviews.length})
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "summary"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            My Scores
          </button>
        </div>

        {/* Pending Reviews */}
        {activeTab === "pending" && (
          <div className="space-y-3">
            {allSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-500">No submissions to review yet!</p>
                <p className="text-xs text-slate-400 mt-2">Other students haven't submitted their work</p>
              </div>
            ) : (
              allSubmissions.slice(0, 3).map((submission, idx) => {
                // Check if already reviewed
                const alreadyReviewed = receivedReviews.some(
                  r => r.reviewerId === studentId && r.revieweeId === submission.student_id
                )
                
                return (
                  <div
                    key={submission.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium">Classmate's Submission {idx + 1}</p>
                          <p className="text-sm text-slate-500">
                            Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {alreadyReviewed && (
                        <Badge className="bg-green-100 text-green-800">Reviewed</Badge>
                      )}
                    </div>
                    
                    {/* Show submission content */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                        {submission.content || "No description provided"}
                      </p>
                      {submission.file_url && (
                        <a 
                          href={submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View attached file →
                        </a>
                      )}
                    </div>
                    
                    {!alreadyReviewed && (
                      <Button 
                        onClick={() => startReview({
                          id: `review-${submission.id}`,
                          projectId,
                          reviewerId: studentId,
                          revieweeId: submission.student_id,
                          assignedAt: new Date().toISOString(),
                          status: "pending"
                        })}
                        className="w-full"
                      >
                        Review This Work
                      </Button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Received Reviews */}
        {activeTab === "received" && (
          <div className="space-y-3">
            {receivedReviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No reviews received yet</p>
              </div>
            ) : (
              receivedReviews.map((review, idx) => (
                <div
                  key={review.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary">Review #{idx + 1}</Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(review.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {review.ratings.map((rating) => (
                      <div key={rating.skill} className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{rating.score}</div>
                        <div className="text-xs text-slate-500 capitalize">{rating.skill}</div>
                      </div>
                    ))}
                  </div>
                  {review.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {review.strengths.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-green-600 border-green-300">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {review.overallComment && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm italic">
                      "{review.overallComment}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Summary */}
        {activeTab === "summary" && (
          <div>
            {reviewSummary ? (
              <div className="space-y-4">
                {/* Overall Score */}
                <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
                  <Award className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                  <div className="text-4xl font-bold text-indigo-600 mb-1">
                    {reviewSummary.overallScore.toFixed(1)}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Overall Soft Skills Score
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Based on {reviewSummary.reviewCount} peer review{reviewSummary.reviewCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Individual Skills */}
                <div className="space-y-3">
                  {Object.entries(reviewSummary.averageScores).map(([skill, average]) => (
                    <div key={skill} className="flex items-center gap-4">
                      <div className="w-28 text-sm font-medium capitalize">{skill}</div>
                      <div className="flex-1">
                        <Progress value={((average as number) / 5) * 100} className="h-2" />
                      </div>
                      <div className="w-12 text-right font-semibold">
                        {(average as number).toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Highlights */}
                {reviewSummary.commonStrengths.length > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-green-600" />
                      Your Strengths
                    </h4>
                    <ul className="space-y-1">
                      {reviewSummary.commonStrengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-green-800 dark:text-green-300">
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {reviewSummary.commonImprovements.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Areas to Grow
                    </h4>
                    <ul className="space-y-1">
                      {reviewSummary.commonImprovements.map((area, idx) => (
                        <li key={idx} className="text-sm text-amber-800 dark:text-amber-300">
                          • {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  Complete peer reviews to see your soft skills summary
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
