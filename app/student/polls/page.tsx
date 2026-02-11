"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-auth"
import { StudentHeader } from "@/components/student/header-new"
import { StudentSidebar } from "@/components/student/sidebar-new"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { getStudentClasses } from "@/lib/data-service"
import type { Class } from "@/lib/data-service"
import {
  getActivePolls,
  getAllActivePolls,
  submitPollResponse,
  getStudentPollHistory,
  type Poll,
  type PollResponse
} from "@/lib/polls-service"
import {
  BarChart3,
  CheckCircle,
  Clock,
  MessageSquare,
  Star,
  Send,
  History,
  Zap,
  ThumbsUp,
  ArrowRight
} from "lucide-react"

export default function StudentPollsPage() {
  const { user, loading } = useRequireAuth(["student"])
  const router = useRouter()
  const [activePolls, setActivePolls] = useState<Poll[]>([])
  const [respondedPolls, setRespondedPolls] = useState<Set<string>>(new Set())
  const [pollHistory, setPollHistory] = useState<{ poll: Poll; response: PollResponse }[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null)
  const [response, setResponse] = useState<string>("")
  const [scaleValue, setScaleValue] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
    
    // Poll for new polls every 10 seconds
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [user])

  async function loadData() {
    if (!user) return
    
    try {
      const classesData = await getStudentClasses(user.id)
      console.debug("student.loadData: classesData=", classesData)
      setClasses(classesData)
      
      // Get active polls for all enrolled classes (Supabase-backed)
      const classIds: string[] = classesData.map((c: Class) => c.id)
      const allActivePolls: Poll[] = []
      const responded = new Set<string>()

      if (classIds.length === 0) {
        // Fallback: show any active polls if student is not enrolled (helps teachers testing)
        const polls = await getAllActivePolls()
        console.debug("student.loadData: getAllActivePolls returned", polls.length, "polls")
        polls.forEach((poll: Poll) => {
          if (poll.responses && poll.responses.some(r => r.studentId === user.id)) responded.add(poll.id)
          allActivePolls.push(poll)
        })
      } else {
        for (const classId of classIds) {
          const polls = await getActivePolls(classId)
          console.debug("student.loadData: getActivePolls for", classId, "returned", polls.length)
          polls.forEach((poll: Poll) => {
            if (poll.responses && poll.responses.some(r => r.studentId === user.id)) {
              responded.add(poll.id)
            }
            allActivePolls.push(poll)
          })
        }
      }

      console.debug("student.loadData: total active polls=", allActivePolls.length)

      setActivePolls(allActivePolls)
      setRespondedPolls(responded)

      // Get poll history
      const history = await getStudentPollHistory(user.id)
      setPollHistory(history || [])
    } catch (error) {
      console.error("Error loading polls:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit() {
    if (!selectedPoll || !user) return
    
    setIsSubmitting(true)
    
    let responseValue = response
    if (selectedPoll.type === "scale") {
      responseValue = scaleValue.toString()
    }
    
    if (!responseValue.trim() && selectedPoll.type !== "scale") {
      setIsSubmitting(false)
      return
    }
    
    const result = await submitPollResponse(selectedPoll.id, user.id, user.email || "Student", responseValue)
    
    if (result.success) {
      setShowSuccess(true)
      setRespondedPolls(prev => new Set([...prev, selectedPoll.id]))
      setTimeout(() => {
        setShowSuccess(false)
        setSelectedPoll(null)
        setResponse("")
        setScaleValue(3)
        loadData()
      }, 2000)
    }
    
    setIsSubmitting(false)
  }

  function getClassName(classId: string) {
    return classes.find(c => c.id === classId)?.name || "Class"
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const unansweredPolls = activePolls.filter(p => !respondedPolls.has(p.id))
  const answeredPolls = activePolls.filter(p => respondedPolls.has(p.id))

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                  Classroom Polls
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Share your thoughts with your teachers
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                {showHistory ? "Active Polls" : "History"}
              </Button>
            </div>

            {showHistory ? (
              /* Poll History */
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Your Poll History
                </h2>
                {pollHistory.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No poll responses yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pollHistory.map(({ poll, response }) => (
                      <Card key={poll.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="secondary" className="mb-2">
                                {getClassName(poll.classId)}
                              </Badge>
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {poll.question}
                              </h3>
                              <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                                Your response: {response.response}
                              </p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              {new Date(response.submittedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedPoll ? (
              /* Answer Poll View */
              <Card className="max-w-2xl mx-auto">
                {showSuccess ? (
                  <CardContent className="text-center py-16">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Response Submitted!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Thank you for sharing your thoughts
                    </p>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-100 text-green-800">Live</Badge>
                        <Badge variant="secondary">{getClassName(selectedPoll.classId)}</Badge>
                        {selectedPoll.isAnonymous && (
                          <Badge variant="outline">Anonymous</Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl">{selectedPoll.title}</CardTitle>
                      <CardDescription className="text-lg mt-2">
                        {selectedPoll.question}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Multiple Choice */}
                      {selectedPoll.type === "multiple-choice" && selectedPoll.options && (
                        <div className="space-y-2">
                          {selectedPoll.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => setResponse(option)}
                              className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                                response === option
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  response === option
                                    ? "border-indigo-500 bg-indigo-500"
                                    : "border-slate-300"
                                }`}>
                                  {response === option && (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  )}
                                </div>
                                <span className="font-medium">{option}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Yes/No */}
                      {selectedPoll.type === "yes-no" && (
                        <div className="flex gap-4 justify-center">
                          {["Yes", "No"].map((option) => (
                            <button
                              key={option}
                              onClick={() => setResponse(option)}
                              className={`flex-1 p-6 border-2 rounded-xl transition-all ${
                                response === option
                                  ? option === "Yes"
                                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                    : "border-red-500 bg-red-50 dark:bg-red-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                              }`}
                            >
                              <ThumbsUp className={`w-8 h-8 mx-auto mb-2 ${
                                option === "No" ? "rotate-180" : ""
                              } ${
                                response === option
                                  ? option === "Yes" ? "text-green-600" : "text-red-600"
                                  : "text-slate-400"
                              }`} />
                              <span className="text-lg font-semibold">{option}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Scale */}
                      {selectedPoll.type === "scale" && (
                        <div className="text-center">
                          <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <button
                                key={value}
                                onClick={() => setScaleValue(value)}
                                className={`w-14 h-14 rounded-full border-2 text-lg font-bold transition-all ${
                                  scaleValue >= value
                                    ? "border-yellow-500 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30"
                                    : "border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {value <= scaleValue ? (
                                  <Star className="w-6 h-6 mx-auto fill-yellow-500 text-yellow-500" />
                                ) : (
                                  <Star className="w-6 h-6 mx-auto text-slate-300" />
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-slate-500">
                            {scaleValue === 1 && "Strongly Disagree"}
                            {scaleValue === 2 && "Disagree"}
                            {scaleValue === 3 && "Neutral"}
                            {scaleValue === 4 && "Agree"}
                            {scaleValue === 5 && "Strongly Agree"}
                          </p>
                        </div>
                      )}

                      {/* Word Cloud */}
                      {selectedPoll.type === "word-cloud" && (
                        <div>
                          <Input
                            value={response}
                            onChange={(e) => setResponse(e.target.value.split(" ")[0])} // Single word only
                            placeholder="Enter one word..."
                            className="text-center text-xl p-6"
                            maxLength={20}
                          />
                          <p className="text-center text-sm text-slate-500 mt-2">
                            Enter a single word that comes to mind
                          </p>
                        </div>
                      )}

                      {/* Open Ended */}
                      {selectedPoll.type === "open-ended" && (
                        <Textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="Share your thoughts..."
                          rows={4}
                        />
                      )}

                      <div className="flex gap-3 pt-4">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => { setSelectedPoll(null); setResponse(""); setScaleValue(3) }}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={handleSubmit}
                          disabled={isSubmitting || (!response && selectedPoll.type !== "scale")}
                        >
                          {isSubmitting ? "Submitting..." : "Submit Response"}
                          <Send className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            ) : (
              /* Polls List */
              <div className="space-y-6">
                {/* Unanswered Polls */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Waiting for Your Response ({unansweredPolls.length})
                  </h2>
                  {unansweredPolls.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                        <p className="text-slate-600 dark:text-slate-400 font-medium">
                          All caught up!
                        </p>
                        <p className="text-slate-500 text-sm">
                          No active polls right now. Check back later!
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {unansweredPolls.map((poll) => (
                        <Card 
                          key={poll.id}
                          className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10"
                          onClick={() => setSelectedPoll(poll)}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  Live
                                </Badge>
                                <Badge variant="secondary">
                                  {getClassName(poll.classId)}
                                </Badge>
                              </div>
                              <Clock className="w-4 h-4 text-amber-500" />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                              {poll.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                              {poll.question}
                            </p>
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-xs text-slate-500">
                                {poll.responses.length} responses
                              </span>
                              <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                                Answer <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Already Answered */}
                {answeredPolls.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Already Answered ({answeredPolls.length})
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {answeredPolls.map((poll) => (
                        <Card key={poll.id} className="opacity-60">
                          <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="secondary">
                                {getClassName(poll.classId)}
                              </Badge>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {poll.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {poll.question}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
