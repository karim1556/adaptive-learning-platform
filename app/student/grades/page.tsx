"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { getStudentData } from "@/lib/student-data"
import { StudentSidebar } from "@/components/student/sidebar"
import { StudentHeader } from "@/components/student/header"
import { 
  Award,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react"
import SoftSkillsUploader from '@/components/student/soft-skills-uploader'

function getMasteryColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500", text: "text-emerald-600", light: "bg-emerald-50" }
  if (score >= 60) return { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" }
  if (score >= 40) return { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" }
  return { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50" }
}

function getMasteryLabel(score: number) {
  if (score >= 80) return "Mastered"
  if (score >= 60) return "Proficient"
  if (score >= 40) return "Developing"
  return "Needs Work"
}

export default function StudentGradesPage() {
  const { user, loading } = useRequireAuth(["student"])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const studentData = getStudentData(user.id)
  
  const masteredCount = studentData.masteryByTopic.filter(t => t.score >= 80).length
  const proficientCount = studentData.masteryByTopic.filter(t => t.score >= 60 && t.score < 80).length
  const developingCount = studentData.masteryByTopic.filter(t => t.score >= 40 && t.score < 60).length
  const needsWorkCount = studentData.masteryByTopic.filter(t => t.score < 40).length

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <StudentSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader user={user} />

        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grades & Mastery</h1>
              <p className="text-slate-500 mt-1">Track your learning progress across all topics</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{studentData.overallMasteryScore}%</p>
                <p className="text-sm text-slate-500">Overall Mastery</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{masteredCount}</p>
                <p className="text-sm text-slate-500">Topics Mastered</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-amber-600">{proficientCount + developingCount}</p>
                <p className="text-sm text-slate-500">In Progress</p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">{needsWorkCount}</p>
                <p className="text-sm text-slate-500">Need Support</p>
              </div>
            </div>

            {/* Topic Mastery Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                <h2 className="font-semibold text-slate-900 dark:text-white">Mastery by Topic</h2>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {studentData.masteryByTopic.map((topic) => {
                  const colors = getMasteryColor(topic.score)
                  const label = getMasteryLabel(topic.score)

                  return (
                    <div key={topic.topicId} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <div className="flex items-center gap-4">
                        {/* Topic Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{topic.topicName}</h3>
                          </div>
                          <p className="text-sm text-slate-500">{topic.assessmentCount} assessments completed</p>
                        </div>

                        {/* Score */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-2xl font-bold ${colors.text}`}>{topic.score}%</p>
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${colors.light} ${colors.text}`}>
                            {label}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors.bg} rounded-full transition-all`}
                          style={{ width: `${topic.score}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Keep Up the Great Work!</h3>
                  <p className="text-blue-100">
                    Focus on topics with lower mastery scores. Regular practice with adaptive content 
                    tailored to your learning style will help you improve faster.
                  </p>
                </div>
              </div>
            </div>

            {/* Soft Skills Upload */}
            <div>
              <SoftSkillsUploader studentId={user.id} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
