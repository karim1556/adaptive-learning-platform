"use client"

import { useState, useRef, useEffect } from "react"
import { CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { Checkpoint, Question } from "@/lib/lesson-service"

interface VideoWithCheckpointsProps {
  videoUrl: string
  checkpoints: Checkpoint[]
  onCheckpointComplete: (checkpointId: string, score: number, passed: boolean) => void
  className?: string
}

export function VideoWithCheckpoints({
  videoUrl,
  checkpoints = [],
  onCheckpointComplete,
  className = ""
}: VideoWithCheckpointsProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null)
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<string>>(new Set())
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string | number>>({})
  const [showResults, setShowResults] = useState(false)
  const [checkpointScore, setCheckpointScore] = useState({ correct: 0, total: 0 })
  const [autoSubmittedReason, setAutoSubmittedReason] = useState<string | null>(null)
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Extract YouTube ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  const youtubeId = getYouTubeId(videoUrl)
  const isEmbedUrl = videoUrl && (videoUrl.includes("/api/videos/embed/") || videoUrl.includes("/embed/"))
  const isDirectVideo = !youtubeId && !isEmbedUrl

  // Sort checkpoints by timestamp
  const sortedCheckpoints = [...checkpoints].sort((a, b) => 
    (a.videoTimestamp || 0) - (b.videoTimestamp || 0)
  )

  // Monitor video time for direct video
  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return

    const video = videoRef.current
    const handleTimeUpdate = () => {
      const time = video.currentTime
      setCurrentTime(time)

      // Check if we should trigger a checkpoint
      const checkpoint = sortedCheckpoints.find(cp => 
        cp.videoTimestamp && 
        !completedCheckpoints.has(cp.id) &&
        Math.abs(time - cp.videoTimestamp) < 0.5 // Within 0.5 seconds
      )

      if (checkpoint) {
        video.pause()
        setIsPaused(true)
        setActiveCheckpoint(checkpoint)
        setCurrentAnswers({})
        setShowResults(false)
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    return () => video.removeEventListener("timeupdate", handleTimeUpdate)
  }, [sortedCheckpoints, completedCheckpoints, isDirectVideo])

  // Timer for iframe videos (since we can't track their time)
  useEffect(() => {
    if (isDirectVideo || activeCheckpoint) return

    // Start timer when component mounts
    if (!videoStartTime) {
      setVideoStartTime(Date.now())
    }

    const interval = setInterval(() => {
      if (videoStartTime && !isPaused) {
        const elapsed = Math.floor((Date.now() - videoStartTime) / 1000)
        setElapsedTime(elapsed)

        // Check if we should trigger a checkpoint
        const checkpoint = sortedCheckpoints.find(cp => 
          cp.videoTimestamp && 
          !completedCheckpoints.has(cp.id) &&
          Math.abs(elapsed - cp.videoTimestamp) < 2 // Within 2 seconds
        )

        if (checkpoint) {
          setIsPaused(true)
          setActiveCheckpoint(checkpoint)
          setCurrentAnswers({})
          setShowResults(false)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isDirectVideo, videoStartTime, isPaused, activeCheckpoint, sortedCheckpoints, completedCheckpoints])

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setCurrentAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmitCheckpoint = () => {
    if (!activeCheckpoint) return

    let correct = 0
    const total = activeCheckpoint.questions.length

    activeCheckpoint.questions.forEach(q => {
      const answer = currentAnswers[q.id]
      if (answer !== undefined && answer === q.correctAnswer) {
        correct++
      }
    })

    const score = Math.round((correct / total) * 100)
    const passed = score >= activeCheckpoint.passingScore

    setCheckpointScore({ correct, total })
    setShowResults(true)

    // mark reason if it was auto-submitted
    if (!autoSubmittedReason) {
      setAutoSubmittedReason(null)
    }

    // Notify parent
    onCheckpointComplete(activeCheckpoint.id, score, passed)
  }

  // Auto-submit when user switches tabs, window blurs, attempts to copy, or unloads.
  useEffect(() => {
    if (!activeCheckpoint) return

    let submitted = false

    const doAutoSubmit = (reason: string) => {
      if (submitted) return
      submitted = true
      setAutoSubmittedReason(reason)
      // call submit even if not all answers provided
      handleSubmitCheckpoint()
    }

    const onVisibilityChange = () => {
      if (document.hidden) doAutoSubmit("visibilitychange")
    }

    const onBlur = () => doAutoSubmit("blur")
    const onCopy = (e: ClipboardEvent) => {
      doAutoSubmit("copy")
      // allow copy but still submit
    }

    const onBeforeUnload = () => doAutoSubmit("beforeunload")

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("blur", onBlur)
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("copy", onCopy)

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("copy", onCopy)
    }
  }, [activeCheckpoint, handleSubmitCheckpoint])

  const handleContinue = () => {
    if (!activeCheckpoint) return

    // Mark as completed
    setCompletedCheckpoints(prev => new Set([...prev, activeCheckpoint.id]))
    setActiveCheckpoint(null)
    setShowResults(false)
    setIsPaused(false)

    // Resume video
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const triggerCheckpoint = (checkpoint: Checkpoint) => {
    if (completedCheckpoints.has(checkpoint.id)) return
    setIsPaused(true)
    setActiveCheckpoint(checkpoint)
    setCurrentAnswers({})
    setShowResults(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Video Player */}
      <div className={`aspect-video rounded-xl overflow-hidden bg-slate-900 ${activeCheckpoint ? "pointer-events-none opacity-50" : ""}`}>
        {youtubeId ? (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isEmbedUrl ? (
          <iframe
            ref={iframeRef}
            src={videoUrl}
            className="w-full h-full"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full"
          />
        )}
      </div>

      {/* Checkpoint Overlay */}
      {activeCheckpoint && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">?</span>
                </div>
                {activeCheckpoint.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Answer the questions to continue watching • Passing score: {activeCheckpoint.passingScore}%
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {!showResults ? (
                <>
                  {activeCheckpoint.questions.map((question, idx) => (
                    <div key={question.id} className="space-y-3">
                      <p className="font-medium">
                        {idx + 1}. {question.text}
                      </p>

                      {question.type === "multiple_choice" && question.options && (
                        <RadioGroup
                          value={String(currentAnswers[question.id] ?? "")}
                          onValueChange={(value) => handleAnswerChange(question.id, parseInt(value))}
                        >
                          {question.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2">
                              <RadioGroupItem value={String(optIdx)} id={`${question.id}-${optIdx}`} />
                              <Label htmlFor={`${question.id}-${optIdx}`} className="cursor-pointer">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {question.type === "true_false" && (
                        <RadioGroup
                          value={String(currentAnswers[question.id] ?? "")}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id={`${question.id}-true`} />
                            <Label htmlFor={`${question.id}-true`} className="cursor-pointer">True</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id={`${question.id}-false`} />
                            <Label htmlFor={`${question.id}-false`} className="cursor-pointer">False</Label>
                          </div>
                        </RadioGroup>
                      )}

                      {question.type === "short_answer" && (
                        <input
                          type="text"
                          value={String(currentAnswers[question.id] ?? "")}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Type your answer..."
                        />
                      )}
                    </div>
                  ))}

                  <Button
                    onClick={handleSubmitCheckpoint}
                    className="w-full"
                    disabled={Object.keys(currentAnswers).length !== activeCheckpoint.questions.length}
                  >
                    Submit Answers
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Results */}
                  <div className={`p-6 rounded-lg text-center ${
                    checkpointScore.correct / checkpointScore.total >= activeCheckpoint.passingScore / 100
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  }`}>
                    {checkpointScore.correct / checkpointScore.total >= activeCheckpoint.passingScore / 100 ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-green-900 dark:text-green-100">Great Job!</h3>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-red-900 dark:text-red-100">Keep Learning</h3>
                      </>
                    )}
                    <p className="text-sm mt-2">
                      You got {checkpointScore.correct} out of {checkpointScore.total} correct
                      ({Math.round((checkpointScore.correct / checkpointScore.total) * 100)}%)
                    </p>
                  </div>

                  {/* Question Review */}
                  {activeCheckpoint.questions.map((q, idx) => {
                    const userAnswer = currentAnswers[q.id]
                    const isCorrect = userAnswer === q.correctAnswer

                    return (
                      <div key={q.id} className={`p-4 rounded-lg border ${
                        isCorrect 
                          ? "border-green-200 bg-green-50 dark:bg-green-900/10" 
                          : "border-red-200 bg-red-50 dark:bg-red-900/10"
                      }`}>
                        <div className="flex items-start gap-2">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{idx + 1}. {q.text}</p>
                            {!isCorrect && q.explanation && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <strong>Explanation:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <Button onClick={handleContinue} className="w-full">
                    Continue Video
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Checkpoint Indicators */}
      {sortedCheckpoints.length > 0 && (
        <div className="mt-3">
          {!isDirectVideo && (
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              Elapsed: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, "0")}
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {sortedCheckpoints.map(cp => (
              <button
                key={cp.id}
                onClick={() => !isDirectVideo && triggerCheckpoint(cp)}
                disabled={completedCheckpoints.has(cp.id) || isDirectVideo}
                className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                  completedCheckpoints.has(cp.id)
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : isDirectVideo
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 cursor-default"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 cursor-pointer"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {completedCheckpoints.has(cp.id) && "✓ "}
                {cp.title} @ {Math.floor((cp.videoTimestamp || 0) / 60)}:{String(Math.floor((cp.videoTimestamp || 0) % 60)).padStart(2, "0")}
              </button>
            ))}
          </div>
          {!isDirectVideo && sortedCheckpoints.some(cp => !completedCheckpoints.has(cp.id)) && (
            <p className="text-xs text-slate-500 mt-2">💡 Click checkpoint buttons when you reach that time in the video</p>
          )}
        </div>
      )}
    </div>
  )
}
