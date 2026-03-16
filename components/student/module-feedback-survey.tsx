"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { getModuleFeedbackAggregate, getStudentLessonFeedback, saveModuleFeedback } from "@/lib/module-feedback"

interface ModuleFeedbackSurveyProps {
  studentId: string
  lessonId: string
  conceptId?: string
  conceptName: string
  learningMode: string
  onSubmitted?: () => void
}

export function ModuleFeedbackSurvey({
  studentId,
  lessonId,
  conceptId,
  conceptName,
  learningMode,
  onSubmitted,
}: ModuleFeedbackSurveyProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [responseCount, setResponseCount] = useState(0)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const existing = await getStudentLessonFeedback(studentId, lessonId)
      const aggregate = await getModuleFeedbackAggregate({ lessonId, conceptName })
      if (!mounted) return

      if (existing) {
        setRating(existing.rating)
        setComment(existing.comment || "")
        setSubmitted(true)
      }

      if (aggregate.totalResponses > 0) {
        setAverageRating(aggregate.averageRating)
        setResponseCount(aggregate.totalResponses)
      }
    })()

    return () => {
      mounted = false
    }
  }, [studentId, lessonId, conceptName])

  const handleSubmit = async () => {
    if (!rating) return
    setIsSaving(true)

    try {
      await saveModuleFeedback({
        studentId,
        lessonId,
        conceptId,
        conceptName,
        learningMode,
        rating,
        comment,
      })

      const aggregate = await getModuleFeedbackAggregate({ lessonId, conceptName })
      setAverageRating(aggregate.averageRating)
      setResponseCount(aggregate.totalResponses)
      setSubmitted(true)
      onSubmitted?.()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Module Micro-Survey</h3>
          <p className="text-sm text-slate-500 mt-1">Rate this module in one tap so AMEP can refine future AI guidance.</p>
        </div>
        {averageRating !== null && (
          <div className="text-right">
            <div className="text-lg font-semibold text-slate-900 dark:text-white">{averageRating}/5</div>
            <div className="text-xs text-slate-500">{responseCount} responses</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className="transition-transform hover:scale-110"
            aria-label={`Rate ${value} stars`}
          >
            <Star
              className={`w-7 h-7 ${
                value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={3}
        placeholder="Optional: what would help next time?"
        className="mt-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm"
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {submitted ? "Thanks. Your feedback is already shaping future prompts." : "1 click is enough. Comment is optional."}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!rating || isSaving}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : submitted ? "Update Feedback" : "Submit"}
        </button>
      </div>
    </div>
  )
}

export default ModuleFeedbackSurvey
