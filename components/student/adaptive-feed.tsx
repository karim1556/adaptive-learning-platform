"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Sparkles, ArrowRight } from "lucide-react"
import type { LearningContent } from "@/lib/student-data"
import { supabase } from "@/lib/supabaseClient"
import { getDominantLearningStyles } from "@/lib/vark-survey"

interface AdaptiveFeedProps {
  content: LearningContent[]
}

export function AdaptiveFeed({ content }: AdaptiveFeedProps) {
  // Determine the student's dominant styles by inspecting the current auth
  // session or local VARK profile. We prefer the full distribution stored in
  // session (created at survey completion). If not available, we fall back to
  // an empty array and show no filtering.
  const [storedVark, setStoredVark] = useState<any | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const meta = (data?.user?.user_metadata || {}) as any
        if (!mounted) return
        setStoredVark(meta.varkProfile || null)
      } catch {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const dominantStyles = useMemo(() => {
    if (storedVark && storedVark.scores) {
      return getDominantLearningStyles(storedVark.scores)
    }
    return [] as string[]
  }, [storedVark])

  // Filter content to the student's two dominant styles. Pedagogical note:
  // prioritizing the top-2 styles increases the chance the student will
  // engage and benefit from the material; if no items match both styles we
  // allow a fallback to the primary (stronger) style so the feed still offers
  // relevant content rather than an empty list.
  const filtered = useMemo(() => {
    if (!dominantStyles || dominantStyles.length === 0) return content

    const [primary, secondary] = dominantStyles

    const matching = content.filter((c) => c.learningMode === primary || c.learningMode === secondary)

    if (matching.length === 0) {
      // Fallback to primary only
      return content.filter((c) => c.learningMode === primary)
    }

    return matching
  }, [content, dominantStyles])
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-blue-100 text-blue-800"
      case "advanced":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  const getLearningModeIcon = (mode: string) => {
    const icons = {
      visual: "🎨",
      auditory: "🎧",
      reading: "📖",
      kinesthetic: "✋",
    }
    return icons[mode as keyof typeof icons] || "📚"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle>Adaptive Learning Feed</CardTitle>
            <CardDescription>Content personalized to your learning style and gaps</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-sm">{item.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
              </div>
              <span className="text-xl">{getLearningModeIcon(item.learningMode)}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className={getDifficultyColor(item.difficulty)}>
                {item.difficulty}
              </Badge>
              {/* Clearly mark the content's delivery style (Visual/Auditory/Reading/Kinesthetic)
                  to make the pedagogical match explicit to the learner. */}
              <Badge variant="outline" className="capitalize">
                {item.learningMode}
              </Badge>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Recommended match (your learning style)</span>
                <span className="font-semibold">{item.varkAlignment}%</span>
              </div>
              <Progress value={item.varkAlignment} className="h-1" />
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
