"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users } from "lucide-react"
import type { ClassAnalytics } from "@/lib/teacher-data"

interface ClassOverviewCardProps {
  classData: ClassAnalytics
  onClick?: () => void
}

export function ClassOverviewCard({ classData, onClick }: ClassOverviewCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{classData.className}</CardTitle>
          <Users className="w-4 h-4 text-slate-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1">Avg. Mastery Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{classData.averageMastery.toFixed(1)}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <Progress value={classData.averageMastery} className="mt-2 h-2" />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Students</p>
            <p className="text-2xl font-bold">{classData.studentCount}</p>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-slate-500 mb-1">Avg. Engagement</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{classData.averageEngagement.toFixed(0)}</span>
            <span className="text-xs text-slate-500">%</span>
          </div>
          <Progress value={classData.averageEngagement} className="mt-2 h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
