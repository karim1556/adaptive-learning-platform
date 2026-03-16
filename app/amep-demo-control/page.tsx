"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react"

type StudentSummary = {
  id: string
  userId: string
  name: string
  email: string | null
  overallMastery: number
  engagementIndex: number
  currentClass: string | null
}

type StudentDetail = {
  id: string
  userId: string
  name: string
  email: string | null
  overallMastery: number
  engagementIndex: number
  varkProfile: { dominantStyle: string | null; secondaryStyle: string | null }
  masteryByTopic: Array<{ topicId: string | null; topicName: string; score: number }>
  recentActivity: Array<{ description: string; timestamp: string }>
  badges: Array<{ id: string; name: string; earned: boolean }>
  moduleFeedback: { averageRating: number; totalResponses: number }
  metrics: { modulesStarted: number; modulesCompleted: number; totalTimeSpent: number }
}

type BadgeCatalogItem = { id: string; name: string; description: string }

type ControlMeta = {
  usesConfiguredKey?: boolean
  fallbackKey?: string | null
}

type FormState = {
  overallMastery: number
  engagementIndex: number
  modulesStarted: number
  modulesCompleted: number
  totalTimeSpent: number
  dominantStyle: string
  secondaryStyle: string
  feedbackAverage: number
  feedbackResponses: number
  badges: string[]
  topicScores: Array<{ topicId?: string | null; topicName: string; score: number }>
  activityNotes: string[]
  resetExisting: boolean
}

const STORAGE_KEY = "amep_demo_admin_key_v1"

function buildFormState(student: StudentDetail): FormState {
  return {
    overallMastery: Math.round(student.overallMastery || 0),
    engagementIndex: Math.round(student.engagementIndex || 50),
    modulesStarted: Math.max(1, student.metrics?.modulesStarted || 3),
    modulesCompleted: Math.max(1, student.metrics?.modulesCompleted || 2),
    totalTimeSpent: Math.max(30, student.metrics?.totalTimeSpent || 90),
    dominantStyle: student.varkProfile?.dominantStyle || "Visual",
    secondaryStyle: student.varkProfile?.secondaryStyle || "Auditory",
    feedbackAverage: student.moduleFeedback?.averageRating || 4,
    feedbackResponses: student.moduleFeedback?.totalResponses || 3,
    badges: student.badges.filter((badge) => badge.earned).map((badge) => badge.id),
    topicScores:
      student.masteryByTopic?.slice(0, 4).map((topic) => ({
        topicId: topic.topicId,
        topicName: topic.topicName,
        score: Math.round(topic.score),
      })) || [
        { topicName: "Core Concepts", score: 82 },
        { topicName: "Applied Practice", score: 76 },
        { topicName: "Revision Readiness", score: 68 },
      ],
    activityNotes:
      student.recentActivity?.slice(0, 3).map((activity) => activity.description) || [
        "Completed a mastery checkpoint with strong confidence.",
        "Reviewed adaptive practice recommendations.",
        "Stayed engaged through the latest module session.",
      ],
    resetExisting: true,
  }
}

