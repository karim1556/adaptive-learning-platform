"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface AnalyticsPanelProps {
  varkDistribution: Array<{ name: string; value: number; count: number }>
  masteryBands: Array<{ name: string; value: number; count: number }>
  classSummaries: Array<{
    classCode: string
    className: string
    students: number
    avgMastery: number
    avgEngagement: number
    atRiskStudents: number
  }>
  onExport: () => void
}

const VARK_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#94a3b8"]
const MASTERY_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]

export function CohortAnalyticsPanel({
  varkDistribution,
  masteryBands,
  classSummaries,
  onExport,
}: AnalyticsPanelProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Class-Wide Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Cohort distribution, mastery mix, and export-ready summaries.</p>
        </div>
        <Button variant="outline" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-4">VARK Mix</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={varkDistribution} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85}>
                  {varkDistribution.map((item, index) => (
                    <Cell key={item.name} fill={VARK_COLORS[index % VARK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {varkDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: VARK_COLORS[index % VARK_COLORS.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">
                  {item.count} students
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-4">Mastery Bands</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={masteryBands} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85}>
                  {masteryBands.map((item, index) => (
                    <Cell key={item.name} fill={MASTERY_COLORS[index % MASTERY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {masteryBands.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: MASTERY_COLORS[index % MASTERY_COLORS.length] }}
                  />
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 p-4">
          <h3 className="font-medium text-slate-900 dark:text-white mb-4">Class Summary</h3>
          <div className="space-y-3">
            {classSummaries.map((course) => (
              <div key={course.classCode} className="rounded-xl bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{course.className}</p>
                    <p className="text-xs text-slate-500">{course.classCode} • {course.students} students</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {course.atRiskStudents} at risk
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-slate-500">Avg. Mastery</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{course.avgMastery}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avg. Engagement</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{course.avgEngagement}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CohortAnalyticsPanel
