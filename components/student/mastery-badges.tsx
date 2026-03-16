"use client"

import type { MasteryBadge } from "@/lib/student-achievements"
import { Brain, BookOpen, Flame, Sparkles, Target, Trophy, Share2 } from "lucide-react"

interface MasteryBadgesProps {
  badges: MasteryBadge[]
  onShare: () => void
}

const ICONS = {
  brain: Brain,
  "book-open": BookOpen,
  flame: Flame,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
}

const ACCENT_BACKGROUNDS: Record<string, string> = {
  "first-win": "linear-gradient(135deg, #3b82f6, #4f46e5)",
  "style-specialist": "linear-gradient(135deg, #10b981, #0f766e)",
  "mastery-builder": "linear-gradient(135deg, #f59e0b, #ea580c)",
  "topic-champion": "linear-gradient(135deg, #d946ef, #ec4899)",
  "adaptive-explorer": "linear-gradient(135deg, #06b6d4, #0284c7)",
  "consistency-flame": "linear-gradient(135deg, #f43f5e, #dc2626)",
}

export function MasteryBadges({ badges, onShare }: MasteryBadgesProps) {
  const earnedBadges = badges.filter((badge) => badge.earned)
  const nextBadge = badges.find((badge) => !badge.earned)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Mastery Badges</h2>
          <p className="text-sm text-slate-500 mt-1">Unlock badges as your VARK module mastery grows.</p>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {badges.map((badge) => {
          const Icon = ICONS[badge.icon]

          return (
            <div
              key={badge.id}
              className={`rounded-2xl border p-4 ${
                badge.earned
                  ? "border-transparent text-white"
                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
              }`}
              style={badge.earned ? { background: ACCENT_BACKGROUNDS[badge.id] } : undefined}
            >
              <div className={badge.earned ? "rounded-[18px] p-4 -m-4" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    badge.earned ? "bg-white/20" : "bg-white dark:bg-slate-800"
                  }`}>
                    <Icon className={`w-5 h-5 ${badge.earned ? "text-white" : "text-indigo-600"}`} />
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                      badge.earned
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {badge.earned ? "Unlocked" : `${badge.progress}%`}
                  </span>
                </div>
                <h3 className={`mt-3 font-semibold ${badge.earned ? "text-white" : "text-slate-900 dark:text-white"}`}>
                  {badge.name}
                </h3>
                <p className={`text-sm mt-1 ${badge.earned ? "text-white/85" : "text-slate-500"}`}>{badge.description}</p>
                <p className={`text-xs mt-3 ${badge.earned ? "text-white/75" : "text-slate-500"}`}>{badge.progressLabel}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 text-sm">
        {nextBadge ? (
          <>
            <span className="font-medium text-slate-900 dark:text-white">Next unlock:</span>{" "}
            <span className="text-slate-600 dark:text-slate-300">
              {nextBadge.name} is {Math.max(0, 100 - nextBadge.progress)}% away.
            </span>
          </>
        ) : (
          <span className="font-medium text-emerald-600">All current badges unlocked.</span>
        )}
      </div>

      {earnedBadges.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">Complete a module to unlock your first badge.</p>
      )}
    </div>
  )
}

export default MasteryBadges
