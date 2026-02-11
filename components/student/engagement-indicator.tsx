import { Card, CardContent } from "@/components/ui/card"
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react"
import { calculateEngagementIndex, EngagementInputs } from "@/lib/intelligence/engagementEngine"

interface EngagementIndicatorProps {
  /**
   * Legacy/mock `score` prop is kept for compatibility; we'll synthesize
   * a full EngagementInputs object and compute a deterministic engagement
   * index using `calculateEngagementIndex` instead of trusting the raw value.
   */
  score: number
}

export function EngagementIndicator({ score }: EngagementIndicatorProps) {
  // Synthesize engagement inputs from the single `score` prop. This keeps the
  // component self-contained while allowing a richer, explainable engagement
  // calculation. We use the same signal for all sub-metrics so the mapping is
  // deterministic and transparent.
  const inputs: EngagementInputs = {
    loginFrequency: score,
    contentInteraction: score,
    aiUsage: score,
    projectParticipation: score,
    consistencyScore: score,
  }

  const engagement = calculateEngagementIndex(inputs)

  const getStatus = (score: number) => {
    if (score >= 75) return { label: "Highly Engaged", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" }
    if (score >= 50) return { label: "Moderately Engaged", icon: Activity, color: "text-blue-600", bg: "bg-blue-50" }
    return { label: "Low Engagement", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" }
  }

  const status = getStatus(engagement.score)
  const Icon = status.icon

  return (
    <Card>
      <CardContent className={`pt-6 text-center ${status.bg} rounded-lg`}>
        <Icon className={`w-8 h-8 ${status.color} mx-auto mb-2`} />
        <p className="text-sm font-semibold text-slate-900">{status.label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{engagement.score}%</p>
      </CardContent>
    </Card>
  )
}
