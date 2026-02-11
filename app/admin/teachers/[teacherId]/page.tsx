"use client"

import { useRequireAuth } from "@/hooks/use-auth"
import { AdminHeader } from "@/components/admin/header"
import { AdminSidebar } from "@/components/admin/sidebar"
import { getTeacherData } from "@/lib/teacher-data"

export default function TeacherDetailPage({ params }: { params: { teacherId: string } }) {
  const { user, loading } = useRequireAuth(["admin"])
  const teacherId = params.teacherId

  if (loading) return <div />
  if (!user) return null

  const t = getTeacherData(teacherId)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader user={user} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.name}</h1>
              <p className="text-slate-600 mt-1">{t.department}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded p-4">
                <h3 className="font-semibold mb-2">Classes</h3>
                <ul className="space-y-2">
                  {(t.classes || []).map((c) => (
                    <li key={c.classCode} className="text-sm text-slate-700 dark:text-slate-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{c.className}</div>
                          <div className="text-xs text-slate-500">Code: {c.classCode}</div>
                        </div>
                        <div className="text-sm">{c.studentCount} students</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded p-4">
                <h3 className="font-semibold mb-2">Learning Style Distribution</h3>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {(t.learningStyleDistribution || []).map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div>{s.name}</div>
                      <div className="font-medium">{s.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
