import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, BookOpen, Zap, Clock } from "lucide-react"

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: Date
}

interface RecentActivityProps {
  activities: ActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "content_view":
        return <Video className="w-4 h-4" />
      case "assessment":
        return <BookOpen className="w-4 h-4" />
      case "ai_chat":
        return <Zap className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "content_view":
        return "bg-blue-100 text-blue-800"
      case "assessment":
        return "bg-green-100 text-green-800"
      case "ai_chat":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-slate-100 text-slate-800"
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return "just now"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-b-0 last:pb-0">
            <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.description}</p>
              <p className="text-xs text-slate-500 mt-1">{formatDate(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
