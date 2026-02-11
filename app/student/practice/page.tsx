"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { StudentHeader } from "@/components/student/header-new"
import { StudentSidebar } from "@/components/student/sidebar-new"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabaseClient"
import { getStudentMastery, type StudentMasteryData } from "@/lib/lesson-service"
import {
  identifyConceptGaps,
  generateAdaptivePractice,
  evaluatePracticeSession,
  type PracticeQuestion,
  type ConceptGap,
  type PracticeSession
} from "@/lib/intelligence/adaptivePracticeEngine"
import {
  Brain,
  Target,
  CheckCircle,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Trophy,
  Zap,
  HelpCircle,
  ChevronRight
} from "lucide-react"

type PracticeState = "overview" | "practicing" | "results"

export default function StudentPracticePage() {
  const { user, loading } = useRequireAuth(["student"])
  const [practiceState, setPracticeState] = useState<PracticeState>("overview")
  const [masteryData, setMasteryData] = useState<StudentMasteryData[]>([])
  const [conceptGaps, setConceptGaps] = useState<ConceptGap[]>([])
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null)
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: string; answer: string; correct: boolean }[]>([])
  const [varkProfile, setVarkProfile] = useState({ visual: 25, auditory: 25, reading: 25, kinesthetic: 25 })
  const [isLoading, setIsLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      console.debug("[AdaptivePractice] Starting loadData for user:", user?.id)
      
      // Get VARK profile
      const { data: authData } = await supabase.auth.getUser()
      const meta = authData?.user?.user_metadata || {}
      if (meta.varkProfile?.scores) {
        setVarkProfile(meta.varkProfile.scores)
      }
      console.debug("[AdaptivePractice] VARK profile:", meta.varkProfile)

      // Get mastery data
      const mastery = await getStudentMastery(user!.id)
      console.debug("[AdaptivePractice] Mastery data received:", mastery)
      setMasteryData(mastery)

      // Identify gaps
      const gaps = identifyConceptGaps(mastery)
      console.debug("[AdaptivePractice] Concept gaps identified:", gaps)
      setConceptGaps(gaps)
    } catch (error) {
      console.error("Error loading practice data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function startPractice(targetGaps?: ConceptGap[]) {
    const gapsToUse = targetGaps || conceptGaps.slice(0, 3)
    
    if (gapsToUse.length === 0) {
      // No gaps - generate review questions
      const reviewQuestions = generateAdaptivePractice(
        [{ conceptId: "linear-equations", conceptName: "Linear Equations", masteryScore: 70, priority: "low", recommendedDifficulty: 75 }],
        varkProfile,
        { targetConceptCount: 1, questionsPerConcept: 5, difficultyBuffer: 20, includeSpacedRepetition: true }
      )
      setQuestions(reviewQuestions)
    } else {
      const practiceQuestions = generateAdaptivePractice(gapsToUse, varkProfile)
      setQuestions(practiceQuestions)
    }

    setCurrentSession({
      id: `session-${Date.now()}`,
      studentId: user!.id,
      conceptId: gapsToUse[0]?.conceptId || "review",
      conceptName: gapsToUse[0]?.conceptName || "Review",
      questions: [],
      startedAt: new Date().toISOString(),
      questionsAnswered: 0,
      correctAnswers: 0
    })

    setCurrentQuestionIndex(0)
    setAnswers([])
    setSelectedAnswer("")
    setShowExplanation(false)
    setShowHint(false)
    setPracticeState("practicing")
  }

  function submitAnswer() {
    const question = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
    
    setAnswers([...answers, {
      questionId: question.id,
      answer: selectedAnswer,
      correct: isCorrect
    }])
    
    setShowExplanation(true)
  }

  function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer("")
      setShowExplanation(false)
      setShowHint(false)
    } else {
      // Session complete
      finishSession()
    }
  }

  function finishSession() {
    const correctCount = answers.filter(a => a.correct).length
    const finalSession: PracticeSession = {
      ...currentSession!,
      completedAt: new Date().toISOString(),
      questionsAnswered: answers.length,
      correctAnswers: correctCount,
      score: Math.round((correctCount / answers.length) * 100)
    }
    setCurrentSession(finalSession)
    setPracticeState("results")
  }

  function getPriorityColor(priority: ConceptGap["priority"]) {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const currentQuestion = questions[currentQuestionIndex]
  const progressPercentage = questions.length > 0 
    ? Math.round(((currentQuestionIndex + (showExplanation ? 1 : 0)) / questions.length) * 100)
    : 0

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto">
            {practiceState === "overview" && (
              <>
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Brain className="w-8 h-8 text-indigo-600" />
                    Adaptive Practice
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Personalized practice targeting your weak areas and learning style
                  </p>
                </div>

                {/* Quick Start */}
                <Card className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold mb-2">Ready to Practice?</h2>
                        <p className="text-indigo-100">
                          {conceptGaps.length > 0 
                            ? `We've identified ${conceptGaps.length} concept${conceptGaps.length > 1 ? "s" : ""} to focus on`
                            : "You're doing great! Let's review to keep your skills sharp"
                          }
                        </p>
                      </div>
                      <Button 
                        onClick={() => startPractice()}
                        className="bg-white text-indigo-600 hover:bg-indigo-50"
                        size="lg"
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        Start Practice
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Concept Gaps */}
                {conceptGaps.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Focus Areas
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {conceptGaps.map((gap) => (
                        <Card key={gap.conceptId} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  {gap.conceptName}
                                </h4>
                                <Badge className={getPriorityColor(gap.priority)}>
                                  {gap.priority} priority
                                </Badge>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                  {gap.masteryScore}%
                                </span>
                                <p className="text-xs text-slate-500">mastery</p>
                              </div>
                            </div>
                            <Progress value={gap.masteryScore} className="h-2 mb-3" />
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => startPractice([gap])}
                            >
                              Practice This
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* How It Works */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      How Adaptive Practice Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Target className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h4 className="font-semibold mb-1">Identifies Gaps</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Analyzes your mastery to find concepts that need attention
                        </p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Brain className="w-6 h-6 text-purple-600" />
                        </div>
                        <h4 className="font-semibold mb-1">Matches Your Style</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Questions aligned to your VARK learning preferences
                        </p>
                      </div>
                      <div className="text-center p-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Trophy className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="font-semibold mb-1">Builds Mastery</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Gradually increases difficulty as you improve
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {practiceState === "practicing" && currentQuestion && (
              <>
                {/* Progress Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <Badge variant="outline">{currentQuestion.conceptName}</Badge>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                {/* Question Card */}
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                      <Badge variant="secondary" className="capitalize">
                        {currentQuestion.learningMode}
                      </Badge>
                      <Badge variant="secondary">
                        Difficulty: {currentQuestion.difficulty}%
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">
                      {currentQuestion.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Answer Options */}
                    {currentQuestion.type === "multiple-choice" && currentQuestion.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => !showExplanation && setSelectedAnswer(option)}
                            disabled={showExplanation}
                            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                              showExplanation
                                ? option === currentQuestion.correctAnswer
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : selectedAnswer === option
                                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700"
                                : selectedAnswer === option
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {showExplanation && option === currentQuestion.correctAnswer && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                              {showExplanation && selectedAnswer === option && option !== currentQuestion.correctAnswer && (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                              <span>{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {currentQuestion.type === "true-false" && (
                      <div className="flex gap-4">
                        {["True", "False"].map((option) => (
                          <button
                            key={option}
                            onClick={() => !showExplanation && setSelectedAnswer(option.toLowerCase())}
                            disabled={showExplanation}
                            className={`flex-1 p-4 text-center rounded-lg border-2 transition-all ${
                              showExplanation
                                ? option.toLowerCase() === currentQuestion.correctAnswer
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                  : selectedAnswer === option.toLowerCase()
                                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                    : "border-slate-200 dark:border-slate-700"
                                : selectedAnswer === option.toLowerCase()
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {(currentQuestion.type === "short-answer" || currentQuestion.type === "fill-blank") && (
                      <input
                        type="text"
                        value={selectedAnswer}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        disabled={showExplanation}
                        placeholder="Type your answer..."
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          showExplanation
                            ? selectedAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim()
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                        } bg-transparent`}
                      />
                    )}

                    {/* Hint */}
                    {currentQuestion.hints && currentQuestion.hints.length > 0 && !showExplanation && (
                      <div className="mt-4">
                        {showHint ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                              💡 {currentQuestion.hints[0]}
                            </p>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                            <HelpCircle className="w-4 h-4 mr-1" />
                            Show Hint
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    {showExplanation && (
                      <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          {answers[answers.length - 1]?.correct ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-green-600">Correct!</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="text-red-600">Not quite</span>
                            </>
                          )}
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300">
                          {currentQuestion.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setPracticeState("overview")}
                  >
                    Exit Practice
                  </Button>
                  {!showExplanation ? (
                    <Button 
                      onClick={submitAnswer}
                      disabled={!selectedAnswer}
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button onClick={nextQuestion}>
                      {currentQuestionIndex < questions.length - 1 ? (
                        <>
                          Next Question
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      ) : (
                        <>
                          See Results
                          <Trophy className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}

            {practiceState === "results" && currentSession && (
              <>
                {/* Results Card */}
                <Card className="mb-6">
                  <CardContent className="p-8 text-center">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                      currentSession.score! >= 80 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : currentSession.score! >= 60 
                          ? "bg-yellow-100 dark:bg-yellow-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                    }`}>
                      <Trophy className={`w-12 h-12 ${
                        currentSession.score! >= 80 
                          ? "text-green-600" 
                          : currentSession.score! >= 60 
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                      {currentSession.score}%
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      You got {currentSession.correctAnswers} out of {currentSession.questionsAnswered} questions correct
                    </p>

                    {/* Score breakdown */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-2xl font-bold text-indigo-600">{currentSession.questionsAnswered}</p>
                        <p className="text-sm text-slate-500">Questions</p>
                      </div>
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{currentSession.correctAnswers}</p>
                        <p className="text-sm text-slate-500">Correct</p>
                      </div>
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{currentSession.questionsAnswered - currentSession.correctAnswers}</p>
                        <p className="text-sm text-slate-500">Incorrect</p>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {(() => {
                      const { recommendations } = evaluatePracticeSession(currentSession)
                      return (
                        <div className="text-left p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg mb-6">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-indigo-600" />
                            Recommendations
                          </h4>
                          <ul className="space-y-2">
                            {recommendations.map((rec, idx) => (
                              <li key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                <span className="text-indigo-600">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    })()}

                    <div className="flex gap-4 justify-center">
                      <Button variant="outline" onClick={() => setPracticeState("overview")}>
                        Back to Overview
                      </Button>
                      <Button onClick={() => startPractice()}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Practice Again
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
