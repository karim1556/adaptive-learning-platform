"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import type { ClassStudent } from "@/lib/teacher-data"
import { getStudentProfile } from "@/lib/teacher-data"
import type { StudentProfile } from "@/lib/teacher-data"
import { calculateMasteryScore, MasteryInputs } from "@/lib/intelligence/masteryEngine"
import { calculateEngagementIndex } from "@/lib/intelligence/engagementEngine"

interface StudentListProps {
  students: ClassStudent[]
  title: string
  onStudentClick?: (studentId: string) => void
}

export function StudentList({ students, title, onStudentClick }: StudentListProps) {
  // Map numeric engagement to a status using the engagement engine so that
  // teacher UI shows a consistent `low|medium|high` level used for
  // prioritization and intervention.
  const getEngagementStatus = (level: number) => {
    const result = calculateEngagementIndex({
      loginFrequency: level,
      contentInteraction: level,
      aiUsage: level,
      projectParticipation: level,
      consistencyScore: level,
    })

    if (result.level === "high") return { label: "High", color: "bg-green-100 text-green-800", level: result.level }
    if (result.level === "medium") return { label: "Medium", color: "bg-blue-100 text-blue-800", level: result.level }
    return { label: "Low", color: "bg-amber-100 text-amber-800", level: result.level }
  }

  // Compute mastery using the mastery engine so teachers see a reproducible
  // mastery signal (supports consistent triage rules for early intervention).
  const getMasteryStatus = (score: number, assessmentCount: number) => {
    const inputs: MasteryInputs = {
      assessmentScore: score,
      practiceAccuracy: Math.min(100, score + assessmentCount * 2),
      aiHelpEffectiveness: 10,
      engagementConsistency: 50,
    }

    const computed = calculateMasteryScore(inputs)

    // Triage coloring: green=strong, blue=ok, amber=needs attention, alert when below 50
    if (computed >= 80) return { icon: CheckCircle2, color: "text-green-600", score: computed }
    if (computed >= 60) return { icon: CheckCircle2, color: "text-blue-600", score: computed }
    if (computed >= 50) return { icon: CheckCircle2, color: "text-amber-600", score: computed }
    return { icon: AlertCircle, color: "text-red-600", score: computed }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
            {students.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No students</p>
          ) : (
            students.map((student) => {
              // Fetch richer profile when available to display top-2 styles and
              // per-topic mastery. Fall back to the lightweight ClassStudent
              // record when the full profile isn't available in the simulated store.
              const profile: StudentProfile | null = (() => {
                try {
                  return getStudentProfile(student.id, student.name)
                } catch {
                  return null
                }
              })()

              const engagementStatus = getEngagementStatus(student.engagementLevel)
              const masteryStatus = getMasteryStatus(student.masteryScore)
              const StatusIcon = masteryStatus.icon
              const topStyles = profile ? [profile.dominantStyle, profile.secondaryStyle].filter(Boolean) : [student.dominantLearningStyle]
              const topics = profile ? profile.masteryByTopic.slice(0, 2) : []

              return (
                <div
                  key={student.id}
                  // Highlight students who may need early intervention: low
                  // mastery (computed) OR low engagement level. This visual cue
                  // helps teachers quickly triage who to contact or support.
                  className={`p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer` +
                    (() => {
                      const mastery = getMasteryStatus(student.masteryScore, 0)
                      const engagement = getEngagementStatus(student.engagementLevel)
                      const isLowMastery = (mastery.score ?? student.masteryScore) < 60
                      const isLowEngagement = engagement.level === "low"
                      if (isLowMastery || isLowEngagement) return " ring-2 ring-amber-300 bg-amber-50/30"
                      return ""
                    })()}
                  onClick={() => onStudentClick?.(student.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{student.name}</h4>
                        <StatusIcon className={`w-4 h-4 ${masteryStatus.color}`} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{student.recentActivity}</p>
                      {/* Show top-2 dominant learning styles when available; these
                          are used by recommendation engines and help teachers
                          tailor outreach (e.g., visual prompts vs. audio
                          interventions). */}
                      <div className="mt-2 flex items-center gap-2">
                        {topStyles.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    {/* Show computed mastery score to make intervention decisions reproducible */}
                    <span className="text-xs text-slate-600">Mastery: {masteryStatus.score}%</span>
                    {/* Show engagement level (low/medium/high) — helpful for teachers to prioritize outreach */}
                    <Badge variant="outline" className={engagementStatus.color}>
                      {engagementStatus.label} Engagement
                    </Badge>
                  </div>

                  {/* Minimal per-topic mastery preview using existing Progress
                      UI (no new charts). Shows up to two topics to give teachers
                      quick context for where to focus. */}
                  {topics.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {topics.map((t) => (
                        <div key={t.topic} className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">{t.topic}</span>
                          <span className="text-xs font-medium">{t.score}%</span>
                        </div>
                      ))}
                      <div className="mt-1">
                        <Progress value={masteryStatus.score} className="h-1.5" />
                      </div>
                    </div>
                  )}

                  {!topics.length && <Progress value={masteryStatus.score} className="h-1.5" />}
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
