"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ParentHeader } from "@/components/parent/header"
import { ParentSidebar } from "@/components/parent/sidebar"
import { ChevronLeft } from "lucide-react"

export default function ParentStudentDetail() {
  const params = useParams()
  const id = params?.id as string
  const { user, loading } = useRequireAuth(["parent"])
  const [student, setStudent] = useState<any>(null)
  const [allChildren, setAllChildren] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const res = await fetch('/api/parent/children', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
        const json = await res.json()
        const children = json?.children || []
        setAllChildren(children)
        const child = children.find((c: any) => c.id === id)
        setStudent(child || null)
        // Debug: log all children and the id param
        console.log('Parent detail page: children:', children)
        console.log('Parent detail page: id param:', id)
      } catch (e) {
        console.error('Failed to load student detail', e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user, id])

  if (loading || isLoading) return <div className="p-6">Loading...</div>
  if (!user) return null

  if (!student) return (
    <div className="p-6">
      Student not found or not linked to your account.
      <pre className="mt-4 p-2 bg-slate-100 text-xs text-slate-700 rounded">
        {JSON.stringify({ id, allChildren }, null, 2)}
      </pre>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <ParentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()} className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <h1 className="text-2xl font-bold">{student.name}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">Mastery</p>
                  <div className="text-3xl font-bold">{Math.round(student.overallMastery || 0)}%</div>
                  <p className="text-sm text-slate-500 mt-3">Engagement</p>
                  <div className="text-2xl font-bold">{Math.round(student.engagementIndex || 0)}%</div>
                  <div className="mt-3 text-sm text-slate-600">{student.recentActivity?.length ? `Recent: ${student.recentActivity[0].description || student.recentActivity[0].type}` : 'No recent activity'}</div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Learning Style & Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="text-sm text-slate-500">Learning Style</div>
                    <div className="font-semibold mt-1">{student.varkProfile?.dominant_style || student.varkProfile?.dominantStyle || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Enrolled Classes</div>
                    <ul className="mt-2 space-y-2">
                      {(student.enrolledClasses || []).map((c: any) => (
                        <li key={c.classId} className="text-sm text-slate-700">{c.className} — {c.classCode}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mastery By Topic</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {(student.masteryByTopic || []).map((m: any) => (
                      <li key={m.topicId} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{m.topicName}</div>
                          <div className="text-sm text-slate-500">Assessments: {m.assessmentCount}</div>
                        </div>
                        <div className="font-semibold">{Math.round(m.score)}%</div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(student.recentActivity || []).map((a: any) => (
                      <li key={a.id} className="text-sm text-slate-700">{a.type}: {a.description} <span className="text-xs text-slate-500">{a.timestamp}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

          </div>
          {/* Debug panel: show raw student data */}
          <div className="mt-8">
            <details>
              <summary className="cursor-pointer text-xs text-slate-500">Show raw student data (debug)</summary>
              <pre className="bg-slate-100 text-xs text-slate-700 rounded p-2 mt-2">
                {JSON.stringify(student, null, 2)}
              </pre>
            </details>
          </div>
        </main>
      </div>
    </div>
  )
}
