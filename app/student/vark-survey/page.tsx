"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { VARK_QUESTIONS, scoreVARKAnswers } from "@/lib/vark-survey"
import { useRequireAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabaseClient"
import { 
  GraduationCap, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Ear,
  BookText,
  Hand,
  Sparkles
} from "lucide-react"

type VARKAnswers = Record<string, string>

const VARK_INFO = {
  Visual: {
    icon: Eye,
    color: "bg-blue-500",
    lightColor: "bg-blue-50 text-blue-700",
    description: "You learn best through visual information like diagrams, charts, and images."
  },
  Auditory: {
    icon: Ear,
    color: "bg-purple-500",
    lightColor: "bg-purple-50 text-purple-700",
    description: "You learn best through listening and verbal explanations."
  },
  Reading: {
    icon: BookText,
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 text-emerald-700",
    description: "You learn best through reading and writing text-based content."
  },
  Kinesthetic: {
    icon: Hand,
    color: "bg-amber-500",
    lightColor: "bg-amber-50 text-amber-700",
    description: "You learn best through hands-on practice and real-world experience."
  },
}

export default function VARKSurveyPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<VARKAnswers>({})
  const [isComplete, setIsComplete] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, loading } = useRequireAuth(["student"])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  if (!user) return null

  const handleAnswer = async (answerId: string) => {
    const newAnswers = {
      ...answers,
      [VARK_QUESTIONS[currentQuestion].id]: answerId,
    }
    setAnswers(newAnswers)

    if (currentQuestion < VARK_QUESTIONS.length - 1) {
      // Small delay for visual feedback
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 150)
    } else {
      // Survey complete
      setIsSubmitting(true)
      const varkResult = scoreVARKAnswers(newAnswers)
      setResult(varkResult)
      
      try {
        await supabase.auth.updateUser({ 
          data: { varkProfile: varkResult, varkComplete: true } 
        })
      } catch (e) {
        console.warn("Could not save VARK result:", e)
      }
      
      setIsSubmitting(false)
      setIsComplete(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleContinue = () => {
    router.push("/student/onboarding")
  }

  // Results screen
  if (isComplete && result) {
    const primaryInfo = VARK_INFO[result.dominantStyle as keyof typeof VARK_INFO]
    const secondaryInfo = VARK_INFO[result.secondaryStyle as keyof typeof VARK_INFO]
    const PrimaryIcon = primaryInfo?.icon || Eye
    const SecondaryIcon = secondaryInfo?.icon || Ear

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          {/* Success header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Your Learning Profile
            </h1>
            <p className="text-slate-500 mt-2">
              We've identified your unique learning preferences
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Primary Style */}
            <div className={`p-6 ${primaryInfo?.color || "bg-blue-500"} text-white`}>
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <Sparkles className="w-4 h-4" />
                Your Primary Style
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <PrimaryIcon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{result.dominantStyle}</h2>
                  <p className="text-white/80 text-sm mt-1">{primaryInfo?.description}</p>
                </div>
              </div>
            </div>

            {/* Secondary Style */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${secondaryInfo?.color || "bg-purple-500"} rounded-xl flex items-center justify-center`}>
                  <SecondaryIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Secondary Style</p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{result.secondaryStyle}</h3>
                </div>
              </div>
            </div>

            {/* All Scores */}
            <div className="p-5">
              <h4 className="text-sm font-medium text-slate-500 mb-4">Complete VARK Distribution</h4>
              <div className="space-y-3">
                {Object.entries(result.scores)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([style, score]: [string, any]) => {
                    const info = VARK_INFO[style.charAt(0).toUpperCase() + style.slice(1) as keyof typeof VARK_INFO]
                    const Icon = info?.icon || Eye
                    return (
                      <div key={style} className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${info?.color || "bg-slate-500"} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize text-slate-700 dark:text-slate-300">{style}</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{score}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${info?.color || "bg-slate-500"} rounded-full transition-all duration-500`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Info box */}
            <div className="mx-5 mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>How we'll use this:</strong> Your AI tutor and learning content will primarily be presented in your top 2 styles ({result.dominantStyle} & {result.secondaryStyle}) for optimal learning.
              </p>
            </div>

            {/* Continue button */}
            <div className="p-5 pt-0">
              <button
                onClick={handleContinue}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition"
              >
                Go to Dashboard
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Survey screen
  const progress = ((currentQuestion + 1) / VARK_QUESTIONS.length) * 100
  const question = VARK_QUESTIONS[currentQuestion]
  const currentAnswer = answers[question.id]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Learning Style Assessment</h1>
            <p className="text-sm text-slate-500">Discover how you learn best</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Question {currentQuestion + 1} of {VARK_QUESTIONS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {question.question}
            </h2>
          </div>

          <div className="p-4 space-y-3">
            {question.answers.map((answer) => {
              const isSelected = currentAnswer === answer.id
              return (
                <button
                  key={answer.id}
                  onClick={() => handleAnswer(answer.id)}
                  disabled={isSubmitting}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? "border-blue-600 bg-blue-600" 
                        : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`text-sm ${isSelected ? "text-blue-700 dark:text-blue-300 font-medium" : "text-slate-700 dark:text-slate-300"}`}>
                      {answer.text}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="flex gap-1">
              {VARK_QUESTIONS.map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentQuestion 
                      ? "bg-blue-600 w-4" 
                      : answers[VARK_QUESTIONS[i].id] 
                        ? "bg-blue-400" 
                        : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
              ))}
            </div>

            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>

        {/* Tips */}
        <p className="text-center text-sm text-slate-500 mt-6">
          💡 Answer honestly - there are no right or wrong answers!
        </p>
      </div>
    </div>
  )
}
