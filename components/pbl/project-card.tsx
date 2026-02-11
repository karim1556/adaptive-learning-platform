import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, CheckCircle2, AlertCircle } from "lucide-react"

interface ProjectCardProps {
  title: string
  concept: string
  dueDate: Date
  teamName: string
  progress: number
  memberCount: number
  difficulty?: string
  learningStyles?: string[]
}

export function ProjectCard({ title, concept, dueDate, teamName, progress, memberCount, difficulty, learningStyles }: ProjectCardProps) {
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const getStatusIcon = () => {
    if (progress >= 80) return <CheckCircle2 className="w-4 h-4 text-green-600" />
    if (progress >= 50) return <AlertCircle className="w-4 h-4 text-blue-600" />
    return <AlertCircle className="w-4 h-4 text-amber-600" />
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{teamName}</p>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-medium">Progress</span>
            <span className="text-xs font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <Badge variant="outline">{concept}</Badge>
          </div>
          {difficulty && <Badge variant="outline">{difficulty}</Badge>}
          {(learningStyles || []).map((s) => (
            <Badge key={s} variant="secondary">{s}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t">
          <div className="flex items-center gap-1 text-slate-600">
            <Users className="w-3 h-3" />
            {memberCount} members
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Calendar className="w-3 h-3" />
            {daysUntilDue} days left
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
