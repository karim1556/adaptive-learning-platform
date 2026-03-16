"use client"

import type { EngagementHeatmapCell } from "@/lib/teacher-analytics"
import { AlertTriangle } from "lucide-react"

interface EngagementHeatmapProps {
  cells: EngagementHeatmapCell[]
  flaggedMoments: Array<{ label: string; activeLearners: number; disengagementScore: number }>
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const TIME_SLOTS = ["06:00-09:00", "09:00-12:00", "12:00-15:00", "15:00-18:00", "18:00-21:00", "21:00-24:00"]

function getCellTone(score: number) {
  if (score >= 75) return "bg-red-500 text-white"
  if (score >= 60) return "bg-orange-400 text-white"
  if (score >= 40) return "bg-amber-300 text-slate-900"
  if (score >= 20) return "bg-emerald-200 text-slate-900"
  return "bg-slate-100 text-slate-500"
}

export function EngagementHeatmap({ cells, flaggedMoments }: EngagementHeatmapProps) {
  const cellMap = new Map(cells.map((cell) => [`${cell.day}-${cell.slot}`, cell]))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Engagement Heatmap</h2>
          <p className="text-sm text-slate-500 mt-1">Recent timeline zones where disengagement risk spikes.</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Low risk to high risk</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="w-4 h-4 rounded bg-slate-100" />
            <span className="w-4 h-4 rounded bg-emerald-200" />
            <span className="w-4 h-4 rounded bg-amber-300" />
            <span className="w-4 h-4 rounded bg-orange-400" />
            <span className="w-4 h-4 rounded bg-red-500" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[120px_repeat(7,minmax(0,1fr))] gap-2">
            <div />
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}

            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="contents">
                <div className="text-xs font-medium text-slate-500 py-2">{slot}</div>
                {DAYS.map((day) => {
                  const cell = cellMap.get(`${day}-${slot}`) || {
                    day,
                    slot,
                    label: `${day} ${slot}`,
                    activeLearners: 0,
                    disengagementScore: 0,
                    flagged: false,
                  }

                  return (
                    <div
                      key={`${day}-${slot}`}
                      title={`${cell.label}: ${cell.disengagementScore}% disengagement risk across ${cell.activeLearners} learners`}
                      className={`min-h-[56px] rounded-xl p-2 transition ${getCellTone(cell.disengagementScore)}`}
                    >
                      <div className="text-sm font-semibold">{cell.disengagementScore}%</div>
                      <div className="text-[11px] opacity-80">{cell.activeLearners} learners</div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Peak Disengagement Windows
        </div>
        {flaggedMoments.length > 0 ? (
          flaggedMoments.map((moment) => (
            <div
              key={moment.label}
              className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm"
            >
              <span className="text-slate-700 dark:text-slate-300">{moment.label}</span>
              <span className="font-medium text-amber-700 dark:text-amber-300">
                {moment.disengagementScore}% risk • {moment.activeLearners} learners
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No sharp disengagement zones detected this week.</p>
        )}
      </div>
    </div>
  )
}

export default EngagementHeatmap
