import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { calculateMasteryScore, MasteryInputs } from "@/lib/intelligence/masteryEngine"

interface MasteryCardProps {
  topicName: string
  /**
   * Legacy/mock score prop: kept for API compatibility. We'll compute a
   * deterministic mastery score using `calculateMasteryScore` instead of
   * relying on this raw value directly.
   */
  score: number
  assessmentCount: number
  trend?: "up" | "down" | "stable"
}

export function MasteryCard({ topicName, score, assessmentCount, trend = "stable" }: MasteryCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-slate-400" />
    }
  }

  // Map incoming props to the MasteryInputs expected by the engine. These
  // mappings are intentionally simple and deterministic: `score` is used as
  // the summative assessment signal, `assessmentCount` slightly boosts
  // practice accuracy (more practice -> higher practice accuracy). Unknown
  // signals (AI help, engagement consistency) are assigned neutral defaults.
  const inputs: MasteryInputs = {
    assessmentScore: score,
    practiceAccuracy: Math.min(100, score + assessmentCount * 2),
    aiHelpEffectiveness: 10,
    engagementConsistency: 50,
  }

  const computedScore = calculateMasteryScore(inputs)

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 60) return "bg-blue-500"
    return "bg-orange-500"
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{topicName}</CardTitle>
          {getTrendIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{computedScore}</span>
          <span className="text-sm text-slate-500">/ 100</span>
        </div>
        <Progress value={computedScore} className="h-2" />
        <p className="text-xs text-slate-500">{assessmentCount} assessments completed</p>
      </CardContent>
    </Card>
  )
}
