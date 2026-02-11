"use client"

import React, { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { useRouter, useParams } from "next/navigation"
import { TeacherHeader } from "@/components/teacher/header"
import { TeacherSidebar } from "@/components/teacher/sidebar"
import { 
  getLessonAnalytics,
  getLesson,
  type LessonAnalytics,
  type Lesson
} from "@/lib/lesson-service"
import {
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Brain,
  Target,
  Award
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function LessonAnalyticsPage() {
  const auth = useRequireAuth(["teacher"])
  const user = auth.user
  const router = useRouter()
  const params = useParams()
  const lessonId = params.id as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [analytics, setAnalytics] = useState<LessonAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [lessonId, user])

  async function loadData() {
    try {
      setLoading(true)
      const [lessonData, analyticsData] = await Promise.all([
        getLesson(lessonId),
        getLessonAnalytics(lessonId)
      ])
      
      setLesson(lessonData)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (auth.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <TeacherSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && <TeacherHeader user={user} />}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => router.push("/teacher/lessons")}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lessons
              </Button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {loading ? "Loading..." : lesson?.title || "Lesson Analytics"}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Detailed performance metrics and student insights
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/teacher/lessons`)}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Lesson
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading analytics...</p>
                </div>
              </div>
            ) : !analytics ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600">No analytics data available for this lesson.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Students</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">
                            {analytics.totalStudents}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Completed</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">
                            {analytics.completedStudents}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {analytics.totalStudents > 0 
                              ? `${Math.round((analytics.completedStudents / analytics.totalStudents) * 100)}%`
                              : "0%"
                            }
                          </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg. Score</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">
                            {analytics.averageScore}%
                          </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <Award className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg. Time</p>
                          <p className="text-3xl font-bold text-gray-900 mt-1">
                            {analytics.averageTimeSpent}m
                          </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Clock className="w-6 h-6 text-orange-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Checkpoint Analytics */}
                {analytics.checkpointAnalytics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Checkpoint Performance
                      </CardTitle>
                      <CardDescription>
                        Breakdown of student performance at each checkpoint
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {analytics.checkpointAnalytics.map((checkpoint, idx) => (
                          <div key={checkpoint.checkpointId} className="border-b last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-500">
                                    Checkpoint {idx + 1}
                                  </span>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {checkpoint.checkpointTitle}
                                  </h3>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 mt-3">
                                  <div>
                                    <p className="text-sm text-gray-600">Attempts</p>
                                    <p className="text-xl font-bold text-gray-900">
                                      {checkpoint.attempts}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Pass Rate</p>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xl font-bold text-gray-900">
                                        {checkpoint.passRate}%
                                      </p>
                                      {checkpoint.passRate >= 70 ? (
                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-600">Avg. Score</p>
                                    <p className="text-xl font-bold text-gray-900">
                                      {checkpoint.averageScore}%
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3">
                                  <Progress 
                                    value={checkpoint.passRate} 
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            </div>

                            {checkpoint.commonMistakes.length > 0 && (
                              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                  <p className="text-sm font-medium text-yellow-900">
                                    Common Mistakes
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  {checkpoint.commonMistakes.slice(0, 3).map((mistake) => (
                                    <p key={mistake.questionId} className="text-sm text-yellow-700">
                                      • Question {mistake.questionId.slice(-4)}: {mistake.wrongAnswerCount} wrong answers
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Students Needing Attention */}
                {analytics.studentsNeedingAttention.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        Students Needing Attention
                      </CardTitle>
                      <CardDescription>
                        Students who are struggling or stuck in the lesson
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.studentsNeedingAttention.map((student) => (
                          <div 
                            key={student.studentId}
                            className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {student.studentName}
                              </p>
                              <p className="text-sm text-gray-600">
                                Stuck at: {student.stuckAt}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Score</p>
                                <p className={`text-lg font-bold ${
                                  student.score >= 70 ? "text-green-600" : "text-red-600"
                                }`}>
                                  {student.score}%
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/teacher/students/${student.studentId}`)}
                              >
                                View Profile
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {analytics.totalStudents === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No student activity yet</p>
                      <p className="text-sm text-gray-500">
                        Students haven't started this lesson. Share it with your class to begin tracking progress.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