export default function AMEPDemoControlPage() {
  const [secretKey, setSecretKey] = useState("")
  const [search, setSearch] = useState("")
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
  const [badgeCatalog, setBadgeCatalog] = useState<BadgeCatalogItem[]>([])
  const [styleOptions, setStyleOptions] = useState<string[]>(["Visual", "Auditory", "Reading", "Kinesthetic"])
  const [form, setForm] = useState<FormState | null>(null)
  const [meta, setMeta] = useState<ControlMeta>({})
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || ""
    if (stored) setSecretKey(stored)

    ;(async () => {
      try {
        const response = await fetch("/api/demo-control/students")
        const data = await response.json()
        if (response.ok) {
          setMeta(data || {})
          if (!stored && data?.fallbackKey) {
            setSecretKey(data.fallbackKey)
          }
        }
      } catch {
        // ignore meta probe failures
      }
    })()
  }, [])

  const persistKey = (value: string) => {
    localStorage.setItem(STORAGE_KEY, value)
    sessionStorage.setItem(STORAGE_KEY, value)
  }

  const loadStudents = async (studentSearch = search) => {
    if (!secretKey.trim()) {
      setError("Enter the demo admin key first.")
      return
    }

    setIsLoadingStudents(true)
    setError("")
    setStatus("")

    try {
      persistKey(secretKey.trim())
      const response = await fetch("/api/demo-control/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-admin-key": secretKey.trim(),
        },
        body: JSON.stringify({ search: studentSearch }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setMeta(data || {})
          throw new Error(
            data?.fallbackKey
              ? `Wrong key. Use ${data.fallbackKey} unless you set DEMO_ADMIN_KEY in .env.local.`
              : "Wrong key. Check DEMO_ADMIN_KEY in .env.local.",
          )
        }
        throw new Error(data?.error || "Unable to load students")
      }

      setStudents(data.students || [])
      setBadgeCatalog(data.badgeCatalog || [])
      setStyleOptions(data.styleOptions || [])
      setMeta(data || {})

      if ((data.students || []).length === 0) {
        setStatus("Key accepted, but no student records were found yet.")
      } else {
        setStatus(`Loaded ${(data.students || []).length} student${(data.students || []).length === 1 ? "" : "s"}.`)
      }
    } catch (err: any) {
      setStudents([])
      setSelectedStudent(null)
      setForm(null)
      setError(err?.message || "Unable to load students")
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const loadStudentDetail = async (studentId: string) => {
    if (!secretKey.trim()) {
      setError("Enter the demo admin key first.")
      return
    }

    setIsLoadingDetail(true)
    setError("")
    setStatus("")

    try {
      const response = await fetch("/api/demo-control/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-admin-key": secretKey.trim(),
        },
        body: JSON.stringify({ studentId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to load student details")
      }

      setSelectedStudent(data.student)
      setBadgeCatalog(data.badgeCatalog || [])
      setStyleOptions(data.styleOptions || [])
      setForm(buildFormState(data.student))
      setStatus(`Editing ${data.student?.name || "student"}.`)
    } catch (err: any) {
      setError(err?.message || "Unable to load student details")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const applyOverrides = async () => {
    if (!secretKey.trim() || !selectedStudent || !form) {
      setError("Load a student first.")
      return
    }

    setIsApplying(true)
    setError("")
    setStatus("")

    try {
      const response = await fetch("/api/demo-control/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-admin-key": secretKey.trim(),
        },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          ...form,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Unable to apply demo values")
      }

      setSelectedStudent(data.student)
      setForm(buildFormState(data.student))
      setStatus(`Demo values applied for ${data.student?.name || "student"}. Teacher and parent dashboards will now reflect the new values.`)
      await loadStudents(search)
    } catch (err: any) {
      setError(err?.message || "Unable to apply demo values")
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_30%),linear-gradient(135deg,#f8fffc_0%,#eefcf8_44%,#edf7ff_100%)] p-6 lg:p-8 shadow-[0_25px_80px_-45px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
                <Shield className="h-3.5 w-3.5" />
                Demo Operator Panel
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-950">Tune student demo data fast</h1>
                <p className="mt-3 text-sm lg:text-base text-slate-600">
                  Pick a student, set mastery and engagement, then push consistent demo values into the same data flow used by the
                  student, teacher, and parent dashboards.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/teacher/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Teacher dashboard
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link
                href="/parent/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Parent dashboard
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Key mode</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {meta.usesConfiguredKey ? "Using DEMO_ADMIN_KEY from env" : `Fallback key active: ${meta.fallbackKey || "AMEP-DEMO"}`}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Students loaded</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{students.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Selected student</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{selectedStudent?.name || "None yet"}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)]">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-800">Demo admin key</label>
                <div className="mt-2 relative">
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(event) => setSecretKey(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadStudents(search)
                    }}
                    placeholder={meta.fallbackKey || "Enter demo key"}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-950 placeholder:text-slate-400"
                  />
                </div>
                {!meta.usesConfiguredKey && meta.fallbackKey && (
                  <p className="mt-2 text-xs text-slate-500">
                    Quick fallback for tomorrow’s demo: <span className="font-semibold text-slate-900">{meta.fallbackKey}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-800">Find student</label>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") loadStudents(search)
                      }}
                      placeholder="Search by name or email"
                      className="w-full rounded-2xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-950 placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => loadStudents(search)}
                    disabled={isLoadingStudents}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Load
                  </button>
                </div>
              </div>

              {status && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {status}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                {students.length > 0 ? (
                  students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => loadStudentDetail(student.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        selectedStudent?.id === student.id
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{student.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{student.email || "No email"}</p>
                          <p className="mt-1 text-xs text-slate-500">{student.currentClass || "No class mapped"}</p>
                        </div>
                        <div className="text-right text-xs text-slate-600">
                          <p>{student.overallMastery}%</p>
                          <p className="mt-1">{student.engagementIndex}%</p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Enter the key and press <span className="font-semibold text-slate-900">Load</span> to fetch students.
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="rounded-[28px] border border-slate-200 bg-white p-5 lg:p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.35)]">
            {isLoadingDetail ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-slate-50">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              </div>
            ) : selectedStudent && form ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      <UserRound className="h-3.5 w-3.5" />
                      Selected Student
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-slate-950">{selectedStudent.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedStudent.email || "No email available"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Any values you save here will be visible in teacher and parent dashboards.
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Overall mastery", "overallMastery", 0, 100],
                    ["Engagement", "engagementIndex", 0, 100],
                    ["Modules started", "modulesStarted", 1, 8],
                    ["Modules completed", "modulesCompleted", 0, 8],
                  ].map(([label, key, min, max]) => (
                    <div key={String(key)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <label className="text-sm font-semibold text-slate-800">{label}</label>
                      <input
                        type="number"
                        min={Number(min)}
                        max={Number(max)}
                        value={form[key as keyof FormState] as number}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  [key]: Number(event.target.value),
                                  ...(key === "modulesStarted" && Number(event.target.value) < current.modulesCompleted
                                    ? { modulesCompleted: Number(event.target.value) }
                                    : {}),
                                }
                              : current,
                          )
                        }
                        className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-sm font-semibold text-slate-800">Study time (minutes)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.totalTimeSpent}
                      onChange={(event) => setForm((current) => current ? { ...current, totalTimeSpent: Number(event.target.value) } : current)}
                      className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-sm font-semibold text-slate-800">Dominant style</label>
                    <select
                      value={form.dominantStyle}
                      onChange={(event) => setForm((current) => current ? { ...current, dominantStyle: event.target.value } : current)}
                      className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                    >
                      {styleOptions.map((style) => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="text-sm font-semibold text-slate-800">Secondary style</label>
                    <select
                      value={form.secondaryStyle}
                      onChange={(event) => setForm((current) => current ? { ...current, secondaryStyle: event.target.value } : current)}
                      className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                    >
                      {styleOptions.map((style) => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-slate-950">Topic mastery</h3>
                    </div>
                    <div className="mt-4 space-y-3">
                      {form.topicScores.map((topic, index) => (
                        <div key={`${topic.topicId || topic.topicName}-${index}`} className="grid grid-cols-[1fr_110px] gap-3">
                          <input
                            value={topic.topicName}
                            onChange={(event) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      topicScores: current.topicScores.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, topicName: event.target.value } : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={topic.score}
                            onChange={(event) =>
                              setForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      topicScores: current.topicScores.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, score: Number(event.target.value) } : item,
                                      ),
                                    }
                                  : current,
                              )
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-lg font-semibold text-slate-950">Module feedback</h3>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          step={0.1}
                          value={form.feedbackAverage}
                          onChange={(event) => setForm((current) => current ? { ...current, feedbackAverage: Number(event.target.value) } : current)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                        />
                        <input
                          type="number"
                          min={0}
                          max={8}
                          value={form.feedbackResponses}
                          onChange={(event) => setForm((current) => current ? { ...current, feedbackResponses: Number(event.target.value) } : current)}
                          className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                        />
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-lg font-semibold text-slate-950">Badges to show</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {badgeCatalog.map((badge) => {
                          const active = form.badges.includes(badge.id)
                          return (
                            <button
                              key={badge.id}
                              type="button"
                              onClick={() =>
                                setForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        badges: active
                                          ? current.badges.filter((id) => id !== badge.id)
                                          : [...current.badges, badge.id],
                                      }
                                    : current,
                                )
                              }
                              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                                active
                                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {badge.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-950">Recent activity notes</h3>
                  <div className="mt-4 space-y-3">
                    {form.activityNotes.map((note, index) => (
                      <input
                        key={`activity-${index}`}
                        value={note}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? {
                                  ...current,
                                  activityNotes: current.activityNotes.map((item, itemIndex) =>
                                    itemIndex === index ? event.target.value : item,
                                  ),
                                }
                              : current,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
                      />
                    ))}
                  </div>
                </div>

                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.resetExisting}
                    onChange={(event) => setForm((current) => current ? { ...current, resetExisting: event.target.checked } : current)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  Reset this student’s existing progress, feedback, and badges before applying demo values
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={applyOverrides}
                    disabled={isApplying}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Apply demo values
                  </button>
                  <button
                    onClick={() => selectedStudent && setForm(buildFormState(selectedStudent))}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                  >
                    Reset form
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[560px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <h2 className="mt-4 text-xl font-bold text-slate-950">Ready when you are</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Load students with the key on the left, then pick one to edit mastery, engagement, badges, and feedback.
                </p>
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  )
}
