"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { getClassByCode } from "@/lib/teacher-data"

export default function ClassDetailPage({ params }: { params: { classCode: string } }) {
  const { user, loading } = useRequireAuth(["admin"])
  const classCode = params.classCode

  if (loading) return <div />
  if (!user) return null

  const cls = getClassByCode(classCode)
  if (!cls) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-600">Class not found.</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{cls.className}</h1>
              <p className="text-slate-600 mt-1">Code: {cls.classCode} • Teacher: {cls.teacherName}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded p-4">
              <h3 className="font-semibold mb-2">Students</h3>
              <ul className="space-y-2">
                {(cls.students || []).map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">Mastery: {s.masteryScore} • Engagement: {s.engagementLevel}</div>
                    </div>
                    <a href={`/admin/students/${s.id}`} className="text-blue-400 hover:text-blue-300">View</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
