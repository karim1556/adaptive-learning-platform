"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, ArrowRight } from "lucide-react"
import { generateContentRecommendations } from "@/lib/ai-assistant"
import { supabase } from "@/lib/supabaseClient"
import { getDominantLearningStyles } from "@/lib/vark-survey"

interface ContentRecommendationsProps {
  studentProfile: {
    masteryScores: Record<string, number>
    dominantStyle: string
    engagementLevel: number
  }
}

export function ContentRecommendations({ studentProfile }: ContentRecommendationsProps) {
  const recommendations = generateContentRecommendations(studentProfile)

  // Annotate recommendations with student's dominant styles to make the
  // pedagogical rationale explicit. We read the VARK profile from session if
  // available; otherwise we fall back to the single `dominantStyle` provided
  // by the caller.
  const [dominantStyles, setDominantStyles] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const meta = (data?.user?.user_metadata || {}) as any
        if (!mounted) return
        if (meta?.varkProfile?.scores) {
          setDominantStyles(getDominantLearningStyles(meta.varkProfile.scores))
          return
        }
      } catch {
        // ignore
      }

      if (studentProfile.dominantStyle) setDominantStyles([studentProfile.dominantStyle.toLowerCase()])
    })()
    return () => {
      mounted = false
    }
  }, [studentProfile])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <CardTitle>Recommended Next Steps</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className="p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-sm">{rec.title}</h4>
              <Badge className={getPriorityColor(rec.priority)}>{rec.priority} priority</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{rec.reason}</p>
            {/* Annotate recommendation with dominant style(s) to make the
                pedagogy visible: teachers and students can see why a
                recommendation was made (matching learning preferences). */}
            <div className="flex gap-2 items-center mb-3">
              {dominantStyles.slice(0, 2).map((s) => (
                <Badge key={s} variant="outline" className="capitalize">
                  {s}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
              Start Learning <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
