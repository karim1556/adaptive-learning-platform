"use client"

import { useMemo, useState } from "react"
import { Mail, Send, CheckCircle2 } from "lucide-react"

interface ProgressShareCardProps {
  studentId: string
  parentEmail?: string
  parentName?: string
  studentSnapshot: {
    studentName: string
    overallMastery: number
    engagementLevel: number
    dominantStyle?: string
    masteryByTopic: Array<{ topicName: string; score: number }>
    badges: Array<{ name: string }>
    recentActivity: Array<{ description: string; timestamp: string }>
  }
}

export function ProgressShareCard({ studentId, parentEmail, parentName, studentSnapshot }: ProgressShareCardProps) {
  const [email, setEmail] = useState(parentEmail || "")
  const [status, setStatus] = useState<null | { type: "success" | "draft"; message: string }>(null)
  const [isSending, setIsSending] = useState(false)

  const topStrength = useMemo(() => {
    return [...studentSnapshot.masteryByTopic].sort((a, b) => b.score - a.score)[0]
  }, [studentSnapshot.masteryByTopic])

  const handleShare = async () => {
    if (!email.trim()) return

    setIsSending(true)
    setStatus(null)

    try {
      const response = await fetch("/api/ai/parent-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          parentEmail: email.trim(),
          parentName,
          studentSnapshot,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to create parent snapshot")
      }

      if (data.deliveryStatus === "sent") {
        setStatus({ type: "success", message: `Weekly snapshot emailed to ${email.trim()}.` })
      } else {
        if (data.mailtoUrl) {
          window.location.href = data.mailtoUrl
        }
        setStatus({ type: "draft", message: "Email draft prepared with this week's mastery snapshot." })
      }
    } catch (error: any) {
      setStatus({ type: "draft", message: error?.message || "Unable to prepare the snapshot right now." })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Share Weekly Progress</h2>
          <p className="text-sm text-slate-500 mt-1">Generate a parent-ready mastery snapshot without leaving the dashboard.</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 text-sm text-slate-600 dark:text-slate-300">
        <p>
          Snapshot preview: {studentSnapshot.studentName} is at {Math.round(studentSnapshot.overallMastery)}% mastery and{" "}
          {Math.round(studentSnapshot.engagementLevel)}% engagement.
        </p>
        {topStrength && (
          <p className="mt-2">Strongest topic this week: {topStrength.topicName} ({Math.round(topStrength.score)}%).</p>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="parent@example.com"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={handleShare}
          disabled={!email.trim() || isSending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {isSending ? "Preparing..." : "Generate & Share"}
        </button>
      </div>

      {status && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          {status.message}
        </div>
      )}
    </div>
  )
}

export default ProgressShareCard
