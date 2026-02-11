"use client"

import { useState, useEffect, useCallback } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter, useParams } from "next/navigation"
import { StudentHeader } from "@/components/student/header"
import { StudentSidebar } from "@/components/student/sidebar"
import { VideoWithCheckpoints } from "@/components/student/video-with-checkpoints"
import { 
  getLesson,
  getStudentProgress,
  startLesson,
  completeContentBlock,
  submitCheckpoint,
  completeLesson,
  saveProgress,
  type Lesson,
  type LessonProgress,
  type LessonBlock,
  type CheckpointAttempt
} from "@/lib/lesson-service"
import {
  BookOpen,
  Eye,
  Ear,
  BookText,
  Hand,
  Clock,
  HelpCircle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Play,
  FileText,
  Video,
  Image,
  Link,
  Trophy,
  Target,
  AlertCircle,
  RotateCcw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const VARK_OPTIONS = [
  { id: "visual", label: "Visual", icon: Eye, color: "bg-blue-500" },
  { id: "auditory", label: "Auditory", icon: Ear, color: "bg-purple-500" },
  { id: "reading", label: "Reading", icon: BookText, color: "bg-emerald-500" },
  { id: "kinesthetic", label: "Kinesthetic", icon: Hand, color: "bg-amber-500" },
]

export default function LessonViewerPage() {
  const { user, loading: authLoading } = useRequireAuth(["student"])
  const router = useRouter()
  const params = useParams()
  const lessonId = params.id as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)
  
  // Checkpoint state
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [checkpointResult, setCheckpointResult] = useState<{
    score: number
    passed: boolean
    results: Array<{ questionId: string; correct: boolean; explanation?: string }>
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Content block timer
  const [blockStartTime, setBlockStartTime] = useState<number>(Date.now())
  const [timeSpent, setTimeSpent] = useState(0)

  useEffect(() => {
    if (!user || !lessonId) return
    loadLesson()
  }, [user?.id, lessonId])

  // Track time spent
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - blockStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [blockStartTime])

  const loadLesson = async () => {
    if (!user) return
    
    const lessonData = await getLesson(lessonId)
    if (!lessonData) {
      router.push("/student/lessons")
      return
    }
    setLesson(lessonData)

    // Get or start progress
    let progressData = await getStudentProgress(user.id, lessonId)
    if (!progressData) {
      progressData = await startLesson(user.id, lessonData)
    }
    
    if (progressData) {
      setProgress(progressData)
      // If lesson is completed, reset to first block for review
      // Otherwise, use saved progress
      if (progressData.completedAt) {
        setCurrentBlockIndex(0)
      } else {
        setCurrentBlockIndex(progressData.currentBlockIndex)
      }
    }
    
    setIsLoading(false)
    setBlockStartTime(Date.now())
  }

  const isBlockCompleted = useCallback((blockId: string) => {
    return progress?.completedBlocks.includes(blockId) || false
  }, [progress])

  const getCheckpointAttempt = useCallback((checkpointId: string): CheckpointAttempt | undefined => {
    return progress?.checkpointAttempts.find(a => a.checkpointId === checkpointId)
  }, [progress])

  const handleContentComplete = async () => {
    if (!user || !lesson || !currentBlock || currentBlock.type !== "content" || !progress) return

    await completeContentBlock(progress, currentBlock.id, timeSpent)
    
    // Reload progress
    const updatedProgress = await getStudentProgress(user.id, lessonId)
    if (updatedProgress) setProgress(updatedProgress)

    // Move to next block
    goToNextBlock()
  }

  const handleCheckpointSubmit = async () => {
    if (!user || !lesson || !currentBlock || currentBlock.type !== "checkpoint" || !currentBlock.checkpoint || !progress) return

    setIsSubmitting(true)

    const result = await submitCheckpoint(
      progress,
      currentBlock.checkpoint.id,
      answers,
      currentBlock.checkpoint
    )

    setCheckpointResult({
      score: result.score,
      passed: result.passed,
      results: currentBlock.checkpoint.questions.map(q => ({
        questionId: q.id,
        correct: checkAnswer(q, answers[q.id]),
        explanation: q.explanation
      }))
    })

    // Reload progress
    const updatedProgress = await getStudentProgress(user.id, lessonId)
    if (updatedProgress) setProgress(updatedProgress)

    setIsSubmitting(false)
  }

  // Helper to check if answer is correct
  const checkAnswer = (question: any, answer: string | number | undefined): boolean => {
    if (answer === undefined) return false
    if (question.type === "multiple_choice" || question.type === "true_false") {
      return answer === question.correctAnswer
    }
    if (question.type === "short_answer") {
      return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim()
    }
    return false
  }

  const goToNextBlock = async () => {
    if (!lesson || !progress) return
    
    // Reset state
    setAnswers({})
    setCheckpointResult(null)
    setBlockStartTime(Date.now())
    setTimeSpent(0)

    if (currentBlockIndex < lesson.blocks.length - 1) {
      const nextIndex = currentBlockIndex + 1
      setCurrentBlockIndex(nextIndex)
      
      // Update progress with new index
      progress.currentBlockIndex = nextIndex
      await saveProgress(progress)
    } else {
      // Lesson complete - don't increment beyond lesson length
      handleLessonComplete()
    }
  }

  const goToPreviousBlock = () => {
    if (currentBlockIndex > 0) {
      setAnswers({})
      setCheckpointResult(null)
      setBlockStartTime(Date.now())
      setTimeSpent(0)
      setCurrentBlockIndex(currentBlockIndex - 1)
    }
  }

  const handleLessonComplete = async () => {
    if (!user || !progress) return
    await completeLesson(progress)
    const updatedProgress = await getStudentProgress(user.id, lessonId)
    if (updatedProgress) setProgress(updatedProgress)
  }

  const retryCheckpoint = () => {
    setAnswers({})
    setCheckpointResult(null)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !lesson) return null

  // Ensure currentBlockIndex is within bounds
  const safeBlockIndex = Math.min(currentBlockIndex, lesson.blocks.length - 1)
  const currentBlock = lesson.blocks[safeBlockIndex]

  const vark = VARK_OPTIONS.find(v => v.id === lesson.learningMode)
  const overallProgress = Math.round(((safeBlockIndex + (checkpointResult || isBlockCompleted(currentBlock?.id || "") ? 1 : 0)) / lesson.blocks.length) * 100)
  const isComplete = !!progress?.completedAt

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto">
          {/* Lesson Header */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-3">
                <Button variant="outline" size="sm" onClick={() => router.push("/student/lessons")}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Lessons
                </Button>
                {isComplete && (
                  <span className="px-3 py-1 text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    Completed - Score: {Math.round(progress?.overallScore || 0)}%
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">{lesson.title}</h1>
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <span className="capitalize">{lesson.learningMode}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.estimatedDuration} min
                    </span>
                    <span>•</span>
                    <span>Block {safeBlockIndex + 1} of {lesson.blocks.length}</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Lesson Progress</span>
                  <span className="font-medium text-slate-900 dark:text-white">{overallProgress}%</span>
                </div>
                <div className="relative">
                  <Progress value={overallProgress} className="h-2" />
                  {/* Block markers */}
                  <div className="absolute inset-0 flex">
                    {lesson.blocks.map((block, i) => (
                      <button
                        key={block.id}
                        onClick={() => {
                          if (i <= safeBlockIndex || isBlockCompleted(block.id)) {
                            setCurrentBlockIndex(i)
                            setAnswers({})
                            setCheckpointResult(null)
                          }
                        }}
                        className={`flex-1 h-2 cursor-pointer ${i === 0 ? "rounded-l-full" : ""} ${i === lesson.blocks.length - 1 ? "rounded-r-full" : ""}`}
                        style={{ opacity: 0 }}
                        title={block.type === "checkpoint" ? `Quiz: ${block.checkpoint?.title}` : "Content block"}
                      />
                    ))}
                  </div>
                </div>
                {/* Block indicator dots */}
                <div className="flex justify-between mt-2">
                  {lesson.blocks.map((block, i) => (
                    <div
                      key={block.id}
                      className={`w-3 h-3 rounded-full flex items-center justify-center ${
                        i === safeBlockIndex
                          ? "bg-indigo-600 ring-4 ring-indigo-200 dark:ring-indigo-900"
                          : isBlockCompleted(block.id)
                            ? "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      {block.type === "checkpoint" && (
                        <HelpCircle className="w-2 h-2 text-white" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              {currentBlock?.type === "content" && currentBlock.contentBlock && (
                <ContentBlockViewer
                  block={currentBlock}
                  timeSpent={timeSpent}
                  isCompleted={isBlockCompleted(currentBlock.id)}
                  onComplete={handleContentComplete}
                  onNext={goToNextBlock}
                  onPrevious={goToPreviousBlock}
                  hasPrevious={safeBlockIndex > 0}
                  isLastBlock={safeBlockIndex === lesson.blocks.length - 1}
                  studentId={user.id}
                  lessonId={lessonId}
                />
              )}

              {currentBlock?.type === "checkpoint" && currentBlock.checkpoint && (
                <CheckpointViewer
                  block={currentBlock}
                  answers={answers}
                  setAnswers={setAnswers}
                  result={checkpointResult}
                  previousAttempt={getCheckpointAttempt(currentBlock.checkpoint.id)}
                  isSubmitting={isSubmitting}
                  onSubmit={handleCheckpointSubmit}
                  onRetry={retryCheckpoint}
                  onNext={goToNextBlock}
                  onPrevious={goToPreviousBlock}
                  hasPrevious={currentBlockIndex > 0}
                  isLastBlock={currentBlockIndex === lesson.blocks.length - 1}
                  isComplete={isComplete}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ============================================================================
// Content Block Viewer
// ============================================================================

function ContentBlockViewer({
  block,
  timeSpent,
  isCompleted,
  onComplete,
  onNext,
  onPrevious,
  hasPrevious,
  isLastBlock,
  studentId,
  lessonId
}: {
  block: LessonBlock
  timeSpent: number
  isCompleted: boolean
  onComplete: () => void
  onNext: () => void
  onPrevious: () => void
  hasPrevious: boolean
  isLastBlock: boolean
  studentId: string
  lessonId: string
}) {
  const content = block.contentBlock!
  const minReadTime = Math.max(10, (content.duration || 5) * 10) // 10 seconds per estimated minute

  const getContentTypeIcon = () => {
    switch (content.type) {
      case "text": return FileText
      case "video": return Video
      case "image": return Image
      case "embed": return Link
      default: return FileText
    }
  }

  const Icon = getContentTypeIcon()

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Block Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white capitalize">{content.type} Content</p>
            <p className="text-xs text-slate-500">~{content.duration} min</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">
            {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {content.type === "text" && (
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
        )}

        {content.type === "video" && (
          <VideoWithCheckpoints
            videoUrl={content.content}
            checkpoints={content.videoCheckpoints || []}
            onCheckpointComplete={async (checkpointId, score, passed) => {
              // Video checkpoints are auto-graded, just log the result
              console.log(`Video checkpoint ${checkpointId} completed: ${score}% (${passed ? "passed" : "failed"})`)
              // Update stats would go here if needed
            }}
            className=""
          />
        )}

        {content.type === "image" && (
          <div className="flex justify-center">
            <img 
              src={content.content} 
              alt="Lesson content" 
              className="max-w-full max-h-[600px] rounded-xl object-contain"
            />
          </div>
        )}

        {content.type === "pdf" && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                PDF Document
              </span>
              <a 
                href={content.content} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Open in new tab
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <iframe
              src={content.content}
              className="w-full h-[600px]"
              title="PDF Document"
            />
          </div>
        )}

        {content.type === "embed" && (
          <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <iframe
              src={content.content}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={!hasPrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {!isCompleted && timeSpent < minReadTime && (
            <p className="text-sm text-slate-500">
              Read for at least {minReadTime - timeSpent} more seconds
            </p>
          )}
          
          {isCompleted ? (
            <Button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700">
              {isLastBlock ? "Finish Lesson" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={onComplete} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={timeSpent < minReadTime}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Checkpoint Viewer
// ============================================================================

function CheckpointViewer({
  block,
  answers,
  setAnswers,
  result,
  previousAttempt,
  isSubmitting,
  onSubmit,
  onRetry,
  onNext,
  onPrevious,
  hasPrevious,
  isLastBlock,
  isComplete
}: {
  block: LessonBlock
  answers: Record<string, string | number>
  setAnswers: (answers: Record<string, string | number>) => void
  result: { score: number; passed: boolean; results: Array<{ questionId: string; correct: boolean; explanation?: string }> } | null
  previousAttempt: CheckpointAttempt | undefined
  isSubmitting: boolean
  onSubmit: () => void
  onRetry: () => void
  onNext: () => void
  onPrevious: () => void
  hasPrevious: boolean
  isLastBlock: boolean
  isComplete: boolean | undefined
}) {
  const checkpoint = block.checkpoint!
  const allAnswered = checkpoint.questions.every(q => answers[q.id] !== undefined)

  // If there's a previous attempt and no current result, show the review
  const showReview = previousAttempt && !result && Object.keys(answers).length === 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Checkpoint Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{checkpoint.title}</p>
              <p className="text-xs text-slate-500">
                {checkpoint.questions.length} questions • Pass: {checkpoint.passingScore}%
              </p>
            </div>
          </div>
          {previousAttempt && (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Previous Score: {Math.round(previousAttempt.percentage)}%
              </p>
              <p className={`text-xs ${previousAttempt.percentage >= checkpoint.passingScore ? "text-emerald-600" : "text-red-500"}`}>
                {previousAttempt.percentage >= checkpoint.passingScore ? "Passed" : "Not Passed"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Questions or Review */}
      <div className="p-6">
        {showReview ? (
          // Previous attempt review
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                previousAttempt.percentage >= checkpoint.passingScore ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                {previousAttempt.percentage >= checkpoint.passingScore ? (
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-4">
                {previousAttempt.percentage >= checkpoint.passingScore ? "Great job!" : "Keep trying!"}
              </h3>
              <p className="text-slate-500 mt-1">
                You scored {Math.round(previousAttempt.percentage)}% on this checkpoint
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" onClick={onRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700">
                {isLastBlock ? "Finish Lesson" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : result ? (
          // Show results
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                result.passed ? "bg-emerald-100" : "bg-red-100"
              }`}>
                {result.passed ? (
                  <Trophy className="w-8 h-8 text-emerald-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-4">
                {Math.round(result.score)}%
              </h3>
              <p className={`font-medium ${result.passed ? "text-emerald-600" : "text-red-600"}`}>
                {result.passed ? "Passed!" : `Needs ${checkpoint.passingScore}% to pass`}
              </p>
            </div>

            {/* Results breakdown */}
            <div className="space-y-4">
              {checkpoint.questions.map((question, qi) => {
                const qResult = result.results.find(r => r.questionId === question.id)
                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-xl border ${
                      qResult?.correct
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                        : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        qResult?.correct ? "bg-emerald-500" : "bg-red-500"
                      }`}>
                        {qResult?.correct ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <XCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">{question.text}</p>
                        {question.explanation && (
                          <p className="text-sm text-slate-500 mt-2">{question.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          // Active quiz
          <div className="space-y-6">
            {checkpoint.questions.map((question, qi) => (
              <div key={question.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-medium flex items-center justify-center flex-shrink-0">
                    {qi + 1}
                  </span>
                  <p className="font-medium text-slate-900 dark:text-white pt-0.5">{question.text}</p>
                </div>

                {question.type === "multiple_choice" && (
                  <div className="space-y-2 ml-10">
                    {question.options?.map((option, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers({ ...answers, [question.id]: oi })}
                        className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                          answers[question.id] === oi
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                            : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                        }`}
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-300">{option}</span>
                      </button>
                    ))}
                  </div>
                )}

                {question.type === "true_false" && (
                  <div className="flex gap-4 ml-10">
                    <button
                      onClick={() => setAnswers({ ...answers, [question.id]: "true" })}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        answers[question.id] === "true"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                      }`}
                    >
                      True
                    </button>
                    <button
                      onClick={() => setAnswers({ ...answers, [question.id]: "false" })}
                      className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                        answers[question.id] === "false"
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                          : "border-slate-200 dark:border-slate-600 hover:border-slate-300"
                      }`}
                    >
                      False
                    </button>
                  </div>
                )}

                {question.type === "short_answer" && (
                  <div className="ml-10">
                    <input
                      type="text"
                      value={String(answers[question.id] || "")}
                      onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                      placeholder="Type your answer..."
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={!hasPrevious}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex items-center gap-3">
          {!showReview && !result && (
            <Button
              onClick={onSubmit}
              disabled={!allAnswered || isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? "Grading..." : "Submit Answers"}
            </Button>
          )}

          {(result || showReview) && (
            <>
              {!result?.passed && !showReview && (
                <Button variant="outline" onClick={onRetry}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700">
                {isLastBlock ? "Finish Lesson" : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
