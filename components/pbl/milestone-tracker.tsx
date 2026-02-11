import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"

interface Milestone {
  id: string
  name: string
  dueDate: Date
  status: "pending" | "in-progress" | "completed"
  submissions: number
}

interface MilestoneTrackerProps {
  projectTitle: string
  milestones: Milestone[]
}

export function MilestoneTracker({ projectTitle, milestones }: MilestoneTrackerProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case "in-progress":
        return <Clock className="w-5 h-5 text-blue-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{projectTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {milestones.map((milestone, idx) => (
            <div key={milestone.id} className="relative">
              {/* Timeline line */}
              {idx < milestones.length - 1 && <div className="absolute left-2.5 top-10 w-0.5 h-12 bg-slate-200"></div>}

              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex-shrink-0">{getStatusIcon(milestone.status)}</div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{milestone.name}</h4>
                    <Badge className={getStatusColor(milestone.status)}>{milestone.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    Due: {milestone.dueDate.toLocaleDateString()}
                    {milestone.submissions > 0 &&
                      ` • ${milestone.submissions} submission${milestone.submissions > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
