"use client"

import { useEffect, useState } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ParentHeader } from "@/components/parent/header"
import { ParentSidebar } from "@/components/parent/sidebar"
import { User } from "lucide-react"
import type { ChildOverview } from "@/lib/data-service"

export default function ParentChildrenPage() {
  const { user, loading } = useRequireAuth(["parent"])
  const [children, setChildren] = useState<ChildOverview[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const res = await fetch('/api/parent/children', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
        const json = await res.json()
        const data = json?.children || []
        // map to simple display shape
        const mapped = (data as any[]).map((c) => ({
          id: c.id,
          name: c.name,
          grade: c.enrolledClasses?.[0]?.className || c.enrolledClasses?.[0]?.class_name || c.enrolledClasses?.[0]?.className || '',
          masteryScore: Math.round(Number(c.overallMastery || 0)),
          engagementScore: Math.round(Number(c.engagementIndex || 0)),
          learningStyle: (c.varkProfile?.dominant_style || c.varkProfile?.dominantStyle || c.varkProfile?.dominantStyle || '') || '',
          status: (c.engagementStatus || 'medium') === 'high' ? 'On Track' : (c.engagementStatus === 'medium' ? 'Medium' : 'Needs Support'),
          recommendations: c.recommendations || [],
          recentActivity: c.recentActivity || [],
        }))
        setChildren(mapped)
      } catch (e) {
        console.error('Failed to load children list', e)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [user?.id])

  if (loading || isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <ParentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ParentHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Children</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Monitor each child's progress and learning journey</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {children.map((child) => (
                <Card key={child.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-white">{child.name}</CardTitle>
                          <p className="text-sm text-slate-400">{child.grade}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${child.status === "On Track" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {child.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-slate-400">Mastery Score</p>
                        <p className="text-2xl font-bold text-blue-400">{child.masteryScore}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Engagement</p>
                        <p className="text-2xl font-bold text-green-400">{child.engagementScore}%</p>
                      </div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-sm text-slate-400">Learning Style</p>
                      <p className="text-white font-semibold">{child.learningStyle} Learner</p>
                    </div>
                    {child.recommendations?.length > 0 && (
                      <div className="text-sm text-slate-300">• {child.recommendations[0]}</div>
                    )}
                    {child.recentActivity?.length > 0 && (
                      <div className="text-xs text-slate-400 mt-2">Recent: {child.recentActivity[0].description || child.recentActivity[0].type}</div>
                    )}
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.location.href = `/parent/children/${child.id}`}>
                      View Detailed Progress
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
